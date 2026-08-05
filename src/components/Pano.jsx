import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../Gsapconfig'

/**
 * The Marzipano plate. Owns exactly one viewer for the life of the panel and
 * treats `scene` as the only instruction: point it at a tile set and it either
 * dissolves to a scene it already built or builds one on the spot.
 *
 * Three things keep it cheap:
 *   - the library is a dynamic import, and the viewer is not constructed until
 *     the panel is first opened, so nothing here touches the landing bundle;
 *   - scenes are cached per tile set, so going back to an elevation or hour you
 *     have already seen reuses its geometry, view and warm texture store;
 *   - off-panel the render loop is stopped outright. Marzipano only draws when
 *     the view is dirty, so an idle pano is free — but an autorotating one is
 *     not, and neither is one nobody can see.
 */

/** Slow enough not to fight the interface, fast enough to read as alive. */
const AUTOROTATE = { yawSpeed: 0.028, targetPitch: 0, targetFov: Math.PI / 2 }

/** A floating nav dot plus its always-on label — Marzipano hotspots are
 *  plain DOM, positioned and reprojected by the library itself as the view
 *  moves, so this builds real elements rather than JSX. */
function buildLinkHotspotElement({ label, onClick }) {
  const wrap = document.createElement('div')
  wrap.className =
    'flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5'

  const dot = document.createElement('button')
  dot.type = 'button'
  dot.setAttribute('aria-label', `Go to ${label}`)
  dot.className =
    'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-white/25 shadow-[0_4px_16px_-4px_rgb(0_0_0/0.6)] backdrop-blur-sm transition-transform duration-150 hover:scale-110'
  dot.innerHTML =
    '<span class="absolute inset-0 rounded-full bg-white/40 animate-ping"></span>' +
    '<span class="relative h-2.5 w-2.5 rounded-full bg-white"></span>'
  dot.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick?.()
  })

  const tag = document.createElement('span')
  tag.className =
    'pointer-events-none whitespace-nowrap rounded-full bg-void/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-paper opacity-90'
  tag.textContent = label

  wrap.appendChild(dot)
  wrap.appendChild(tag)
  return wrap
}

/** How long after a drag the drift picks itself back up. */
const IDLE_MS = 3600

/** Long enough to read as a dissolve between two hours, not a cut. */
const SWITCH_MS = 700

/** In case a stable frame never lands — a slow connection must still reveal. */
const REVEAL_FALLBACK_MS = 1800

const Pano = ({ scene, active, autorotate, hotspots = [], onTag, className = '', ...rest }) => {
  const hostRef = useRef(null)
  const libRef = useRef(null)
  const viewerRef = useRef(null)
  const scenesRef = useRef(new Map())

  // Read at scene-creation time only (see below) — kept in a ref so a new
  // `hotspots` array identity each render doesn't reopen the scene effect.
  const hotspotsRef = useRef(hotspots)
  useLayoutEffect(() => {
    hotspotsRef.current = hotspots
  })

  // Bumped once per constructed viewer rather than set to `true`, so the
  // scene/movement effects below re-run against a *new* viewer — under
  // StrictMode the first one is built and torn down before the real mount.
  const [generation, setGeneration] = useState(0)
  const [live, setLive] = useState(false)

  // Built on the first open, and never on a panel nobody has visited. Teardown
  // is deliberately not here: leaving the panel must not throw the viewer away,
  // only stop it (see the movement effect).
  useEffect(() => {
    if (!active || viewerRef.current) return
    let cancelled = false

    import('marzipano').then((mod) => {
      const Marzipano = mod.default ?? mod
      if (cancelled || viewerRef.current || !hostRef.current) return
      libRef.current = Marzipano
      viewerRef.current = new Marzipano.Viewer(hostRef.current, {
        controls: { mouseViewMode: 'drag' },
        // Draw the coarse levels while the sharp ones are still arriving,
        // instead of holding the last good frame.
        stage: { progressive: true },
      })
      setGeneration((n) => n + 1)
    })

    return () => {
      cancelled = true
    }
  }, [active])

  // Point the viewer at a tile set.
  useEffect(() => {
    const viewer = viewerRef.current
    const Marzipano = libRef.current
    if (!viewer || !Marzipano || !scene) return

    let entry = scenesRef.current.get(scene.id)
    if (!entry) {
      const view = new Marzipano.RectilinearView(
        scene.initialView,
        Marzipano.RectilinearView.limit.traditional(
          scene.faceSize,
          (100 * Math.PI) / 180,
          (120 * Math.PI) / 180,
        ),
      )
      entry = {
        view,
        scene: viewer.createScene({
          view,
          geometry: new Marzipano.CubeGeometry(scene.levels),
          source: Marzipano.ImageUrlSource.fromString(scene.tileUrl, {
            cubeMapPreviewUrl: scene.previewUrl,
          }),
          // Keeps the cube preview resident, so a pan into tiles that have not
          // arrived yet shows a soft frame rather than a hole.
          pinFirstLevel: true,
        }),
      }
      // Only ever attached the moment this scene is first built — Pano is
      // remounted fresh per panorama by its caller, so there is no later
      // point where the link set for an already-built scene would change.
      hotspotsRef.current.forEach((h) => {
        entry.scene
          .hotspotContainer()
          .createHotspot(buildLinkHotspotElement(h), { yaw: h.yaw, pitch: h.pitch })
      })

      scenesRef.current.set(scene.id, entry)
    }

    // Carry the heading across the switch. Each scene needs its own view (the
    // zoom limit is derived from its own face size), so the parameters are
    // copied rather than the object shared — otherwise changing height or hour
    // would spin you back to wherever the tool happened to leave that pano.
    const from = viewer.scene()?.view()
    if (from) entry.view.setParameters(from.parameters())

    entry.scene.switchTo({
      transitionDuration: prefersReducedMotion() ? 0 : SWITCH_MS,
    })
  }, [generation, scene])

  // Dev-only hotspot placement: report the yaw/pitch under the pointer
  // instead of panning, so a caller can build a `links` entry from a click
  // rather than guessing coordinates by hand.
  useEffect(() => {
    if (!onTag) return undefined
    const el = hostRef.current
    const viewer = viewerRef.current
    if (!el || !viewer) return undefined

    const handleClick = (e) => {
      const rect = el.getBoundingClientRect()
      const view = viewer.scene()?.view()
      const coords = view?.screenToCoordinates?.({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      if (coords) onTag({ yaw: coords.yaw, pitch: coords.pitch })
    }

    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [generation, onTag])

  // Autorotate, and the off-panel idle state.
  useEffect(() => {
    const viewer = viewerRef.current
    const Marzipano = libRef.current
    if (!viewer || !Marzipano) return

    if (active) {
      viewer.updateSize()
      viewer.controls().enable()
      viewer.renderLoop().start()
    } else {
      viewer.controls().disable()
    }

    if (active && autorotate && !prefersReducedMotion()) {
      const movement = Marzipano.autorotate(AUTOROTATE)
      viewer.startMovement(movement)
      viewer.setIdleMovement(IDLE_MS, movement)
    } else {
      viewer.stopMovement()
      viewer.setIdleMovement(Infinity)
    }

    // Stopped last, so the frame that parks the pano still gets drawn.
    if (!active) viewer.renderLoop().stop()
  }, [generation, active, autorotate])

  // Hold the pano back until it has a frame worth showing. The still plate in
  // the media layer is already behind it, so this is a hand-off, not a spinner.
  useEffect(() => {
    if (!generation || live) return
    const stage = viewerRef.current?.stage()
    if (!stage) return

    const onFrame = (stable) => {
      if (stable) setLive(true)
    }
    stage.addEventListener('renderComplete', onFrame)
    const t = setTimeout(() => setLive(true), REVEAL_FALLBACK_MS)

    return () => {
      stage.removeEventListener('renderComplete', onFrame)
      clearTimeout(t)
    }
  }, [generation, live])

  // Declared last so this cleanup runs after the listeners above are detached.
  useEffect(() => {
    const scenes = scenesRef.current
    return () => {
      viewerRef.current?.destroy()
      viewerRef.current = null
      scenes.clear()
    }
  }, [])

  return (
    <div className={className} {...rest}>
      <div className="absolute inset-0 overflow-hidden bg-void">
        <div ref={hostRef} className="absolute inset-0" />

        {/* The same grade the still plates get in MediaLayer. Without it the
            live pano reads a stop brighter than every other screen and the
            paper chrome floats on nothing. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[#33404d] opacity-30 mix-blend-multiply"
        />

        {/* Grain only while the panel is open: the app-wide grain sits under
            this canvas, so mounting a second one full time would pay for the
            same texture twice. */}
        {active && (
          <div
            aria-hidden="true"
            className="grain pointer-events-none absolute -inset-1/2 opacity-[0.045] mix-blend-overlay"
          />
        )}

        {/* Legibility wash under the chrome. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(11_10_8/0.6)_0%,rgb(11_10_8/0.16)_32%,rgb(11_10_8/0)_60%)]"
        />
      </div>

      {/* Loading cover. Opaque until the pano has a frame worth showing, and
          fades OUT rather than the pano fading in — the pano itself stays
          permanently mounted above, so there is never a gap where the media
          plate behind Views can bleed through. */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute inset-0 z-10 bg-void transition-opacity duration-700 ease-out',
          live ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      />
    </div>
  )
}

export default Pano

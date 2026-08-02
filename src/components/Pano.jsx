import { useEffect, useRef, useState } from 'react'
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

/** How long after a drag the drift picks itself back up. */
const IDLE_MS = 3600

/** Long enough to read as a dissolve between two hours, not a cut. */
const SWITCH_MS = 700

/** In case a stable frame never lands — a slow connection must still reveal. */
const REVEAL_FALLBACK_MS = 1800

const Pano = ({ scene, active, autorotate, className = '', ...rest }) => {
  const hostRef = useRef(null)
  const libRef = useRef(null)
  const viewerRef = useRef(null)
  const scenesRef = useRef(new Map())

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

  // Hold the pano back only until it has drawn something. The opaque plate
  // below stands in until then, so an early frame costs nothing: a transparent
  // canvas reads as that plate, and the cube preview fills in within a frame or
  // two. Waiting for a *stable* frame instead would hold the panel dark for the
  // whole sharpening pass, which is the wait this hand-off exists to avoid.
  useEffect(() => {
    if (!generation || live) return
    const stage = viewerRef.current?.stage()
    if (!stage) return

    const onFrame = () => setLive(true)
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
      {/* The plate this panel stands on. Opaque and always there, so the media
          layer's still of the tower is never what you see on this screen —
          neither while the first pano builds nor in the gap a scene switch can
          leave when the incoming tiles have not landed yet. The pano dissolves
          against this instead, so every transition here is pano-to-pano. */}
      <div aria-hidden="true" className="absolute inset-0 bg-void" />

      <div
        className={[
          'absolute inset-0 overflow-hidden transition-opacity duration-700 ease-out',
          live ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
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
    </div>
  )
}

export default Pano

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, useGSAP, prefersReducedMotion } from '../Gsapconfig'
import { useViewReveal } from '../hooks/useViewReveal'
import { srcSet, fallbackSrc } from '../lib/images'
import { client } from "../sanity/client";
import { urlFor } from "../sanity/image";

/** `short` marks the three tiles that survive the short-viewport cut. */
const TILES = [
  { id: 'club', name: 'Club Z', sub: 'Skydeck lounge', level: 'L52', img: 'am-1', short: true,
    area: 'col-start-1 col-end-7 row-start-1 row-end-6 md:col-end-8 md:row-end-4 lg:col-end-7 lg:row-end-6 short:col-end-6 short:row-end-5' },
  { id: 'bar', name: 'Sunset Bar', sub: 'Open deck', level: 'L52', img: 'am-2', short: true,
    area: 'col-start-7 col-end-13 row-start-1 row-end-4 md:col-start-8 md:row-end-3 lg:col-start-7 lg:row-end-4 short:col-start-6 short:row-end-3' },
  { id: 'lawn', name: 'The Lawn', sub: 'Podium garden', level: 'L05', img: 'am-3', short: false,
    area: 'col-start-7 col-end-10 row-start-4 row-end-7 md:col-start-8 md:col-end-13 md:row-start-3 md:row-end-5 lg:col-start-7 lg:col-end-10 lg:row-start-4 lg:row-end-7' },
  { id: 'pool', name: 'Infinity Pool', sub: 'Podium edge', level: 'L05', img: 'am-4', short: true,
    area: 'col-start-10 col-end-13 row-start-4 row-end-9 md:col-start-1 md:col-end-6 md:row-start-4 md:row-end-7 lg:col-start-10 lg:col-end-13 lg:row-start-4 lg:row-end-9 short:col-start-6 short:col-end-13 short:row-start-3 short:row-end-5' },
  { id: 'yoga', name: 'Nirvana', sub: 'Yoga deck', level: 'L51', img: 'am-5', short: false,
    area: 'col-start-1 col-end-7 row-start-6 row-end-9 md:col-start-6 md:col-end-13 md:row-start-5 md:row-end-7 lg:col-start-1 lg:col-end-7 lg:row-start-6 lg:row-end-9' },
]

const Amenities = ({ active }) => {

  const rootRef = useRef(null)
  const boxRef = useRef(null)
  const boxImgRef = useRef(null)
  const [open, setOpen] = useState(null);
const [amenityData, setAmenityData] = useState(null);
const [galleryIndex, setGalleryIndex] = useState(0);

const tiles = TILES.map((tile, index) => ({
  ...tile,
  ...(amenityData?.amenities?.[index] || {}),
}));

useEffect(() => {
  client
    .fetch(`
      *[_type=="zenithSite"][0]{
        amenities
      }
    `)
    .then((data) => {
      setAmenityData(data?.amenities ?? null);
    })
    .catch(console.error);
}, []);

  useViewReveal(active, rootRef)
  const { contextSafe } = useGSAP({ scope: rootRef })

  const step = useCallback(
    (dir) => setOpen((n) => (n === null ? n : (n + dir + TILES.length) % TILES.length)),
    [setOpen],
  )
    
 

  // eslint-disable-next-line react-hooks/refs
  const animateSwap = contextSafe(() => {
    const img = boxImgRef.current
    if (!img || prefersReducedMotion()) return
    gsap.set(img, { opacity: 0, scale: 1.04 })
    gsap.to(img, { opacity: 1, scale: 1, duration: 0.7, ease: 'zenith' })
  })



  // Capture phase, so the view Observer never sees these while open.
  useEffect(() => {
    if (open === null) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, step])

  useGSAP(
    () => {
      const box = boxRef.current
      if (!box) return
      if (open === null) {
        gsap.set(box, { autoAlpha: 0 })
        return
      }
      if (prefersReducedMotion()) {
        gsap.set(box, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' })
        return
      }
      gsap.set(box, { autoAlpha: 1, clipPath: 'inset(0% 0% 100% 0%)' })
      gsap.to(box, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.out' })
      animateSwap()
    },
    { dependencies: [open], scope: rootRef },
  )

  useGSAP(() => animateSwap(), { dependencies: [open], scope: rootRef })

 

const cur = open === null ? null : tiles[open];

const gallery =
  cur?.gallery && cur.gallery.length > 0
    ? cur.gallery
    : cur?.coverImage
    ? [cur.coverImage]
    : [];

const prevImage = () => {
  if (!gallery.length) return;

  setGalleryIndex((prev) =>
    prev === 0 ? gallery.length - 1 : prev - 1
  );
};

const nextImage = () => {
  if (!gallery.length) return;

  setGalleryIndex((prev) =>
    prev === gallery.length - 1 ? 0 : prev + 1
  );
};

  const iconBtn = [
    'grid place-items-center rounded-full bg-paper text-ink',
    'shadow-[0_14px_34px_-16px_rgb(0_0_0/0.6)]',
    'transition-colors duration-200 hover:bg-ink hover:text-paper',
  ].join(' ')

  return (
    <div ref={rootRef} className="grid h-full w-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 md:gap-4">
      <div
        className="flex max-w-[30ch] flex-col gap-1.5 text-paper [text-shadow:0_2px_22px_rgb(0_0_0/0.55)]"
      >
        <p data-reveal className="t-label flex items-center gap-2 text-paper/70 before:h-px before:w-3.5 before:bg-brass before:content-['']">
          02 &middot; Amenities
        </p>
        <h2
          data-reveal
          data-view-heading
          tabIndex={-1}
          className="t-h2 outline-none short:hidden"
        >
          Ten thousand square feet,
          <br className="hidden sm:inline" /> above the city
        </h2>
      </div>

      <div className="grid min-h-0 grid-cols-12 grid-rows-8 gap-1.5 md:grid-rows-6 md:gap-2 lg:grid-rows-8 lg:gap-2.5 short:grid-rows-4">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
  setOpen(i);
  setGalleryIndex(0);
}}
            data-amen-tile={t.id}
            data-reveal-figure
            className={[
              'group relative min-h-0 overflow-hidden rounded-tile bg-void',
              t.area,
              t.short ? '' : 'short:hidden',
            ].join(' ')}
          >
     <img
  className="h-full w-full object-cover transition-transform duration-900 ease-zenith group-hover:scale-[1.045]"
  src={
    t.coverImage
      ? urlFor(t.coverImage).url()
      : fallbackSrc(t.img)
  }
  alt={t.title || t.name}
  loading="lazy"
  decoding="async"
/>

            {/* Solid paper caption. Touch has no hover, so it sits open there. */}
            <span
              className={[
                'absolute bottom-0 left-0 flex flex-col gap-px rounded-tr-tile bg-paper px-2.5 py-1.5 text-left text-ink',
                'md:px-3 md:py-2',
                'translate-y-full transition-transform duration-500 ease-zenith',
                'group-hover:translate-y-0 group-focus-visible:translate-y-0',
                // Open by default on anything small or hover-less: on a phone
                // there is no hover to reveal them, and a narrow desktop
                // window has no room to guess from the image alone.
                'max-md:translate-y-0 touch:translate-y-0',
              ].join(' ')}
            >
              <span className="text-[11px] font-normal leading-tight md:text-[13px]">
                {t.title || t.name}
              </span>
              <span className="t-label hidden text-ink-3 md:block">{t.description || t.sub}</span>
            </span>

            <span className="chip absolute right-2 top-2 hidden h-[22px] px-2 text-[9px] text-ink-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
              {t.level}
            </span>
          </button>
        ))}
      </div>

      {/* Portalled to the body: the dock and status chip sit in higher stacking
          contexts than the view layer, so a viewer rendered in place would be
          painted underneath them however high its z-index. */}
      {createPortal(
        <div
          ref={boxRef}
          role="dialog"
          aria-modal="true"
          aria-label={cur ? `${cur.title || cur.name}, ${cur.description || cur.sub}` : "Image viewer"}
          hidden={open === null}
          className="fixed inset-2 z-100 overflow-hidden rounded-plate bg-void sm:inset-2.5 lg:inset-3 3xl:inset-4"
        >
          {cur && (
            <>
                 <img
  ref={boxImgRef}
  className="h-full w-full object-cover"
  src={
    gallery.length
      ? urlFor(gallery[galleryIndex]).url()
      : fallbackSrc(cur.img)
  }
  alt={cur?.title || cur?.name}
/>

              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous image"
                className={`${iconBtn} absolute left-3 top-1/2 z-2 h-11 w-11 -translate-y-1/2 md:left-6 md:h-12 md:w-12`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.4]">
                  <path d="M15 4 7 12l8 8" />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next image"
                className={`${iconBtn} absolute right-3 top-1/2 z-2 h-11 w-11 -translate-y-1/2 md:right-6 md:h-12 md:w-12`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.4]">
                  <path d="M9 4l8 8-8 8" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close viewer"
                className={`${iconBtn} absolute right-3 top-3 z-2 h-10 w-10 md:right-6 md:top-6 md:h-11 md:w-11`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.4]">
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>

              <div className="absolute bottom-3 left-3 z-2 flex flex-col gap-0.5 rounded-plate bg-paper px-3.5 py-2.5 text-ink md:bottom-6 md:left-6 md:px-4 md:py-3">
                <span className="text-[15px] font-normal leading-tight md:text-[17px]">
                  {cur.title || cur.name}
                </span>
                <span className="t-label text-ink-3">
                  {cur.description || cur.sub} &middot; {cur.level}
                </span>
                <span className="t-fig mt-1 text-[10px] tracking-widest text-brass">
                  {String(galleryIndex + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}
                </span>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

export default Amenities

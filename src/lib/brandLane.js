/**
 * The corner the studio credit stands in, expressed as right padding for the
 * bottom-left blocks that share its band — the landing hero, the gallery
 * title, the showcase caption. Import it there rather than re-typing the
 * numbers, so the lane and the mark can never drift apart.
 *
 * Each step is the mark's own width at that breakpoint plus its inset and a
 * gap; see components/BrandMark.jsx for both.
 *
 *   base  16 + 84 + 12    sm  16 + 96 + 12    md  24 + 112 + 14
 *   lg    28 + 124 + 16   3xl 40 + 148 + 20   4xl 40 + 172 + 20
 *
 * The `max()` is what makes a notch safe. In landscape the mark's own inset
 * grows to `env(safe-area-inset-right)`, which slides it further from the edge
 * and into this lane — so the lane grows by exactly the same amount instead of
 * being overrun. `index.html` sets `viewport-fit=cover`, so those insets are
 * live rather than always zero.
 */
export const BRAND_LANE = [
  'pr-[max(112px,calc(env(safe-area-inset-right)+96px))]',
  'sm:pr-[max(124px,calc(env(safe-area-inset-right)+108px))]',
  'md:pr-[max(150px,calc(env(safe-area-inset-right)+126px))]',
  'lg:pr-[max(168px,calc(env(safe-area-inset-right)+140px))]',
  '3xl:pr-[max(208px,calc(env(safe-area-inset-right)+168px))]',
  '4xl:pr-[max(232px,calc(env(safe-area-inset-right)+192px))]',
].join(' ')

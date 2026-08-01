import { groupSelection } from './saveables'

/**
 * The take-away sheet.
 *
 * Everything a visitor marked during their tour, set on the app's own paper in
 * the app's own typeface and handed back as a PDF. It is built in the browser —
 * there is no server in this tool — so pdf-lib and the three font faces are
 * pulled in only when someone actually asks for the sheet.
 *
 * On the typeface: GT Ultra ships here as woff2, which no PDF can embed. The
 * three faces the sheet uses are shipped a second time under public/fonts/pdf/
 * as Latin-subset OTFs, ~18KB each. They must be embedded with `subset: false` —
 * GT Ultra is CFF, and pdf-lib's own CFF subsetter re-maps the glyph ids on
 * these, which turns the whole page into punctuation soup.
 *
 * To regenerate a face (fonttools + brotli):
 *   python -c "from fontTools.ttLib import TTFont; \
 *     f=TTFont('src/assets/fonts/NAME.woff2'); f.flavor=None; f.save('/tmp/NAME.otf')"
 *   pyftsubset /tmp/NAME.otf --output-file=public/fonts/pdf/NAME.otf \
 *     --unicodes="U+0020-007E,U+00A0-00FF,U+2010-2015,U+2018-201D,U+2022,U+2026" \
 *     --layout-features="" --no-hinting --desubroutinize
 * Keep the subset in step with SAFE below — a glyph the font lacks throws.
 */

const FONT_URLS = {
  fine: '/fonts/pdf/GTUltraFine-Regular.otf',
  light: '/fonts/pdf/GTUltraMedian-Light.otf',
  medium: '/fonts/pdf/GTUltraMedian-Regular.otf',
}

const LOGO_URL = '/img/brand/runwal-480.png'
const COVER_URL = '/img/home-1920.jpg'

/** A4 portrait, in points. */
const PAGE = { w: 595.28, h: 841.89 }
const M = 46 // page margin
const GUTTER = 18
const COL = (PAGE.w - M * 2 - GUTTER) / 2
const CONTENT_W = PAGE.w - M * 2
/** Nothing prints below this; the footer rule lives here. */
const FLOOR = 62

/** The theme, as PDF colour. Same hex values as @theme in index.css. */
const HEX = {
  paper: '#f4f1ea',
  paper2: '#eae5da',
  paper3: '#ded7c8',
  ink: '#1a1714',
  ink2: '#4d463d',
  ink3: '#5a5346',
  brass: '#a28a00',
  brassInk: '#5f5100',
  void: '#0b0a08',
}

/**
 * The visitor types their own name, and the subset faces carry Latin only.
 * Anything outside that would throw inside pdf-lib's encoder and take the whole
 * download with it, so every string is filtered on the way to the page.
 */
const SAFE = /[^\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/g
const safe = (s) => String(s ?? '').replace(SAFE, '').trim()

const fmtDate = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** "12" → "12 selections"; "1" → "1 selection". */
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const loadBytes = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

/** Geometry for an image fitted *inside* a box, centred, aspect kept. */
const containBox = (iw, ih, bw, bh) => {
  const s = Math.min(bw / iw, bh / ih)
  const w = iw * s
  const h = ih * s
  return { w, h, dx: (bw - w) / 2, dy: (bh - h) / 2 }
}

/** Geometry for an image filling a box, aspect kept, overflow clipped away. */
const coverBox = (iw, ih, bw, bh) => {
  const s = Math.max(bw / iw, bh / ih)
  const w = iw * s
  const h = ih * s
  return { w, h, dx: (bw - w) / 2, dy: (bh - h) / 2 }
}

export const sheetFilename = (name) => {
  const who = safe(name).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `Runwal-Zenith-Selection${who ? `-${who}` : ''}.pdf`
}

/**
 * Build the sheet and return it as a Blob.
 *
 * `name` is the visitor; `saved` is the flat record list from the session (see
 * lib/saveables.js). Records whose artwork can't be fetched are dropped rather
 * than allowed to fail the document — a missing render must not cost someone
 * the rest of their selection.
 */
export const buildPreferenceSheet = async ({ name, saved = [], date = new Date() }) => {
  const [{ PDFDocument, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath },
    { default: fontkit }] = await Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
  ])

  const col = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
  }
  const C = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, col(v)]))

  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  doc.setTitle(`Runwal Zenith — Selection${name ? ` for ${safe(name)}` : ''}`)
  doc.setAuthor('Runwal Realty')
  doc.setSubject('Runwal Zenith, Balkum, Thane (W)')
  doc.setCreator('Runwal Zenith')
  doc.setProducer('Runwal Zenith')

  const [fineB, lightB, mediumB] = await Promise.all(
    [FONT_URLS.fine, FONT_URLS.light, FONT_URLS.medium].map(loadBytes),
  )
  // subset:false — see the note at the top of this file.
  const F = {
    fine: await doc.embedFont(fineB, { subset: false }),
    light: await doc.embedFont(lightB, { subset: false }),
    medium: await doc.embedFont(mediumB, { subset: false }),
  }

  // --- image loading, shared across pages -------------------------------
  const imgCache = new Map()
  const image = async (url) => {
    if (imgCache.has(url)) return imgCache.get(url)
    const p = (async () => {
      const bytes = await loadBytes(url)
      return /\.png$/i.test(url) ? doc.embedPng(bytes) : doc.embedJpg(bytes)
    })()
    imgCache.set(url, p)
    return p
  }
  /** Never let one dead asset cost the visitor their sheet. */
  const imageOrNull = async (url) => {
    try {
      return await image(url)
    } catch {
      imgCache.delete(url)
      return null
    }
  }

  // --- drawing helpers ---------------------------------------------------

  /** pdf-lib has no letter-spacing, and tracked uppercase is half this app's
   *  voice — so tracked runs are set a glyph at a time. */
  const trackedWidth = (str, font, size, tracking) =>
    font.widthOfTextAtSize(str, size) + tracking * Math.max(str.length - 1, 0)

  const drawTracked = (page, raw, { x, y, size, font, color, tracking = 1.4, align = 'left' }) => {
    const str = safe(raw).toUpperCase()
    if (!str) return 0
    const total = trackedWidth(str, font, size, tracking)
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
    for (const ch of str) {
      page.drawText(ch, { x: cx, y, size, font, color })
      cx += font.widthOfTextAtSize(ch, size) + tracking
    }
    return total
  }

  const drawText = (page, raw, { x, y, size, font, color, align = 'left', maxWidth }) => {
    let str = safe(raw)
    if (!str) return
    if (maxWidth) {
      // Ellipsise rather than wrap: these are captions on a plate, and a
      // second line would push into the image below it.
      while (str.length > 1 && font.widthOfTextAtSize(str, size) > maxWidth) {
        str = str.slice(0, -1)
      }
      if (str !== safe(raw)) str = `${str.slice(0, -1)}…`
    }
    const w = font.widthOfTextAtSize(str, size)
    const cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
    page.drawText(str, { x: cx, y, size, font, color })
  }

  const wrap = (raw, font, size, maxWidth) => {
    const words = safe(raw).split(/\s+/).filter(Boolean)
    const lines = []
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        lines.push(line)
        line = w
      } else {
        line = next
      }
    }
    if (line) lines.push(line)
    return lines
  }

  const drawParagraph = (page, raw, { x, y, size, font, color, maxWidth, leading }) => {
    const lines = wrap(raw, font, size, maxWidth)
    lines.forEach((l, i) => page.drawText(l, { x, y: y - i * leading, size, font, color }))
    return lines.length * leading
  }

  /** Fill a box with an image, cropped to it. */
  const drawCovered = (page, img, { x, y, w, h }) => {
    const g = coverBox(img.width, img.height, w, h)
    page.pushOperators(pushGraphicsState(), rectangle(x, y, w, h), clip(), endPath())
    page.drawImage(img, { x: x + g.dx, y: y + g.dy, width: g.w, height: g.h })
    page.pushOperators(popGraphicsState())
  }

  // --- page furniture ----------------------------------------------------

  const pages = []
  const startPage = () => {
    const page = doc.addPage([PAGE.w, PAGE.h])
    page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: C.paper })
    pages.push(page)
    return page
  }

  /** Running head and foot. Applied at the end, so page numbers can be
   *  totals-aware and the cover can be left clean. */
  const dressPages = () => {
    pages.forEach((page, i) => {
      if (i === 0) return // the cover carries its own furniture
      drawTracked(page, 'Runwal Zenith', {
        x: M,
        y: PAGE.h - M + 6,
        size: 6.4,
        font: F.medium,
        color: C.ink3,
        tracking: 1.5,
      })
      drawTracked(page, 'Your selection', {
        x: PAGE.w - M,
        y: PAGE.h - M + 6,
        size: 6.4,
        font: F.medium,
        color: C.ink3,
        tracking: 1.5,
        align: 'right',
      })
      page.drawRectangle({
        x: M,
        y: PAGE.h - M - 4,
        width: CONTENT_W,
        height: 0.6,
        color: C.ink,
        opacity: 0.16,
      })
      page.drawRectangle({ x: M, y: FLOOR - 16, width: CONTENT_W, height: 0.6, color: C.brass, opacity: 0.55 })
      drawText(page, String(i + 1).padStart(2, '0'), {
        x: PAGE.w - M,
        y: FLOOR - 30,
        size: 8,
        font: F.fine,
        color: C.ink3,
        align: 'right',
      })
      drawText(page, 'Balkum, Thane (W)', {
        x: M,
        y: FLOOR - 30,
        size: 7,
        font: F.light,
        color: C.ink3,
      })
    })
  }

  // ======================================================================
  // Cover
  // ======================================================================
  // Two clean fields parted by a brass hairline: the render above, the paper
  // below. No scrim over the image — this app's chrome is solid and tactile,
  // and a faked gradient prints as banding anyway.
  const cover = startPage()
  const HERO_BOTTOM = 430

  const heroImg = await imageOrNull(COVER_URL)
  if (heroImg) {
    drawCovered(cover, heroImg, { x: 0, y: HERO_BOTTOM, w: PAGE.w, h: PAGE.h - HERO_BOTTOM })
  } else {
    cover.drawRectangle({ x: 0, y: HERO_BOTTOM, width: PAGE.w, height: PAGE.h - HERO_BOTTOM, color: C.void })
  }
  cover.drawRectangle({ x: 0, y: HERO_BOTTOM - 1, width: PAGE.w, height: 1, color: C.brass })

  // The landing's own lockup, set on paper.
  cover.drawRectangle({ x: M, y: HERO_BOTTOM - 30, width: 15, height: 0.9, color: C.brass })
  drawTracked(cover, 'Runwal · Balkum, Thane (W)', {
    x: M + 22,
    y: HERO_BOTTOM - 33,
    size: 7.2,
    font: F.medium,
    color: C.ink3,
    tracking: 1.6,
  })
  drawText(cover, 'Zenith', { x: M, y: HERO_BOTTOM - 92, size: 54, font: F.fine, color: C.ink })
  drawText(cover, 'A 52-storey landmark, seen from every side', {
    x: M,
    y: HERO_BOTTOM - 112,
    size: 9.5,
    font: F.light,
    color: C.ink2,
  })

  cover.drawRectangle({ x: M, y: 306, width: CONTENT_W, height: 0.6, color: C.ink, opacity: 0.14 })

  const total = saved.length
  drawTracked(cover, 'Curated for', {
    x: M,
    y: 272,
    size: 7.4,
    font: F.medium,
    color: C.ink3,
    tracking: 1.8,
  })
  drawText(cover, name || 'Our guest', {
    x: M,
    y: 230,
    size: 34,
    font: F.fine,
    color: C.ink,
    maxWidth: CONTENT_W,
  })
  cover.drawRectangle({ x: M, y: 214, width: 46, height: 0.8, color: C.brass })
  drawText(cover, `${plural(total, 'selection', 'selections')} · ${fmtDate(date)}`, {
    x: M,
    y: 194,
    size: 9.5,
    font: F.light,
    color: C.ink2,
  })

  const logo = await imageOrNull(LOGO_URL)
  if (logo) {
    const lw = 72
    cover.drawImage(logo, {
      x: M,
      y: FLOOR + 20,
      width: lw,
      height: (lw * logo.height) / logo.width,
    })
  }

  cover.drawRectangle({ x: M, y: FLOOR - 8, width: CONTENT_W, height: 0.6, color: C.ink, opacity: 0.14 })
  drawText(
    cover,
    'MahaRERA P51700046734 · Possession 2029 · Images are artist impressions.',
    { x: M, y: FLOOR - 22, size: 6.8, font: F.light, color: C.ink3 },
  )

  // ======================================================================
  // Sections
  // ======================================================================
  const groups = groupSelection(saved)

  // A cursor-based flow: `y` walks down the page and asks for a new one when
  // the next block won't fit. Every block knows its own height, so a section
  // can start mid-page and a grid can break across pages without special cases.
  let page = null
  let y = 0

  const newPage = () => {
    page = startPage()
    y = PAGE.h - M - 34
  }
  const need = (h) => {
    if (!page || y - h < FLOOR) newPage()
  }

  /** The head asks for room for itself *and* a first row, so a section can
   *  never be orphaned at the foot of a page. */
  const drawSectionHead = (group, index) => {
    need(96 + 210)
    drawTracked(page, String(index + 1).padStart(2, '0'), {
      x: M,
      y,
      size: 7.4,
      font: F.medium,
      color: C.brassInk,
      tracking: 1.8,
    })
    y -= 26
    drawText(page, group.title, { x: M, y, size: 25, font: F.fine, color: C.ink })
    y -= 16
    drawText(page, group.note, { x: M, y, size: 9, font: F.light, color: C.ink3 })
    y -= 12
    page.drawRectangle({ x: M, y, width: CONTENT_W, height: 0.8, color: C.brass, opacity: 0.75 })
    y -= 22
  }

  /**
   * A residence, one to a page. The drawing is a document — it is the thing a
   * buyer actually studies — so it takes whatever the page will give it and is
   * never cropped. The plate is sized to the drawing rather than the other way
   * round, so it hugs the sheet instead of framing dead paper, and the whole
   * block is centred in what's left of the page.
   */
  const PLAN_PAD = 12
  const PLAN_CAPTION = 46

  const drawPlanPage = async (rec) => {
    const img = await imageOrNull(rec.img)
    if (!img) return

    const availH = y - FLOOR - PLAN_CAPTION
    const g = containBox(img.width, img.height, CONTENT_W - PLAN_PAD * 2, availH - PLAN_PAD * 2)
    const plateW = g.w + PLAN_PAD * 2
    const plateH = g.h + PLAN_PAD * 2
    // The plans are landscape on a portrait page, so there is always vertical
    // slack. Bias the block above centre — dead paper reads better under a
    // page than hanging off a section rule.
    const slack = Math.max(0, y - FLOOR - (plateH + PLAN_CAPTION))
    const top = y - slack * 0.34
    const px = M + (CONTENT_W - plateW) / 2

    page.drawRectangle({
      x: px,
      y: top - plateH,
      width: plateW,
      height: plateH,
      color: C.paper2,
      borderColor: C.ink,
      borderOpacity: 0.14,
      borderWidth: 0.6,
    })
    page.drawImage(img, { x: px + PLAN_PAD, y: top - plateH + PLAN_PAD, width: g.w, height: g.h })

    let cy = top - plateH - 20
    drawText(page, rec.title, { x: M, y: cy, size: 15, font: F.fine, color: C.ink, maxWidth: CONTENT_W * 0.7 })
    if (rec.sub) {
      drawTracked(page, rec.sub, {
        x: PAGE.w - M,
        y: cy + 2,
        size: 6.6,
        font: F.medium,
        color: C.ink3,
        tracking: 1.4,
        align: 'right',
      })
    }
    cy -= 15
    if (rec.meta) drawText(page, rec.meta, { x: M, y: cy, size: 9, font: F.light, color: C.ink2, maxWidth: CONTENT_W })
    y = FLOOR // this page is spent
  }

  /** Amenities and renders: two to a row, cropped to a common plate so the
   *  grid reads as a grid whatever shape the source is. */
  const drawTileRow = async (rows) => {
    // 0.62 is not a taste call: it is the tallest crop that still lets three
    // rows clear the footer on a page that also carries a section head.
    const imgH = Math.round(COL * 0.62)
    const captionH = 40
    need(imgH + captionH + 14)
    const top = y

    for (let i = 0; i < rows.length; i += 1) {
      const rec = rows[i]
      const x = M + i * (COL + GUTTER)
      const img = await imageOrNull(rec.img)
      if (img) {
        drawCovered(page, img, { x, y: top - imgH, w: COL, h: imgH })
      } else {
        page.drawRectangle({ x, y: top - imgH, width: COL, height: imgH, color: C.paper2 })
      }
      page.drawRectangle({
        x,
        y: top - imgH,
        width: COL,
        height: imgH,
        borderColor: C.ink,
        borderOpacity: 0.12,
        borderWidth: 0.6,
      })

      let ly = top - imgH - 15
      drawText(page, rec.title, { x, y: ly, size: 11.5, font: F.fine, color: C.ink, maxWidth: COL })
      ly -= 11
      if (rec.sub) {
        drawTracked(page, rec.sub, { x, y: ly, size: 6.2, font: F.medium, color: C.ink3, tracking: 1.3 })
      }
      if (rec.meta) {
        drawText(page, rec.meta, { x: x + COL, y: ly, size: 7.4, font: F.light, color: C.ink2, align: 'right', maxWidth: COL * 0.55 })
      }
    }
    y = top - imgH - captionH - 14
  }

  for (let g = 0; g < groups.length; g += 1) {
    const group = groups[g]
    drawSectionHead(group, g)

    if (group.kind === 'residence') {
      for (let i = 0; i < group.items.length; i += 1) {
        if (i > 0) newPage()
        await drawPlanPage(group.items[i])
      }
      page = null // a plan page is spent; whatever follows starts fresh
    } else {
      for (let i = 0; i < group.items.length; i += 2) {
        await drawTileRow(group.items.slice(i, i + 2))
      }
      y -= 12
    }
  }

  // ======================================================================
  // Closing
  // ======================================================================
  {
    const p = startPage()
    page = p
    let cy = PAGE.h - M - 34

    drawTracked(p, 'Next', { x: M, y: cy, size: 7.4, font: F.medium, color: C.brassInk, tracking: 1.8 })
    cy -= 30
    drawText(p, 'Come and stand in it', { x: M, y: cy, size: 28, font: F.fine, color: C.ink })
    cy -= 14
    p.drawRectangle({ x: M, y: cy, width: CONTENT_W, height: 0.8, color: C.brass, opacity: 0.75 })
    cy -= 30

    cy -= drawParagraph(
      p,
      total > 0
        ? `${name || 'You'} marked ${plural(total, 'space', 'spaces')} on this visit. Bring this sheet to the site and our team will walk you through each one at its own level — the plans against the plate they sit on, the amenity decks as they are being built, and the view from the height you chose.`
        : 'Bring this sheet to the site and our team will walk you through the tower — the plans against the plate they sit on, the amenity decks as they are being built, and the view from the height you choose.',
      { x: M, y: cy, size: 10.5, font: F.light, color: C.ink2, maxWidth: CONTENT_W * 0.86, leading: 16 },
    )
    cy -= 34

    // What they marked, counted back to them — the same figure row the menu
    // box carries under its list.
    if (groups.length) {
      p.drawRectangle({ x: M, y: cy + 26, width: CONTENT_W, height: 0.6, color: C.ink, opacity: 0.14 })
      groups.forEach((g, i) => {
        const x = M + i * (CONTENT_W / 3)
        drawText(p, String(g.items.length).padStart(2, '0'), {
          x,
          y: cy,
          size: 26,
          font: F.fine,
          color: C.ink,
        })
        drawTracked(p, g.title, {
          x,
          y: cy - 14,
          size: 6.4,
          font: F.medium,
          color: C.ink3,
          tracking: 1.5,
        })
      })
      cy -= 46
    }

    const facts = [
      ['Address', 'Runwal Zenith, Balkum, Thane (W) 400608'],
      ['Configuration', '3 BHK and Jodi residences'],
      ['Height', '168 m · 52 storeys'],
      ['Possession', '2029'],
      ['MahaRERA', 'P51700046734'],
    ]
    for (const [k, v] of facts) {
      drawTracked(p, k, { x: M, y: cy, size: 6.6, font: F.medium, color: C.ink3, tracking: 1.5 })
      drawText(p, v, { x: M + 118, y: cy, size: 9.5, font: F.light, color: C.ink })
      cy -= 8
      p.drawRectangle({ x: M, y: cy, width: CONTENT_W * 0.7, height: 0.5, color: C.ink, opacity: 0.1 })
      cy -= 18
    }

    const closingLogo = await imageOrNull(LOGO_URL)
    if (closingLogo) {
      const lw = 70
      p.drawImage(closingLogo, {
        x: M,
        y: FLOOR + 24,
        width: lw,
        height: (lw * closingLogo.height) / closingLogo.width,
      })
    }
    drawText(
      p,
      'Images are artist impressions. Areas stated are RERA carpet as printed on the sanctioned plans.',
      { x: M, y: FLOOR + 4, size: 6.8, font: F.light, color: C.ink3 },
    )
  }

  dressPages()

  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

/** Build the sheet and hand it to the browser's downloader. */
export const downloadPreferenceSheet = async ({ name, saved }) => {
  const blob = await buildPreferenceSheet({ name, saved })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = sheetFilename(name)
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the download a tick to start before the blob goes away.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

import hotspotData3bhk from '../hotspots/hotspotData'
import hotspotData4bhk from '../hotspots/hotspotData4bhk'

/**
 * The isometric "dollhouse" pan renders — one baked image sequence per unit
 * configuration, hover-panned rather than fully orbited (see IsoFrameStage).
 * Frame files live in `public/Frames/<id>/`; `framePrefix` differs per unit
 * because the on-disk render export names weren't normalised.
 */
export const ISO_UNITS = [
  {
    id: '3BHK',
    label: '3 BHK',
    frameCount: 121,
    basePath: '/Frames/3BHK',
    framePrefix: 'ISO_3BHK_',
    padLength: 5,
    extension: '.jpg',
    hotspotData: hotspotData3bhk,
  },
  {
    id: '4BHK',
    label: '4 BHK',
    frameCount: 121,
    basePath: '/Frames/4BHK',
    framePrefix: 'Iso_2_BHK_',
    padLength: 5,
    extension: '.jpg',
    hotspotData: hotspotData4bhk,
  },
]

export const ISO_IMAGE_ASPECT_RATIO = 2036 / 1016

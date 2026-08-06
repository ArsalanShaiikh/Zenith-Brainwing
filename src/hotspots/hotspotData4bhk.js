// Room hotspot positions for the ISO_4BHK interior sequence.
// x/y are fractional (0-1) coordinates within the rendered image's content
// box, sampled at checkpoint frames and linearly interpolated for any frame
// in between (see interpolateHotspot.js).
//
// Exported from the dev-only hotspot tagger (bottom-right "Edit Hotspots"
// button) - paste its exported JSON back in here to refine further.
export default {
  "frameCount": 121,
  "rooms": [
    {
      "id": "bedroom-1",
      "label": "Bedroom 1",
      "panorama": "10-masterbedoom_1",
      "links":[
           {
  "to": "living-dining",
  "yaw": -2.1122478661014856,
  "pitch": -0.04605266685615561
},
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.5104166666666666,
          "y": 0.18619670051017423
        },
        {
          "frame": 40,
          "x": 0.5729166666666666,
          "y": 0.19837352566165461
        },
        {
          "frame": 80,
          "x": 0.6258680555555556,
          "y": 0.22446672241482682
        },
        {
          "frame": 120,
          "x": 0.6675347222222222,
          "y": 0.2627367443194794
        }
      ]
    },
    {
      "id": "bedroom-2",
      "label": "Bedroom 2",
      "panorama": "1-master-bedroom_02",
      "links":[
        {
  "to": "living-dining",
  "yaw": -3.004273488885275,
  "pitch": -0.03382509568440639
},
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.6388888888888888,
          "y": 0.27665311592117126
        },
        {
          "frame": 40,
          "x": 0.6684027777777778,
          "y": 0.3236208700768813
        },
        {
          "frame": 80,
          "x": 0.6953125,
          "y": 0.39146318163512905
        },
        {
          "frame": 120,
          "x": 0.7013888888888888,
          "y": 0.4558264002929539
        }
      ]
    },
    {
      "id": "bedroom-3",
      "label": "Bedroom 3",
      "panorama": "0-kids-room",
      "links":[
        {
  "to": "living-dining",
  "yaw": 2.6361098118247073,
  "pitch": -0.045803636279984516
},
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.7335069444444444,
          "y": 0.39320272808534057
        },
        {
          "frame": 40,
          "x": 0.75,
          "y": 0.47844050414570316
        },
        {
          "frame": 80,
          "x": 0.7447916666666666,
          "y": 0.5271478047516246
        },
        {
          "frame": 120,
          "x": 0.7291666666666666,
          "y": 0.6297810453141021
        }
      ]
    },
    {
      "id": "kitchen",
      "label": "Kitchen",
      "panorama": "7-kitchen",
      "links":[
        {
  "to": "bedroom-2",
  "yaw": 2.2332989565816774,
  "pitch": -0.06428338655268462
},
{
  "to": "bedroom-3",
  "yaw": 1.9594650644179818,
  "pitch": -0.048209574889085616
},
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.4305555555555556,
          "y": 0.32709996297730426
        },
        {
          "frame": 40,
          "x": 0.4652777777777778,
          "y": 0.31666268427603533
        },
        {
          "frame": 80,
          "x": 0.4956597222222222,
          "y": 0.31666268427603533
        },
        {
          "frame": 120,
          "x": 0.5277777777777778,
          "y": 0.30970449847518944
        }
      ]
    },
    {
      "id": "living-dining",
      "label": "Living / Dining",
      "panorama": "8-living_cam_1",
      "links":[
        {
         "to": "balcony",
         "yaw": 0.792310350609295,
         "pitch": 0.08355126513500366
        },
         {
          "to": "bedroom-1",
          "yaw": -0.4799468258213544,
          "pitch": 0.033603102801365026
         },
         {
  "to": "kitchen",
  "yaw": -0.6116401345134541,
  "pitch": 0.045561126160384546
},
{
  "to": "puja-room",
  "yaw": -0.775707902878823,
  "pitch": 0.13755232321231503
},
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.4956597222222222,
          "y": 0.5723760124571232
        },
        {
          "frame": 40,
          "x": 0.46875,
          "y": 0.5880319305090265
        },
        {
          "frame": 80,
          "x": 0.4513888888888889,
          "y": 0.5584596408554313
        },
        {
          "frame": 120,
          "x": 0.4331597222222222,
          "y": 0.542803722803528
        }
      ]
    },
    {
      "id": "balcony",
      "label": "Balcony",
      "panorama": "4-living_balcony",
      "links":[
        {
         "to": "living-dining",
         "yaw": 0.20301941634010134,
         "pitch": 0.29429325836027154
        },
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.5503472222222222,
          "y": 0.7724238542314436
        },
        {
          "frame": 40,
          "x": 0.4973958333333333,
          "y": 0.7550283897293287
        },
        {
          "frame": 80,
          "x": 0.4383680555555556,
          "y": 0.7532888432791173
        },
        {
          "frame": 120,
          "x": 0.3854166666666667,
          "y": 0.7098001820238302
        }
      ]
    },
    {
      "id": "master-bathroom",
      "label": "Master Bathroom",
      "panorama": "2-master-bedroom_bathroom_02",
      "keyframes": []
    },
    {
      "id": "puja-room",
      "label": "Puja Room",
      "panorama": "3-puja_room",
      "links":[
        {
  "to": "living-dining",
  "yaw": -2.747122869220572,
  "pitch": 0.26447353043116983
},
      ],
      "keyframes": []
    },
    {
      "id": "servant-room",
      "label": "Servant Room",
      "panorama": "11-servant_room",
      "keyframes": []
    }
  ]
};

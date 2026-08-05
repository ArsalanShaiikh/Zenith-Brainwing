// Room hotspot positions for the ISO_3BHK interior sequence.
// x/y are fractional (0-1) coordinates within the rendered image's content
// box, sampled at 4 evenly-spaced checkpoint frames (0/40/80/120) and
// linearly interpolated for any frame in between (see interpolateHotspot.js).
//
// These starting coordinates were eyeballed from frames 0/40/80/120 - open
// the dev-only hotspot tagger (bottom-right "Edit Hotspots" button) to
// refine them precisely, then paste its exported JSON back in here.
export default {
  "frameCount": 121,
  "rooms": [
    {
      "id": "bedroom-1",
      "label": "Bedroom 1",
      "panorama": "3-master-bedroom",
      "links":[
        {
  "to": "living-dining",
  "yaw": -1.3488343860111804,
  "pitch": -0.06537270304036014
},
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.3402777777777778,
          "y": 0.2262062688650383
        },
        {
          "frame": 40,
          "x": 0.3888888888888889,
          "y": 0.1896757934105972
        },
        {
          "frame": 80,
          "x": 0.4461805555555556,
          "y": 0.16184305020721348
        },
        {
          "frame": 120,
          "x": 0.5234375,
          "y": 0.160103503757002
        }
      ]
    },
    {
      "id": "bedroom-2",
      "label": "Bedroom 2",
      "panorama": "6-guest-room",
      "links":[
        {
         "to": "living-dining",
         "yaw": -1.8091652217411607,
         "pitch": -0.021671621535070074
        },
      ],

      "keyframes": [
        {
          "frame": 0,
          "x": 0.234375,
          "y": 0.3584117990811109
        },
        {
          "frame": 40,
          "x": 0.2612847222222222,
          "y": 0.301006766224132
        },
        {
          "frame": 80,
          "x": 0.3133680555555556,
          "y": 0.23316445466588423
        },
        {
          "frame": 120,
          "x": 0.3802083333333333,
          "y": 0.18619670051017423
        }
      ]
    },
    {
      "id": "kitchen",
      "label": "Kitchen",
      "panorama": "2-kitchen",
      "links":[
        {
          "to": "living-dining",
          "yaw": -1.5421696144879782,
          "pitch": 0.1851256294489989
        },
        {
          "to": "utility",
          "yaw": 1.554290131983005,
          "pitch": 0.050639685827810865
        },
        {
          "to": "foyer",
          "yaw": 0.13753207395076927,
          "pitch": 0.2524570606832022
        },
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.5755208333333334,
          "y": 0.20359216501228905
        },
        {
          "frame": 40,
          "x": 0.6041666666666666,
          "y": 0.2383830940165187
        },
        {
          "frame": 80,
          "x": 0.6458333333333334,
          "y": 0.2749135694709598
        },
        {
          "frame": 120,
          "x": 0.6866319444444444,
          "y": 0.33927678812878465
        }
      ]
    },
    {
      "id": "living-dining",
      "label": "Living / Dining",
      "panorama": "8-living-room",
      "links": [
        {
          "to": "balcony",
          "yaw": 0.258933816298887,
          "pitch": 0.03530313999602441
        },
        {
          "to": "bedroom-1",
          "yaw": -0.832909152819596,
          "pitch": -0.06984890264089572
        },
        {
           "to": "bedroom-2",
           "yaw": -0.675625887421285,
           "pitch": -0.05925398621939948
        },
        {
          "to": "foyer",
          "yaw": 1.7094620138788352,
          "pitch": 0.24146911101283308
        },
        {
          "to": "powder-bathroom",
          "yaw": -1.7393913149759506,
          "pitch": -0.1241011589237413
       },
       {
          "to": "kitchen",
          "yaw": -2.944312147490244,
          "pitch": 0.5215043892469566
       },
      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.5147569444444444,
          "y": 0.5706364660069116
        },
        {
          "frame": 40,
          "x": 0.5,
          "y": 0.5619387337558542
        },
        {
          "frame": 80,
          "x": 0.4947916666666667,
          "y": 0.5741155589073347
        },
        {
          "frame": 120,
          "x": 0.4774305555555556,
          "y": 0.5549805479550084
        }
      ]
    },
    {
      "id": "balcony",
      "label": "Balcony",
      "panorama": "1-balcony",
      "links": [
        {
          "to": "living-dining",
          "yaw": 0.25759773592720947,
          "pitch": 0.2901062482648946
      },
        {
          "to": "foyer",
          "yaw": -0.37987615072326797,
          "pitch": 0.1097719109468116
        },

      ],
      "keyframes": [
        {
          "frame": 0,
          "x": 0.4340277777777778,
          "y": 0.7498097503786942
        },
        {
          "frame": 40,
          "x": 0.4053819444444444,
          "y": 0.7445911110280599
        },
        {
          "frame": 80,
          "x": 0.375,
          "y": 0.7011024497727728
        },
        {
          "frame": 120,
          "x": 0.3454861111111111,
          "y": 0.6315205917643135
        }
      ]
    },
   
    {
      "id": "powder-bathroom",
      "label": "Powder Bathroom",
      "panorama": "4-powder-bathroom",
      "links":[
       {
        "to": "living-dining",
        "yaw": 2.5127006951735265,
        "pitch": 0.11604515053107534
       },
      ],
      "keyframes": []
    },
    {
      "id": "foyer",
      "label": "Foyer",
      "panorama": "5-foyar",
      "links":[
        {
          "to": "kitchen",
          "yaw": -2.470813061252027,
          "pitch": 0.17249710211643254
       },
       {
          "to": "utility",
          "yaw": 2.074999954808985,
          "pitch": 0.0698138108076094
       },
       {
        "to": "living-dining",
        "yaw": -0.03139955488479451,
        "pitch": 0.30640799526454465
       },
      ],
      "keyframes": []
    },
    {
      "id": "utility",
      "label": "Utility",
      "panorama": "9-uility",
      "links":[
        {
          "to": "kitchen",
          "yaw": -2.9015179879810447,
          "pitch": 0.06686808633967978
        },
      ],
      "keyframes": []


    }
  ]
};

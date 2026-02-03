
export const config = {
  "layout": {
    "maxWidthHome": "max-w-4xl",
    "maxWidthCombat": "max-w-6xl",
    "maxWidthTest": "max-w-[1440px]",
    "paddingMobile": "p-3",
    "paddingPC": "md:p-8"
  },
  "combat": {
    "status": {
      "widthMobile": "w-[85%]",
      "widthPC": "md:w-[60%]",
      "maxWidth": "max-w-[800px]"
    },
    "uiScale": {
      "baseWidth": 1000,
      "maxScale": 1
    },
    "projectiles": {
      "bottomPosition": "12%",
      "testBottomPosition": "52%",
      "sizeMobile": "w-12 h-12",
      "sizePC": "md:w-16 md:h-16"
    },
    "spacing": {
      "meleeDistancePC": 576,
      "meleeDistanceMobile": 420,
      "baseActionOffsetPC": 96,
      "baseActionOffsetMobile": 64,
      "containerWidthPC": 1000,
      "containerWidthMobile": 800,
      "containerHeightPC": 450,
      "containerHeightMobile": 380,
      "sidePaddingPC": 48,
      "sidePaddingMobile": 16,
      "groundHeightPC": 288,
      "groundHeightMobile": 240,
      "vsTextTopPC": "22%",
      "vsTextTopMobile": "18%"
    }
  },
  "visuals": {
    "character": {
      "baseScale": 1.7,
      "containerWidth": 270,
      "containerHeight": 310,
      "mobileWidth": "w-48",
      "mobileHeight": "h-56",
      "pcWidth": "w-56",
      "pcHeight": "h-64"
    }
  }
};

export default config;

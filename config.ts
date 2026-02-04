
export type OffsetType = 'HOME' | 'BASE' | 'MELEE';

export interface AttackStep {
  state: string;
  frame: number;
  offset: OffsetType;
  offsetY?: number;
  moveDuration: number;
  delay: number;
  playSfx?: boolean;
  calculateHit?: boolean;
  shaking?: 'SCREEN' | 'P' | 'N' | null;
  projectile?: boolean; // 特殊标记：是否在该帧发射飞行物
}

export interface AttackModuleConfig {
  repeat?: number;
  steps: AttackStep[];
}

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
      "vsTextTopMobile": "18%",
      "projectileBottomPC": "12%",
      "projectileBottomMobile": "18%",
      "testProjectileBottomPC": "52%",
      "testProjectileBottomMobile": "48%"
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
  },
  // 动作模组配置化定义
  "ATTACK_SEQUENCES": {
    "CLEAVE": {
      "steps": [
        { "state": "CLEAVE", "frame": 1, "offset": "BASE", "offsetY": -60, "moveDuration": 120, "delay": 120, "playSfx": true },
        { "state": "CLEAVE", "frame": 2, "offset": "MELEE", "offsetY": -260, "moveDuration": 300, "delay": 300, "playSfx": true },
        { "state": "CLEAVE", "frame": 3, "offset": "MELEE", "offsetY": 0, "moveDuration": 80, "delay": 80 },
        { "state": "CLEAVE", "frame": 3, "offset": "MELEE", "offsetY": 0, "moveDuration": 0, "delay": 600, "calculateHit": true, "shaking": "SCREEN" }
      ]
    },
    "SLASH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 300, "delay": 300 },
        { "state": "SLASH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 110 },
        { "state": "SLASH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 110, "playSfx": true, "calculateHit": true },
        { "state": "SLASH", "frame": 3, "offset": "MELEE", "moveDuration": 0, "delay": 110 }
      ]
    },
    "PIERCE": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 250, "delay": 250 },
        { "state": "PIERCE", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 100 },
        { "state": "PIERCE", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 100, "playSfx": true, "calculateHit": true },
        { "state": "PIERCE", "frame": 3, "offset": "MELEE", "moveDuration": 0, "delay": 100 },
        { "state": "PIERCE", "frame": 4, "offset": "MELEE", "moveDuration": 0, "delay": 100 }
      ]
    },
    "SWING": {
      "steps": [
        { "state": "SWING", "frame": 1, "offset": "BASE", "moveDuration": 200, "delay": 200, "playSfx": true },
        { "state": "SWING", "frame": 2, "offset": "BASE", "moveDuration": 0, "delay": 200 },
        { "state": "SWING", "frame": 3, "offset": "BASE", "moveDuration": 0, "delay": 200 },
        { "state": "SWING", "frame": 4, "offset": "MELEE", "moveDuration": 80, "delay": 80, "playSfx": true },
        { "state": "SWING", "frame": 4, "offset": "MELEE", "moveDuration": 0, "delay": 400, "calculateHit": true, "shaking": "SCREEN" }
      ]
    },
    "PUNCH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 250, "delay": 250 },
        { "state": "PUNCH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 150, "playSfx": true },
        { "state": "PUNCH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 150, "calculateHit": true }
      ]
    },
    "THROW": {
      "repeat": 2,
      "steps": [
        { "state": "THROW", "frame": 1, "offset": "HOME", "moveDuration": 0, "delay": 120, "playSfx": true },
        { "state": "THROW", "frame": 2, "offset": "HOME", "moveDuration": 0, "delay": 120, "projectile": true },
        { "state": "THROW", "frame": 3, "offset": "HOME", "moveDuration": 0, "delay": 120 }
      ]
    }
  } as Record<string, AttackModuleConfig>
};

export default config;

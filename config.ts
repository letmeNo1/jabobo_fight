
/** 
 * 角色位移目标类型定义
 * HOME: 初始位置
 * BASE: 动作前摇微调位置（百分比）
 * MELEE: 近战冲刺目标位置（百分比）
 */
export type OffsetType = 'HOME' | 'BASE' | 'MELEE';

/** 
 * 单个动作帧的详细配置步骤
 */
export interface AttackStep {
  state: string;          // 动画状态名（如 IDLE, SLASH）
  frame: number;          // 对应美术资源的帧序号
  offset: OffsetType;     // 位移目标类型
  offsetY?: number;       // 纵向位移（占容器高度的百分比，向上为负）
  moveDuration: number;   // 补间动画持续时间 (ms)
  delay: number;          // 该帧停留时间 (ms)
  playSfx?: boolean;      // 是否在本帧播放音效
  calculateHit?: boolean; // 是否在本帧触发伤害结算
  shaking?: 'SCREEN' | 'P' | 'N' | null; // 震动效果类型
  projectile?: boolean;   // 是否在本帧发射飞行道具
}

/** 
 * 动作模组的整体配置
 */
export interface AttackModuleConfig {
  repeat?: number; // 动作重复次数
  steps: AttackStep[]; // 动作序列帧
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
      "meleeDistancePctPC": 55.0,
      "meleeDistancePctMobile": 50.0,
      "baseActionOffsetPctPC": 8.0,
      "baseActionOffsetPctMobile": 6.0,
      "sidePaddingPctPC": 15.0,
      "sidePaddingPctMobile": 10.0,
      "groundHeightPctPC": 64.0,
      "groundHeightPctMobile": 63.0,
      "vsTextTopPC": "22%",
      "vsTextTopMobile": "18%",
      "projectileBottomPC": "15%",
      "projectileBottomMobile": "20%",
      "testProjectileBottomPC": "50%",
      "testProjectileBottomMobile": "45%"
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
  "ATTACK_SEQUENCES": {
    "CLEAVE": {
      "steps": [
        { "state": "CLEAVE", "frame": 1, "offset": "BASE", "offsetY": -5, "moveDuration": 100, "delay": 150, "playSfx": true },
        { "state": "CLEAVE", "frame": 2, "offset": "MELEE", "offsetY": -20, "moveDuration": 200, "delay": 250 },
        { "state": "CLEAVE", "frame": 3, "offset": "MELEE", "offsetY": 0, "moveDuration": 70, "delay": 500, "calculateHit": true, "shaking": "SCREEN" }
      ]
    },
    "SLASH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 250, "delay": 250 },
        { "state": "SLASH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 80,"playSfx": true},
        { "state": "SLASH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 120, "calculateHit": true },
        { "state": "SLASH", "frame": 3, "offset": "MELEE", "moveDuration": 0, "delay": 80 }
      ]
    },
    "PIERCE": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 220, "delay": 220 },
        { "state": "PIERCE", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 80 },
        { "state": "PIERCE", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 100, "playSfx": true, "calculateHit": true },
        { "state": "PIERCE", "frame": 4, "offset": "MELEE", "moveDuration": 0, "delay": 100 }
      ]
    },
    "SWING": {
      "steps": [
        { "state": "SWING", "frame": 1, "offset": "BASE", "moveDuration": 150, "delay": 150, "playSfx": true },
        { "state": "SWING", "frame": 2, "offset": "BASE", "moveDuration": 0, "delay": 150 },
        { "state": "SWING", "frame": 4, "offset": "MELEE", "moveDuration": 100, "delay": 400, "playSfx": true, "calculateHit": true, "shaking": "SCREEN" }
      ]
    },
    "PUNCH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 200, "delay": 200 },
        { "state": "PUNCH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 120, "playSfx": true },
        { "state": "PUNCH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 150, "calculateHit": true }
      ]
    },
    "KICK": {
      "steps": [
        { "state": "KICK", "frame": 1, "offset": "HOME", "offsetY": 0, "moveDuration": 0, "delay": 200, "playSfx": true },
        { "state": "KICK", "frame": 2, "offset": "MELEE", "offsetY": 0, "moveDuration": 0, "delay": 150, "playSfx": true, "calculateHit": true },
        { "state": "KICK", "frame": 3, "offset": "HOME", "offsetY": 0, "moveDuration": 0, "delay": 2000 },
        { "state": "KICK", "frame": 2, "offset": "HOME", "offsetY": 0, "moveDuration": 0, "delay": 200, "calculateHit": true, "shaking": null }
      ]
    },
    "THROW": {
      "repeat": 1, 
      "steps": [
        { "state": "THROW", "frame": 1, "offset": "HOME", "moveDuration": 0, "delay": 100, "playSfx": true },
        { "state": "THROW", "frame": 2, "offset": "HOME", "moveDuration": 0, "delay": 100, "projectile": true },
        { "state": "THROW", "frame": 3, "offset": "HOME", "moveDuration": 0, "delay": 100 },
        { "state": "THROW", "frame": 4, "offset": "HOME", "moveDuration": 0, "delay": 100, "calculateHit": true }
      ]
    }
  } as Record<string, AttackModuleConfig>
};

export default config;

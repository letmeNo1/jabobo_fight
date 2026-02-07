
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
      /** 
       * 核心间距配置（均为相对于容器宽/高的百分比 0-100）
       */
      "meleeDistancePctPC": 55.0,     // PC端：攻击方冲向对方的水平距离(%)
      "meleeDistancePctMobile": 50.0, // 移动端：攻击方冲向对方的水平距离(%)
      "baseActionOffsetPctPC": 8.0,   // PC端：蓄力/小跳步的水平位移(%)
      "baseActionOffsetPctMobile": 6.0, // 移动端：蓄力/小跳步的水平位移(%)
      
      "sidePaddingPctPC": 15.0,       // 角色初始离边缘的水平距离(%)
      "sidePaddingPctMobile": 10.0,   // 角色初始离边缘的水平距离(%)
      
      "groundHeightPctPC": 64.0,      // 地面所在的高度位置(%)
      "groundHeightPctMobile": 63.0,
      
      "vsTextTopPC": "22%",
      "vsTextTopMobile": "18%",
      
      "projectileBottomPC": "15%",    // 飞行道具轨道高度(%)
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
  /**
   * 动作序列百分比配置实例
   */
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
        { "state": "SLASH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 80 },
        { "state": "SLASH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 120, "playSfx": true, "calculateHit": true },
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

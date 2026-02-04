
/** 
 * 角色位移目标类型定义
 * HOME: 初始站位点
 * BASE: 攻击前摇时的微小位移点
 * MELEE: 冲刺到对手面前的攻击点
 */
export type OffsetType = 'HOME' | 'BASE' | 'MELEE';

/** 
 * 单个动作帧的详细配置步骤
 */
export interface AttackStep {
  state: string;          // 动画状态名称 (对应 CharacterVisual 中的 VisualState)
  frame: number;          // 该状态下的具体帧号 (1-based)
  offset: OffsetType;     // 该步骤角色应处于的水平位移目标
  offsetY?: number;       // 该步骤角色的垂直偏移量 (px)，正值为下，负值为上
  moveDuration: number;   // 移动到目标位移所需的过渡时间 (ms)
  delay: number;          // 在该帧停留的时间/总执行时间 (ms)
  playSfx?: boolean;      // 是否在该帧触发音效播放
  calculateHit?: boolean; // 是否在该帧触发伤害数值结算
  shaking?: 'SCREEN' | 'P' | 'N' | null; // 触发何种震动效果 (全屏/攻击者/受击者)
  projectile?: boolean;   // 是否在该帧发射飞行物 (仅对 THROW 类型有效)
}

/** 
 * 动作模组的整体配置
 */
export interface AttackModuleConfig {
  repeat?: number; // 整个动作序列重复执行的次数 (如暗器连发)
  steps: AttackStep[]; // 构成该动作的步骤数组
}

export const config = {
  /** 页面布局相关配置 */
  "layout": {
    "maxWidthHome": "max-w-4xl",       // 主页内容区最大宽度
    "maxWidthCombat": "max-w-6xl",     // 战斗场景最大宽度
    "maxWidthTest": "max-w-[1440px]",  // 实验室界面最大宽度
    "paddingMobile": "p-3",            // 移动端边距
    "paddingPC": "md:p-8"              // PC端边距
  },

  /** 战斗系统核心参数 */
  "combat": {
    "status": {
      "widthMobile": "w-[85%]",        // 移动端顶部状态栏宽度
      "widthPC": "md:w-[60%]",         // PC端顶部状态栏宽度
      "maxWidth": "max-w-[800px]"      // 状态栏物理最大宽度限制
    },
    "uiScale": {
      "baseWidth": 1000,               // 自动缩放的基准宽度 (根据此宽度计算 scale 比例)
      "maxScale": 1                    // 允许的最大缩放倍率
    },
    "projectiles": {
      "sizeMobile": "w-12 h-12",       // 移动端飞行物大小
      "sizePC": "md:w-16 md:h-16"      // PC端飞行物大小
    },
    "spacing": {
      "meleeDistancePC": 576,          // PC端近战位移距离 (px)
      "meleeDistanceMobile": 420,      // 移动端近战位移距离 (px)
      "baseActionOffsetPC": 96,        // PC端攻击前摇微移距离 (px)
      "baseActionOffsetMobile": 64,    // 移动端攻击前摇微移距离 (px)
      "containerWidthPC": 1000,        // PC端战斗容器逻辑宽度 (px)
      "containerWidthMobile": 800,     // 移动端战斗容器逻辑宽度 (px)
      "containerHeightPC": 450,        // PC端战斗容器逻辑高度 (px)
      "containerHeightMobile": 380,    // 移动端战斗容器逻辑高度 (px)
      "sidePaddingPC": 48,             // PC端初始位置边距 (px)
      "sidePaddingMobile": 16,         // 移动端初始位置边距 (px)
      "groundHeightPC": 288,           // PC端地面层高度参考 (px)
      "groundHeightMobile": 240,       // 移动端地面层高度参考 (px)
      "vsTextTopPC": "22%",            // 背景 VS 文字位置 (PC)
      "vsTextTopMobile": "18%",        // 背景 VS 文字位置 (移动端)
      "projectileBottomPC": "12%",     // 飞行物飞行高度 (战斗中)
      "projectileBottomMobile": "18%", // 飞行物飞行高度 (移动端战斗中)
      "testProjectileBottomPC": "52%", // 实验室飞行物高度 (PC)
      "testProjectileBottomMobile": "48%" // 实验室飞行物高度 (移动端)
    }
  },

  /** 角色视觉表现配置 */
  "visuals": {
    "character": {
      "baseScale": 1.7,                // 角色图像基础缩放倍率
      "containerWidth": 270,           // 角色组件容器宽度 (px)
      "containerHeight": 310,          // 角色组件容器高度 (px)
      "mobileWidth": "w-48",           // 移动端角色占位宽度
      "mobileHeight": "h-56",          // 移动端角色占位高度
      "pcWidth": "w-56",               // PC端角色占位宽度
      "pcHeight": "h-64"               // PC端角色占位高度
    }
  },

  /** 
   * 动作模组序列配置
   * 定义了不同攻击模组（如重砸、横切、突刺等）的执行逻辑
   */
  "ATTACK_SEQUENCES": {
    // 砸地模组：重劈
    "CLEAVE": {
      "steps": [
        { "state": "CLEAVE", "frame": 1, "offset": "BASE", "offsetY": -60, "moveDuration": 120, "delay": 120, "playSfx": true },
        { "state": "CLEAVE", "frame": 2, "offset": "MELEE", "offsetY": -260, "moveDuration": 300, "delay": 300, "playSfx": true },
        { "state": "CLEAVE", "frame": 3, "offset": "MELEE", "offsetY": 0, "moveDuration": 80, "delay": 80 },
        { "state": "CLEAVE", "frame": 3, "offset": "MELEE", "offsetY": 0, "moveDuration": 0, "delay": 600, "calculateHit": true, "shaking": "SCREEN" }
      ]
    },
    // 横斩模组：标准近战
    "SLASH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 300, "delay": 300 },
        { "state": "SLASH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 110 },
        { "state": "SLASH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 110, "playSfx": true, "calculateHit": true },
        { "state": "SLASH", "frame": 3, "offset": "MELEE", "moveDuration": 0, "delay": 110 }
      ]
    },
    // 突刺模组：枪类武器
    "PIERCE": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 250, "delay": 250 },
        { "state": "PIERCE", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 100 },
        { "state": "PIERCE", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 100, "playSfx": true, "calculateHit": true },
        { "state": "PIERCE", "frame": 3, "offset": "MELEE", "moveDuration": 0, "delay": 100 },
        { "state": "PIERCE", "frame": 4, "offset": "MELEE", "moveDuration": 0, "delay": 100 }
      ]
    },
    // 挥动模组：棍棒类
    "SWING": {
      "steps": [
        { "state": "SWING", "frame": 1, "offset": "BASE", "moveDuration": 200, "delay": 200, "playSfx": true },
        { "state": "SWING", "frame": 2, "offset": "BASE", "moveDuration": 0, "delay": 200 },
        { "state": "SWING", "frame": 3, "offset": "BASE", "moveDuration": 0, "delay": 200 },
        { "state": "SWING", "frame": 4, "offset": "MELEE", "moveDuration": 80, "delay": 80, "playSfx": true },
        { "state": "SWING", "frame": 4, "offset": "MELEE", "moveDuration": 0, "delay": 400, "calculateHit": true, "shaking": "SCREEN" }
      ]
    },
    // 肉搏模组：空手或拳法
    "PUNCH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 250, "delay": 250 },
        { "state": "PUNCH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 150, "playSfx": true },
        { "state": "PUNCH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 150, "calculateHit": true }
      ]
    },
    // 投掷模组：暗器类
    "THROW": {
      "repeat": 2, // 默认执行两轮投掷循环
      "steps": [
        { "state": "THROW", "frame": 1, "offset": "HOME", "moveDuration": 0, "delay": 120, "playSfx": true },
        { "state": "THROW", "frame": 2, "offset": "HOME", "moveDuration": 0, "delay": 120, "projectile": true },
        { "state": "THROW", "frame": 3, "offset": "HOME", "moveDuration": 0, "delay": 120 }
      ]
    }
  } as Record<string, AttackModuleConfig>
};

export default config;

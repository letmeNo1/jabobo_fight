
/** 
 * 角色位移目标类型定义
 * HOME: 初始位置
 * BASE: 准备攻击的微调位置
 * MELEE: 近战贴脸位置
 */
export type OffsetType = 'HOME' | 'BASE' | 'MELEE';

/** 
 * 单个动作帧的详细配置步骤
 */
export interface AttackStep {
  state: string;          // 对应 VisualState 动画状态
  frame: number;          // 动画帧索引
  offset: OffsetType;     // 位移目标类型
  offsetY?: number;       // Y轴偏移（如跳跃攻击）
  moveDuration: number;   // 移动到该位置所需的毫秒数
  delay: number;          // 在该帧停留的毫秒数
  playSfx?: boolean;      // 是否播放该动作绑定的音效
  calculateHit?: boolean; // 是否在该帧判定伤害命中
  shaking?: 'SCREEN' | 'P' | 'N' | null; // 是否触发震屏或角色震动
  projectile?: boolean;   // 是否在该帧发射飞行道具/特效
}

/** 
 * 动作模组的整体配置
 */
export interface AttackModuleConfig {
  repeat?: number; // 动作序列重复次数（如连掷）
  steps: AttackStep[]; // 详细的动作帧步骤列表
}

export const config = {
  /** 
   * 页面基础布局配置 (Tailwind 类名)
   */
  "layout": {
    "maxWidthHome": "max-w-4xl",    // 主页最大宽度
    "maxWidthCombat": "max-w-6xl",  // 战斗界面最大宽度
    "maxWidthTest": "max-w-[1440px]", // 演武室最大宽度
    "paddingMobile": "p-2",         // 移动端边距
    "paddingPC": "md:p-8"           // PC端边距
  },

  /** 
   * 战斗场景核心参数 (坐标与逻辑)
   */
  "combat": {
    "status": {
      "widthMobile": "w-[94%]",     // 手机端血条状态栏宽度百分比
      "widthPC": "md:w-[60%]",      // PC端宽度百分比
      "maxWidth": "max-w-[800px]"   // 最大物理宽度
    },
    "uiScale": {
      "baseWidth": 1000,            // UI 缩放基准逻辑宽度
      "maxScale": 1                 // 最大缩放限制
    },
    "projectiles": {
      "sizeMobile": "w-10 h-10",    // 手机端飞行道具大小
      "sizePC": "md:w-16 md:h-16"   // PC端飞行道具大小
    },
    "spacing": {
      "meleeDistancePct": 38,       // 近战攻击时角色冲刺覆盖的屏幕百分比宽度
      "baseActionOffsetPct": 6,    // 攻击前摇时的微小前移百分比
      
      "containerWidthPC": 1000,     // PC端逻辑计算容器宽度
      "containerWidthMobile": 600,  // 移动端逻辑计算容器宽度
      "containerHeightPC": 450,     // PC端逻辑高度
      "containerHeightMobile": 500, // 移动端逻辑高度（适配竖屏）
      
      "sidePaddingPctPC": 6.0,      // PC端角色初始距离边缘百分比
      "sidePaddingPctMobile": 4.0,  // 移动端角色初始距离边缘百分比（适当增加防止偏右感）
      
      "groundHeightPctPC": 64.0,    // PC端舞台（地面）层占据屏幕高度百分比
      "groundHeightPctMobile": 70.0,// 移动端舞台高度占比
      
      "vsTextTopPC": "22%",         // 背景 VS 字样位置 (PC)
      "vsTextTopMobile": "28%",     // 背景 VS 字样位置 (移动)
      
      "projectileBottomPC": "12%",        // 战斗中飞行物轨迹底部高度
      "projectileBottomMobile": "26%",    // 移动端战斗飞行物轨迹底部高度
      "testProjectileBottomPC": "52%",    // 实验室飞行物高度
      "testProjectileBottomMobile": "50%" // 移动端实验室飞行物高度
    }
  },

  /** 
   * 角色视觉渲染参数
   */
  "visuals": {
    "character": {
      "baseScale": 1.7,             // 全局基础缩放
      
      /* --- 角色大小调节 (核心参数) --- */
      "combatScalePC": 1.8,         // PC端战斗中角色体型（调整此值改变PC战斗角色大小）
      "combatScaleMobile": 1.45,    // 手机端战斗中角色体型（调整此值改变手机战斗角色大小）
      "homeScale": 1.5,             // 个人主页/演武室展示时的缩放比例
      
      /* --- 容器物理空间 (解决溢出导致的偏右问题) --- */
      "containerWidthPC": 270,      // PC端渲染容器宽度
      "containerWidthMobile": 180,  // 移动端渲染容器宽度（减小宽度防止在窄屏手机上两个角色重叠或溢出）
      "containerHeightPC": 310,     // PC端渲染容器高度
      "containerHeightMobile": 240, // 移动端渲染容器高度
      
      /* --- 基础图片占用尺寸 (Tailwind 比例) --- */
      "mobileWidth": "w-36",        // 移动端角色容器内部图片宽
      "mobileHeight": "h-44",       // 移动端角色容器内部图片高
      "pcWidth": "w-56",            // PC端角色容器内部图片宽
      "pcHeight": "h-64"            // PC端角色容器内部图片高
    }
  },

  /** 
   * 动作序列配置 (基于模组名称)
   */
  "ATTACK_SEQUENCES": {
    "CLEAVE": { 
      "steps": [
        { "state": "CLEAVE", "frame": 1, "offset": "BASE", "offsetY": -40, "moveDuration": 100, "delay": 150, "playSfx": true },
        { "state": "CLEAVE", "frame": 2, "offset": "MELEE", "offsetY": -180, "moveDuration": 200, "delay": 250 },
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
      "repeat": 2, 
      "steps": [
        { "state": "THROW", "frame": 1, "offset": "HOME", "moveDuration": 0, "delay": 100, "playSfx": true },
        { "state": "THROW", "frame": 2, "offset": "HOME", "moveDuration": 0, "delay": 100, "projectile": true },
        { "state": "THROW", "frame": 3, "offset": "HOME", "moveDuration": 0, "delay": 100, "calculateHit": true }
      ]
    }
  } as Record<string, AttackModuleConfig>
};

export default config;

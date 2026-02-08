// config.ts 完整代码（含新增可选配置）
/** 
 * 角色位移目标类型定义
 * - HOME: 初始站位（战斗开始时的默认位置）
 * - BASE: 动作前摇微调位置（基于基础偏移百分比）
 * - MELEE: 近战冲刺目标位置（贴近对手的近战攻击位置）
 */
export type OffsetType = 'HOME' | 'BASE' | 'MELEE';

/** 
 * 单个动作帧的详细配置步骤
 * 每个动作由多个步骤组成，每个步骤对应一帧动画和相关行为
 */
export interface AttackStep {
  state: string;          // 动画状态名（与CharacterVisual组件的state对应，如 IDLE, SLASH, SPIKE）
  frame: number;          // 对应美术资源的帧序号（从1开始计数）
  offset: OffsetType;     // 位移目标类型（支持拼接偏移值，如 "MELEE+250" 表示近战位置额外偏移250px）
  offsetY?: number;       // 纵向位移（占容器高度的百分比，向上为负，向下为正，控制角色跳升/下沉）
  moveDuration: number;   // 位移补间动画持续时间 (ms)，0表示无动画瞬间位移
  delay: number;          // 该帧停留时间 (ms)，控制动画播放速度
  playSfx?: boolean;      // 是否在本帧播放音效（true=播放对应动作的音效）
  calculateHit?: boolean; // 是否在本帧触发伤害结算（true=该帧计算命中/闪避/伤害）
  shaking?: 'SCREEN' | 'P' | 'N' | null; // 震动效果类型：SCREEN=全屏震，P=玩家震，N=对手震，null=无震动
  projectile?: boolean;   // 是否在本帧发射飞行道具（仅THROW动作生效）
}

/** 
 * 动作模组的整体配置
 * 定义单个攻击动作的完整序列规则
 */
export interface AttackModuleConfig {
  repeat?: number; // 动作重复次数（默认1次，大于1则循环播放动作序列）
  steps: AttackStep[]; // 动作序列帧数组（按顺序执行每个步骤）
}

/**
 * 全局战斗配置对象
 * 包含布局、战斗参数、视觉样式、动作序列等所有战斗相关配置
 */
export const config = {
  /** 页面布局基础配置 */
  "layout": {
    "maxWidthHome": "max-w-4xl",       // 主页最大宽度（Tailwind类，适配PC端）
    "maxWidthCombat": "max-w-6xl",     // 战斗页面最大宽度（Tailwind类）
    "maxWidthTest": "max-w-[1440px]",  // 测试页面最大宽度（固定像素值）
    "paddingMobile": "p-3",            // 移动端通用内边距（Tailwind类）
    "paddingPC": "md:p-8"              // PC端通用内边距（Tailwind响应式类）
  },

  /** 战斗核心参数配置 */
  "combat": {
    /** 战斗状态面板（血条/状态栏）配置 */
    "status": {
      "widthMobile": "w-[35%]",    // 移动端状态面板宽度（百分比）
      "widthPC": "md:w-[60%]",     // PC端状态面板宽度（Tailwind响应式类）
      "maxWidth": "max-w-[800px]"  // 状态面板最大宽度（防止过宽）
    },

    /** UI缩放配置 */
    "uiScale": {
      "baseWidth": 1000,  // UI缩放基准宽度（超过该宽度不再放大）
      "maxScale": 1       // 最大缩放比例（1=100%，不超过原尺寸）
    },

    /** 飞行道具（投射物）配置 */
    "projectiles": {
      "sizeMobile": "w-12 h-12", // 移动端投射物尺寸（Tailwind类）
      "sizePC": "md:w-16 md:h-16"// PC端投射物尺寸（Tailwind响应式类）
    },

    /** 战斗间距/位置百分比配置（核心！控制角色/元素的位置） */
    "spacing": {
      "meleeDistancePctPC": 65.0,        // PC端近战攻击距离（角色到对手的水平百分比）
      "meleeDistancePctMobile": 50.0,    // 移动端近战攻击距离（水平百分比，数值越小距离越近）
      "baseActionOffsetPctPC": 8.0,      // PC端基础动作偏移（前摇微调的水平百分比）
      "baseActionOffsetPctMobile": 6.0,  // 移动端基础动作偏移
      "sidePaddingPctPC": 15.0,          // PC端角色容器左右内边距（百分比，控制角色离屏幕边缘的距离）
      "sidePaddingPctMobile": 10.0,      // 移动端角色容器左右内边距
      "groundHeightPctPC": 64.0,         // PC端角色离地高度（百分比，数值越大离地越近/贴地）
      "groundHeightPctMobile": 23.0,     // 移动端角色离地高度（百分比，数值越小离地越高）
      "vsTextTopPC": "22%",              // PC端VS文字顶部位置（百分比）
      "vsTextTopMobile": "18%",          // 移动端VS文字顶部位置
      "projectileBottomPC": "32%",       // PC端投射物底部位置（百分比，控制投射物发射高度）
      "projectileBottomMobile": "20%",   // 移动端投射物底部位置
      "testProjectileBottomPC": "50%",   // 测试模式下PC端投射物底部位置
      "testProjectileBottomMobile": "45%",// 测试模式下移动端投射物底部位置
      // 新增：角色初始间距可选配置（核心！控制玩家/NPC初始位置，避免重合）
      "playerLeftOffsetPctPC": 10.0,     // PC端玩家左侧偏移（可选配置，默认10%）
      "playerLeftOffsetPctMobile": 8.0,  // 移动端玩家左侧偏移（可选配置）
      "npcRightOffsetPctPC": 10.0,       // PC端NPC右侧偏移（可选配置）
      "npcRightOffsetPctMobile": 8.0     // 移动端NPC右侧偏移（可选配置）
    }
  },

  /** 角色视觉样式配置 */
  "visuals": {
    "character": {
      "baseScale": 1.7,             // 角色基础缩放比例（1=100%，1.7=放大70%）
      "containerWidth": 270,        // PC端角色容器宽度（固定像素，备用）
      "containerHeight": 310,       // PC端角色容器高度（固定像素，备用）
      "mobileWidth": "70%",         // 移动端角色宽度（百分比，相对于父容器）
      "mobileHeight": "70%",        // 移动端角色高度（百分比，相对于父容器）
      "pcWidth": "70%",             // PC端角色宽度（百分比，可选替代固定像素）
      "pcHeight": "85%"             // PC端角色高度（百分比，可选替代固定像素）
    }
  },

  /**
   * 攻击动作序列配置（核心战斗动画）
   * 每个键对应一个动作模组ID，值为该动作的完整序列规则
   */
  "ATTACK_SEQUENCES": {
    /** 劈砍动作（CLEAVE）- 大范围横劈，带全屏震动 */
    "CLEAVE": {
      "steps": [
        { "state": "CLEAVE", "frame": 1, "offset": "BASE", "offsetY": -5, "moveDuration": 100, "delay": 150, "playSfx": true }, // 前摇：小幅上移，播放音效
        { "state": "CLEAVE", "frame": 2, "offset": "MELEE", "offsetY": -20, "moveDuration": 200, "delay": 250 }, // 冲刺：大幅上移贴近对手
        { "state": "CLEAVE", "frame": 3, "offset": "MELEE", "offsetY": 0, "moveDuration": 70, "delay": 500, "calculateHit": true, "shaking": "SCREEN" } // 命中：落地结算伤害，全屏震动
      ]
    },

    /** 斩击动作（SLASH）- 快速横斩，无明显位移 */
    "SLASH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 250, "delay": 250 }, // 冲刺：快速贴近对手
        { "state": "SLASH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 80,"playSfx": true}, // 斩击：播放音效，无位移
        { "state": "SLASH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 120, "calculateHit": true }, // 命中：结算伤害
        { "state": "SLASH", "frame": 3, "offset": "MELEE", "moveDuration": 0, "delay": 80 } // 收招：短暂停留
      ]
    },

    /** 穿刺动作（PIERCE）- 直线突刺，多帧蓄力 */
    "PIERCE": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 220, "delay": 220 }, // 冲刺：快速突进到对手位置
        { "state": "PIERCE", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 80 }, // 蓄力1：无位移
        { "state": "PIERCE", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 80 }, // 蓄力2：无位移
        { "state": "PIERCE", "frame": 3, "offset": "MELEE", "moveDuration": 0, "delay": 80 }, // 蓄力3：无位移
        { "state": "PIERCE", "frame": 4, "offset": "MELEE", "moveDuration": 0, "delay": 80 ,"playSfx": true, "calculateHit": true } // 穿刺：播放音效，结算伤害
      ]
    },

    /** 挥击动作（SWING）- 大范围挥打，带全屏震动 */
    "SWING": {
      "steps": [
        { "state": "SWING", "frame": 1, "offset": "BASE", "moveDuration": 150, "delay": 150, "playSfx": true }, // 前摇：基础位置，播放音效
        { "state": "SWING", "frame": 2, "offset": "BASE", "moveDuration": 0, "delay": 150 }, // 蓄力：无位移
        { "state": "SWING", "frame": 4, "offset": "MELEE", "moveDuration": 100, "delay": 400,  "calculateHit": true, "shaking": "SCREEN" } // 挥打：贴近对手，结算伤害，全屏震动
      ]
    },

    /** 拳击动作（PUNCH）- 快速近战拳打，无震动 */
    "PUNCH": {
      "steps": [
        { "state": "RUN", "frame": 1, "offset": "MELEE", "moveDuration": 200, "delay": 200 }, // 冲刺：快速贴近对手
        { "state": "PUNCH", "frame": 1, "offset": "MELEE", "moveDuration": 0, "delay": 120, "playSfx": true }, // 出拳：播放音效
        { "state": "PUNCH", "frame": 2, "offset": "MELEE", "moveDuration": 0, "delay": 150, "calculateHit": true } // 命中：结算伤害
      ]
    },

    /** 踢击动作（KICK）- 远距离踢腿，带额外像素偏移 */
    "KICK": {
      "steps": [       
        { "state": "KICK", "frame": 1, "offset": "HOME", "offsetY": 0, "moveDuration": 0, "delay": 100, "playSfx": true }, // 起脚：初始位置，播放音效
        { "state": "KICK", "frame": 2, "offset": "MELEE+250", "offsetY": 0, "moveDuration": 0, "delay": 1000 }, // 踢腿：近战位置额外偏移250px，长时间停留
        { "state": "KICK", "frame": 3, "offset": "HOME", "offsetY": 0, "moveDuration": 0, "delay": 120, "calculateHit": true}, // 命中：返回初始位置，结算伤害
        { "state": "KICK", "frame": 4, "offset": "HOME", "offsetY": 0, "moveDuration": 0, "delay": 120 } // 收招：初始位置短暂停留
      ]
    },

    /** 刺击动作（SPIKE）- 多段递进刺击，逐步贴近对手 */
    "SPIKE": {
      "steps": [    
        { "state": "SPIKE", "frame": 1, "offset": "MELEE", "offsetY": 0, "moveDuration": 0, "delay": 80, "playSfx": true }, // 起手：近战位置，播放音效
        { "state": "SPIKE", "frame": 2, "offset": "MELEE+10", "offsetY": 0, "moveDuration": 0, "delay": 120 }, // 刺击1：额外偏移10px
        { "state": "SPIKE", "frame": 3, "offset": "MELEE+30", "offsetY": 0, "moveDuration": 0, "delay": 100 }, // 刺击2：额外偏移30px
        { "state": "SPIKE", "frame": 4, "offset": "MELEE+90", "offsetY": 0, "moveDuration": 0, "delay": 220, "calculateHit": true} // 刺击3：额外偏移90px，结算伤害
      ]
    },

    /** 投掷动作（THROW）- 发射飞行道具，无近战位移 */
    "THROW": {
      "repeat": 1, // 仅执行1次
      "steps": [
        { "state": "THROW", "frame": 1, "offset": "HOME", "moveDuration": 0, "delay": 100, "playSfx": true }, // 起手：初始位置，播放音效
        { "state": "THROW", "frame": 2, "offset": "HOME", "moveDuration": 0, "delay": 100, "projectile": true }, // 投掷：发射飞行道具
        { "state": "THROW", "frame": 3, "offset": "HOME", "moveDuration": 0, "delay": 100 }, // 蓄力：无位移
        { "state": "THROW", "frame": 4, "offset": "HOME", "moveDuration": 0, "delay": 100, "calculateHit": true } // 命中：结算投射物伤害
      ]
    }
  } as Record<string, AttackModuleConfig> // 类型断言：确保所有动作模组符合AttackModuleConfig类型
};

export default config;
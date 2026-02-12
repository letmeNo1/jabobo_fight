
export enum WeaponType {
  LARGE = 'LARGE',
  MEDIUM = 'MEDIUM',
  SMALL = 'SMALL',
  THROW = 'THROW'
}

export enum SkillCategory {
  BASE_STAT = 'BASE_STAT',
  PASSIVE = 'PASSIVE',
  ACTIVE = 'ACTIVE',
  SPECIAL = 'SPECIAL'
}

export type AttackModule = 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW' | 'PUNCH' | 'KICK'|'SPIKE';

// Define visual states globally
export type VisualState = 'IDLE' | 'RUN' | 'ATTACK' | 'HURT' | 'DODGE' | 'HOME' | 'JUMP' | 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW' | 'PUNCH' | 'KICK' | 'SPIKE';

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  baseDmg: [number, number];
  effect?: string;
  description: string;
  module: AttackModule;
  sfx?: string;
  sfxFrame?: number;
  hitSfx?: string;
  isArtifact?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  minLevel?: number;
  module?: AttackModule;
  sfx?: string;
  sfxFrame?: number;
  hitSfx?: string;
}

// Define Dressing interface for shop and visuals
export interface Dressing {
  id: string;
  name: string;
  part: 'HEAD' | 'BODY' | 'WEAPON';
  type: 'COMMON' | 'RARE';
  price: number;
  statBonus?: {
    str?: number;
    agi?: number;
    spd?: number;
    hp?: number;
  };
}

export interface CharacterData {
  name: string;
  level: number;
  exp: number;
  gold: number;
  str: number;
  agi: number;
  spd: number;
  maxHp: number;
  weapons: string[];
  skills: string[];
  dressing: { HEAD: string; BODY: string; WEAPON: string; };
  unlockedDressings: string[];
  isConcentrated: boolean;
  friends: Friend[];
}

export interface Friend {
  id: string;
  name: string;
  level: number;
  str: number;
  agi: number;
  spd: number;
  hp: number;
  weapons: string[];
  skills: string[];
  dressing: { HEAD: string; BODY: string; WEAPON: string; };
}

export interface BattleLog {
  attacker: string;
  text: string;
  damage?: number;
  isCrit?: boolean;
}

// --- 战斗回放相关类型 ---

export interface FighterSnapshot {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  str: number;
  agi: number;
  spd: number;
  weapons: string[];
  skills: string[];
  dressing: { HEAD: string; BODY: string; WEAPON: string; };
}

export interface BattleTurn {
  side: 'P' | 'N';
  /** * 新增 'SKIPPED' 类型：用于表示被眩晕、胶水黏住等无法行动的回合
   * 前端可以根据此类型跳过攻击动画，直接显示受困动画或纯文本日志
   */
  actionType: 'WEAPON' | 'SKILL' | 'PUNCH' | 'SKIPPED'; 
  actionId?: string;
  isHit: boolean;
  damage: number;
  logs: BattleLog[];
  statusChanges: {
    disarmed?: number;
    sticky?: number;
    stunned?: number;
    afterimage?: number;
    // 允许数组形式存储持续伤害
    dots?: { id: string; dmg: number; duration: number }[];
    // 可选：用于记录本回合是否消耗了武器或触发了单次技能（如装死）
    usedSkills?: string[];
  };
}

export interface BattleRecord {
  id: string;
  timestamp: number;
  player: FighterSnapshot;
  opponent: FighterSnapshot;
  turns: BattleTurn[];
  winner: 'P' | 'N';
  rewards?: { gold: number; exp: number };
}

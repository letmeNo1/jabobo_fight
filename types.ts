
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

export type AttackModule = 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW' | 'PUNCH' | 'KICK';

// Define visual states globally
export type VisualState = 'IDLE' | 'RUN' | 'ATTACK' | 'HURT' | 'DODGE' | 'HOME' | 'JUMP' | 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW' | 'PUNCH' | 'KICK';

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  baseDmg: [number, number];
  effect?: string;
  description: string;
  module: AttackModule;
  sfx?: string; // 攻击声（挥动）
  hitSfx?: string; // 受击声（击中）
  sfxFrame?: number;
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
  hitSfx?: string;
  sfxFrame?: number;
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
  actionType: 'WEAPON' | 'SKILL' | 'PUNCH';
  actionId?: string;
  isHit: boolean;
  damage: number;
  logs: BattleLog[];
  statusChanges: {
    disarmed?: number;
    sticky?: number;
    afterimage?: number;
    dots?: { id: string; dmg: number; duration: number }[];
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

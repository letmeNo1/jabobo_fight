
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

export type AttackModule = 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW' | 'PUNCH';

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  baseDmg: [number, number]; // [min, max]
  effect?: string;
  description: string;
  module: AttackModule; // 绑定的动作模组
  sfx?: string; // 绑定的动作/挥动音效ID
  sfxFrame?: number; // 指定触发动作音效的动画帧 (1-based)
  isArtifact?: boolean; // 是否为神器
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  minLevel?: number;
  module?: AttackModule; // 主动技能绑定的动作模组
  sfx?: string; // 绑定的释放音效ID
  sfxFrame?: number; // 指定触发释放音效的动画帧 (1-based)
}

export interface Dressing {
  id: string;
  name: string;
  part: 'HEAD' | 'BODY' | 'WEAPON';
  type: 'COMMON' | 'RARE';
  price: number;
  statBonus?: {
    agi?: number;
    hp?: number;
    str?: number;
  };
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
  dressing: {
    HEAD: string;
    BODY: string;
    WEAPON: string;
  };
}

export interface CharacterData {
  name: string; // 玩家昵称
  level: number;
  exp: number;
  gold: number;
  str: number;
  agi: number;
  spd: number;
  maxHp: number;
  weapons: string[]; // IDs
  skills: string[]; // IDs
  dressing: {
    HEAD: string;
    BODY: string;
    WEAPON: string;
  };
  unlockedDressings: string[];
  isConcentrated: boolean; // 潜心状态
  friends: Friend[]; // 好友列表
}

export interface BattleLog {
  attacker: string;
  text: string;
  damage?: number;
  isCrit?: boolean;
}

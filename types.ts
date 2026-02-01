
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

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  baseDmg: [number, number]; // [min, max]
  effect?: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  minLevel?: number;
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

export interface CharacterData {
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
}

export interface BattleLog {
  attacker: string;
  text: string;
  damage?: number;
  isCrit?: boolean;
}

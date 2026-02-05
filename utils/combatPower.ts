
import { CharacterData, Friend, Weapon, Skill, SkillCategory } from '../types';
import { WEAPONS, SKILLS } from '../constants';

/**
 * 计算单件武器的战力分
 */
export const calculateWeaponCP = (weapon: Weapon): number => {
  let score = (weapon.baseDmg[0] + weapon.baseDmg[1]) * 2;
  if (weapon.isArtifact) {
    score += 200; // 神器基础额外加分
  }
  return Math.floor(score);
};

/**
 * 计算单个技能的战力分
 */
export const calculateSkillCP = (skill: Skill): number => {
  const weights = {
    [SkillCategory.ACTIVE]: 50,
    [SkillCategory.PASSIVE]: 35,
    [SkillCategory.SPECIAL]: 80,
    [SkillCategory.BASE_STAT]: 20,
  };
  return weights[skill.category] || 10;
};

/**
 * 计算玩家或好友的基础属性战力
 */
export const calculateStatsCP = (stats: { hp: number; str: number; agi: number; spd: number }): number => {
  return Math.floor(
    (stats.hp / 10) + (stats.str * 8) + (stats.agi * 7) + (stats.spd * 10)
  );
};

/**
 * 计算实体的总战力
 */
export const calculateTotalCP = (entity: CharacterData | Friend): number => {
  // Use 'in' operator to determine if the entity has 'hp' (Friend) or 'maxHp' (CharacterData)
  const statsCP = calculateStatsCP({
    hp: 'hp' in entity ? entity.hp : (entity as CharacterData).maxHp,
    str: entity.str,
    agi: entity.agi,
    spd: entity.spd,
  });

  const weaponsCP = entity.weapons.reduce((sum, wid) => {
    const w = WEAPONS.find(item => item.id === wid);
    return sum + (w ? calculateWeaponCP(w) : 0);
  }, 0);

  const skillsCP = entity.skills.reduce((sum, sid) => {
    const s = SKILLS.find(item => item.id === sid);
    return sum + (s ? calculateSkillCP(s) : 0);
  }, 0);

  return statsCP + weaponsCP + skillsCP;
};

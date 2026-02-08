
import { Weapon, Skill, WeaponType, SkillCategory, Dressing } from './types';

// 修正武器音效配置：sfx 为起手挥动声，hitSfx 为计算伤害时的打击声
export const WEAPONS: Weapon[] = [
  // LARGE
  { id: 'w1', name: '方天画戟', type: WeaponType.LARGE, baseDmg: [15, 20], description: '10%概率触发自身闪避', module: 'SWING', sfx: 'swing2', hitSfx: 'heavy_hit', sfxFrame: 1, isArtifact: true },
  { id: 'w2', name: '三叉戟', type: WeaponType.LARGE, baseDmg: [25, 50], description: '10%概率MISS，攻击后休息1回合', module: 'CLEAVE', sfx: 'heavy_swing', hitSfx: 'heavy_hit', sfxFrame: 1 },
  { id: 'w3', name: '充气锤子', type: WeaponType.LARGE, baseDmg: [20, 35], description: '10%概率让对方跳过1回合', module: 'CLEAVE', sfx: 'swing_light', hitSfx: 'squeak', sfxFrame: 2 },
  { id: 'w4', name: '开山斧', type: WeaponType.LARGE, baseDmg: [12, 18], description: '5%概率被攻击前反击，5%概率让对方跳过1回合', module: 'CLEAVE', sfx: 'heavy_swing', hitSfx: 'heavy_hit', sfxFrame: 1 },
  { id: 'w5', name: '青龙偃月刀', type: WeaponType.LARGE, baseDmg: [20, 35], description: '10%概率触发连击', module: 'CLEAVE', sfx: 'heavy_swing', hitSfx: 'heavy_hit', sfxFrame: 1, isArtifact: true },
  { id: 'w6', name: '狂魔镰', type: WeaponType.LARGE, baseDmg: [15, 25], description: '必中，对方无法反击', module: 'SLASH', sfx: 'heavy_swing', hitSfx: 'slash', sfxFrame: 1, isArtifact: true },
  { id: 'w7', name: '棒球棒', type: WeaponType.LARGE, baseDmg: [15, 20], description: '15%概率让对方跳过1回合', module: 'SWING', sfx: 'swing2', hitSfx: 'pan_hit', sfxFrame: 2 },
  { id: 'w8', name: '木槌', type: WeaponType.LARGE, baseDmg: [7, 14], description: '无额外效果', module: 'CLEAVE', sfx: 'swing_light', hitSfx: 'blunt_hit', sfxFrame: 2 },
  // MEDIUM
  { id: 'w9', name: '红缨枪', type: WeaponType.MEDIUM, baseDmg: [15, 30], description: '10%概率连击', module: 'PIERCE', sfx: 'swing2', hitSfx: 'pierce', sfxFrame: 2 },
  { id: 'w10', name: '环扣刀', type: WeaponType.MEDIUM, baseDmg: [12, 12], description: '对方无法反击', module: 'KICK', sfx: 'draw_knife', hitSfx: 'draw_knife_hit', sfxFrame: 1 },
  { id: 'w11', name: '双截棍', type: WeaponType.MEDIUM, baseDmg: [10, 18], description: '被攻击命中后15%概率反击', module: 'SWING', sfx: 'swing_light', hitSfx: 'blunt_hit', sfxFrame: 1 },
  { id: 'w12', name: '蛇影弓', type: WeaponType.MEDIUM, baseDmg: [10, 20], description: '攻击时自身命中率+10%', module: 'THROW', sfx: 'bow_shot', hitSfx: 'pierce_light', sfxFrame: 1 },
  { id: 'w13', name: '平底锅', type: WeaponType.MEDIUM, baseDmg: [18, 22], description: '5%概率闪避+反击', module: 'SWING', sfx: 'swing2', hitSfx: 'pan_hit', sfxFrame: 2 },
  { id: 'w14', name: '宽刃剑', type: WeaponType.MEDIUM, baseDmg: [10, 18], description: '无额外效果', module: 'SLASH', sfx: 'swing_light', hitSfx: 'slash_light', sfxFrame: 1 },
  // SMALL
  { id: 'w15', name: '木剑', type: WeaponType.SMALL, baseDmg: [10, 25], description: '5%连击/5%闪避反击/无视装死', module: 'SLASH', sfx: 'swing_light', hitSfx: 'slash_light', sfxFrame: 1 },
  { id: 'w16', name: '短剑', type: WeaponType.SMALL, baseDmg: [3, 8], description: '20%概率连击', module: 'PIERCE', sfx: 'swing_light', hitSfx: 'pierce_light', sfxFrame: 2 },
  { id: 'w17', name: '判官笔', type: WeaponType.SMALL, baseDmg: [5, 8], description: '必中', module: 'PIERCE', sfx: 'swing_light', hitSfx: 'pierce_light', sfxFrame: 2 },
  { id: 'w18', name: '流星球', type: WeaponType.SMALL, baseDmg: [15, 24], description: '对方闪避率+15%，可连扔2次', module: 'SWING', sfx: 'swing2', hitSfx: 'blunt_hit', sfxFrame: 1 },
  { id: 'w19', name: '老鼠', type: WeaponType.SMALL, baseDmg: [5, 10], description: '对方命中率-10%(2回合)', module: 'THROW', sfx: 'squeak', hitSfx: 'squeak', sfxFrame: 1 },
  { id: 'w20', name: '板砖', type: WeaponType.SMALL, baseDmg: [8, 12], description: '5%概率让对方眩晕1回合', module: 'THROW', sfx: 'swing_light', hitSfx: 'heavy_hit', sfxFrame: 2 },
  // THROW
  { id: 'w21', name: 'speaker 310', type: WeaponType.THROW, baseDmg: [10, 18], description: '无视装死，5%概率瞬杀', module: 'THROW', sfx: 'throw_knife', hitSfx: 'throw_hit', sfxFrame: 1 },
  { id: 'w22', name: '接力棒', type: WeaponType.THROW, baseDmg: [10, 15], description: '10%概率连击', module: 'THROW', sfx: 'throw_light', hitSfx: 'blunt_hit', sfxFrame: 1 },
  { id: 'w23', name: '胶水瓶', type: WeaponType.THROW, baseDmg: [5, 12], description: '命中后使对方被黏住3回合', module: 'THROW', sfx: 'throw_light', hitSfx: 'sticky', sfxFrame: 1 },
  { id: 'w24', name: '毒镖', type: WeaponType.THROW, baseDmg: [8, 12], description: '命中后使对方中毒3回合', module: 'THROW', sfx: 'throw_knife', hitSfx: 'pierce_light', sfxFrame: 1 }
];

export const SKILLS: Skill[] = [
  { id: 's1', name: '嗜血', category: SkillCategory.ACTIVE, description: '攻击时回复伤害的30%', module: 'KICK', sfx: 'skill_cast', hitSfx: 'blood_drain' },
  { id: 's2', name: '化骨绵掌', category: SkillCategory.ACTIVE, description: '使对方下一回合力量减半', module: 'PUNCH', sfx: 'skill_cast', hitSfx: 'heavy_hit' },
  { id: 's12', name: '大力金刚掌', category: SkillCategory.ACTIVE, description: '造成高额爆发伤害', module: 'PUNCH', sfx: 'skill_cast', hitSfx: 'heavy_hit' },
  { id: 's14', name: '狂暴', category: SkillCategory.ACTIVE, description: '损失生命值转化为力量', module: 'PUNCH', sfx: 'roar', hitSfx: 'roar' },
  { id: 's15', name: '瞬杀', category: SkillCategory.SPECIAL, description: '5%概率直接秒杀对方', module: 'KICK', sfx: 'swing2', hitSfx: 'heavy_hit' },
  { id: 's17', name: '风暴打击', category: SkillCategory.ACTIVE, description: '连续攻击两次', module: 'SLASH', sfx: 'wind_storm', hitSfx: 'slash' },
  { id: 's19', name: '小李飞刀', category: SkillCategory.ACTIVE, description: '远程暗器攻击', module: 'THROW', sfx: 'throw_knife', hitSfx: 'throw_hit' },
  { id: 's20', name: '狮子吼', category: SkillCategory.ACTIVE, description: '眩晕对方1回合', module: 'PUNCH', sfx: 'roar', hitSfx: 'roar' },
  { id: 's22', name: '蜘蛛网', category: SkillCategory.SPECIAL, description: '黏住对方3回合', module: 'THROW', sfx: 'sticky', hitSfx: 'sticky' },
  { id: 's23', name: '隔山打牛', category: SkillCategory.ACTIVE, description: '无视防御的攻击', module: 'PUNCH', sfx: 'skill_cast', hitSfx: 'heavy_hit' },
  { id: 's24', name: '剧毒蛇', category: SkillCategory.SPECIAL, description: '召唤毒蛇使对方中毒', module: 'THROW', sfx: 'squeak', hitSfx: 'squeak' },
  { id: 's25', name: '暗器百解', category: SkillCategory.SPECIAL, description: '投掷身上所有的投掷类武器', module: 'THROW', sfx: 'rapid_throw', hitSfx: 'throw_hit' },
  { id: 's26', name: '降龙十八掌', category: SkillCategory.SPECIAL, description: '极高威力的神功', module: 'PUNCH', sfx: 'dragon_roar', hitSfx: 'heavy_hit' },
  { id: 's29', name: '捷波波', category: SkillCategory.SPECIAL, description: '神秘力量，提升全属性', module: 'KICK', sfx: 'skill_cast', hitSfx: 'skill_cast' },
  { id: 's32', name: '乾坤大挪移', category: SkillCategory.SPECIAL, description: '反弹受到的伤害', module: 'PUNCH', sfx: 'skill_cast', hitSfx: 'heavy_hit' }
];

export const DRESSINGS: Dressing[] = [
  { id: 'h1', name: '普通头巾', part: 'HEAD', type: 'COMMON', price: 100, statBonus: { hp: 20 } },
  { id: 'h2', name: '格斗发带', part: 'HEAD', type: 'COMMON', price: 200, statBonus: { agi: 2 } },
  { id: 'h3', name: '武圣头盔', part: 'HEAD', type: 'RARE', price: 1000, statBonus: { str: 5, hp: 50 } },
  { id: 'b1', name: '练功服', part: 'BODY', type: 'COMMON', price: 150, statBonus: { agi: 3 } },
  { id: 'b2', name: '皮甲', part: 'BODY', type: 'COMMON', price: 300, statBonus: { hp: 60 } },
  { id: 'b3', name: '金丝软猬甲', part: 'BODY', type: 'RARE', price: 1500, statBonus: { hp: 150, str: 2 } },
  { id: 'ws1', name: '黄金之光', part: 'WEAPON', type: 'RARE', price: 2000, statBonus: { str: 10 } }
];

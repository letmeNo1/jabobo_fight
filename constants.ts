
import { Weapon, Skill, WeaponType, SkillCategory, Dressing } from './types';

export const WEAPONS: Weapon[] = [
  // LARGE
  { id: 'w1', name: '方天画戟', type: WeaponType.LARGE, baseDmg: [15, 20], description: '10%概率触发自身闪避', module: 'SWING', sfx: 'heavy_swing', sfxFrame: 1, hitSfx: 'heavy_hit' },
  { id: 'w2', name: '三叉戟', type: WeaponType.LARGE, baseDmg: [25, 50], description: '10%概率MISS，攻击后休息1回合', module: 'CLEAVE', sfx: 'heavy_hit', sfxFrame: 1, hitSfx: 'heavy_hit' },
  { id: 'w3', name: '充气锤子', type: WeaponType.LARGE, baseDmg: [20, 35], description: '10%概率让对方跳过1回合', module: 'CLEAVE', sfx: 'toy_hit', sfxFrame: 2, hitSfx: 'toy_hit' },
  { id: 'w4', name: '开山斧', type: WeaponType.LARGE, baseDmg: [12, 18], description: '5%概率被攻击前反击，5%概率让对方跳过1回合', module: 'CLEAVE', sfx: 'heavy_hit', sfxFrame: 1, hitSfx: 'blunt_hit' },
  { id: 'w5', name: '青龙偃月刀', type: WeaponType.LARGE, baseDmg: [20, 35], description: '10%概率触发连击', module: 'CLEAVE', sfx: 'heavy_swing', sfxFrame: 1, hitSfx: 'heavy_hit' },
  { id: 'w6', name: '狂魔镰', type: WeaponType.LARGE, baseDmg: [15, 25], description: '必中，对方无法反击', module: 'SLASH', sfx: 'slash', sfxFrame: 1, hitSfx: 'slash' },
  { id: 'w7', name: '棒球棒', type: WeaponType.LARGE, baseDmg: [15, 20], description: '15%概率让对方跳过1回合', module: 'SWING', sfx: 'blunt_hit', sfxFrame: 2, hitSfx: 'blunt_hit' },
  { id: 'w8', name: '木槌', type: WeaponType.LARGE, baseDmg: [7, 14], description: '无额外效果', module: 'CLEAVE', sfx: 'blunt_hit', sfxFrame: 2, hitSfx: 'blunt_hit' },
  // MEDIUM
  { id: 'w9', name: '红缨枪', type: WeaponType.MEDIUM, baseDmg: [15, 30], description: '10%概率连击', module: 'PIERCE', sfx: 'pierce', sfxFrame: 2, hitSfx: 'pierce' },
  { id: 'w10', name: '环扣刀', type: WeaponType.MEDIUM, baseDmg: [12, 12], description: '对方无法反击', module: 'SLASH', sfx: 'slash', sfxFrame: 1, hitSfx: 'slash' },
  { id: 'w11', name: '双截棍', type: WeaponType.MEDIUM, baseDmg: [10, 18], description: '被攻击命中后15%概率反击', module: 'SWING', sfx: 'blunt_hit', sfxFrame: 1, hitSfx: 'blunt_hit' },
  { id: 'w12', name: '蛇影弓', type: WeaponType.MEDIUM, baseDmg: [10, 20], description: '攻击时自身命中率+10%', module: 'THROW', sfx: 'bow_shot', sfxFrame: 1, hitSfx: 'pierce_light' },
  { id: 'w13', name: '平底锅', type: WeaponType.MEDIUM, baseDmg: [18, 22], description: '5%概率闪避+反击', module: 'SWING', sfx: 'pan_hit', sfxFrame: 2, hitSfx: 'pan_hit' },
  { id: 'w14', name: '宽刃剑', type: WeaponType.MEDIUM, baseDmg: [10, 18], description: '无额外效果', module: 'SLASH', sfx: 'slash', sfxFrame: 1, hitSfx: 'slash' },
  // SMALL
  { id: 'w15', name: '木剑', type: WeaponType.SMALL, baseDmg: [10, 25], description: '5%连击/5%闪避反击/无视装死', module: 'SLASH', sfx: 'slash_light', sfxFrame: 1, hitSfx: 'blunt_hit' },
  { id: 'w16', name: '短剑', type: WeaponType.SMALL, baseDmg: [3, 8], description: '20%概率连击', module: 'PIERCE', sfx: 'pierce_light', sfxFrame: 2, hitSfx: 'pierce_light' },
  { id: 'w17', name: '判官笔', type: WeaponType.SMALL, baseDmg: [5, 8], description: '必中', module: 'PIERCE', sfx: 'pierce_light', sfxFrame: 2, hitSfx: 'pierce_light' },
  { id: 'w18', name: '流星球', type: WeaponType.SMALL, baseDmg: [15, 24], description: '对方闪避率+15%，可连扔2次', module: 'SWING', sfx: 'swing_light', sfxFrame: 1, hitSfx: 'blunt_hit' },
  { id: 'w19', name: '老鼠', type: WeaponType.SMALL, baseDmg: [5, 10], description: '对方命中率-10%(2回合)', module: 'THROW', sfx: 'squeak', sfxFrame: 1, hitSfx: 'toy_hit' },
  { id: 'w20', name: '板砖', type: WeaponType.SMALL, baseDmg: [8, 12], description: '5%概率让对方眩晕1回合', module: 'THROW', sfx: 'blunt_hit', sfxFrame: 2, hitSfx: 'blunt_hit' },
  // THROW
  { id: 'w21', name: '小李飞刀', type: WeaponType.THROW, baseDmg: [10, 18], description: '无视装死，5%概率瞬杀', module: 'THROW', sfx: 'throw_knife', sfxFrame: 1, hitSfx: 'pierce_light' },
  { id: 'w22', name: '接力棒', type: WeaponType.THROW, baseDmg: [10, 15], description: '10%概率连击', module: 'THROW', sfx: 'throw_light', sfxFrame: 1, hitSfx: 'blunt_hit' },
  { id: 'w23', name: '胶水(瓶)', type: WeaponType.THROW, baseDmg: [0, 0], description: '黏住对方3回合', module: 'THROW', sfx: 'bottle_break', sfxFrame: 2, hitSfx: 'bottle_break' },
  { id: 'w24', name: '仙人掌', type: WeaponType.THROW, baseDmg: [10, 15], description: '造成持续伤害(5点, 3回合)', module: 'THROW', sfx: 'throw_hit', sfxFrame: 2, hitSfx: 'throw_hit' },
];

export const SKILLS: Skill[] = [
  // Base Stats
  { id: 's1', name: '天生大力', category: SkillCategory.BASE_STAT, description: '力量+5' },
  { id: 's2', name: '身手敏捷', category: SkillCategory.BASE_STAT, description: '敏捷+5' },
  { id: 's3', name: '快人一步', category: SkillCategory.BASE_STAT, description: '速度+5' },
  { id: 's4', name: '强健身躯', category: SkillCategory.BASE_STAT, description: '生命值上限+20' },
  { id: 's5', name: '均衡发展', category: SkillCategory.BASE_STAT, description: '力量/敏捷/速度各+2' },
  // Passive
  { id: 's6', name: '武器好手', category: SkillCategory.PASSIVE, description: '武器伤害+20%' },
  { id: 's7', name: '肉搏好手', category: SkillCategory.PASSIVE, description: '空手伤害+20%' },
  { id: 's8', name: '第六感', category: SkillCategory.PASSIVE, description: '被攻30%概率反击自身力量' },
  { id: 's9', name: '无影手', category: SkillCategory.PASSIVE, description: '20%概率连续攻击' },
  { id: 's10', name: '霸气护体', category: SkillCategory.PASSIVE, description: '每局2次格挡50%伤害' },
  { id: 's11', name: '大海无量', category: SkillCategory.PASSIVE, description: '100%反弹100%受到的伤害' },
  { id: 's12', name: '皮糙肉厚', category: SkillCategory.PASSIVE, description: '受伤害-20%' },
  { id: 's13', name: '凌波微步', category: SkillCategory.PASSIVE, description: '闪避率+7% (上限30%)' },
  { id: 's14', name: '惯用重物', category: SkillCategory.PASSIVE, description: '大型武器伤害+10%' },
  { id: 's15', name: '神来一击', category: SkillCategory.PASSIVE, description: '5%概率将对手血量降至1' },
  { id: 's16', name: '装死', category: SkillCategory.PASSIVE, description: '血量归0时保留1点 (1次)' },
  { id: 's17', name: '缴械', category: SkillCategory.PASSIVE, description: '50%概率夺取对方武器' },
  { id: 's18', name: '残影', category: SkillCategory.PASSIVE, description: '触发后2回合速度x1.5, 伤害x1.1' },
  // Active
  { id: 's19', name: '晴天霹雳', category: SkillCategory.ACTIVE, description: '15+等级*1.5固定伤害', module: 'THROW', sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'thunder' },
  { id: 's20', name: '龙卷风', category: SkillCategory.ACTIVE, description: '20+力量*0.9伤害', module: 'CLEAVE', sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'wind_storm' },
  { id: 's21', name: '矿泉水', category: SkillCategory.ACTIVE, description: '恢复25%血量并追加攻击', module: 'PUNCH', sfx: 'drink', sfxFrame: 1, hitSfx: 'drink' },
  { id: 's22', name: '胶水', category: SkillCategory.ACTIVE, description: '黏住对手3回合', module: 'THROW', sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'sticky' },
  { id: 's23', name: '天使之翼', category: SkillCategory.ACTIVE, description: '15+敏捷*1伤害且无法反击', module: 'SLASH', sfx: 'wing_flap', sfxFrame: 1, hitSfx: 'wing_flap' },
  { id: 's24', name: '佛山无影脚', category: SkillCategory.ACTIVE, description: '30+力量*0.5伤害', module: 'PIERCE', sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'kick_combo' },
  { id: 's25', name: '势如暴雨', category: SkillCategory.ACTIVE, description: '连续投掷3种投掷武器', module: 'THROW', sfx: 'rapid_throw', sfxFrame: 1, hitSfx: 'throw_hit' },
  { id: 's26', name: '企鹅吼', category: SkillCategory.ACTIVE, description: '15点固定伤害且对方停1回合', module: 'THROW', sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'roar' },
  { id: 's27', name: '企鹅挠痒', category: SkillCategory.ACTIVE, description: '持续6回合每回合5+敏捷*0.2伤害', module: 'SLASH', sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'scratch' },
  { id: 's28', name: '师傅驾到', category: SkillCategory.ACTIVE, description: '恢复10%并下次必中', minLevel: 10, module: 'PUNCH', sfx: 'master_arrive', sfxFrame: 1, hitSfx: 'master_arrive' },
  // Special
  { id: 's29', name: '黑龙波', category: SkillCategory.SPECIAL, description: '50点固定伤害 (1次)', module: 'THROW', sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'dragon_roar' },
  { id: 's30', name: '如来神掌', category: SkillCategory.SPECIAL, description: '扣除对方当前50%生命值', minLevel: 30, module: 'CLEAVE', sfx: 'skill_cast', sfxFrame: 2, hitSfx: 'buddha_palm' },
  { id: 's31', name: '避重就轻', category: SkillCategory.SPECIAL, description: '中/小型武器伤害+15%', minLevel: 30 },
  { id: 's32', name: '嗜血', category: SkillCategory.SPECIAL, description: '30%吸血', minLevel: 30, sfx: 'skill_cast', sfxFrame: 1, hitSfx: 'blood_drain' },
];

export const DRESSINGS: Dressing[] = [
  { id: 'h1', name: '新手草帽', part: 'HEAD', type: 'COMMON', price: 100 },
  { id: 'h2', name: '冠军头盔', part: 'HEAD', type: 'RARE', price: 500, statBonus: { agi: 1 } },
  { id: 'b1', name: '普通T恤', part: 'BODY', type: 'COMMON', price: 100 },
  { id: 'b2', name: '龙鳞战甲', part: 'BODY', type: 'RARE', price: 500, statBonus: { hp: 10 } },
  { id: 'w_a1', name: '普通剑套', part: 'WEAPON', type: 'COMMON', price: 100 },
  { id: 'w_a2', name: '黄金武器套', part: 'WEAPON', type: 'RARE', price: 500, statBonus: { str: 2 } },
];

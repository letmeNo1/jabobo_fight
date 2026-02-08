import { CharacterData, Friend, BattleRecord, BattleTurn, FighterSnapshot, SkillCategory, WeaponType } from '../types';
import { WEAPONS, SKILLS } from '../constants';

const createSnapshot = (data: CharacterData | Friend): FighterSnapshot => {
  return {
    name: data.name,
    level: data.level,
    hp: 'hp' in data ? data.hp : data.maxHp,
    maxHp: 'hp' in data ? data.hp : data.maxHp,
    str: data.str,
    agi: data.agi,
    spd: data.spd,
    weapons: [...data.weapons],
    skills: [...data.skills],
    dressing: { ...data.dressing }
  };
};

interface FighterState extends FighterSnapshot {
  status: {
    disarmed: number;
    sticky: number; // 胶水/网
    stunned: number; // 眩晕/停止行动
    afterimage: number;
    dots: { id: string; dmg: number; duration: number }[];
    usedSkills: string[];
    invincible: number; // 无敌/闪避所有
  };
  maxHp: number; // 确保 maxHp 存在
}

// 应用开局被动技能加成
const applyPassiveStats = (fighter: FighterState) => {
  // s1: 天生大力 (+5 Str)
  if (fighter.skills.includes('s1')) fighter.str += 5;
  // s2: 身手敏捷 (+5 Agi)
  if (fighter.skills.includes('s2')) fighter.agi += 5;
  // s3: 快人一步 (+5 Spd)
  if (fighter.skills.includes('s3')) fighter.spd += 5;
  // s4: 强健身躯 (+20 HP)
  if (fighter.skills.includes('s4')) {
    fighter.maxHp += 20;
    fighter.hp += 20;
  }
  // s5: 均衡发展 (+2 All)
  if (fighter.skills.includes('s5')) {
    fighter.str += 2;
    fighter.agi += 2;
    fighter.spd += 2;
  }
};

// 新增：夺取武器的工具函数
const seizeWeapons = (attacker: FighterState, defender: FighterState): string[] => {
  // 规则1：夺取对方全部武器（也可改为随机夺取1-2件）
  const seizedWeapons = [...defender.weapons];
  if (seizedWeapons.length === 0) return [];
  
  // 规则2：移除对方的武器
  defender.weapons = [];
  
  // 可选规则：将夺取的武器加入攻击者的武器列表（可选，根据游戏设定）
  // attacker.weapons.push(...seizedWeapons);
  
  return seizedWeapons;
};

export const simulateBattle = (player: CharacterData, opponent: FighterSnapshot): BattleRecord => {
  const pData = createSnapshot(player);
  const nData = { ...opponent }; // opponent is already a snapshot

  const state = {
    p: { ...pData, status: { disarmed: 0, sticky: 0, stunned: 0, afterimage: 0, invincible: 0, dots: [], usedSkills: [] } } as FighterState,
    n: { ...nData, status: { disarmed: 0, sticky: 0, stunned: 0, afterimage: 0, invincible: 0, dots: [], usedSkills: [] } } as FighterState
  };

  // 应用被动属性
  applyPassiveStats(state.p);
  applyPassiveStats(state.n);

  const turns: BattleTurn[] = [];
  
  // 速度决定先手
  let currentSide: 'P' | 'N' = state.p.spd >= state.n.spd ? 'P' : 'N';
  let winner: 'P' | 'N' | null = null;
  let maxTurns = 60; // 防止无限循环

  while (!winner && maxTurns-- > 0) {
    const isP = currentSide === 'P';
    const atk = isP ? state.p : state.n;
    const def = isP ? state.n : state.p;

    const turn: BattleTurn = {
      side: currentSide,
      actionType: 'PUNCH',
      isHit: false,
      damage: 0,
      logs: [],
      statusChanges: {}
    };

    // 1. 处理 DOT 伤害 (中毒等)
    if (atk.status.dots.length > 0) {
      const dotDmg = atk.status.dots.reduce((sum, d) => sum + d.dmg, 0);
      atk.hp = Math.max(0, Math.floor(atk.hp - dotDmg));
      turn.logs.push({ attacker: '系统', text: `${atk.name} 受到持续伤害 -${dotDmg}` });
      if (atk.hp <= 0) {
        // s16: 装死 (保留1点血，仅限一次) - 简化处理：放在伤害结算后统一判断
      }
    }

    // 2. 状态倒计时减少
    atk.status.disarmed = Math.max(0, atk.status.disarmed - 1);
    atk.status.sticky = Math.max(0, atk.status.sticky - 1);
    atk.status.stunned = Math.max(0, atk.status.stunned - 1);
    atk.status.afterimage = Math.max(0, atk.status.afterimage - 1);
    atk.status.invincible = Math.max(0, atk.status.invincible - 1);
    atk.status.dots = atk.status.dots.map(d => ({ ...d, duration: d.duration - 1 })).filter(d => d.duration > 0);

    // 3. 检查是否跳过回合 (胶水 / 眩晕)
    if (atk.hp <= 0) {
       winner = isP ? 'N' : 'P';
       turns.push(turn);
       break;
    }

    if (atk.status.sticky > 0) {
      turn.logs.push({ attacker: atk.name, text: '被黏住了，无法行动！' });
      turns.push(turn);
      currentSide = isP ? 'N' : 'P';
      continue;
    }
    if (atk.status.stunned > 0) {
      turn.logs.push({ attacker: atk.name, text: '处于眩晕状态，无法行动！' });
      turns.push(turn);
      currentSide = isP ? 'N' : 'P';
      continue;
    }

    // 4. 选择行动
    const actionPool: any[] = [];
    
    // 筛选可用主动技能 (排除已使用的单次技能)
    const activeSkills = SKILLS.filter(s => 
      atk.skills.includes(s.id) && 
      (s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL) && 
      !atk.status.usedSkills.includes(s.id)
    );
    
    // 技能权重
    activeSkills.forEach(s => actionPool.push({ type: 'SKILL', id: s.id, weight: 30 }));
    
    // 武器权重 (未缴械)
    if (atk.status.disarmed <= 0 && atk.weapons.length > 0) {
      atk.weapons.forEach(wid => actionPool.push({ type: 'WEAPON', id: wid, weight: 50 }));
    }
    
    // 普通攻击权重
    actionPool.push({ type: 'PUNCH', weight: 20 });

    // 随机选择
    const totalWeight = actionPool.reduce((s, a) => s + a.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = actionPool[actionPool.length - 1];
    for (const a of actionPool) { if (rand < a.weight) { selected = a; break; } rand -= a.weight; }

    turn.actionType = selected.type;
    turn.actionId = selected.id;

    // 5. 计算基础命中率与伤害
    let baseDmg = 0;
    let hitRate = 0.75 + (atk.agi - def.agi) * 0.01; // 基础命中
    
    // s13: 凌波微步 (闪避+7%)
    if (def.skills.includes('s13')) hitRate -= 0.07;
    // s12: 皮糙肉厚 (受伤-20%) - 放在伤害修正做
    
    let actionName = "普通攻击";
    let logText = "";
    let healAmount = 0;
    let selfEffectLog = "";
    // 新增：标记是否夺取了武器
    let seizedWeapons: string[] = [];

    // --- 执行逻辑 ---
    if (selected.type === 'SKILL') {
      const s = SKILLS.find(sk => sk.id === selected.id)!;
      actionName = `使用了技能【${s.name}】`;
      atk.status.usedSkills.push(s.id); // 标记已使用
      
      // 技能具体效果实现
      switch (s.id) {
        case 's15': // 神来一击: 5%几率1血，95% miss
          hitRate = 0.05;
          baseDmg = Math.max(1, def.hp - 1);
          break;
        case 's17': // 缴械: 50%几率夺取对方武器（核心修改）
          baseDmg = atk.str * 0.5;
          const disarmSuccess = Math.random() < 0.5;
          // 记录判定结果（方便调试）
          turn.logs.push({ attacker: '系统', text: `缴械判定：${disarmSuccess ? '成功' : '失败'}` });
          
          if (disarmSuccess) {
            // 标记缴械成功（保留原状态，可选）
            turn.statusChanges.disarmed = 3;
            // 核心：夺取对方武器
            seizedWeapons = seizeWeapons(atk, def);
            
            if (seizedWeapons.length > 0) {
              // 转换武器ID为武器名称，提升日志可读性
              const weaponNames = seizedWeapons.map(wid => WEAPONS.find(w => w.id === wid)?.name || wid);
              logText = `成功夺取了对方的【${weaponNames.join('、')}】！`;
            } else {
              logText = "试图缴械，但对方没有武器！";
            }
          } else {
            logText = "缴械失败！";
          }
          break;
        case 's18': // 残影
          baseDmg = 0;
          hitRate = 1.0; // 必中Buff
          turn.statusChanges.afterimage = 3;
          break;
        case 's19': // 晴天霹雳: 15 + level*1.5
          baseDmg = 15 + atk.level * 1.5;
          hitRate += 0.1;
          break;
        case 's20': // 龙卷风: 20 + str*0.9
          baseDmg = 20 + atk.str * 0.9;
          break;
        case 's21': // 矿泉水: 恢复25%
          baseDmg = atk.str * 0.5;
          healAmount = Math.floor(atk.maxHp * 0.25);
          selfEffectLog = `恢复了 ${healAmount} 点生命`;
          break;
        case 's22': // 胶水: 黏住3回合
          baseDmg = 5;
          turn.statusChanges.sticky = 3;
          logText = "并黏住了对手！";
          break;
        case 's23': // 天使之翼: 15 + agi*1 (必中)
          baseDmg = 15 + atk.agi;
          hitRate = 100.0; 
          break;
        case 's24': // 佛山无影脚
          baseDmg = 30 + atk.str * 0.5;
          break;
        case 's25': // 势如暴雨 (消耗武器)
          const throwables = atk.weapons.filter(wid => WEAPONS.find(w => w.id === wid)?.type === WeaponType.THROW).slice(0, 3);
          baseDmg = throwables.length * 15 + atk.str;
          atk.weapons = atk.weapons.filter(wid => !throwables.includes(wid)); // 消耗
          logText = `投掷了 ${throwables.length} 件暗器！`;
          break;
        case 's26': // 企鹅吼: 15伤 + 停1回合
          baseDmg = 15;
          turn.statusChanges.stunned = 1;
          logText = "震晕了对手！";
          break;
        case 's27': // 企鹅挠痒: DOT
          baseDmg = 5;
          turn.statusChanges.dots = [{ id: 'scratch', dmg: 5 + Math.floor(atk.agi * 0.2), duration: 6 }];
          logText = "造成了持续流血！";
          break;
        case 's28': // 师傅驾到: 恢复10% + 必中
          baseDmg = atk.str * 0.8;
          hitRate = 100.0;
          healAmount = Math.floor(atk.maxHp * 0.1);
          selfEffectLog = `师傅喂了口饭，回血 ${healAmount}`;
          break;
        case 's29': // 捷波波: 50固定
          baseDmg = 50;
          break;
        case 's30': // 如来神掌: 扣除50%当前血
          baseDmg = Math.floor(def.hp * 0.5);
          hitRate = 0.8;
          break;
        default:
          baseDmg = atk.str * 1.5;
      }
    } else if (selected.type === 'WEAPON') {
      const w = WEAPONS.find(we => we.id === selected.id)!;
      actionName = `使用了武器【${w.name}】`;
      // 武器基础伤害波动
      baseDmg = w.baseDmg[0] + Math.random() * (w.baseDmg[1] - w.baseDmg[0]);
      
      // 消耗武器机制 (投掷类必消耗，其他概率消耗? 这里简化为只要用了就移除，除了神器? 
      // 为了游戏体验，暂时设定：投掷类(THROW/SMALL)消耗，大型/中型不消耗，或者全部消耗以促进收集)
      // 依照旧逻辑：全部消耗。
      atk.weapons = atk.weapons.filter(id => id !== w.id);

      // s14: 惯用重物 (Large +10%)
      if (w.type === WeaponType.LARGE && atk.skills.includes('s14')) baseDmg *= 1.1;
      // s31: 避重就轻 (Small/Medium +15%)
      if ((w.type === WeaponType.SMALL || w.type === WeaponType.MEDIUM) && atk.skills.includes('s31')) baseDmg *= 1.15;
      // s6: 武器好手 (+20%)
      if (atk.skills.includes('s6')) baseDmg *= 1.2;

      // 武器特效
      switch (w.id) {
        case 'w1': // 方天画戟: 10% 自身闪避(无敌) -> 模拟为下回合无敌
          if (Math.random() < 0.1) {
            atk.status.invincible = 1;
            selfEffectLog = "触发格挡姿态！";
          }
          break;
        case 'w2': // 三叉戟: 10% MISS
          if (Math.random() < 0.1) hitRate = 0;
          break;
        case 'w3': // 充气锤子: 10% 跳过回合
          if (Math.random() < 0.1) { turn.statusChanges.stunned = 1; logText = "敲晕了对手！"; }
          break;
        case 'w4': // 开山斧: 5% 跳过
          if (Math.random() < 0.05) { turn.statusChanges.stunned = 1; logText = "对手被重击致晕！"; }
          break;
        case 'w6': // 狂魔镰: 必中
          hitRate = 100.0;
          break;
        case 'w7': // 棒球棒: 15% 晕
          if (Math.random() < 0.15) { turn.statusChanges.stunned = 1; logText = "一棒打晕！"; }
          break;
        case 'w12': // 蛇影弓: 命中+10%
          hitRate += 0.1;
          break;
        case 'w17': // 判官笔: 必中
          hitRate = 100.0;
          break;
        case 'w18': // 流星球: 对方闪避+15% (即命中-15%)
          hitRate -= 0.15;
          break;
        case 'w19': // 老鼠: 命中-10% (简化为致盲效果? 这里暂不实现Debuff，直接本回合伤害提高)
          baseDmg += 5; 
          break;
        case 'w20': // 板砖: 5% 晕
          if (Math.random() < 0.05) { turn.statusChanges.stunned = 1; logText = "拍晕了！"; }
          break;
        case 'w21': // speaker: 必中 + 5%瞬杀
          hitRate = 100.0;
          if (Math.random() < 0.05) baseDmg = 9999;
          break;
        case 'w23': // 胶水
          baseDmg = 1;
          turn.statusChanges.sticky = 3;
          logText = "黏住了！";
          break;
        case 'w24': // 仙人掌: DOT
          turn.statusChanges.dots = [{ id: 'cactus', dmg: 5, duration: 3 }];
          break;
      }
    } else {
      // 空手 PUNCH
      actionName = "空手攻击";
      baseDmg = atk.str * 0.8;
      // s7: 肉搏好手 (+20%)
      if (atk.skills.includes('s7')) baseDmg *= 1.2;
    }

    // 6. 最终命中判定
    // 检查对方是否无敌
    if (def.status.invincible > 0) {
      hitRate = 0;
      logText = "被对方完全格挡了！";
    }
    
    // s18 (残影) 状态下伤害加成
    if (atk.status.afterimage > 0) baseDmg *= 1.2;

    const isHit = Math.random() < hitRate;
    turn.isHit = isHit;

    if (isHit) {
      // 暴击判定 (简化：基于 Agi)
      const isCrit = Math.random() < (atk.agi * 0.005);
      if (isCrit) {
        baseDmg *= 1.5;
        logText += " (暴击!)";
      }

      // s12: 皮糙肉厚
      if (def.skills.includes('s12')) baseDmg *= 0.8;

      let finalDmg = Math.floor(baseDmg);
      
      // s16: 装死 (如果致死，保留1血)
      if (def.skills.includes('s16') && def.hp > 1 && finalDmg >= def.hp && !state.n.status.usedSkills.includes('s16_trigger')) {
         finalDmg = def.hp - 1;
         logText += " (对方触发装死!)";
         // 标记装死已触发 (复用 usedSkills)
         if (def === state.n) state.n.status.usedSkills.push('s16_trigger');
         else state.p.status.usedSkills.push('s16_trigger');
      }

      turn.damage = finalDmg;
      
      // 吸血逻辑 s32: 嗜血 (30%)
      if (atk.skills.includes('s32') || activeSkills.some(s => s.id === 's32')) { // 拥有技能即可吸血
         const vamp = Math.floor(finalDmg * 0.3);
         healAmount += vamp;
         selfEffectLog += ` 吸取了 ${vamp} 生命`;
      }

    } else {
      turn.damage = 0;
      // 新增：攻击未命中时，即使缴械判定成功也失效
      if (selected.id === 's17') {
        turn.logs.push({ attacker: '系统', text: '攻击未命中，缴械效果失效！' });
      }
    }

    // 应用治疗
    if (healAmount > 0) {
      atk.hp = Math.min(atk.maxHp, atk.hp + healAmount);
    }

    // 生成日志
    turn.logs.push({ attacker: atk.name, text: actionName + logText + (selfEffectLog ? `，${selfEffectLog}` : "") });
    if (!isHit && def.status.invincible <= 0) {
      turn.logs.push({ attacker: def.name, text: '巧妙地闪避了！' });
    }

    // 状态应用到 State
    if (isHit) {
      def.hp = Math.max(0, def.hp - turn.damage);
      if (turn.statusChanges.sticky) def.status.sticky = turn.statusChanges.sticky;
      if (turn.statusChanges.disarmed) def.status.disarmed = turn.statusChanges.disarmed;
      if (turn.statusChanges.stunned) def.status.stunned = turn.statusChanges.stunned;
      if (turn.statusChanges.dots) def.status.dots.push(...turn.statusChanges.dots);
    }
    // 特殊：s18 残影是 Buff 自己
    if (turn.actionId === 's18' && turn.statusChanges.afterimage) {
      atk.status.afterimage = turn.statusChanges.afterimage;
    }

    turns.push(turn);

    if (def.hp <= 0) {
      winner = isP ? 'P' : 'N';
    } else {
      // 交换回合
      currentSide = isP ? 'N' : 'P';
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    player: pData,
    opponent: nData,
    turns,
    winner: winner || 'N'
  };
};
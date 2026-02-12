import { CharacterData, Friend, BattleRecord, BattleTurn, FighterSnapshot, SkillCategory, WeaponType } from '../types';
import { WEAPONS, SKILLS } from '../constants';

// --- 辅助函数：创建快照 ---
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
    sticky: number;
    stunned: number;
    afterimage: number;
    dots: { id: string; dmg: number; duration: number }[];
    usedSkills: string[];
    invincible: number;
  };
}

// --- 属性加成逻辑 ---
const applyPassiveStats = (fighter: FighterState) => {
  if (fighter.skills.includes('s1')) fighter.str += 5;
  if (fighter.skills.includes('s2')) fighter.agi += 5;
  if (fighter.skills.includes('s3')) fighter.spd += 5;
  if (fighter.skills.includes('s4')) {
    fighter.maxHp += 20;
    fighter.hp += 20;
  }
  if (fighter.skills.includes('s5')) {
    fighter.str += 2;
    fighter.agi += 2;
    fighter.spd += 2;
  }
};

const seizeWeapons = (attacker: FighterState, defender: FighterState): string[] => {
  const seizedWeapons = [...defender.weapons];
  defender.weapons = [];
  return seizedWeapons;
};

// --- 核心战斗模拟 ---
export const simulateBattle = (player: CharacterData, opponent: FighterSnapshot): BattleRecord => {
  const pData = createSnapshot(player);
  const nData = { ...opponent };

  const state = {
    p: { ...pData, status: { disarmed: 0, sticky: 0, stunned: 0, afterimage: 0, invincible: 0, dots: [], usedSkills: [] } } as FighterState,
    n: { ...nData, status: { disarmed: 0, sticky: 0, stunned: 0, afterimage: 0, invincible: 0, dots: [], usedSkills: [] } } as FighterState
  };

  applyPassiveStats(state.p);
  applyPassiveStats(state.n);

  const turns: BattleTurn[] = [];
  let currentSide: 'P' | 'N' = state.p.spd >= state.n.spd ? 'P' : 'N';
  let winner: 'P' | 'N' | null = null;
  let maxTurns = 100; // 稍微增加上限防止平局

  while (!winner && maxTurns-- > 0) {
    const isP = currentSide === 'P';
    const atk = isP ? state.p : state.n;
    const def = isP ? state.n : state.p;

    // 初始化 Turn 对象，默认为跳过状态
    const turn: BattleTurn = {
      side: currentSide,
      actionType: 'SKIPPED', 
      isHit: false,
      damage: 0,
      logs: [],
      statusChanges: {}
    };

    // 1. 处理 DOT 伤害 (中毒/流血等)
    if (atk.status.dots.length > 0) {
      const dotDmg = atk.status.dots.reduce((sum, d) => sum + d.dmg, 0);
      atk.hp = Math.max(0, Math.floor(atk.hp - dotDmg));
      turn.logs.push({ attacker: '系统', text: `${atk.name} 受到持续伤害 -${dotDmg}` });
      if (atk.hp <= 0) {
        winner = isP ? 'N' : 'P';
        turns.push(turn);
        break;
      }
    }

    // 2. 状态检查：判断是否因眩晕或胶水跳过回合
    const isStunned = atk.status.stunned > 0;
    const isSticky = atk.status.sticky > 0;

    // 状态时长在回合开始判定后立即减少
    atk.status.disarmed = Math.max(0, atk.status.disarmed - 1);
    atk.status.sticky = Math.max(0, atk.status.sticky - 1);
    atk.status.stunned = Math.max(0, atk.status.stunned - 1);
    atk.status.afterimage = Math.max(0, atk.status.afterimage - 1);
    atk.status.invincible = Math.max(0, atk.status.invincible - 1);
    atk.status.dots = atk.status.dots
      .map(d => ({ ...d, duration: d.duration - 1 }))
      .filter(d => d.duration > 0);

    if (isStunned || isSticky) {
      const reason = isStunned ? '处于眩晕状态' : '被黏住了';
      turn.logs.push({ attacker: atk.name, text: `${reason}，无法行动！` });
      turns.push(turn);
      currentSide = isP ? 'N' : 'P';
      continue; // 彻底拦截，不执行后续攻击逻辑
    }

    // 3. 选择行动 (走到这里说明行动正常)
    const actionPool: any[] = [];
    const activeSkills = SKILLS.filter(s => 
      atk.skills.includes(s.id) && 
      (s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL) && 
      !atk.status.usedSkills.includes(s.id)
    );
    
    activeSkills.forEach(s => actionPool.push({ type: 'SKILL', id: s.id, weight: 30 }));
    if (atk.status.disarmed <= 0 && atk.weapons.length > 0) {
      atk.weapons.forEach(wid => actionPool.push({ type: 'WEAPON', id: wid, weight: 50 }));
    }
    actionPool.push({ type: 'PUNCH', weight: 20 });

    const totalWeight = actionPool.reduce((s, a) => s + a.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = actionPool[actionPool.length - 1];
    for (const a of actionPool) { if (rand < a.weight) { selected = a; break; } rand -= a.weight; }

    turn.actionType = selected.type;
    turn.actionId = selected.id;

    // 4. 执行具体逻辑
    let baseDmg = 0;
    let hitRate = 0.75 + (atk.agi - def.agi) * 0.01;
    if (def.skills.includes('s13')) hitRate -= 0.07; // 凌波微步

    let actionName = "普通攻击";
    let logSuffix = "";
    let healAmount = 0;
    let selfEffectLog = "";

    if (selected.type === 'SKILL') {
      const s = SKILLS.find(sk => sk.id === selected.id)!;
      actionName = `使用了技能【${s.name}】`;
      atk.status.usedSkills.push(s.id); 
      
      switch (s.id) {
        case 's15': // 神来一击
          hitRate = 0.05; baseDmg = Math.max(1, def.hp - 1); break;
        case 's17': // 缴械
          baseDmg = atk.str * 0.5;
          if (Math.random() < 0.5) {
            turn.statusChanges.disarmed = 3;
            const seized = seizeWeapons(atk, def);
            logSuffix = seized.length > 0 ? `并夺取了对方的武器！` : `，但对方没有武器可夺！`;
          } else { logSuffix = "，缴械失败！"; }
          break;
        case 's18': // 残影
          baseDmg = 0; hitRate = 1.0; turn.statusChanges.afterimage = 3; break;
        case 's19': // 晴天霹雳
          baseDmg = 15 + atk.level * 1.5; hitRate += 0.1; break;
        case 's20': // 龙卷风
          baseDmg = 20 + atk.str * 0.9; break;
        case 's21': // 矿泉水
          baseDmg = atk.str * 0.5; healAmount = Math.floor(atk.maxHp * 0.25);
          selfEffectLog = `恢复了 ${healAmount} 点生命`; break;
        case 's22': // 胶水
          baseDmg = 5; turn.statusChanges.sticky = 3; logSuffix = "并黏住了对手！"; break;
        case 's23': // 天使之翼
          baseDmg = 15 + atk.agi; hitRate = 100; break;
        case 's24': // 佛山无影脚
          baseDmg = 30 + atk.str * 0.5; break;
        case 's25': // 势如暴雨
          const throwables = atk.weapons.filter(wid => WEAPONS.find(w => w.id === wid)?.type === WeaponType.THROW).slice(0, 3);
          baseDmg = throwables.length * 15 + atk.str;
          atk.weapons = atk.weapons.filter(wid => !throwables.includes(wid));
          logSuffix = `，投掷了 ${throwables.length} 件暗器！`; break;
        case 's26': // 企鹅吼
          baseDmg = 15; turn.statusChanges.stunned = 1; logSuffix = "震晕了对手！"; break;
        case 's27': // 企鹅挠痒
          baseDmg = 5; turn.statusChanges.dots = [{ id: 'scratch', dmg: 5 + Math.floor(atk.agi * 0.2), duration: 6 }];
          logSuffix = "造成了持续流血！"; break;
        case 's28': // 师傅驾到
          baseDmg = atk.str * 0.8; hitRate = 100; healAmount = Math.floor(atk.maxHp * 0.1);
          selfEffectLog = `师傅喂了口饭，回血 ${healAmount}`; break;
        case 's29': // 捷波波
          baseDmg = 50; break;
        case 's30': // 如来神掌
          baseDmg = Math.floor(def.hp * 0.5); hitRate = 0.8; break;
        default: baseDmg = atk.str * 1.5;
      }
    } else if (selected.type === 'WEAPON') {
      const w = WEAPONS.find(we => we.id === selected.id)!;
      actionName = `使用了武器【${w.name}】`;
      baseDmg = w.baseDmg[0] + Math.random() * (w.baseDmg[1] - w.baseDmg[0]);
      atk.weapons = atk.weapons.filter(id => id !== w.id); // 消耗

      if (w.type === WeaponType.LARGE && atk.skills.includes('s14')) baseDmg *= 1.1;
      if ((w.type === WeaponType.SMALL || w.type === WeaponType.MEDIUM) && atk.skills.includes('s31')) baseDmg *= 1.15;
      if (atk.skills.includes('s6')) baseDmg *= 1.2;

      // 武器特技逻辑
      switch (w.id) {
        case 'w1': if (Math.random() < 0.1) { atk.status.invincible = 1; selfEffectLog = "触发格挡姿态！"; } break;
        case 'w2': if (Math.random() < 0.1) hitRate = 0; break;
        case 'w3': case 'w4': case 'w7': case 'w20':
          let stunChance = w.id === 'w7' ? 0.15 : 0.05;
          if (Math.random() < stunChance) { turn.statusChanges.stunned = 1; logSuffix = "击晕了对手！"; } break;
        case 'w6': case 'w17': case 'w21': hitRate = 100; if(w.id==='w21' && Math.random()<0.05) baseDmg=9999; break;
        case 'w23': baseDmg = 1; turn.statusChanges.sticky = 3; logSuffix = "黏住了对手！"; break;
        case 'w24': turn.statusChanges.dots = [{ id: 'cactus', dmg: 5, duration: 3 }]; break;
      }
    } else {
      actionName = "空手攻击";
      baseDmg = atk.str * 0.8;
      if (atk.skills.includes('s7')) baseDmg *= 1.2;
    }

    // 5. 命中判定与伤害结算
    if (def.status.invincible > 0) { hitRate = 0; logSuffix = "（被对方格挡了）"; }
    if (atk.status.afterimage > 0) baseDmg *= 1.2;

    const isHit = Math.random() < hitRate;
    turn.isHit = isHit;

    if (isHit) {
      // 暴击
      if (Math.random() < (atk.agi * 0.005)) { baseDmg *= 1.5; logSuffix += " (暴击!)"; }
      if (def.skills.includes('s12')) baseDmg *= 0.8; // 皮糙肉厚

      let finalDmg = Math.floor(baseDmg);
      
      // 装死判断
      if (def.skills.includes('s16') && def.hp > 1 && finalDmg >= def.hp && !def.status.usedSkills.includes('s16_trigger')) {
        finalDmg = def.hp - 1;
        logSuffix += " (对方触发装死!)";
        def.status.usedSkills.push('s16_trigger');
      }

      turn.damage = finalDmg;
      def.hp = Math.max(0, def.hp - finalDmg);

      // 吸血
      if (atk.skills.includes('s32')) {
        const vamp = Math.floor(finalDmg * 0.3);
        healAmount += vamp; selfEffectLog += ` 吸取了 ${vamp} 生命`;
      }

      // 应用状态
      if (turn.statusChanges.sticky) def.status.sticky = turn.statusChanges.sticky;
      if (turn.statusChanges.disarmed) def.status.disarmed = turn.statusChanges.disarmed;
      if (turn.statusChanges.stunned) def.status.stunned = turn.statusChanges.stunned;
      if (turn.statusChanges.dots) def.status.dots.push(...turn.statusChanges.dots);
    }

    if (healAmount > 0) atk.hp = Math.min(atk.maxHp, atk.hp + healAmount);

    // 6. 记录日志
    turn.logs.push({ 
      attacker: atk.name, 
      text: `${actionName}${isHit ? '' : '但落空了'}${logSuffix}${selfEffectLog ? '，' + selfEffectLog : ''}` 
    });

    turns.push(turn);

    if (def.hp <= 0) {
      winner = isP ? 'P' : 'N';
    } else {
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
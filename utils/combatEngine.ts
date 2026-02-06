
import { CharacterData, Friend, BattleRecord, BattleTurn, FighterSnapshot, SkillCategory, AttackModule } from '../types';
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

export const simulateBattle = (player: CharacterData, opponent: FighterSnapshot): BattleRecord => {
  const p = createSnapshot(player);
  const n = { ...opponent };
  const turns: BattleTurn[] = [];
  
  // 实时状态追踪（仅用于计算过程）
  const state = {
    p: { ...p, status: { disarmed: 0, sticky: 0, afterimage: 0, dots: [] as any[], usedSkills: [] as string[] } },
    n: { ...n, status: { disarmed: 0, sticky: 0, afterimage: 0, dots: [] as any[], usedSkills: [] as string[] } }
  };

  let currentSide: 'P' | 'N' = state.p.spd >= state.n.spd ? 'P' : 'N';
  let winner: 'P' | 'N' | null = null;
  let maxTurns = 100;

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

    // 1. 处理 DOT
    if (atk.status.dots.length > 0) {
      const dotDmg = atk.status.dots.reduce((sum, d) => sum + d.dmg, 0);
      atk.hp = Math.max(0, atk.hp - dotDmg);
      turn.logs.push({ attacker: '系统', text: `${atk.name} 受到持续伤害 -${dotDmg}` });
      if (atk.hp <= 0) {
        winner = isP ? 'N' : 'P';
        turns.push(turn);
        break;
      }
    }

    // 2. 衰减状态
    atk.status.disarmed = Math.max(0, atk.status.disarmed - 1);
    atk.status.sticky = Math.max(0, atk.status.sticky - 1);
    atk.status.afterimage = Math.max(0, atk.status.afterimage - 1);
    atk.status.dots = atk.status.dots.map(d => ({ ...d, duration: d.duration - 1 })).filter(d => d.duration > 0);

    if (atk.status.sticky > 0) {
      turn.logs.push({ attacker: atk.name, text: '被黏住了，无法行动！' });
      turns.push(turn);
      currentSide = isP ? 'N' : 'P';
      continue;
    }

    // 3. 选择动作
    const actionPool: any[] = [];
    const activeSkills = SKILLS.filter(s => atk.skills.includes(s.id) && (s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL) && !atk.status.usedSkills.includes(s.id));
    activeSkills.forEach(s => actionPool.push({ type: 'SKILL', id: s.id, weight: 40 }));
    if (atk.status.disarmed <= 0 && atk.weapons.length > 0) {
      atk.weapons.forEach(wid => actionPool.push({ type: 'WEAPON', id: wid, weight: 45 }));
    }
    actionPool.push({ type: 'PUNCH', weight: 15 });

    const totalWeight = actionPool.reduce((s, a) => s + a.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = actionPool[actionPool.length - 1];
    for (const a of actionPool) { if (rand < a.weight) { selected = a; break; } rand -= a.weight; }

    turn.actionType = selected.type;
    turn.actionId = selected.id;

    // 4. 计算命中和伤害
    let baseDmg = atk.str * 1.5;
    let actionName = "普通攻击";
    let isHit = Math.random() >= Math.min(0.35, (def.agi + (def.skills.includes('s13') ? 7 : 0)) / 100);

    if (selected.type === 'SKILL') {
      const s = SKILLS.find(sk => sk.id === selected.id)!;
      actionName = `使用了技能【${s.name}】`;
      atk.status.usedSkills.push(s.id);
      if (s.id === 's15') { isHit = Math.random() < 0.05; baseDmg = def.hp - 1; }
      else if (s.id === 's22') { isHit = true; baseDmg = 0; turn.statusChanges.sticky = 3; }
      else if (s.id === 's18') { isHit = true; baseDmg = 0; turn.statusChanges.afterimage = 4; }
      else baseDmg = atk.str * 2.5;
    } else if (selected.type === 'WEAPON') {
      const w = WEAPONS.find(we => we.id === selected.id)!;
      actionName = `使用了武器【${w.name}】`;
      baseDmg = w.baseDmg[0] + Math.random() * (w.baseDmg[1] - w.baseDmg[0]);
      atk.weapons = atk.weapons.filter(id => id !== w.id);
      if (w.id === 'w23') { isHit = true; baseDmg = 0; turn.statusChanges.sticky = 3; }
      if (w.id === 'w24') { turn.statusChanges.dots = [{ id: 'poison', dmg: 10, duration: 3 }]; }
    }

    turn.isHit = isHit;
    turn.damage = isHit ? Math.floor(baseDmg * (atk.status.afterimage > 0 ? 1.2 : 1)) : 0;
    turn.logs.push({ attacker: atk.name, text: actionName });
    if (!isHit) turn.logs.push({ attacker: def.name, text: '巧妙地闪避了！' });

    // 5. 应用状态变化
    if (isHit) {
      def.hp = Math.max(0, def.hp - turn.damage);
      if (turn.statusChanges.sticky) def.status.sticky = turn.statusChanges.sticky;
      if (turn.statusChanges.disarmed) def.status.disarmed = turn.statusChanges.disarmed;
      if (turn.statusChanges.dots) def.status.dots.push(...turn.statusChanges.dots);
      if (turn.statusChanges.afterimage) atk.status.afterimage = turn.statusChanges.afterimage;
    }

    turns.push(turn);
    if (def.hp <= 0) { winner = isP ? 'P' : 'N'; }
    else { currentSide = isP ? 'N' : 'P'; }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    player: p,
    opponent: n,
    turns,
    winner: winner || 'N'
  };
};

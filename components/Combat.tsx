
import React, { useState, useEffect, useRef } from 'react';
import { CharacterData, BattleLog, Weapon, Skill, WeaponType, SkillCategory } from '../types';
import { WEAPONS, SKILLS, DRESSINGS } from '../constants';
import CharacterVisual from './CharacterVisual';

interface CombatProps {
  player: CharacterData;
  onWin: (gold: number, exp: number) => void;
  onLoss: (exp: number) => void;
}

interface Fighter {
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  str: number;
  agi: number;
  spd: number;
  level: number;
  weapons: string[];
  skills: string[];
  currentWeapon: Weapon | null;
  statuses: { [key: string]: number };
  passivesUsed: Set<string>;
  usedActives: Set<string>;
  blockCount: number;
  isDead: boolean;
  hasPlayedDead: boolean;
  nextHitGuaranteed: boolean;
}

interface VisualEffect {
  id: number;
  type: 'damage' | 'heal' | 'status';
  text: string;
  isPlayer: boolean;
}

const Combat: React.FC<CombatProps> = ({ player, onWin, onLoss }) => {
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [fighters, setFighters] = useState<{ p: Fighter; n: Fighter } | null>(null);
  const [turn, setTurn] = useState<'P' | 'N'>('P');
  const [battleOver, setBattleOver] = useState(false);
  const [animating, setAnimating] = useState<'P' | 'N' | null>(null);
  const [pFrame, setPFrame] = useState(0); 
  const [nFrame, setNFrame] = useState(0); 
  const [shaking, setShaking] = useState<'P' | 'N' | null>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    let interval: number | null = null;
    if (animating === 'P') {
      interval = window.setInterval(() => {
        setPFrame(prev => (prev % 5) + 1);
      }, 80);
    } else if (animating === 'N') {
      interval = window.setInterval(() => {
        setNFrame(prev => (prev % 5) + 1);
      }, 80);
    } else {
      setPFrame(0);
      setNFrame(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [animating]);

  useEffect(() => {
    const npcLevel = Math.max(1, player.level + Math.floor(Math.random() * 5) - 2);
    const npc: Fighter = {
      name: '神秘挑战者',
      isPlayer: false,
      hp: 50 + npcLevel * 10,
      maxHp: 50 + npcLevel * 10,
      str: 5 + (npcLevel - 1),
      agi: 5 + (npcLevel - 1),
      spd: 5 + (npcLevel - 1),
      level: npcLevel,
      weapons: WEAPONS.slice(0, 3).map(w => w.id),
      skills: SKILLS.slice(0, 3).map(s => s.id),
      currentWeapon: null,
      statuses: {},
      passivesUsed: new Set(),
      usedActives: new Set(),
      blockCount: 0,
      isDead: false,
      hasPlayedDead: false,
      nextHitGuaranteed: false
    };

    const pFighter: Fighter = {
      name: '你',
      isPlayer: true,
      hp: player.maxHp,
      maxHp: player.maxHp,
      str: player.str,
      agi: player.agi,
      spd: player.spd,
      level: player.level,
      weapons: [...player.weapons],
      skills: [...player.skills],
      currentWeapon: null,
      statuses: {},
      passivesUsed: new Set(),
      usedActives: new Set(),
      blockCount: 0,
      isDead: false,
      hasPlayedDead: false,
      nextHitGuaranteed: false
    };

    setFighters({ p: pFighter, n: npc });

    let speedDecision: 'P' | 'N';
    let speedLog: string;

    if (pFighter.spd > npc.spd) {
      speedDecision = 'P';
      speedLog = `⚡ 你的速度 (${pFighter.spd}) 高于对手 (${npc.spd})，取得先手！`;
    } else if (npc.spd > pFighter.spd) {
      speedDecision = 'N';
      speedLog = `💨 对手速度 (${npc.spd}) 极快，抢占了先手位置！`;
    } else {
      const luck = Math.random() > 0.5;
      speedDecision = luck ? 'P' : 'N';
      speedLog = `⚖️ 双方速度势均力敌，最终由 ${luck ? '你' : '对手'} 获得了先手。`;
    }

    setTurn(speedDecision);
    setLogs([
      { attacker: '系统', text: `⚔️ 决斗开始！对方企鹅 Lv.${npcLevel} 已经就绪。` },
      { attacker: '系统', text: speedLog }
    ]);
  }, []);

  const triggerEffect = (text: string, isPlayer: boolean, type: 'damage' | 'heal' | 'status' = 'damage') => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, text, isPlayer, type }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 1000);
  };

  const addLog = (log: BattleLog) => setLogs(prev => [...prev, log]);

  const processTurn = async () => {
    if (!fighters || battleOver) return;
    const currentTurn = turn;
    const attacker = currentTurn === 'P' ? fighters.p : fighters.n;
    const defender = currentTurn === 'P' ? fighters.n : fighters.p;

    if (attacker.hp <= 0) return;

    if (attacker.statuses['眩晕'] > 0 || attacker.statuses['跳过'] > 0) {
      addLog({ attacker: attacker.name, text: `正处于眩晕状态，无法动弹...` });
      triggerEffect('眩晕中', attacker.isPlayer, 'status');
      updateStatus(attacker);
      setTimeout(endTurn, 1000);
      return;
    }

    setAnimating(currentTurn);
    await new Promise(r => setTimeout(r, 600));

    const procRate = 0.2 + attacker.spd * 0.005;
    let actionTaken = false;

    if (Math.random() < procRate) {
      const skills = attacker.skills.filter(id => {
        const s = SKILLS.find(sk => sk.id === id);
        return s && (s.category === SkillCategory.ACTIVE || s.category === SkillCategory.SPECIAL) && !attacker.usedActives.has(id);
      });
      if (skills.length > 0) {
        executeSkill(skills[Math.floor(Math.random() * skills.length)], attacker, defender);
        actionTaken = true;
      } else if (attacker.weapons.length > 0) {
        const wp = WEAPONS.find(w => w.id === attacker.weapons[Math.floor(Math.random() * attacker.weapons.length)]);
        if (wp) { executeWeaponAttack(wp, attacker, defender); actionTaken = true; }
      }
    }

    if (!actionTaken) executeNormalAttack(attacker, defender);

    setAnimating(null);
    updateStatus(attacker);
    setTimeout(endTurn, 800);
  };

  const executeNormalAttack = (atk: Fighter, def: Fighter) => {
    addLog({ attacker: atk.name, text: `发动了一次迅猛的肉搏！` });
    performHit(atk, def, atk.str, { isMelee: true });
  };

  const executeWeaponAttack = (wp: Weapon, atk: Fighter, def: Fighter) => {
    addLog({ attacker: atk.name, text: `施展「${wp.name}」技巧进行重击！` });
    const dmg = Math.floor(Math.random() * (wp.baseDmg[1] - wp.baseDmg[0] + 1)) + wp.baseDmg[0] + Math.floor(atk.str * 0.5);
    if (performHit(atk, def, dmg, { isWeapon: true })) {
      if (wp.id === 'w20' && Math.random() < 0.1) {
        def.statuses['眩晕'] = 1;
        addLog({ attacker: '系统', text: `${def.name} 被板砖拍晕了！` });
      }
    }
  };

  const executeSkill = (sid: string, atk: Fighter, def: Fighter) => {
    const s = SKILLS.find(sk => sk.id === sid);
    if (!s) return;
    addLog({ attacker: atk.name, text: `使出秘技：【${s.name}】！` });
    atk.usedActives.add(sid);
    if (sid === 's19') performHit(atk, def, 30, { mustHit: true });
    else if (sid === 's21') {
      const heal = Math.floor(atk.maxHp * 0.2);
      atk.hp = Math.min(atk.maxHp, atk.hp
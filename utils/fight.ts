import { Dispatch, SetStateAction, MutableRefObject } from 'react';
import { playSFX } from './audio';
import config from '../config';

/**
 * 根据ID和类型查找投射物资源路径
 * @param id 武器/技能ID
 * @param type 类型（WEAPON/SKILL/PUNCH）
 * @returns 资源路径 | null
 */
export const findProjectileAsset = (id?: string, type?: 'WEAPON' | 'SKILL' | 'PUNCH') => {
  if (!id || !window.assetMap) return null;
  let paths: string[] = [];
  if (type === 'SKILL') {
    paths = [`Images/${id}_throw.png`, `Images/${id}_projectile.png`, `Images/${id}_projectile1.png`];
  } else {
    paths = [`Images/${id}_throw.png`, `Images/${id}_projectile.png`, `Images/${id}_throw1.png`, `Images/${id}_atk1.png`];
  }
  for (const p of paths) {
    if (window.assetMap.has(p)) return window.assetMap.get(p);
  }
  return null;
};

/**
 * 解析攻击偏移量（支持 MELEE/BASE + 增量 格式）
 * @param offsetStr 偏移量字符串（如 MELEE+50 / BASE）
 * @param containerWidth 容器宽度
 * @param isMobile 是否移动端
 * @returns 计算后的偏移量数值
 */
export const parseAttackOffset = (
  offsetStr?: string,
  containerWidth: number = 1000,
  isMobile: boolean = window.innerWidth < 768
): number => {
  if (!offsetStr) {
    console.warn('[Combat Utils] offset 为空/undefined');
    return 0;
  }

  const offsetMatch = offsetStr.match(/^([A-Z]+)(\+(\d+))?$/);
  if (!offsetMatch) {
    console.warn(`[Combat Utils] offset 格式不匹配，原始值: ${offsetStr}`);
    return 0;
  }

  const baseOffsetType = offsetMatch[1];
  const offsetAdd = Number(offsetMatch[3] || 0);
  console.log(`[Combat Utils] offset 解析结果: 基础类型=${baseOffsetType}, 增量=${offsetAdd}`);

  if (baseOffsetType === 'MELEE') {
    const pct = isMobile ? config.combat.spacing.meleeDistancePctMobile : config.combat.spacing.meleeDistancePctPC;
    const baseDx = (containerWidth * pct) / 100;
    const dx = baseDx + offsetAdd;
    console.log(`[Combat Utils] MELEE偏移计算: 容器宽度=${containerWidth}, 百分比=${pct}%, 基础值=${baseDx}, 最终dx=${dx}`);
    return dx;
  } else if (baseOffsetType === 'BASE') {
    const pct = isMobile ? config.combat.spacing.baseActionOffsetPctMobile : config.combat.spacing.baseActionOffsetPctPC;
    const baseDx = (containerWidth * pct) / 100;
    const dx = baseDx + offsetAdd;
    console.log(`[Combat Utils] BASE偏移计算: 容器宽度=${containerWidth}, 百分比=${pct}%, 基础值=${baseDx}, 最终dx=${dx}`);
    return dx;
  } else {
    console.warn(`[Combat Utils] 未知offset类型:${baseOffsetType}，dx兜底为0`);
    return 0;
  }
};

/**
 * 播放攻击命中音效（THROW模块特殊处理：循环3次）
 * @param hitSfx 音效名称
 * @param module 攻击模块（如 THROW/PUNCH/SLASH）
 */
export const playHitSFX = (hitSfx?: string, module?: string) => {
  if (!hitSfx) return;

  if (module === 'THROW') {
    // 投掷动作：循环3次播放，每次间隔100ms，匹配弹幕发射节奏
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playSFX(hitSfx), i * 100);
    }
  } else {
    // 普通动作：单次播放
    playSFX(hitSfx);
  }
};

/**
 * 生成投射物（通用逻辑）
 * @param projectileCounter 投射物计数器Ref
 * @param setProjectiles 投射物状态更新函数
 * @param startX 起始X坐标
 * @param targetX 目标X坐标
 * @param asset 投射物资源
 * @param side 阵营（P/N）
 * @param type 类型（WEAPON/SKILL/TEXT 等）
 */
export const generateProjectiles = (
  projectileCounter: MutableRefObject<number>,
  setProjectiles: Dispatch<SetStateAction<any[]>>,
  startX: number,
  targetX: number,
  asset: any,
  side: string,
  type?: string
) => {
  for (let j = 0; j < 3; j++) {
    setTimeout(() => {
      const pId = ++projectileCounter.current;
      const projectileData = type ? { id: pId, startX, targetX, asset, side, type } : { id: pId, startX, targetX, asset, side };
      setProjectiles(prev => [...prev, projectileData]);
      setTimeout(() => setProjectiles(prev => prev.filter(p => p.id !== pId)), 800);
    }, j * 120);
  }
};

/**
 * 应用伤害效果（通用逻辑）
 * @param dmg 伤害值
 * @param isPlayer 是否玩家受击
 * @param setProjectiles 投射物状态更新函数
 * @param defSetter 防御方视觉状态更新函数
 */
export const applyImpact = (
  dmg: number,
  isPlayer: boolean,
  setProjectiles: Dispatch<SetStateAction<any[]>>,
  defSetter: Dispatch<SetStateAction<{ state: string; frame: number; weaponId?: string }>>
) => {
  const id = Date.now();
  setProjectiles(prev => [...prev, { id: `dmg-${id}`, text: `-${dmg}`, isPlayer, color: '#ef4444', type: 'TEXT' }]);
  setTimeout(() => setProjectiles(prev => prev.filter(e => e.id !== `dmg-${id}`)), 800);
  defSetter((v: any) => ({ ...v, state: 'HURT', frame: 1 }));
  setTimeout(() => defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })), 400);
};

/**
 * 应用闪避效果（通用逻辑）
 * @param isPlayer 是否玩家闪避
 * @param setProjectiles 投射物状态更新函数
 * @param defSetter 防御方视觉状态更新函数
 */
export const applyMiss = (
  isPlayer: boolean,
  setProjectiles: Dispatch<SetStateAction<any[]>>,
  defSetter: Dispatch<SetStateAction<{ state: string; frame: number; weaponId?: string }>>
) => {
  const id = Date.now();
  setProjectiles(prev => [...prev, { id: `miss-${id}`, text: 'MISS', isPlayer, color: '#94a3b8', type: 'TEXT' }]);
  setTimeout(() => setProjectiles(prev => prev.filter(e => e.id !== `miss-${id}`)), 800);
  defSetter((v: any) => ({ ...v, state: 'DODGE', frame: 1 }));
  setTimeout(() => defSetter((v: any) => ({ ...v, state: 'IDLE', frame: 1 })), 400);
};
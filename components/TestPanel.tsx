import React, { useState, useEffect, useRef } from 'react';
import { CharacterData, Weapon, AttackModule, WeaponType, Skill, SkillCategory, VisualState } from '../types';
import { DRESSINGS, WEAPONS, SKILLS } from '../constants';
import { DEFAULT_ATTACK_MODULE, DEFAULT_SFX, DEFAULT_HIT_SFX } from '../constants/combat';
import CharacterVisual from './CharacterVisual';
import { playSFX, playUISound } from '../utils/audio';
import { findProjectileAsset, parseAttackOffset, playHitSFX, generateProjectiles, applyImpact } from '../utils/fight';
import config from '../config';
import '../styles/combat-animations.css'; // 引入公共样式

interface TestPanelProps {
  player: CharacterData;
  isDebugMode?: boolean;
  onBack: () => void;
}

const TestPanel: React.FC<TestPanelProps> = ({ player, isDebugMode = false, onBack }) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(WEAPONS[0].id);
  const [selectedSkillId, setSelectedSkillId] = useState<string>(SKILLS[0].id);
  const [testType, setTestType] = useState<'WEAPON' | 'SKILL'>('WEAPON');
  
  // Attacker State
  const [atkVisual, setAtkVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1, weaponId: player.dressing.WEAPON });
  const [atkOffset, setAtkOffset] = useState({ x: 0, y: 0 });
  
  // Defender State (Dummy)
  const [defVisual, setDefVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ state: 'IDLE', frame: 1 });
  const [defHp, setDefHp] = useState(1000);
  
  const [projectiles, setProjectiles] = useState<any[]>([]);
  const [shaking, setShaking] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const projectileCounter = useRef(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const atkRef = useRef<HTMLDivElement>(null);
  const defRef = useRef<HTMLDivElement>(null);

  // Idle animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isTesting) {
        setAtkVisual(v => (v.state === 'IDLE' ? { ...v, frame: (v.frame % 2) + 1 } : v));
        setDefVisual(v => (v.state === 'IDLE' ? { ...v, frame: (v.frame % 2) + 1 } : v));
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isTesting]);

  const runTest = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setDefHp(1000); // Reset HP

    let module: any = DEFAULT_ATTACK_MODULE;
    let visualId = undefined;
    let sfx = DEFAULT_SFX.punch;
    let hitSfx = DEFAULT_HIT_SFX.blunt;
    let actionType: 'WEAPON' | 'SKILL' = 'WEAPON';

    if (testType === 'WEAPON') {
      const w = WEAPONS.find(we => we.id === selectedWeaponId);
      module = w?.module || 'SLASH';
      sfx = w?.sfx || DEFAULT_SFX.slash;
      hitSfx = w?.hitSfx || DEFAULT_HIT_SFX.blunt;
      visualId = w?.id;
      actionType = 'WEAPON';
    } else {
      const s = SKILLS.find(sk => sk.id === selectedSkillId);
      module = s?.module || DEFAULT_ATTACK_MODULE;
      sfx = s?.sfx || DEFAULT_SFX.skillCast;
      hitSfx = s?.hitSfx || DEFAULT_HIT_SFX.heavy;
      visualId = s?.id;
      actionType = 'SKILL';
    }

    const seq = config.ATTACK_SEQUENCES[module] || config.ATTACK_SEQUENCES.PUNCH;
    const totalLoops = seq.repeat || 1;

    // 打印测试基础信息
    console.log(`[TestPanel] 开始测试 - 类型=${testType}, 选中ID=${testType === 'WEAPON' ? selectedWeaponId : selectedSkillId}, 攻击模块=${module}`);
    console.log(`[TestPanel] 攻击序列配置:`, seq);

    for (let loop = 0; loop < totalLoops; loop++) {
      console.log(`[TestPanel] 第${loop}轮攻击开始`);
      for (const step of seq.steps) {
        const containerWidth = containerRef.current?.offsetWidth || 1000;
        const containerHeight = containerRef.current?.offsetHeight || 450;
        const isMobile = window.innerWidth < 768;

        // 调用公共偏移解析函数
        const dx = parseAttackOffset(step.offset, containerWidth, isMobile);
        const dy = (containerHeight * (step.offsetY || 0)) / 100;
        console.log(`[TestPanel] 第${loop}轮 最终偏移量: dx=${dx}, dy=${dy}`);

        setAtkOffset({ x: dx, y: dy });
        setAtkVisual({ 
          state: step.state as VisualState, 
          frame: step.frame, 
          weaponId: visualId || player.dressing.WEAPON 
        });

        if (step.playSfx) playSFX(sfx);

        if (step.shaking === 'SCREEN') {
          setShaking(true);
          setTimeout(() => setShaking(false), 400);
        }

        if (step.projectile) {
           const startX = 200; // Approximate left position
           const targetX = containerWidth - 200; // Approximate right position
           const asset = findProjectileAsset(visualId, actionType);
           
           console.log(`[TestPanel] 第${loop}轮 生成投射物: startX=${startX}, targetX=${targetX}, asset=${asset ? '存在' : '不存在'}`);
           
           // 调用公共投射物生成函数
           generateProjectiles(
             projectileCounter,
             setProjectiles,
             startX,
             targetX,
             asset,
             'P'
           );
        }

        if (step.calculateHit) {
          const hitDelay = module === 'THROW' ? 450 : 0;
          setTimeout(() => {
            // 调用公共音效播放函数
            playHitSFX(hitSfx, module);
            
            // Damage Number
            const dmg = Math.floor(Math.random() * 50) + 10;
            // 调用公共伤害应用函数
            applyImpact(dmg, false, setProjectiles, setDefVisual);

            setDefHp(prev => Math.max(0, prev - dmg));
            console.log(`[TestPanel] 第${loop}轮 命中生效: 伤害=${dmg}, 剩余HP=${Math.max(0, defHp - dmg)}`);

          }, hitDelay);
        }

        await new Promise(r => setTimeout(r, step.delay));
      }
    }

    // Reset
    console.log(`[TestPanel] 测试结束，重置状态`);
    setAtkOffset({ x: 0, y: 0 });
    setAtkVisual({ state: 'IDLE', frame: 1, weaponId: player.dressing.WEAPON });
    setIsTesting(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden mb-6 p-4">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
           <h2 className="text-xl font-black text-slate-800">实验室 (Test Lab)</h2>
           <button onClick={onBack} className="text-slate-400 hover:text-slate-600 font-bold">退出</button>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex gap-2">
            <button onClick={() => setTestType('WEAPON')} className={`px-4 py-2 rounded-lg font-bold ${testType === 'WEAPON' ? 'bg-orange-500 text-white' : 'bg-slate-200'}`}>测试武器</button>
            <button onClick={() => setTestType('SKILL')} className={`px-4 py-2 rounded-lg font-bold ${testType === 'SKILL' ? 'bg-blue-500 text-white' : 'bg-slate-200'}`}>测试技能</button>
          </div>

          {testType === 'WEAPON' ? (
             <select className="border-2 border-slate-200 rounded-lg px-3 py-2 font-bold" value={selectedWeaponId} onChange={e => setSelectedWeaponId(e.target.value)}>
               {WEAPONS.map(w => <option key={w.id} value={w.id}>{w.name} ({w.module})</option>)}
             </select>
          ) : (
             <select className="border-2 border-slate-200 rounded-lg px-3 py-2 font-bold" value={selectedSkillId} onChange={e => setSelectedSkillId(e.target.value)}>
               {SKILLS.filter(s => s.module).map(s => <option key={s.id} value={s.id}>{s.name} ({s.module})</option>)}
             </select>
          )}
          
          <button onClick={runTest} disabled={isTesting} className="bg-emerald-500 text-white px-8 py-2 rounded-lg font-black shadow-lg active:scale-95 transition-all disabled:opacity-50">
            {isTesting ? '测试中...' : '开始测试'}
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className={`relative w-full max-w-4xl h-[400px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 ${shaking ? 'animate-heavyShake' : ''}`}>
        <div ref={containerRef} className="absolute inset-0 flex items-end justify-between px-20 pb-16">
           
           {/* Attacker */}
           <div ref={atkRef} style={{ transform: `translate(${atkOffset.x}px, ${atkOffset.y}px)`, transition: 'transform 0.2s linear' }} className="relative z-10">
              <CharacterVisual name={player.name} state={atkVisual.state} frame={atkVisual.frame} weaponId={atkVisual.weaponId} />
           </div>

           {/* Defender (Dummy) */}
           <div ref={defRef} className="relative z-10 scale-x-[-1]">
              <CharacterVisual name="木桩人偶" isNpc state={defVisual.state} frame={defVisual.frame} />
              <div className="absolute -top-10 left-0 w-full text-center scale-x-[-1]">
                 <div className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full">{defHp} HP</div>
              </div>
           </div>

        </div>

        {/* Projectiles & Damage Text */}
        <div className="absolute inset-0 z-50 pointer-events-none">
          {projectiles.map(p => {
             if (p.type === 'TEXT') {
               return (
                 <div key={p.id} className="absolute animate-damage text-4xl font-black text-center w-40" style={{ left: '60%', top: '40%', color: p.color }}>
                   {p.text}
                 </div>
               );
             }
             return (
               <div 
                 key={p.id} 
                 className="absolute w-16 h-16 flex items-center justify-center animate-projectile-pro"
                 style={{
                   left: `${p.startX}px`,
                   bottom: window.innerWidth < 768 ? config.combat.spacing.testProjectileBottomMobile : config.combat.spacing.testProjectileBottomPC,
                   '--tx': `${p.targetX - p.startX}px`
                 } as any}
               >
                 {p.asset ? (
                   <img src={p.asset} className="w-full h-full object-contain" alt="projectile" />
                 ) : (
                   <div className="w-6 h-6 bg-yellow-400 rounded-full shadow-lg" />
                 )}
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default TestPanel;
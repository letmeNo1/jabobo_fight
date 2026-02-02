import React, { useState, useEffect, useRef } from 'react';
import { CharacterData, Weapon, AttackModule } from '../types';
import { DRESSINGS, WEAPONS } from '../constants';
import CharacterVisual, { VisualState } from './CharacterVisual';

interface TestPanelProps {
  player: CharacterData;
  isDebugMode?: boolean;
  onBack: () => void;
}

interface Projectile {
  id: number;
  startX: number;
  targetX: number;
  weaponId?: string;
}

const TestPanel: React.FC<TestPanelProps> = ({ player, isDebugMode = false, onBack }) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(player.dressing.WEAPON || 'w1');
  const [visual, setVisual] = useState<{ state: VisualState; frame: number; weaponId?: string }>({ 
    state: 'IDLE', 
    frame: 1, 
    weaponId: selectedWeaponId 
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [moveDuration, setMoveDuration] = useState(300);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projectileCounter = useRef(0);
  const charContainerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisual(v => (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') ? { ...v, frame: v.frame + 1 } : v);
    }, 125);
    return () => clearInterval(timer);
  }, []);

  // 当选择的武器变化时，立即更新空闲状态下的武器预览
  useEffect(() => {
    if (!isAnimating) {
      setVisual(v => ({ ...v, weaponId: selectedWeaponId }));
    }
  }, [selectedWeaponId, isAnimating]);

  const runModule = async (module: AttackModule) => {
    if (isAnimating) return;
    setIsAnimating(true);
    const dir = 200; 
    const currentWeaponId = selectedWeaponId;

    switch (module) {
      case 'CLEAVE':
        setMoveDuration(120);
        setVisual({ state: 'CLEAVE', frame: 1, weaponId: currentWeaponId });
        setOffset({ x: 64, y: -60 });
        await new Promise(r => setTimeout(r, 120));
        
        setMoveDuration(300);
        setVisual({ state: 'CLEAVE', frame: 2, weaponId: currentWeaponId });
        setOffset({ x: dir, y: -260 });
        await new Promise(r => setTimeout(r, 300));
        
        setMoveDuration(80);
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 80));
        
        setVisual({ state: 'CLEAVE', frame: 3, weaponId: currentWeaponId });
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        await new Promise(r => setTimeout(r, 800));
        break;

      case 'PIERCE':
        setMoveDuration(350);
        setVisual({ state: 'RUN', frame: 1, weaponId: currentWeaponId });
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 350));
        for (let loop = 0; loop < 2; loop++) {
          for (let i = 1; i <= 4; i++) {
            setVisual({ state: 'PIERCE', frame: i, weaponId: currentWeaponId });
            await new Promise(r => setTimeout(r, 100));
          }
        }
        break;

      case 'SLASH':
        setMoveDuration(350);
        setVisual({ state: 'RUN', frame: 1, weaponId: currentWeaponId });
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 350));
        for(let i=1; i<=3; i++){ 
          setVisual({ state: 'SLASH', frame: i, weaponId: currentWeaponId });
          await new Promise(r => setTimeout(r, 110));
        }
        break;

      case 'PUNCH':
        setMoveDuration(250);
        setVisual({ state: 'RUN', frame: 1, weaponId: undefined });
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 250));
        for(let i=1; i<=2; i++) {
          setVisual({ state: 'PUNCH', frame: i, weaponId: undefined });
          await new Promise(r => setTimeout(r, 150));
        }
        break;

      case 'SWING':
        setMoveDuration(600);
        setOffset({ x: 64, y: 0 });
        for(let i=1; i<=3; i++) {
          setVisual({ state: 'SWING', frame: i, weaponId: currentWeaponId });
          await new Promise(r => setTimeout(r, 200));
        }
        setMoveDuration(80);
        setOffset({ x: dir, y: 0 });
        setVisual({ state: 'SWING', frame: 4, weaponId: currentWeaponId });
        await new Promise(r => setTimeout(r, 80));
        await new Promise(r => setTimeout(r, 400));
        break;

      case 'THROW':
        for (let loop = 0; loop < 2; loop++) {
          for(let i = 1; i <= 3; i++) {
            setVisual({ state: 'THROW', frame: i, weaponId: currentWeaponId });
            if (i === 2) {
                const mainRect = mainContainerRef.current?.getBoundingClientRect();
                const charRect = charContainerRef.current?.getBoundingClientRect();
                if (mainRect && charRect) {
                  const startX = (charRect.left - mainRect.left + charRect.width / 2);
                  const targetX = startX + 400;
                  const p1Id = ++projectileCounter.current;
                  const p2Id = ++projectileCounter.current;
                  setProjectiles(prev => [
                    ...prev, 
                    { id: p1Id, startX, targetX, weaponId: currentWeaponId },
                    { id: p2Id, startX, targetX, weaponId: currentWeaponId }
                  ]);
                  setTimeout(() => {
                    setProjectiles(prev => prev.filter(p => p.id !== p1Id && p.id !== p2Id));
                  }, 1000);
                }
            }
            await new Promise(r => setTimeout(r, 120));
          }
        }
        break;

      default:
        setVisual({ state: module as any, frame: 1, weaponId: currentWeaponId });
        await new Promise(r => setTimeout(r, 800));
    }

    await new Promise(r => setTimeout(r, 100));
    setMoveDuration(500);
    setVisual(v => ({...v, state: 'IDLE', frame: 1, weaponId: selectedWeaponId }));
    setOffset({ x: 0, y: 0 });
    await new Promise(r => setTimeout(r, 500));
    setIsAnimating(false);
  };

  const getDressingName = (part: 'HEAD' | 'BODY' | 'WEAPON') => {
    return DRESSINGS.find(d => d.id === player.dressing[part])?.name;
  };

  const currentWeapon = WEAPONS.find(w => w.id === selectedWeaponId);

  const modules: { id: AttackModule | 'HURT' | 'IDLE'; label: string; color: string }[] = [
    { id: 'CLEAVE', label: '天崩地裂 (砸地)', color: 'bg-red-600' },
    { id: 'SLASH', label: '追风逐影 (横斩)', color: 'bg-orange-600' },
    { id: 'PUNCH', label: '正拳 (空手)', color: 'bg-amber-600' },
    { id: 'PIERCE', label: '流星赶月 (突刺)', color: 'bg-blue-600' },
    { id: 'SWING', label: '横扫千军 (重挥)', color: 'bg-emerald-600' },
    { id: 'THROW', label: '定海神针 (发劲)', color: 'bg-indigo-600' },
    { id: 'HURT', label: '受击反馈', color: 'bg-gray-600' },
    { id: 'IDLE', label: '重置', color: 'bg-slate-800' },
  ];

  return (
    <div ref={mainContainerRef} className={`bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[88vh] transition-all duration-500 border border-slate-200 ${shaking ? 'animate-heavyShake' : ''}`}>
      <div className="p-8 border-b flex justify-between items-center bg-indigo-700 text-white shadow-xl z-10">
        <div><div className="flex items-center gap-3"><h2 className="text-2xl font-black italic tracking-tighter uppercase">Mega Pro Arena</h2><span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold">V2.6 STABLE</span></div><p className="text-[11px] opacity-70 uppercase font-black tracking-[0.3em] mt-1">Full Weapon Animation Laboratory</p></div>
        <button onClick={onBack} className="bg-white text-indigo-700 hover:bg-slate-100 px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-90 shadow-lg border-b-4 border-indigo-900/20">退出演武</button>
      </div>
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-slate-100 relative">
        <div className="flex-grow relative bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:40px_40px] flex items-center justify-start pl-[20%] overflow-hidden min-h-[450px]">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-100 to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-100 to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-0 z-50 pointer-events-none">
             {projectiles.map((p, idx) => {
               const weaponImg = p.weaponId ? window.assetMap?.get(`Images/${p.weaponId}_throw.png`) : null;
               return (
                 <div 
                   key={p.id}
                   className="absolute bottom-[12%] w-12 h-12 md:w-16 md:h-16 flex items-center justify-center animate-projectile"
                   style={{
                     left: `${p.startX}px`,
                     '--tx': `${p.targetX - p.startX}px`,
                     '--delay': `${idx % 2 === 0 ? '0s' : '0.15s'}`
                   } as any}
                 >
                   {weaponImg ? (
                     <img src={weaponImg} className="w-full h-full object-contain drop-shadow-xl" alt="projectile" />
                   ) : (
                     <div className="w-6 h-6 bg-red-600 rounded-full shadow-[0_0_20px_#ef4444]">
                       <div className="w-full h-full bg-white/30 rounded-full"></div>
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
          <div className="absolute top-8 left-8 flex gap-6 z-20">
            <div className="bg-white/95 backdrop-blur-xl px-6 py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5"><span className="text-[11px] text-indigo-500 font-black block uppercase mb-1 tracking-widest">State</span><span className="font-mono font-black text-slate-800 text-2xl">{visual.state}</span></div>
            <div className="bg-white/95 backdrop-blur-xl px-6 py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5"><span className="text-[11px] text-indigo-500 font-black block uppercase mb-1 tracking-widest">Config Module</span><span className="font-mono font-black text-slate-800 text-2xl">{currentWeapon?.module || 'NONE'}</span></div>
          </div>
          <div ref={charContainerRef} className="relative z-10 transition-transform pointer-events-none" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: isAnimating ? `transform ${moveDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1.1)` : 'none' }}>
            <div className={['CLEAVE', 'PUNCH'].includes(visual.state) ? 'animate-vibrate' : ''}>
              <CharacterVisual 
                state={visual.state} 
                frame={visual.frame} 
                weaponId={visual.weaponId}
                debug={isDebugMode}
                className="scale-[1.35]" 
                accessory={{ head: getDressingName('HEAD'), body: getDressingName('BODY'), weapon: getDressingName('WEAPON') }} 
              />
            </div>
          </div>
          <div className="absolute bottom-[35%] w-64 h-3 bg-indigo-600/10 rounded-full blur-2xl transition-all duration-300" style={{ left: `calc(20% + ${offset.x}px)`, transform: `translateX(48px) scaleX(${isAnimating ? 1.5 : 1})`, opacity: visual.state === 'JUMP' ? 0.15 : 0.7 }}></div>
        </div>
        
        <div className="w-full md:w-[480px] bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
          <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">选择武器并触发配置模组</h3>
              <div className="grid grid-cols-3 gap-2">
                {WEAPONS.map(w => (
                  <button 
                    key={w.id} 
                    onClick={() => {
                      setSelectedWeaponId(w.id);
                      runModule(w.module);
                    }}
                    disabled={isAnimating}
                    className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition-all flex flex-col items-center ${selectedWeaponId === w.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 disabled:opacity-50'}`}
                  >
                    <span>{w.name}</span>
                    <span className="text-[8px] opacity-60">[{w.module}]</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">手动模组测试</h3>
              <div className="grid grid-cols-2 gap-3">
                {modules.map(m => (
                  <button 
                    key={m.id} 
                    disabled={isAnimating && m.id !== 'IDLE'} 
                    onClick={() => {
                      if(m.id === 'IDLE') {
                        setVisual(v => ({...v, state:'IDLE', frame:1, weaponId: selectedWeaponId}));
                        setOffset({x:0,y:0});
                        setIsAnimating(false);
                      } else if(m.id === 'HURT') {
                        runModule('HURT' as any);
                      } else {
                        runModule(m.id as AttackModule);
                      }
                    }} 
                    className={`${m.color} text-white py-4 rounded-2xl font-black shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:opacity-40 flex items-center justify-center`}
                  >
                    <span className="tracking-tight text-sm">{m.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vibrate { 0% { transform: translate(0,0); } 10% { transform: translate(-2px, -2px); } 20% { transform: translate(2px, -2px); } 30% { transform: translate(-2px, 2px); } 40% { transform: translate(2px, 2px); } 50% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, -2px); } 70% { transform: translate(-2px, 2px); } 80% { transform: translate(2px, 2px); } 90% { transform: translate(-2px, -2px); } 100% { transform: translate(0,0); } }
        .animate-vibrate { animation: vibrate 0.1s linear infinite; }
        @keyframes projectile-fly {
          0% { transform: translate(0, 0) scale(0.7) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--tx), -30px) scale(1.1) rotate(1080deg); opacity: 1; }
        }
        .animate-projectile {
          animation: projectile-fly 0.5s cubic-bezier(0.2, 0.8, 0.4, 1) var(--delay) forwards;
        }
        @keyframes heavyShake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-6px, -6px); } 20%, 40%, 60%, 80% { transform: translate(6px, 6px); } }
        .animate-heavyShake { animation: heavyShake 0.4s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default TestPanel;
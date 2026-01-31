import React, { useState, useEffect } from 'react';
import { CharacterData } from '../types';
import { DRESSINGS } from '../constants';
import CharacterVisual, { VisualState } from './CharacterVisual';

interface TestPanelProps {
  player: CharacterData;
  onBack: () => void;
}

const TestPanel: React.FC<TestPanelProps> = ({ player, onBack }) => {
  const [visual, setVisual] = useState<{ state: VisualState; frame: number }>({ state: 'IDLE', frame: 1 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [moveDuration, setMoveDuration] = useState(300);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisual(v => (v.state === 'IDLE' || v.state === 'RUN' || v.state === 'HOME') ? { ...v, frame: v.frame + 1 } : v);
    }, 125);
    return () => clearInterval(timer);
  }, []);

  const runModule = async (module: VisualState) => {
    if (isAnimating) return;
    setIsAnimating(true);
    const dir = 250; 

    switch (module) {
      case 'CLEAVE':
        setMoveDuration(200);
        setVisual({ state: 'RUN', frame: 1 });
        setOffset({ x: 80, y: 0 });
        await new Promise(r => setTimeout(r, 200));

        setMoveDuration(450);
        setVisual({ state: 'JUMP', frame: 1 });
        setOffset({ x: dir, y: -200 });
        await new Promise(r => setTimeout(r, 450));

        setMoveDuration(80);
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 80));
        
        setVisual({ state: 'CLEAVE', frame: 1 });
        await new Promise(r => setTimeout(r, 800));
        break;

      case 'PIERCE':
        setMoveDuration(350);
        setVisual({ state: 'RUN', frame: 1 });
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 350));
        // 循环播放两遍刺击动画
        for (let loop = 0; loop < 2; loop++) {
          for (let i = 1; i <= 4; i++) {
            setVisual({ state: 'PIERCE', frame: i });
            await new Promise(r => setTimeout(r, 100));
          }
        }
        break;

      case 'SLASH':
        setMoveDuration(350);
        setVisual({ state: 'RUN', frame: 1 });
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 350));
        for(let i=1; i<=4; i++){
          setVisual({ state: 'SLASH', frame: i });
          await new Promise(r => setTimeout(r, 110));
        }
        await new Promise(r => setTimeout(r, 400));
        break;

      case 'SWING':
        // 阶段 1：蓄力（帧 1-3）
        setMoveDuration(600);
        setOffset({ x: 80, y: 0 });
        for(let i=1; i<=3; i++) {
          setVisual({ state: 'SWING', frame: i });
          await new Promise(r => setTimeout(r, 200));
        }
        
        // 阶段 2：爆发冲击（帧 4）
        setMoveDuration(80);
        setOffset({ x: dir, y: 0 });
        setVisual({ state: 'SWING', frame: 4 });
        await new Promise(r => setTimeout(r, 80));
        
        await new Promise(r => setTimeout(r, 400));
        break;

      case 'THROW':
        // 循环播放两遍投掷动画，且播放速度调慢（120ms一帧）
        for (let loop = 0; loop < 2; loop++) {
          for(let i = 1; i <= 3; i++) {
            setVisual({ state: 'THROW', frame: i });
            await new Promise(r => setTimeout(r, 120));
          }
        }
        break;

      default:
        setVisual({ state: module, frame: 1 });
        await new Promise(r => setTimeout(r, 800));
    }

    await new Promise(r => setTimeout(r, 100));
    setMoveDuration(500);
    setVisual({ state: 'IDLE', frame: 1 });
    setOffset({ x: 0, y: 0 });
    await new Promise(r => setTimeout(r, 500));

    setIsAnimating(false);
  };

  const getDressingName = (part: 'HEAD' | 'BODY' | 'WEAPON') => {
    return DRESSINGS.find(d => d.id === player.dressing[part])?.name;
  };

  const modules: { id: VisualState; label: string; color: string }[] = [
    { id: 'CLEAVE', label: '天崩地裂 (砸地停留)', color: 'bg-red-600' },
    { id: 'SLASH', label: '追风逐影 (横斩)', color: 'bg-orange-600' },
    { id: 'PIERCE', label: '流星赶月 (突刺)', color: 'bg-blue-600' },
    { id: 'SWING', label: '横扫千军 (重挥)', color: 'bg-emerald-600' },
    { id: 'THROW', label: '定海神针 (发劲)', color: 'bg-indigo-600' },
    { id: 'HURT', label: '受击反馈测试', color: 'bg-gray-600' },
    { id: 'IDLE', label: '强制中断重置', color: 'bg-slate-800' },
  ];

  return (
    <div className="bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[88vh] transition-all duration-500 border border-slate-200">
      <div className="p-8 border-b flex justify-between items-center bg-indigo-700 text-white shadow-xl z-10">
        <div><div className="flex items-center gap-3"><h2 className="text-2xl font-black italic tracking-tighter uppercase">Mega Pro Arena</h2><span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold">V2.5 STANDARD</span></div><p className="text-[11px] opacity-70 uppercase font-black tracking-[0.3em] mt-1">Movement Balance & Animation Lab</p></div>
        <button onClick={onBack} className="bg-white text-indigo-700 hover:bg-slate-100 px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-90 shadow-lg border-b-4 border-indigo-900/20">退出演武</button>
      </div>
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-slate-100">
        <div className="flex-grow relative bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:40px_40px] flex items-center justify-start pl-[20%] overflow-hidden min-h-[450px]">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-100 to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-100 to-transparent pointer-events-none z-10"></div>
          <div className="absolute top-8 left-8 flex gap-6 z-20">
            <div className="bg-white/95 backdrop-blur-xl px-6 py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5"><span className="text-[11px] text-indigo-500 font-black block uppercase mb-1 tracking-widest">Animation State</span><span className="font-mono font-black text-slate-800 text-2xl">{visual.state}</span></div>
            <div className="bg-white/95 backdrop-blur-xl px-6 py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5"><span className="text-[11px] text-indigo-500 font-black block uppercase mb-1 tracking-widest">X-Offset</span><span className="font-mono font-black text-slate-800 text-2xl">{Math.round(offset.x)}px</span></div>
          </div>
          
          <div className="relative z-10 transition-transform pointer-events-none" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: isAnimating ? `transform ${moveDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1.1)` : 'none' }}>
            <div className={visual.state === 'CLEAVE' ? 'animate-vibrate' : ''}>
              <CharacterVisual state={visual.state} frame={visual.frame} className="scale-[1.35]" accessory={{ head: getDressingName('HEAD'), body: getDressingName('BODY'), weapon: getDressingName('WEAPON') }} />
            </div>
          </div>

          <div className="absolute bottom-[35%] w-64 h-3 bg-indigo-600/10 rounded-full blur-2xl transition-all duration-300" style={{ left: `calc(20% + ${offset.x}px)`, transform: `translateX(48px) scaleX(${isAnimating ? 1.5 : 1})`, opacity: visual.state === 'JUMP' ? 0.15 : 0.7 }}></div>
          <div className="absolute bottom-1/4 left-0 w-full flex items-end justify-around px-8 opacity-20 pointer-events-none">{Array.from({length: 12}).map((_, i) => (<div key={i} className="h-4 w-1 bg-slate-400 rounded-full"></div>))}</div>
          <div className="absolute bottom-1/4 left-0 w-full h-px bg-slate-300 border-b-2 border-dashed border-slate-400 opacity-30"></div>
        </div>
        <div className="w-full md:w-[420px] bg-white border-l border-slate-200 p-10 flex flex-col gap-8 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-6">动作模组均衡测试</h3>
            <div className="grid grid-cols-1 gap-4">
              {modules.map(m => (
                <button key={m.id} disabled={isAnimating && m.id !== 'IDLE'} onClick={() => m.id === 'IDLE' ? (setVisual({state:'IDLE', frame:1}), setOffset({x:0,y:0}), setIsAnimating(false)) : runModule(m.id)} className={`${m.color} text-white py-5 rounded-[20px] font-black shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 disabled:opacity-40 disabled:translate-y-0 flex items-center justify-between px-8 group`}>
                  <span className="tracking-tight text-lg">{m.label}</span>
                  <span className="text-[11px] opacity-60 bg-white/20 px-3 py-1 rounded-xl font-mono group-hover:opacity-100 transition-opacity">{m.id}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto p-6 bg-slate-50 rounded-3xl border border-slate-200/60 ring-1 ring-black/5">
            <h4 className="text-[11px] font-black text-indigo-600 uppercase mb-3 flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>演武场报告</h4>
            <p className="text-[12px] text-slate-500 leading-relaxed italic font-medium">重挥模组已重构：前3帧设为蓄力阶段（配合慢垫步），第4帧设为爆发冲击点。</p>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vibrate { 0% { transform: translate(0,0); } 10% { transform: translate(-2px, -2px); } 20% { transform: translate(2px, -2px); } 30% { transform: translate(-2px, 2px); } 40% { transform: translate(2px, 2px); } 50% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, -2px); } 70% { transform: translate(-2px, 2px); } 80% { transform: translate(2px, 2px); } 90% { transform: translate(-2px, -2px); } 100% { transform: translate(0,0); } }
        .animate-vibrate { animation: vibrate 0.1s linear infinite; }
      `}} />
    </div>
  );
};

export default TestPanel;
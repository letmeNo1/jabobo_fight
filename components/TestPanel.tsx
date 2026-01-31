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

  // 帧动画循环
  useEffect(() => {
    const timer = setInterval(() => {
      setVisual(v => ({ ...v, frame: v.frame + 1 }));
    }, 125);
    return () => clearInterval(timer);
  }, []);

  const runModule = async (module: VisualState) => {
    if (isAnimating) return;
    setIsAnimating(true);

    // 恢复位移量：从 550 恢复到更均衡的 250
    const dir = 250; 

    switch (module) {
      case 'CLEAVE':
        // 模拟位移：跑起 -> 跃起 -> 劈砍
        setMoveDuration(300);
        setVisual({ state: 'RUN', frame: 1 });
        setOffset({ x: dir * 0.35, y: 0 });
        await new Promise(r => setTimeout(r, 300));

        setMoveDuration(450);
        setVisual({ state: 'JUMP', frame: 1 });
        setOffset({ x: dir, y: -140 });
        await new Promise(r => setTimeout(r, 450));

        setMoveDuration(60);
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 60));

        setVisual({ state: 'CLEAVE', frame: 1 });
        await new Promise(r => setTimeout(r, 700));
        break;

      case 'PIERCE':
        // 直线长距突进
        setMoveDuration(250);
        setVisual({ state: 'RUN', frame: 1 });
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 250));
        setVisual({ state: 'PIERCE', frame: 1 });
        await new Promise(r => setTimeout(r, 600));
        break;

      case 'SLASH':
        // 快步横斩
        setMoveDuration(350);
        setVisual({ state: 'RUN', frame: 1 });
        setOffset({ x: dir, y: 0 });
        await new Promise(r => setTimeout(r, 350));
        setVisual({ state: 'SLASH', frame: 1 });
        await new Promise(r => setTimeout(r, 600));
        break;

      case 'SWING':
        // 圆弧重挥
        setMoveDuration(600);
        setOffset({ x: dir * 0.7, y: 50 });
        setVisual({ state: 'RUN', frame: 1 });
        await new Promise(r => setTimeout(r, 300));
        setOffset({ x: dir, y: 0 });
        setVisual({ state: 'SWING', frame: 1 });
        await new Promise(r => setTimeout(r, 700));
        break;

      case 'THROW':
        // 原地蓄力发劲
        setVisual({ state: 'THROW', frame: 1 });
        await new Promise(r => setTimeout(r, 700));
        break;

      default:
        setVisual({ state: module, frame: 1 });
        await new Promise(r => setTimeout(r, 800));
    }

    // 平滑回位
    setMoveDuration(500);
    setOffset({ x: 0, y: 0 });
    setVisual({ state: 'IDLE', frame: 1 });
    setIsAnimating(false);
  };

  const getDressingName = (part: 'HEAD' | 'BODY' | 'WEAPON') => {
    return DRESSINGS.find(d => d.id === player.dressing[part])?.name;
  };

  const modules: { id: VisualState; label: string; color: string }[] = [
    { id: 'CLEAVE', label: '天崩地裂 (跳劈)', color: 'bg-red-600' },
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
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase">Mega Pro Arena</h2>
            <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold">V2.5 STANDARD</span>
          </div>
          <p className="text-[11px] opacity-70 uppercase font-black tracking-[0.3em] mt-1">Movement Balance & Animation Lab</p>
        </div>
        <button onClick={onBack} className="bg-white text-indigo-700 hover:bg-slate-100 px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-90 shadow-lg border-b-4 border-indigo-900/20">退出演武</button>
      </div>

      <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-slate-100">
        {/* 左侧：展示区，微调展示位置至 pl-[20%] 以适应恢复后的位移量 */}
        <div className="flex-grow relative bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:40px_40px] flex items-center justify-start pl-[20%] overflow-hidden min-h-[450px]">
          
          {/* 边缘淡入淡出遮罩 */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-100 to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-100 to-transparent pointer-events-none z-10"></div>

          <div className="absolute top-8 left-8 flex gap-6 z-20">
            <div className="bg-white/95 backdrop-blur-xl px-6 py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5">
              <span className="text-[11px] text-indigo-500 font-black block uppercase mb-1 tracking-widest">Animation State</span>
              <span className="font-mono font-black text-slate-800 text-2xl">{visual.state}</span>
            </div>
            <div className="bg-white/95 backdrop-blur-xl px-6 py-3 rounded-2xl border border-indigo-100 shadow-2xl ring-1 ring-black/5">
              <span className="text-[11px] text-indigo-500 font-black block uppercase mb-1 tracking-widest">X-Offset</span>
              <span className="font-mono font-black text-slate-800 text-2xl">{Math.round(offset.x)}px</span>
            </div>
          </div>

          <div 
            className="relative z-10 transition-transform pointer-events-none"
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              transition: isAnimating ? `transform ${moveDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1.1)` : 'none'
            }}
          >
            <CharacterVisual 
              state={visual.state}
              frame={visual.frame}
              className="scale-[1.35]" 
              accessory={{
                head: getDressingName('HEAD'),
                body: getDressingName('BODY'),
                weapon: getDressingName('WEAPON')
              }}
            />
          </div>

          {/* 动态轨迹阴影 */}
          <div 
            className="absolute bottom-[35%] w-64 h-3 bg-indigo-600/10 rounded-full blur-2xl transition-all duration-300"
            style={{ 
                left: `calc(20% + ${offset.x}px)`,
                transform: `translateX(48px) scaleX(${isAnimating ? 1.5 : 1})`,
                opacity: visual.state === 'JUMP' ? 0.15 : 0.7
            }}
          ></div>

          {/* 刻度尺参考线 */}
          <div className="absolute bottom-1/4 left-0 w-full flex items-end justify-around px-8 opacity-20 pointer-events-none">
            {Array.from({length: 12}).map((_, i) => (
               <div key={i} className="h-4 w-1 bg-slate-400 rounded-full"></div>
            ))}
          </div>
          <div className="absolute bottom-1/4 left-0 w-full h-px bg-slate-300 border-b-2 border-dashed border-slate-400 opacity-30"></div>
        </div>

        {/* 右侧：控制面板 */}
        <div className="w-full md:w-[420px] bg-white border-l border-slate-200 p-10 flex flex-col gap-8 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-6">动作模组均衡测试</h3>
            <div className="grid grid-cols-1 gap-4">
              {modules.map(m => (
                <button
                  key={m.id}
                  disabled={isAnimating && m.id !== 'IDLE'}
                  onClick={() => m.id === 'IDLE' ? (setVisual({state:'IDLE', frame:1}), setOffset({x:0,y:0}), setIsAnimating(false)) : runModule(m.id)}
                  className={`${m.color} text-white py-5 rounded-[20px] font-black shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 disabled:opacity-40 disabled:translate-y-0 flex items-center justify-between px-8 group`}
                >
                  <span className="tracking-tight text-lg">{m.label}</span>
                  <span className="text-[11px] opacity-60 bg-white/20 px-3 py-1 rounded-xl font-mono group-hover:opacity-100 transition-opacity">{m.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-6 bg-slate-50 rounded-3xl border border-slate-200/60 ring-1 ring-black/5">
            <h4 className="text-[11px] font-black text-indigo-600 uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
              演武场报告
            </h4>
            <p className="text-[12px] text-slate-500 leading-relaxed italic font-medium">
              动作位移量已恢复至平衡状态（<span className="text-indigo-600 font-black">250px</span>）。该数值可提供更稳健的打击感与视觉回馈。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPanel;
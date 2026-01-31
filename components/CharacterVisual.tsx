import React, { useMemo } from 'react';

export type VisualState = 'IDLE' | 'RUN' | 'ATTACK' | 'HURT' | 'DODGE' | 'HOME';

interface CharacterVisualProps {
  isNpc?: boolean;
  isWinking?: boolean;
  isDizzy?: boolean;
  state?: VisualState;
  frame?: number; 
  className?: string;
  accessory?: {
    head?: string;
    body?: string;
    weapon?: string;
  };
}

const CharacterVisual: React.FC<CharacterVisualProps> = ({ 
  isNpc = false, 
  isDizzy = false,
  state = 'IDLE',
  frame = 1,
  className = "",
  accessory
}) => {
  const basePath = 'images/';

  // 定义每个状态对应的总帧数，用于预渲染
  const stateFrameConfigs: Record<VisualState, number> = {
    HOME: 2,
    IDLE: 2,
    RUN: 5,
    ATTACK: 4,
    HURT: 1,
    DODGE: 1
  };

  // 状态对应的文件名前缀
  const statePrefixes: Record<VisualState, string> = {
    HOME: 'home',
    IDLE: 'idle',
    RUN: 'run',
    ATTACK: 'atk',
    HURT: 'hurt',
    DODGE: 'dodge'
  };

  // 计算当前状态的所有图片路径，用于预加载和渲染
  const currentFrames = useMemo(() => {
    const count = stateFrameConfigs[state] || 1;
    const prefix = statePrefixes[state];
    return Array.from({ length: count }, (_, i) => `${basePath}${prefix}${i + 1}.png`);
  }, [state]);

  const getFrameTransform = () => {
    if (state === 'HOME') {
        const offset = frame % 2 === 0 ? '-8px' : '0px';
        const scale = frame % 2 === 0 ? '1.02' : '1.0';
        return `translateY(${offset}) scale(${scale})`;
    }
    if (state === 'IDLE') {
        const bounce = frame % 2 === 0 ? 'scale-y-[0.98]' : 'scale-y-100';
        return bounce;
    }
    if (state === 'RUN') {
        const bounce = frame % 2 === 0 ? 'translateY(-4px)' : 'translateY(0px)';
        const tilt = frame % 2 === 0 ? 'rotate(2deg)' : 'rotate(-2deg)';
        return `${bounce} ${tilt}`;
    }
    if (state === 'ATTACK') {
        return 'scale(1.1) rotate(-5deg)';
    }
    if (state === 'HURT') {
        return 'translate(-5px, 0) scale(0.95)';
    }
    if (state === 'DODGE') {
        return 'skewX(-15deg) translateX(10px)';
    }
    return '';
  };

  return (
    <div className={`relative flex flex-col items-center select-none group ${className}`} style={{ width: '160px', height: '180px' }}>
      
      {/* 预加载所有状态的资源池 (隐藏) */}
      <div className="hidden">
        {Object.entries(stateFrameConfigs).map(([s, count]) => 
          Array.from({ length: count }).map((_, i) => (
            <img key={`${s}-${i}`} src={`${basePath}${statePrefixes[s as VisualState]}${i+1}.png`} />
          ))
        )}
      </div>

      {/* 底部阴影 */}
      <div className={`absolute bottom-4 h-5 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-300
        ${state === 'RUN' ? 'w-20 opacity-40 scale-x-110' : 'w-24 animate-pulse'}
        ${state === 'HOME' ? 'w-28 opacity-20 scale-x-110' : ''}
        ${state === 'HURT' ? 'scale-x-75 opacity-20' : ''}
      `}></div>

      {/* 角色图片容器：通过 opacity 切换帧，防止 src 切换产生的白屏闪烁 */}
      <div 
        className={`relative w-36 h-44 flex items-center justify-center
          ${isDizzy ? 'animate-dizzy filter grayscale contrast-125' : ''} 
          ${isNpc ? 'filter hue-rotate-[180deg] brightness-90' : ''}
          ${state === 'HURT' ? 'filter saturate-150 brightness-110' : ''}
          ${state === 'DODGE' ? 'opacity-70' : ''}
        `}
        style={{ transform: getFrameTransform(), transition: 'transform 0.15s ease-out' }}
      >
        {currentFrames.map((src, index) => (
          <img 
            key={src}
            src={src} 
            alt={state}
            className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl transition-opacity duration-0
              ${(frame === index + 1) ? 'opacity-100' : 'opacity-0'}
            `}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith('images/character.png')) {
                target.src = "images/character.png";
              } else {
                target.onerror = null;
                target.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=" + (isNpc ? 'npc' : 'player');
              }
            }}
          />
        ))}

        {isDizzy && (
          <div className="absolute -top-6 left-0 w-full flex justify-center pointer-events-none">
            <span className="text-3xl animate-spin">💫</span>
          </div>
        )}
      </div>

      {/* 装备标签 */}
      <div className={`absolute -top-8 flex flex-col items-center gap-1.5 pointer-events-none z-20 transition-opacity duration-300 ${state !== 'IDLE' && state !== 'HOME' ? 'opacity-0 scale-75' : 'opacity-100'}`}>
        {accessory?.head && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-[10px] text-white px-3 py-1 rounded-full shadow-lg font-black whitespace-nowrap animate-bounce flex items-center gap-1 border border-white/20">
            <span className="text-xs">👑</span> {accessory.head}
          </div>
        )}
        {accessory?.body && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-[10px] text-white px-3 py-1 rounded-full shadow-md font-black whitespace-nowrap flex items-center gap-1 border border-white/20">
            <span className="text-xs">👕</span> {accessory.body}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dizzy {
          0% { transform: rotate(0deg) translate(0, 0); }
          25% { transform: rotate(3deg) translate(-2px, 1px); }
          50% { transform: rotate(0deg) translate(2px, -1px); }
          75% { transform: rotate(-3deg) translate(-1px, 1px); }
          100% { transform: rotate(0deg) translate(0, 0); }
        }
        .animate-dizzy { animation: dizzy 0.3s infinite ease-in-out; }
      `}} />
    </div>
  );
};

export default CharacterVisual;
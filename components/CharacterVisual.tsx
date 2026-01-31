import React from 'react';

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
  isWinking = false, 
  isDizzy = false,
  state = 'IDLE',
  frame = 1,
  className = "",
  accessory
}) => {
  /**
   * 图片资源命名约定：
   * HOME: home1.png, home2.png... (主界面悠闲动画)
   * IDLE: idle1.png, idle2.png... (战斗待机动画)
   * RUN: run1.png, run2.png...
   * ATTACK: atk1.png, atk2.png...
   * HURT: hurt1.png...
   * DODGE: dodge1.png...
   */
  const getCharacterSource = () => {
    const safeFrame = frame > 0 ? frame : 1;
    
    // 基础路径映射
    if (state === 'HOME') return `home${safeFrame}.png`;
    if (state === 'IDLE') return `idle${safeFrame}.png`;
    if (state === 'RUN') return `run${safeFrame}.png`;
    if (state === 'ATTACK') return `atk${safeFrame}.png`;
    if (state === 'HURT') return `hurt${safeFrame}.png`;
    if (state === 'DODGE') return `dodge${safeFrame}.png`;
    
    return "character.png"; 
  };

  const getFrameTransform = () => {
    if (state === 'HOME') {
        // 主界面：更大幅度的平滑上下浮动
        const offset = frame % 2 === 0 ? '-8px' : '0px';
        const scale = frame % 2 === 0 ? '1.02' : '1.0';
        return `translateY(${offset}) scale(${scale})`;
    }
    if (state === 'IDLE') {
        // 战斗待机：紧凑的呼吸感
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
      
      {/* 底部阴影 */}
      <div className={`absolute bottom-4 h-5 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-300
        ${state === 'RUN' ? 'w-20 opacity-40 scale-x-110' : 'w-24 animate-pulse'}
        ${state === 'HOME' ? 'w-28 opacity-20 scale-x-110' : ''}
        ${state === 'HURT' ? 'scale-x-75 opacity-20' : ''}
      `}></div>

      {/* 角色图片容器 */}
      <div 
        className={`relative w-36 h-44 transition-all duration-300 flex items-center justify-center
          ${isDizzy ? 'animate-dizzy filter grayscale contrast-125' : ''} 
          ${isNpc ? 'filter hue-rotate-[180deg] brightness-90' : ''}
          ${state === 'HURT' ? 'filter saturate-150 brightness-110' : ''}
          ${state === 'DODGE' ? 'opacity-70' : ''}
        `}
        style={{ transform: getFrameTransform() }}
      >
        <img 
          src={getCharacterSource()} 
          alt={`${state} Frame ${frame}`} 
          className="w-full h-full object-contain drop-shadow-2xl"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // 兜底策略
            target.src = "character.png";
            target.onerror = () => {
                target.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=" + (isNpc ? 'npc' : 'player') + "&backgroundColor=ffffff";
            };
          }}
        />

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

import React, { useState } from 'react';
import configSettings from '../config';
import { VisualState } from '../types';

interface CharacterVisualProps {
  name?: string; 
  isNpc?: boolean;
  isDizzy?: boolean;
  state?: VisualState;
  frame?: number; 
  className?: string;
  weaponId?: string; 
  hasAfterimage?: boolean; 
  accessory?: {
    head?: string;
    body?: string;
    weapon?: string;
  };
  isMobile?: boolean;
  debug?: boolean; 
  scaleOverride?: number; // 允许手动覆盖缩放
}

const CharacterVisual: React.FC<CharacterVisualProps> = ({ 
  name,
  isNpc = false, 
  isDizzy = false,
  state = 'IDLE',
  frame = 1,
  className = "",
  weaponId,
  hasAfterimage = false,
  accessory,
  isMobile = false,
  debug = false,
  scaleOverride
}) => {
  const basePath = 'Images/';
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const handleImageError = (path: string) => {
    setImageError(prev => ({ ...prev, [path]: true }));
  };

  const findAsset = (paths: string[]): string | null => {
    if (!window.assetMap) return null;
    for (const path of paths) {
      if (window.assetMap.has(path) && !imageError[path]) {
        return window.assetMap.get(path)!;
      }
    }
    return null;
  };

  // 优先级：手动覆盖 > 战斗状态缩放 > 默认缩放
  const isCombatState = state !== 'HOME' && state !== 'IDLE';
  const configBaseScale = isCombatState 
    ? (isMobile ? configSettings.visuals.character.combatScaleMobile : configSettings.visuals.character.combatScalePC)
    : configSettings.visuals.character.homeScale;
    
  const BASE_SCALE = scaleOverride || configBaseScale || configSettings.visuals.character.baseScale;

  // 使用响应式容器宽高
  const containerWidth = isMobile ? configSettings.visuals.character.containerWidthMobile : configSettings.visuals.character.containerWidthPC;
  const containerHeight = isMobile ? configSettings.visuals.character.containerHeightMobile : configSettings.visuals.character.containerHeightPC;
  
  const visualBaseWidth = isMobile ? configSettings.visuals.character.mobileWidth : configSettings.visuals.character.pcWidth;
  const visualBaseHeight = isMobile ? configSettings.visuals.character.mobileHeight : configSettings.visuals.character.pcHeight;

  const STATE_CONFIGS: Record<VisualState, { prefix: string; count: number }> = {
    HOME: { prefix: 'home', count: 2 },
    IDLE: { prefix: 'idle', count: 2 },
    RUN: { prefix: 'run', count: 5 },
    ATTACK: { prefix: 'atk', count: 4 },
    HURT: { prefix: 'hurt', count: 1 },
    DODGE: { prefix: 'dodge', count: 1 },
    JUMP: { prefix: 'jump', count: 1 }, 
    CLEAVE: { prefix: 'cleave', count: 3 }, 
    SLASH: { prefix: 'slash', count: 3 },
    PIERCE: { prefix: 'pierce', count: 4 },
    SWING: { prefix: 'swing', count: 4 },
    THROW: { prefix: 'throw', count: 3 },
    PUNCH: { prefix: 'punch', count: 2 }
  };

  const getFrameTransform = () => {
    const f = (state === 'HOME' || state === 'IDLE' || state === 'RUN') ? (((frame || 1) - 1) % (STATE_CONFIGS[state]?.count || 1)) + 1 : (frame || 1);
    
    switch (state) {
      case 'HOME': {
        const offset = (f % 2 === 0) ? '-2%' : '0%';
        const scale = (f % 2 === 0) ? 1.02 * BASE_SCALE : 1.0 * BASE_SCALE;
        return `translateY(${offset}) scale(${scale}) rotate(0deg)`;
      }
      case 'IDLE':
        return `scale(${BASE_SCALE}) rotate(0deg)`;
      case 'RUN': {
        const bounce = (f % 2 === 0) ? '-2%' : '0%';
        const tilt = (f % 2 === 0) ? 'rotate(2deg)' : 'rotate(-2deg)';
        return `translateY(${bounce}) ${tilt} scale(${BASE_SCALE})`;
      }
      case 'JUMP':
        return `translateY(-10%) scale(${BASE_SCALE * 1.05})`;
      case 'CLEAVE':
        return `translateY(0%) scale(${BASE_SCALE})`;
      case 'SLASH':
        return `scale(${BASE_SCALE}) rotate(0deg) translateX(2%)`;
      case 'PIERCE':
        return `scale(${BASE_SCALE}) rotate(-2deg) translateX(5%)`;
      case 'SWING':
        return `scale(${BASE_SCALE}) ${f === 4 ? 'rotate(0deg) translateX(8%)' : 'rotate(10deg) skewX(-5deg)'}`;
      case 'THROW':
        return `scale(${BASE_SCALE}) rotate(0deg) translateY(0%)`;
      case 'PUNCH':
        return f === 2 
          ? `scale(${BASE_SCALE * 1.1}) rotate(-8deg) translateX(6%)` 
          : `scale(${BASE_SCALE}) rotate(0deg) translateX(-3%)`;
      case 'ATTACK':
        return `scale(${BASE_SCALE}) rotate(-5deg)`;
      case 'HURT':
        return `translate(-4%, 2%) scale(${BASE_SCALE * 0.9}) rotate(5deg)`;
      default:
        return `scale(${BASE_SCALE}) rotate(0deg)`;
    }
  };

  const renderFallbackCharacter = () => {
    const colorClass = isNpc ? 'bg-indigo-600' : 'bg-orange-500';
    const sizeClass = isMobile ? 'w-24 h-24' : 'w-40 h-40';
    return (
      <div data-name={name} className={`relative ${sizeClass} ${colorClass} rounded-full border-4 border-white/50 shadow-2xl flex items-center justify-center overflow-hidden`}>
        <div className="flex gap-4 mb-4">
          <div className="w-2 h-4 md:w-3 md:h-6 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-4 md:w-3 md:h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        </div>
      </div>
    );
  };

  const charFilterClass = isNpc ? 'filter hue-rotate-[180deg] brightness-90' : '';

  return (
    <div 
      className={`relative flex flex-col items-center select-none group transition-all duration-300 ${className} ${debug ? 'outline-2 outline-dashed outline-red-500 rounded-lg bg-red-500/5' : ''}`} 
      style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
    >
      <div className={`absolute bottom-[15%] h-3 md:h-4 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-300
        ${state === 'RUN' ? 'w-24 md:w-32 opacity-40 scale-x-110' : 'w-28 md:w-36 animate-pulse'}
        ${state === 'IDLE' ? 'w-28 md:w-36 opacity-20 scale-x-100' : ''}
      `}></div>

      <div 
        className={`relative ${visualBaseWidth} ${visualBaseHeight} flex items-center justify-center
          ${isDizzy ? 'filter grayscale contrast-125' : ''} 
          ${state === 'HURT' ? 'filter saturate-150 brightness-110' : ''}
          ${hasAfterimage ? 'afterimage-effect' : ''}
        `}
        style={{ 
          transform: getFrameTransform(), 
          transition: 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
      >
        <div className={`w-full h-full relative flex items-center justify-center ${isDizzy ? 'animate-dizzy-wobble' : ''}`}>
          {Object.entries(STATE_CONFIGS).map(([sName, config]) => {
            const isActiveState = state === sName;
            if (!isActiveState) return null;
            
            const isLoopingState = (sName === 'IDLE' || sName === 'RUN' || sName === 'HOME');
            const currentFrame = isLoopingState 
              ? (((frame || 1) - 1) % config.count) + 1 
              : Math.min(frame || 1, config.count);

            return Array.from({ length: config.count }).map((_, i) => {
              const frameIndex = i + 1;
              if (frameIndex !== currentFrame) return null;

              const charUrl = findAsset([`${basePath}${config.prefix}${frameIndex}.png`, `${basePath}character.png`]);
              const weaponUrl = (weaponId && state !== 'THROW') ? findAsset([`${basePath}${weaponId}_${config.prefix}${frameIndex}.png`]) : null;

              return (
                <React.Fragment key={`${sName}-${frameIndex}`}>
                  {charUrl ? (
                    <img 
                      src={charUrl}
                      data-name={name}
                      onError={() => handleImageError(charUrl)}
                      className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl pointer-events-none ${charFilterClass} z-[20]`}
                    />
                  ) : renderFallbackCharacter()}
                  {weaponId && weaponUrl && (
                    <img 
                      src={weaponUrl}
                      data-name={name}
                      onError={() => handleImageError(weaponUrl)}
                      className="absolute inset-0 w-full h-full object-contain drop-shadow-lg pointer-events-none z-[30]"
                    />
                  )}
                </React.Fragment>
              );
            });
          })}
        </div>

        {isDizzy && (
          <div className="absolute -top-10 md:-top-14 left-0 w-full flex justify-center pointer-events-none z-50">
            <span className="text-3xl md:text-5xl animate-spin">💫</span>
          </div>
        )}
      </div>

      <div 
        className={`absolute ${isMobile ? '-top-10' : '-top-20'} flex flex-col items-center gap-1.5 transition-opacity duration-300 ${state !== 'IDLE' && state !== 'HOME' ? 'opacity-0 scale-75' : 'opacity-100'}`}
        style={{ transform: isNpc ? 'scaleX(-1)' : 'none' }}
      >
        {name && (
          <div className={`px-4 py-1.5 md:px-6 md:py-2.5 rounded-2xl border-2 backdrop-blur-md shadow-2xl font-black italic tracking-tighter uppercase whitespace-nowrap z-[100] ${isNpc ? 'bg-indigo-950/80 text-blue-200 border-blue-500/50' : 'bg-orange-950/80 text-orange-200 border-orange-500/50'}`}>
            <span className={isMobile ? 'text-[9px]' : 'text-[13px]'}>{name}</span>
          </div>
        )}
        
        {accessory?.head && (
          <div className="text-[10px] px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg font-black whitespace-nowrap animate-bounce flex items-center gap-1 border border-white/20">
            👑 {accessory.head}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dizzy-wobble {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-3px, 1px) rotate(3deg); }
          50% { transform: translate(3px, -1px) rotate(0deg); }
          75% { transform: translate(-1px, 3px) rotate(-3deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .animate-dizzy-wobble { animation: dizzy-wobble 0.5s linear infinite; }
        .afterimage-effect {
          filter: drop-shadow(-8px 0px 0px rgba(0, 150, 255, 0.4)) 
                  drop-shadow(-16px 0px 2px rgba(0, 150, 255, 0.2)) 
                  drop-shadow(-24px 0px 4px rgba(0, 150, 255, 0.1));
          animation: afterimage-slide 0.2s linear infinite;
        }
        @keyframes afterimage-slide {
          0% { filter: drop-shadow(-8px 0px 0px rgba(0, 150, 255, 0.4)) drop-shadow(-16px 0px 2px rgba(0, 150, 255, 0.2)); }
          50% { filter: drop-shadow(-12px 0px 2px rgba(0, 150, 255, 0.5)) drop-shadow(-20px 0px 4px rgba(0, 150, 255, 0.3)); }
          100% { filter: drop-shadow(-8px 0px 0px rgba(0, 150, 255, 0.4)) drop-shadow(-16px 0px 2px rgba(0, 150, 255, 0.2)); }
        }
      `}} />
    </div>
  );
};

export default CharacterVisual;

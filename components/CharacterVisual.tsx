
import React, { useState } from 'react';
import configSettings from '../config';

// Character visual states for animations
export type VisualState = 'IDLE' | 'RUN' | 'ATTACK' | 'HURT' | 'DODGE' | 'HOME' | 'JUMP' | 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW' | 'PUNCH';

interface CharacterVisualProps {
  name?: string; // 角色名字
  isNpc?: boolean;
  isDizzy?: boolean;
  state?: VisualState;
  frame?: number; 
  className?: string;
  weaponId?: string; // Current weapon ID being held or used
  accessory?: {
    head?: string;
    body?: string;
    weapon?: string;
  };
  isMobile?: boolean;
  debug?: boolean; 
}

const CharacterVisual: React.FC<CharacterVisualProps> = ({ 
  name,
  isNpc = false, 
  isDizzy = false,
  state = 'IDLE',
  frame = 1,
  className = "",
  weaponId,
  accessory,
  isMobile = false,
  debug = false
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

  const BASE_SCALE = configSettings.visuals.character.baseScale; 
  const containerWidth = configSettings.visuals.character.containerWidth;
  const containerHeight = configSettings.visuals.character.containerHeight;
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
    const f = ((frame - 1) % (STATE_CONFIGS[state]?.count || 1)) + 1;
    switch (state) {
      case 'HOME': {
        const offset = (f % 2 === 0) ? '-10px' : '0px';
        const scale = (f % 2 === 0) ? 1.02 * BASE_SCALE : 1.0 * BASE_SCALE;
        return `translateY(${offset}) scale(${scale}) rotate(0deg)`;
      }
      case 'IDLE':
        return `scale(${BASE_SCALE}) rotate(0deg)`;
      case 'RUN': {
        const bounce = (f % 2 === 0) ? '-5px' : '0px';
        const tilt = (f % 2 === 0) ? 'rotate(2deg)' : 'rotate(-2deg)';
        return `translateY(${bounce}) ${tilt} scale(${BASE_SCALE})`;
      }
      case 'JUMP':
        return `translateY(-30px) scale(${BASE_SCALE * 1.05})`;
      case 'CLEAVE':
        return `translateY(0px) scale(${BASE_SCALE})`;
      case 'SLASH':
        return `scale(${BASE_SCALE}) rotate(0deg) translateX(5px)`;
      case 'PIERCE':
        return `scale(${BASE_SCALE}) rotate(-2deg) translateX(15px)`;
      case 'SWING':
        const currentF = ((frame - 1) % 4) + 1;
        const swingScale = BASE_SCALE;
        const swingRot = currentF === 4 ? 'rotate(0deg)' : 'rotate(10deg)';
        const swingSkew = currentF === 4 ? 'skewX(0deg)' : 'skewX(-5deg)';
        const swingX = currentF === 4 ? 'translateX(25px)' : '';
        return `scale(${swingScale}) ${swingRot} ${swingSkew} ${swingX}`;
      case 'THROW':
        return `scale(${BASE_SCALE}) rotate(0deg) translateY(0px)`;
      case 'PUNCH':
        const currentPF = ((frame - 1) % 2) + 1;
        return currentPF === 2 
          ? `scale(${BASE_SCALE * 1.1}) rotate(-8deg) translateX(20px)` 
          : `scale(${BASE_SCALE}) rotate(0deg) translateX(-8px)`;
      case 'ATTACK':
        return `scale(${BASE_SCALE}) rotate(-5deg)`;
      case 'HURT':
        return `translate(-10px, 4px) scale(${BASE_SCALE * 0.9}) rotate(5deg)`;
      default:
        return `scale(${BASE_SCALE}) rotate(0deg)`;
    }
  };

  // CSS Fallback rendering for missing assets
  const renderFallbackCharacter = () => {
    const colorClass = isNpc ? 'bg-indigo-600' : 'bg-orange-500';
    return (
      <div className={`relative w-40 h-40 ${colorClass} rounded-full border-4 border-white/50 shadow-2xl flex items-center justify-center overflow-hidden`}>
        {/* Character Face */}
        <div className="flex gap-4 mb-4">
          <div className="w-3 h-6 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        </div>
        <div className="absolute bottom-6 w-12 h-4 bg-white/20 rounded-full"></div>
        {/* Simple blush */}
        <div className="absolute left-6 top-20 w-4 h-2 bg-rose-400/40 rounded-full blur-sm"></div>
        <div className="absolute right-6 top-20 w-4 h-2 bg-rose-400/40 rounded-full blur-sm"></div>
      </div>
    );
  };

  const renderFallbackWeapon = () => {
    if (!weaponId || state === 'THROW') return null;
    return (
      <div className="absolute bottom-10 right-0 w-12 h-12 bg-slate-700 rounded-lg border-2 border-slate-400 shadow-lg flex items-center justify-center rotate-12 z-40">
        <span className="text-xl">⚔️</span>
      </div>
    );
  };

  const charFilterClass = isNpc ? 'filter hue-rotate-[180deg] brightness-90' : '';

  return (
    <div 
      data-name={name || 'character'} 
      className={`relative flex flex-col items-center select-none group transition-all duration-300 ${className} ${debug ? 'outline-2 outline-dashed outline-red-500 rounded-lg bg-red-500/5' : ''}`} 
      style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
    >
      <div className={`absolute bottom-[15%] h-4 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-300
        ${state === 'RUN' ? 'w-32 opacity-40 scale-x-110' : 'w-36 animate-pulse'}
        ${state === 'JUMP' || state === 'CLEAVE' ? 'w-24 opacity-10 scale-x-50' : ''}
        ${state === 'HOME' ? 'w-40 opacity-20 scale-x-110' : ''}
        ${state === 'HURT' ? 'scale-x-75 opacity-20' : ''}
        ${state === 'IDLE' ? 'w-36 opacity-20 scale-x-100' : ''}
      `}></div>

      <div 
        className={`relative ${visualBaseWidth} ${visualBaseHeight} flex items-center justify-center
          ${isDizzy ? 'animate-dizzy filter grayscale contrast-125' : ''} 
          ${state === 'HURT' ? 'filter saturate-150 brightness-110' : ''}
        `}
        style={{ 
          transform: getFrameTransform(), 
          transition: (state === 'IDLE' || state === 'SWING' || state === 'PUNCH' || state === 'CLEAVE' || state === 'JUMP') ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
      >
        {Object.entries(STATE_CONFIGS).map(([sName, config]) => {
          const isActiveState = state === sName;
          if (!isActiveState) return null;

          const currentFrame = ((frame - 1) % config.count) + 1;

          return Array.from({ length: config.count }).map((_, i) => {
            const frameIndex = i + 1;
            const isTargetFrame = (frameIndex === currentFrame);
            if (!isTargetFrame) return null;

            const charUrl = findAsset([
              `${basePath}${config.prefix}${frameIndex}.png`,
              `${basePath}${config.prefix}1.png`,
              `${basePath}idle1.png`,
              `${basePath}character.png`
            ]);

            let weaponUrl: string | null = null;
            if (weaponId && state !== 'THROW') {
              weaponUrl = findAsset([
                `${basePath}${weaponId}_${config.prefix}${frameIndex}.png`,
                `${basePath}${weaponId}_${config.prefix}1.png`,
                `${basePath}${weaponId}_idle1.png`
              ]);
            }

            return (
              <React.Fragment key={`${sName}-${frameIndex}`}>
                {charUrl ? (
                  <img 
                    src={charUrl}
                    data-name={name || 'character'}
                    onError={() => handleImageError(charUrl)}
                    className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl pointer-events-none ${charFilterClass} z-[20]`}
                    style={{ transition: 'none' }}
                  />
                ) : renderFallbackCharacter()}
                
                {weaponId && weaponUrl ? (
                  <img 
                    src={weaponUrl}
                    data-name={name || 'character'}
                    onError={() => handleImageError(weaponUrl!)}
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-lg pointer-events-none z-[30]"
                    style={{ transition: 'none' }}
                  />
                ) : renderFallbackWeapon()}
              </React.Fragment>
            );
          });
        })}

        {isDizzy && (
          <div className={`absolute ${isMobile ? '-top-6' : '-top-14'} left-0 w-full flex justify-center pointer-events-none z-50`}>
            <span className={`${isMobile ? 'text-2xl' : 'text-5xl'} animate-spin`}>💫</span>
          </div>
        )}
      </div>

      <div className={`absolute ${isMobile ? '-top-10' : '-top-20'} flex flex-col items-center gap-1.5 transition-opacity duration-300 ${state !== 'IDLE' && state !== 'HOME' ? 'opacity-0 scale-75' : 'opacity-100'}`}>
        {/* Name Tag */}
        {name && (
          <div className={`px-4 py-1.5 md:px-6 md:py-2.5 rounded-2xl border-2 backdrop-blur-md shadow-2xl font-black italic tracking-tighter uppercase whitespace-nowrap z-[100] ${isNpc ? 'bg-indigo-950/80 text-blue-200 border-blue-500/50' : 'bg-orange-950/80 text-orange-200 border-orange-500/50'}`}>
            <span className={isMobile ? 'text-[10px]' : 'text-[13px]'}>{name}</span>
          </div>
        )}
        
        {accessory?.head && (
          <div className={`${isMobile ? 'text-[9px] px-2 py-0.5' : 'text-xs px-4 py-2'} bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg font-black whitespace-nowrap animate-bounce flex items-center gap-1 border border-white/20`}>
            <span className={isMobile ? 'text-[10px]' : 'text-sm'}>👑</span> {accessory.head}
          </div>
        )}
        {accessory?.body && (
          <div className={`${isMobile ? 'text-[9px] px-2 py-0.5' : 'text-xs px-4 py-2'} bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-md font-black whitespace-nowrap flex items-center gap-1 border border-white/20`}>
            <span className={isMobile ? 'text-[10px]' : 'text-sm'}>👕</span> {accessory.body}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dizzy {
          0% { transform: rotate(0deg) translate(0, 0); }
          25% { transform: rotate(3deg) translate(-3px, 1px); }
          50% { transform: rotate(0deg) translate(3px, -1px); }
          75% { transform: rotate(-3deg) translate(-1px, 3px); }
          100% { transform: rotate(0deg) translate(0, 0); }
        }
        .animate-dizzy { animation: dizzy 0.5s linear infinite; }
      `}} />
    </div>
  );
};

export default CharacterVisual;

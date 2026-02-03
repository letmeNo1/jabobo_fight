
import React from 'react';
import configSettings from '../config';

// Character visual states for animations
export type VisualState = 'IDLE' | 'RUN' | 'ATTACK' | 'HURT' | 'DODGE' | 'HOME' | 'JUMP' | 'CLEAVE' | 'SLASH' | 'PIERCE' | 'SWING' | 'THROW' | 'PUNCH';

interface CharacterVisualProps {
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
  debug?: boolean; // New debug toggle
}

const CharacterVisual: React.FC<CharacterVisualProps> = ({ 
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
  
  // 辅助函数：从全局缓存中获取 Blob URL，彻底避免实时请求
  const getAssetUrl = (path: string) => {
    if (window.assetMap && window.assetMap.has(path)) {
      return window.assetMap.get(path)!;
    }
    return path;
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
        const swingScale = BASE_SCALE;
        const swingRot = f === 4 ? 'rotate(0deg)' : 'rotate(10deg)';
        const swingSkew = f === 4 ? 'skewX(0deg)' : 'skewX(-5deg)';
        const swingX = f === 4 ? 'translateX(25px)' : '';
        return `scale(${swingScale}) ${swingRot} ${swingSkew} ${swingX}`;
      case 'THROW':
        return `scale(${BASE_SCALE}) rotate(0deg) translateY(0px)`;
      case 'PUNCH':
        return f === 2 
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

  const showBaseImage = !state || !STATE_CONFIGS[state];
  const charFilterClass = isNpc ? 'filter hue-rotate-[180deg] brightness-90' : '';

  return (
    <div 
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
        <img 
          src={getAssetUrl(`${basePath}character.png`)} 
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200 ${charFilterClass}`}
          alt="base"
          style={{ zIndex: 5, opacity: showBaseImage ? 1 : 0 }}
        />

        {Object.entries(STATE_CONFIGS).map(([sName, config]) => {
          const isActiveState = state === sName;
          if (!isActiveState) return null;

          const currentFrame = ((frame - 1) % config.count) + 1;

          return Array.from({ length: config.count }).map((_, i) => {
            const frameIndex = i + 1;
            const isTargetFrame = (frameIndex === currentFrame);
            
            // 资源回退逻辑：如果当前帧素材不存在，回退到 Idle 帧
            let weaponSrc = "";
            if (weaponId) {
              const weaponFramePath = `${basePath}${weaponId}_${config.prefix}${frameIndex}.png`;
              const weaponIdlePath = `${basePath}${weaponId}_idle1.png`;
              
              if (window.assetMap?.has(weaponFramePath)) {
                weaponSrc = window.assetMap.get(weaponFramePath)!;
              } else if (window.assetMap?.has(weaponIdlePath)) {
                // 回退到武器的 Idle1 帧
                weaponSrc = window.assetMap.get(weaponIdlePath)!;
              } else {
                // 如果本地数据库还没准备好或完全缺失，尝试直接请求
                weaponSrc = weaponFramePath;
              }
            }

            return (
              <React.Fragment key={`${sName}-${frameIndex}`}>
                <img 
                  key={`char-${sName}-${frameIndex}`}
                  src={getAssetUrl(`${basePath}${config.prefix}${frameIndex}.png`)}
                  className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl pointer-events-none ${charFilterClass}`}
                  style={{ 
                      opacity: isTargetFrame ? 1 : 0,
                      zIndex: isTargetFrame ? 20 : 10,
                      transition: 'none' 
                  }}
                />
                {weaponId && (
                  <img 
                    key={`weapon-${weaponId}-${sName}-${frameIndex}`}
                    src={weaponSrc}
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-lg pointer-events-none"
                    style={{ 
                        opacity: isTargetFrame ? 1 : 0,
                        zIndex: isTargetFrame ? 30 : 15,
                        transition: 'none'
                    }}
                  />
                )}
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

      <div className={`absolute ${isMobile ? '-top-8' : '-top-16'} flex flex-col items-center gap-1 transition-opacity duration-300 ${state !== 'IDLE' && state !== 'HOME' ? 'opacity-0 scale-75' : 'opacity-100'}`}>
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

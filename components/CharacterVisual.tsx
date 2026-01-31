import React from 'react';

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
}

const CharacterVisual: React.FC<CharacterVisualProps> = ({ 
  isNpc = false, 
  isDizzy = false,
  state = 'IDLE',
  frame = 1,
  className = "",
  weaponId,
  accessory
}) => {
  const basePath = 'Images/';
  const BASE_SCALE = 1.3; // 全局放大30%

  // Configuration for each animation state: prefix for filename and number of frames
  const STATE_CONFIGS: Record<VisualState, { prefix: string; count: number }> = {
    HOME: { prefix: 'home', count: 2 },
    IDLE: { prefix: 'idle', count: 2 },
    RUN: { prefix: 'run', count: 5 },
    ATTACK: { prefix: 'atk', count: 4 },
    HURT: { prefix: 'hurt', count: 1 },
    DODGE: { prefix: 'dodge', count: 1 },
    JUMP: { prefix: 'jump', count: 1 }, 
    CLEAVE: { prefix: 'cleave', count: 1 }, 
    SLASH: { prefix: 'slash', count: 3 },
    PIERCE: { prefix: 'pierce', count: 4 },
    SWING: { prefix: 'swing', count: 4 },
    THROW: { prefix: 'throw', count: 3 },
    PUNCH: { prefix: 'punch', count: 2 }
  };

  // Helper to calculate CSS transforms based on current state and frame
  const getFrameTransform = () => {
    const f = ((frame - 1) % (STATE_CONFIGS[state]?.count || 1)) + 1;

    switch (state) {
      case 'HOME': {
        const offset = (f % 2 === 0) ? '-8px' : '0px';
        const scale = (f % 2 === 0) ? 1.02 * BASE_SCALE : 1.0 * BASE_SCALE;
        return `translateY(${offset}) scale(${scale}) rotate(0deg)`;
      }
      case 'IDLE':
        return `scale(${BASE_SCALE}) rotate(0deg)`;
      case 'RUN': {
        const bounce = (f % 2 === 0) ? 'translateY(-4px)' : 'translateY(0px)';
        const tilt = (f % 2 === 0) ? 'rotate(2deg)' : 'rotate(-2deg)';
        return `${bounce} ${tilt} scale(${BASE_SCALE})`;
      }
      case 'JUMP':
        // 移除角度变化，仅保留垂直位移，应用全局缩放
        return `translateY(-20px) scale(${BASE_SCALE * 1.05})`;
      case 'CLEAVE':
        // 砸地瞬间，不再压扁（移除scaleY/scaleX形变），保持全局缩放并增加着地感
        return `translateY(35px) scale(${BASE_SCALE})`;
      case 'SLASH':
        return `scale(${BASE_SCALE}) rotate(0deg) translateX(5px)`;
      case 'PIERCE':
        return `scale(${BASE_SCALE}) rotate(-2deg) translateX(15px)`;
      case 'SWING':
        const swingScale = f === 4 ? BASE_SCALE : BASE_SCALE;
        const swingRot = f === 4 ? 'rotate(0deg)' : 'rotate(10deg)';
        const swingSkew = f === 4 ? 'skewX(0deg)' : 'skewX(-5deg)';
        const swingX = f === 4 ? 'translateX(20px)' : '';
        return `scale(${swingScale}) ${swingRot} ${swingSkew} ${swingX}`;
      case 'THROW':
        return `scale(${BASE_SCALE}) rotate(0deg) translateY(-5px)`;
      case 'PUNCH':
        return f === 2 
          ? `scale(${BASE_SCALE * 1.1}) rotate(-8deg) translateX(15px)` 
          : `scale(${BASE_SCALE}) rotate(0deg) translateX(-5px)`;
      case 'ATTACK':
        return `scale(${BASE_SCALE}) rotate(-5deg)`;
      case 'HURT':
        return `translate(-8px, 2px) scale(${BASE_SCALE * 0.9}) rotate(5deg)`;
      default:
        return `scale(${BASE_SCALE}) rotate(0deg)`;
    }
  };

  const showBaseImage = !state || !STATE_CONFIGS[state];

  return (
    <div className={`relative flex flex-col items-center select-none group ${className}`} style={{ width: '208px', height: '234px' }}>
      
      {/* Dynamic shadow based on state */}
      <div className={`absolute bottom-6 h-5 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-300
        ${state === 'RUN' ? 'w-24 opacity-40 scale-x-110' : 'w-28 animate-pulse'}
        ${state === 'JUMP' || state === 'CLEAVE' ? 'w-20 opacity-10 scale-x-50' : ''}
        ${state === 'HOME' ? 'w-32 opacity-20 scale-x-110' : ''}
        ${state === 'HURT' ? 'scale-x-75 opacity-20' : ''}
        ${state === 'IDLE' ? 'w-28 opacity-20 scale-x-100' : ''}
      `}></div>

      {/* Main character container */}
      <div 
        className={`relative w-44 h-52 flex items-center justify-center
          ${isDizzy ? 'animate-dizzy filter grayscale contrast-125' : ''} 
          ${isNpc ? 'filter hue-rotate-[180deg] brightness-90' : ''}
          ${state === 'HURT' ? 'filter saturate-150 brightness-110' : ''}
        `}
        style={{ 
          transform: getFrameTransform(), 
          transition: (state === 'IDLE' || state === 'SWING' || state === 'PUNCH' || state === 'CLEAVE' || state === 'JUMP') ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
      >
        <img 
          src={`${basePath}character.png`} 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-200"
          alt="base"
          style={{ 
            zIndex: 5, 
            opacity: showBaseImage ? 1 : 0 
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('dicebear')) {
                target.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=" + (isNpc ? 'npc' : 'player');
            }
          }}
        />

        {/* Action frames rendering */}
        {Object.entries(STATE_CONFIGS).map(([sName, config]) => {
          const isActiveState = state === sName;
          if (!isActiveState) return null;

          const currentFrame = ((frame - 1) % config.count) + 1;

          return Array.from({ length: config.count }).map((_, i) => {
            const frameIndex = i + 1;
            const isTargetFrame = (frameIndex === currentFrame);

            return (
              <React.Fragment key={`${sName}-${frameIndex}`}>
                {/* Character action layer */}
                <img 
                  src={`${basePath}${config.prefix}${frameIndex}.png`}
                  className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl pointer-events-none"
                  style={{ 
                      opacity: isTargetFrame ? 1 : 0,
                      zIndex: isTargetFrame ? 20 : 10,
                      transition: 'none' 
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'; 
                  }}
                />
                
                {/* Weapon action overlay layer */}
                {weaponId && (
                  <img 
                    src={`${basePath}${weaponId}_${config.prefix}${frameIndex}.png`}
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-lg pointer-events-none"
                    style={{ 
                        opacity: isTargetFrame ? 1 : 0,
                        zIndex: isTargetFrame ? 30 : 15,
                        transition: 'none',
                        mixBlendMode: 'normal'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0';
                    }}
                  />
                )}
              </React.Fragment>
            );
          });
        })}

        {/* Dizzy overlay */}
        {isDizzy && (
          <div className="absolute -top-10 left-0 w-full flex justify-center pointer-events-none z-50">
            <span className="text-4xl animate-spin">💫</span>
          </div>
        )}
      </div>

      {/* Floating labels for equipment */}
      <div className={`absolute -top-12 flex flex-col items-center gap-1.5 pointer-events-none z-20 transition-opacity duration-300 ${state !== 'IDLE' && state !== 'HOME' ? 'opacity-0 scale-75' : 'opacity-100'}`}>
        {accessory?.head && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-[11px] text-white px-3.5 py-1.5 rounded-full shadow-lg font-black whitespace-nowrap animate-bounce flex items-center gap-1 border border-white/20">
            <span className="text-xs">👑</span> {accessory.head}
          </div>
        )}
        {accessory?.body && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-[11px] text-white px-3.5 py-1.5 rounded-full shadow-md font-black whitespace-nowrap flex items-center gap-1 border border-white/20">
            <span className="text-xs">👕</span> {accessory.body}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes dizzy {
          0% { transform: rotate(0deg) translate(0, 0); }
          25% { transform: rotate(3deg) translate(-2px, 1px); }
          50% { transform: rotate(0deg) translate(2px, -1px); }
          75% { transform: rotate(-3deg) translate(-1px, 2px); }
          100% { transform: rotate(0deg) translate(0, 0); }
        }
        .animate-dizzy { animation: dizzy 0.5s linear infinite; }
      `}} />
    </div>
  );
};

export default CharacterVisual;
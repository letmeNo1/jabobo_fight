import React from 'react';

export type VisualState = 'IDLE' | 'RUN' | 'ATTACK' | 'HURT' | 'DODGE' | 'HOME';

interface CharacterVisualProps {
  isNpc?: boolean;
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
  // 统一资源路径
  const basePath = 'Images/';

  const STATE_CONFIGS: Record<VisualState, { prefix: string; count: number }> = {
    HOME: { prefix: 'home', count: 2 },
    IDLE: { prefix: 'idle', count: 2 },
    RUN: { prefix: 'run', count: 5 },
    ATTACK: { prefix: 'atk', count: 4 },
    HURT: { prefix: 'hurt', count: 1 },
    DODGE: { prefix: 'dodge', count: 1 }
  };

  // 动画状态下的位移和变形处理
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
    return '';
  };

  /**
   * 核心修复：判断是否显示基础底图
   * 如果当前 state 在 STATE_CONFIGS 中有定义，我们应该依靠序列帧动画，而不是显示底图。
   * 只有当没有 state 或 state 不在配置中时，才显示 character.png 作为兜底。
   */
  const showBaseImage = !state || !STATE_CONFIGS[state];

  return (
    <div className={`relative flex flex-col items-center select-none group ${className}`} style={{ width: '160px', height: '180px' }}>
      
      {/* 底部阴影 */}
      <div className={`absolute bottom-4 h-5 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-300
        ${state === 'RUN' ? 'w-20 opacity-40 scale-x-110' : 'w-24 animate-pulse'}
        ${state === 'HOME' ? 'w-28 opacity-20 scale-x-110' : ''}
        ${state === 'HURT' ? 'scale-x-75 opacity-20' : ''}
      `}></div>

      {/* 绘图容器 */}
      <div 
        className={`relative w-36 h-44 flex items-center justify-center
          ${isDizzy ? 'animate-dizzy filter grayscale contrast-125' : ''} 
          ${isNpc ? 'filter hue-rotate-[180deg] brightness-90' : ''}
          ${state === 'HURT' ? 'filter saturate-150 brightness-110' : ''}
        `}
        style={{ transform: getFrameTransform(), transition: 'transform 0.1s ease-out' }}
      >
        {/* 【基础底图】仅作为兜底占位符，动画激活时 opacity 为 0 */}
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
            // 如果连底图都加载失败，使用 DiceBear 提供的机器人头像作为最终兜底
            if (!target.src.includes('dicebear')) {
                target.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=" + (isNpc ? 'npc' : 'player');
            }
          }}
        />

        {/* 【序列帧】互斥渲染：每个状态的所有帧都在 DOM 中，通过 opacity 精确控制显示哪一帧 */}
        {Object.entries(STATE_CONFIGS).map(([sName, config]) => {
          const isActiveState = state === sName;
          return Array.from({ length: config.count }).map((_, i) => {
            const frameIndex = i + 1;
            // 只有当前状态匹配且帧号对应时，图片才可见 (opacity: 1)
            const isTargetFrame = isActiveState && (
                frame === frameIndex || (frame > config.count && frameIndex === 1) || (!frame && frameIndex === 1)
            );

            return (
              <img 
                key={`${sName}-${frameIndex}`}
                src={`${basePath}${config.prefix}${frameIndex}.png`}
                className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl pointer-events-none"
                style={{ 
                    opacity: isTargetFrame ? 1 : 0,
                    zIndex: isTargetFrame ? 20 : 10,
                    transition: 'none' 
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // 如果序列帧缺失，尝试显示基础图作为补偿（可选逻辑，这里简单隐藏）
                  target.style.display = 'none'; 
                }}
              />
            );
          });
        })}

        {isDizzy && (
          <div className="absolute -top-6 left-0 w-full flex justify-center pointer-events-none z-50">
            <span className="text-3xl animate-spin">💫</span>
          </div>
        )}
      </div>

      {/* 装备/时装标签 - 仅在非战斗动作时显示 */}
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
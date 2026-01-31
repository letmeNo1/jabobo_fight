
import React from 'react';

interface CharacterVisualProps {
  isNpc?: boolean;
  isWinking?: boolean;
  isDizzy?: boolean;
  frame?: number; // 0 为静止，1-5 为跑步帧
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
  frame = 0,
  className = "",
  accessory
}) => {
  /**
   * 图片资源说明：
   * 静止：character.png
   * 跑步帧：run1.png, run2.png, run3.png, run4.png, run5.png
   */
  const getCharacterSource = () => {
    // 如果没有 frame 或为 0，显示静止图
    if (!frame || frame === 0) {
      return "character.png"; 
    }
    // 显示对应的跑步帧
    return `run${frame}.png`;
  };

  // 模拟不同帧的身体微调（即使图片没加载，也能通过 CSS 看到动感）
  const getFrameTransform = () => {
    if (frame === 0) return '';
    const bounce = frame % 2 === 0 ? '-4px' : '0px';
    const tilt = frame % 2 === 0 ? '2deg' : '-2deg';
    return `translateY(${bounce}) rotate(${tilt})`;
  };

  return (
    <div className={`relative flex flex-col items-center select-none group ${className}`} style={{ width: '160px', height: '180px' }}>
      
      {/* 底部呼吸/移动阴影 */}
      <div className={`absolute bottom-4 h-5 bg-black/10 rounded-[100%] blur-[4px] transition-all duration-100
        ${frame > 0 ? 'w-20 opacity-40 scale-x-110' : 'w-24 animate-pulse'}
      `}></div>

      {/* 角色图片容器 */}
      <div 
        className={`relative w-36 h-44 transition-all duration-100 flex items-center justify-center
          ${isDizzy ? 'animate-dizzy filter grayscale contrast-125' : ''} 
          ${isWinking && frame === 0 ? 'scale-y-[0.97] translate-y-1' : ''}
          ${isNpc ? 'filter hue-rotate-[180deg] brightness-90' : ''}
        `}
        style={{ transform: getFrameTransform() }}
      >
        {/* 主形象图片 */}
        <img 
          src={getCharacterSource()} 
          alt={`Character Frame ${frame}`} 
          className="w-full h-full object-contain drop-shadow-2xl"
          onError={(e) => {
            // 兜底逻辑：如果跑步帧图片不存在，使用 DiceBear 占位符
            const target = e.target as HTMLImageElement;
            if (frame > 0) {
                // 如果是跑步帧报错，可以尝试显示静止图
                target.src = "character.png";
            } else {
                target.src = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Jabra&backgroundColor=ffffff";
            }
          }}
        />

        {/* 状态特效：眩晕的小星星 */}
        {isDizzy && (
          <div className="absolute -top-6 left-0 w-full flex justify-center pointer-events-none">
            <span className="text-3xl animate-spin">💫</span>
          </div>
        )}
      </div>

      {/* 装备标签 - 移动时隐藏或缩小以减少视觉干扰 */}
      <div className={`absolute -top-8 flex flex-col items-center gap-1.5 pointer-events-none z-20 transition-opacity duration-200 ${frame > 0 ? 'opacity-0' : 'opacity-100'}`}>
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

import React from 'react';

interface LoadingScreenProps {
  progress: number;
  total: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, total }) => {
  const percentage = Math.floor((progress / total) * 100);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)] animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo/Title Area */}
        <div className="mb-12 text-center animate-popIn">
          <div className="text-6xl mb-4 filter drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">⚔️</div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
            Jabobo-Fight Master
          </h1>
          <p className="text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase mt-2">
            Loading Assets... {percentage}%
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-slate-800/50 h-3 rounded-full overflow-hidden border border-slate-700 shadow-inner relative mb-4">
          <div 
            className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-amber-300 transition-all duration-300 ease-out shadow-[0_0_20px_rgba(249,115,22,0.4)]"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
          </div>
        </div>

        {/* Status Text */}
        <div className="flex justify-between w-full text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
          <span>{progress} / {total} Assets</span>
          <span className="animate-pulse">{percentage === 100 ? 'Complete' : 'Fetching...'}</span>
        </div>

        {/* Game Tips */}
        <div className="mt-16 text-center max-w-xs opacity-60">
          <p className="text-xs italic text-slate-400">
            "小贴士: 力量影响伤害，敏捷影响闪避，速度决定谁先出手。"
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-popIn {
          animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />
    </div>
  );
};

export default LoadingScreen;
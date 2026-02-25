import React from 'react';
import { Friend } from '../types';
import CharacterVisual from './CharacterVisual';
import { calculateTotalCP } from '../utils/combatPower';

// 移除 onRemove 入参
interface FriendCardProps {
  friend: Friend;
  onChallenge: (friend: Friend) => void;
}

// 移除 onRemove 入参
const FriendCard: React.FC<FriendCardProps> = ({ friend, onChallenge }) => {
  const totalCP = calculateTotalCP(friend);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/30 rounded-full -mr-12 -mt-12 group-hover:bg-emerald-100 transition-colors"></div>
      
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
          <div className="scale-[0.22] origin-center">
            <CharacterVisual name={friend.name} isNpc state="HOME" frame={1} />
          </div>
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h4 className="font-black text-slate-800 text-sm md:text-base truncate max-w-[120px]">{friend.name}</h4>
            <div className="text-right">
              <div className="text-[8px] text-slate-400 font-black uppercase">Combat Power</div>
              <div className="text-xs font-black text-indigo-600 tracking-tighter">⚡ {totalCP}</div>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black">等级 {friend.level}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5 relative z-10">
        <div className="bg-slate-50 p-2 rounded-xl text-center">
          <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">STR</p>
          <p className="text-xs font-black text-red-500">{friend.str}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl text-center">
          <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">AGI</p>
          <p className="text-xs font-black text-emerald-500">{friend.agi}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl text-center">
          <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">SPD</p>
          <p className="text-xs font-black text-blue-500">{friend.spd}</p>
        </div>
      </div>

      <div className="flex gap-2 relative z-10">
        <button 
          onClick={() => onChallenge(friend)}
          className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-50 transition-all active:scale-95"
        >
          切磋一下
        </button>
        {/* 移除删除按钮 */}
      </div>
    </div>
  );
};

export default FriendCard;
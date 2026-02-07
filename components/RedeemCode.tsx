
import React, { useState } from 'react';
import { CharacterData } from '../types';
import { playUISound } from '../utils/audio';
import { deleteDB } from '../utils/db';

interface RedeemCodeProps {
  player: CharacterData;
  setPlayer: React.Dispatch<React.SetStateAction<CharacterData>>;
}

const RedeemCode: React.FC<RedeemCodeProps> = ({ player, setPlayer }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ type: 'SUCCESS' | 'ERROR'; msg: string } | null>(null);

  const handleRedeem = () => {
    playUISound('CLICK');
    if (code.trim() === '123456') {
      const hasW21 = player.weapons.includes('w21');
      const hasS29 = player.skills.includes('s29');

      if (hasW21 && hasS29) {
        setStatus({ type: 'ERROR', msg: '你已经领取过该兑换码的奖励了！' });
        return;
      }

      setPlayer(prev => ({
        ...prev,
        weapons: Array.from(new Set([...prev.weapons, 'w21'])),
        skills: Array.from(new Set([...prev.skills, 's29']))
      }));
      setStatus({ type: 'SUCCESS', msg: '兑换成功！获得了：speaker 310 & 捷波波' });
      playUISound('LEVEL_UP');
      setCode('');
    } else {
      setStatus({ type: 'ERROR', msg: '无效的兑换码，请检查后再试。' });
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const handleReloadAssets = async () => {
    if (confirm('确定要重载所有资源吗？用于修复资源不显示问题。')) {
      playUISound('CLICK');
      try {
        await deleteDB();
        window.location.reload();
      } catch (e) {
        window.location.reload();
      }
    }
  };

  return (
    <div className="w-full bg-white/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm animate-popIn mt-4 mb-12 overflow-hidden">
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest italic leading-none">🎁 兑换中心</h3>
            <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase mt-1">Specials & Tools</p>
          </div>
          <button 
            onClick={handleReloadAssets}
            className="md:hidden text-indigo-600 font-black text-[9px] uppercase border border-indigo-200 px-2 py-1 rounded-lg bg-indigo-50 active:scale-95 transition-all"
          >
            🛠️ 资源重载
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="输入兑换码..."
            className="flex-grow bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-xs md:text-sm font-bold focus:border-orange-400 outline-none transition-all placeholder:text-slate-300 min-w-0"
          />
          <div className="flex gap-2">
            <button 
              onClick={handleRedeem}
              className="flex-1 sm:flex-none bg-slate-800 text-white px-3 md:px-6 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider hover:bg-slate-900 transition-all active:scale-95 shadow-md whitespace-nowrap"
            >
              兑换奖励
            </button>
            <button 
              onClick={handleReloadAssets}
              className="hidden md:block bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all active:scale-95 shadow-md whitespace-nowrap"
            >
              🛠️ 资源重载
            </button>
          </div>
        </div>
      </div>

      {status && (
        <div className={`mt-3 text-[10px] md:text-[11px] font-black text-center py-2 rounded-lg animate-bounce ${status.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
          {status.type === 'SUCCESS' ? '✅' : '❌'} {status.msg}
        </div>
      )}
    </div>
  );
};

export default RedeemCode;

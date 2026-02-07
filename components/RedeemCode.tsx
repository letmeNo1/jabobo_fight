
import React, { useState } from 'react';
import { CharacterData } from '../types';
import { playUISound } from '../utils/audio';

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

  return (
    <div className="w-full bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm animate-popIn mt-4 mb-12">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-shrink-0">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">🎁 兑换中心</h3>
          <p className="text-[10px] text-slate-400 font-bold">REDEEM SPECIAL ITEMS</p>
        </div>
        
        <div className="flex-grow flex gap-2 w-full">
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="输入兑换码..."
            className="flex-grow bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:border-orange-400 outline-none transition-all placeholder:text-slate-300"
          />
          <button 
            onClick={handleRedeem}
            className="bg-slate-800 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-900 transition-all active:scale-95 shadow-md"
          >
            兑换奖励
          </button>
        </div>
      </div>

      {status && (
        <div className={`mt-3 text-[11px] font-black text-center py-2 rounded-lg animate-bounce ${status.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
          {status.type === 'SUCCESS' ? '✅' : '❌'} {status.msg}
        </div>
      )}
    </div>
  );
};

export default RedeemCode;

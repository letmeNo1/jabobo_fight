
import React from 'react';
import { CharacterData, Dressing } from '../types';
import { DRESSINGS } from '../constants';

interface DressingRoomProps {
  player: CharacterData;
  setPlayer: React.Dispatch<React.SetStateAction<CharacterData>>;
  onBack: () => void;
}

const DressingRoom: React.FC<DressingRoomProps> = ({ player, setPlayer, onBack }) => {
  const buyOrEquip = (d: Dressing) => {
    const isUnlocked = player.unlockedDressings.includes(d.id);
    
    if (isUnlocked) {
      // Equip
      setPlayer(prev => ({
        ...prev,
        dressing: { ...prev.dressing, [d.part]: d.id === prev.dressing[d.part] ? '' : d.id }
      }));
    } else if (player.gold >= d.price) {
      // Buy and equip
      setPlayer(prev => {
        const newData = {
          ...prev,
          gold: prev.gold - d.price,
          unlockedDressings: [...prev.unlockedDressings, d.id],
          dressing: { ...prev.dressing, [d.part]: d.id }
        };
        // Apply permanent stat bonuses
        if (d.statBonus) {
          if (d.statBonus.agi) newData.agi += d.statBonus.agi;
          if (d.statBonus.hp) newData.maxHp += d.statBonus.hp;
          if (d.statBonus.str) newData.str += d.statBonus.str;
        }
        return newData;
      });
    } else {
      alert('金币不足！快去战斗赚钱吧。');
    }
  };

  const parts: ('HEAD' | 'BODY' | 'WEAPON')[] = ['HEAD', 'BODY', 'WEAPON'];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full">
      <div className="p-6 border-b flex justify-between items-center bg-purple-50">
        <h2 className="text-xl font-bold text-purple-700">换装商店</h2>
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 font-bold">返回主页</button>
      </div>
      
      <div className="p-6 space-y-8">
        {parts.map(part => (
          <div key={part}>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              {part === 'HEAD' ? '头部装饰' : part === 'BODY' ? '身体服饰' : '武器外观'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {DRESSINGS.filter(d => d.part === part).map(d => {
                const isUnlocked = player.unlockedDressings.includes(d.id);
                const isEquipped = player.dressing[part] === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => buyOrEquip(d)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isEquipped ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-800">{d.name}</span>
                      {d.type === 'RARE' && <span className="text-[10px] bg-yellow-400 text-white px-1 rounded font-black">RARE</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 mb-2">
                      {d.statBonus ? Object.entries(d.statBonus).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ') : '无属性加成'}
                    </div>
                    {isUnlocked ? (
                      <span className={`text-xs font-bold ${isEquipped ? 'text-purple-600' : 'text-green-500'}`}>
                        {isEquipped ? '已穿戴' : '已拥有'}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-orange-500">💰 {d.price}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DressingRoom;

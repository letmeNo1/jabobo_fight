import React, { useState, useEffect } from 'react';
import { CharacterData } from '../types';
import { DRESSINGS } from '../constants';
import CharacterVisual from './CharacterVisual';

interface ProfileProps {
  player: CharacterData;
}

const Profile: React.FC<ProfileProps> = ({ player }) => {
  const [frame, setFrame] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev % 2) + 1);
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const getDressingName = (part: 'HEAD' | 'BODY' | 'WEAPON') => {
    const id = player.dressing[part];
    return DRESSINGS.find(d => d.id === id)?.name;
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="relative w-56 h-56 mx-auto flex items-center justify-center mb-6">
        <CharacterVisual 
          state="HOME"
          frame={frame}
          weaponId={player.dressing.WEAPON}
          accessory={{
            head: getDressingName('HEAD'),
            body: getDressingName('BODY'),
            weapon: getDressingName('WEAPON')
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-50 p-3 rounded-lg">
          <p className="text-xs text-orange-400 font-bold uppercase">生命值</p>
          <p className="text-lg font-bold">{player.maxHp}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <p className="text-xs text-red-400 font-bold uppercase">力量</p>
          <p className="text-lg font-bold">{player.str}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-green-400 font-bold uppercase">敏捷</p>
          <p className="text-lg font-bold">{player.agi}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-400 font-bold uppercase">速度</p>
          <p className="text-lg font-bold">{player.spd}</p>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 text-center italic">
        闪避率: {Math.min(30, player.agi + (player.skills.includes('s13') ? 7 : 0))}% (上限30%)
      </div>
    </div>
  );
};

export default Profile;
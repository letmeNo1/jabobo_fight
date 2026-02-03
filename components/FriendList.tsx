
import React, { useState } from 'react';
import { CharacterData, Friend } from '../types';
import FriendCard from './FriendCard';
import FriendSearch from './FriendSearch';
import { generateRandomFriend } from '../utils/game';

interface FriendListProps {
  player: CharacterData;
  onBack: () => void;
  onChallenge: (friend: Friend) => void;
  onAddFriend: (friend: Friend) => void;
  onRemoveFriend: (id: string) => void;
}

const FriendList: React.FC<FriendListProps> = ({ player, onBack, onChallenge, onAddFriend, onRemoveFriend }) => {
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    setSearching(true);
    setTimeout(() => {
      const newFriend = generateRandomFriend(player.level);
      onAddFriend(newFriend);
      setSearching(false);
    }, 800);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[70vh] flex flex-col animate-popIn">
      <div className="p-4 md:p-6 border-b flex justify-between items-center bg-emerald-50">
        <div>
          <h2 className="text-xl font-black text-emerald-800 italic">江湖好友</h2>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Global Challengers</p>
        </div>
        <button onClick={onBack} className="bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-xl text-sm font-black shadow-md shadow-emerald-100 active:scale-95 transition-all">返回主页</button>
      </div>

      <div className="p-4 md:p-8 flex-grow">
        <FriendSearch onSearch={handleSearch} searching={searching} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {player.friends.length > 0 ? (
            player.friends.map(friend => (
              <FriendCard 
                key={friend.id} 
                friend={friend} 
                onChallenge={onChallenge} 
                onRemove={onRemoveFriend} 
              />
            ))
          ) : (
            <div className="col-span-full py-24 text-center">
              <div className="text-6xl mb-6 grayscale opacity-20">🤝</div>
              <h4 className="text-lg font-black text-slate-400 italic">暂无好友，快去寻访名师吧！</h4>
              <p className="text-xs text-slate-300 mt-2">好友不仅可以切磋，更是你实力的见证</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-popIn { animation: popIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
};

export default FriendList;


import React, { useState } from 'react';
import { CharacterData, Friend } from '../types';
import { WEAPONS, SKILLS } from '../constants';
import CharacterVisual from './CharacterVisual';

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
    // 模拟搜索延时，增加代入感
    setTimeout(() => {
      const names = ["西门吹雪", "叶孤城", "陆小凤", "楚留香", "李寻欢", "沈浪", "燕南天", "花无缺", "谢晓峰", "傅红雪"];
      const randomName = names[Math.floor(Math.random() * names.length)] + "#" + Math.floor(1000 + Math.random() * 9000);
      const randomLevel = Math.max(1, player.level + (Math.floor(Math.random() * 5) - 2));
      
      const newFriend: Friend = {
        id: Math.random().toString(36).substr(2, 9),
        name: randomName,
        level: randomLevel,
        str: 5 + randomLevel + Math.floor(Math.random() * 3),
        agi: 5 + randomLevel + Math.floor(Math.random() * 3),
        spd: 5 + randomLevel + Math.floor(Math.random() * 3),
        hp: 300 + randomLevel * 10,
        weapons: [...WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.id),
        skills: [...SKILLS].sort(() => 0.5 - Math.random()).slice(0, 4).map(s => s.id),
        dressing: {
          HEAD: '',
          BODY: '',
          WEAPON: ''
        }
      };

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
        <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-black text-slate-800">寻访豪杰</h3>
            <p className="text-xs text-slate-400 font-medium">在茫茫江湖中寻觅实力相当的对手添加为好友</p>
          </div>
          <button 
            onClick={handleSearch}
            disabled={searching}
            className={`w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {searching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                寻访中...
              </>
            ) : (
              '寻访名师'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {player.friends.length > 0 ? (
            player.friends.map(friend => (
              <div key={friend.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/30 rounded-full -mr-12 -mt-12 group-hover:bg-emerald-100 transition-colors"></div>
                
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                    <div className="scale-[0.22] origin-center">
                      <CharacterVisual isNpc state="HOME" frame={1} />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm md:text-base">{friend.name}</h4>
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
                  <button 
                    onClick={() => onRemoveFriend(friend.id)}
                    className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                    title="移除好友"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
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
        @keyframes popIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-popIn { animation: popIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
};

export default FriendList;

import React, { useState, useEffect } from 'react';
import { CharacterData, Friend } from '../types';
import FriendCard from './FriendCard';
import { getAllUsersData } from '../utils/storage';

interface FriendListProps {
  player: CharacterData;
  onBack: () => void;
  onChallenge: (friend: Friend) => void;
  onAddFriend: (friend: Friend) => void;
  onRemoveFriend: (id: string) => void;
}

const FriendList: React.FC<FriendListProps> = ({ player, onBack, onChallenge, onAddFriend, onRemoveFriend }) => {
  const [allPlayers, setAllPlayers] = useState<CharacterData[]>([]);
  // 🌟 新增：加载状态，提升用户体验
  const [loading, setLoading] = useState(true);

  // 🌟 核心修复：处理异步函数，使用 await + async
  useEffect(() => {
    const fetchAllPlayers = async () => {
      setLoading(true);
      try {
        // 等待异步函数返回结果（Promise解析）
        const users = await getAllUsersData();
        // 过滤掉自己，只显示其他玩家
        setAllPlayers(users.filter(u => u.name !== player.name));
      } catch (error) {
        console.error('获取所有玩家数据失败:', error);
        setAllPlayers([]); // 出错时置空，避免界面崩溃
      } finally {
        setLoading(false);
      }
    };

    fetchAllPlayers();
  }, [player.name]); // 依赖 player.name，确保名字变化时重新过滤

  // 判断是否已是好友
  const isFriend = (id: string) => player.friends.some(f => f.id === id);

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[70vh] flex flex-col animate-popIn">
      <div className="p-4 md:p-6 border-b flex justify-between items-center bg-emerald-50">
        <div>
          <h2 className="text-xl font-black text-emerald-800 italic">江湖榜</h2>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Global Fighters</p>
        </div>
        <button onClick={onBack} className="bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-xl text-sm font-black shadow-md shadow-emerald-100 active:scale-95 transition-all">返回主页</button>
      </div>

      <div className="p-4 md:p-8 flex-grow overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* 🌟 加载状态提示 */}
          {loading ? (
            <div className="col-span-full py-24 text-center">
              <div className="text-6xl mb-6 grayscale opacity-20">🔄</div>
              <h4 className="text-lg font-black text-slate-400 italic">正在查询江湖榜...</h4>
              <p className="text-xs text-slate-300 mt-2">请稍候</p>
            </div>
          ) : allPlayers.length > 0 ? (
            allPlayers.map(p => {
              // 转换 CharacterData 为 Friend 类型（兼容接口）
              const friendData: Friend = {
                id: p.name, // 临时用名字作为ID（后续可替换为UUID）
                name: p.name,
                level: p.level,
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.name}`, // 根据名字生成头像
                hp: p.maxHp, // 用最大生命值作为当前生命值展示
                maxHp: p.maxHp,
                str: p.str,
                agi: p.agi,
                spd: p.spd,
                weapons: p.weapons,
                skills: p.skills,
                dressing: p.dressing
              };
              
              const alreadyFriend = isFriend(friendData.id);

              return (
                <div key={p.name} className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 hover:border-emerald-200 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={friendData.avatar} alt={p.name} className="w-12 h-12 rounded-full bg-white border border-slate-200" />
                    <div>
                      <div className="font-black text-slate-700">{p.name}</div>
                      <div className="text-xs font-bold text-slate-400">Lv.{p.level}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => onChallenge(friendData)}
                      className="bg-orange-500 text-white py-2 rounded-lg text-xs font-black hover:bg-orange-600 active:scale-95 transition-all"
                    >
                      ⚔️ 切磋
                    </button>
                    {alreadyFriend ? (
                      <button 
                        onClick={() => onRemoveFriend(friendData.id)}
                        className="bg-rose-100 text-rose-500 py-2 rounded-lg text-xs font-black hover:bg-rose-200 active:scale-95 transition-all"
                      >
                        💔 断交
                      </button>
                    ) : (
                      <button 
                        onClick={() => onAddFriend(friendData)}
                        className="bg-emerald-500 text-white py-2 rounded-lg text-xs font-black hover:bg-emerald-600 active:scale-95 transition-all"
                      >
                        🤝 结交
                      </button>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 bg-white p-2 rounded-lg">
                    <span>HP:{p.maxHp}</span>
                    <span>STR:{p.str}</span>
                    <span>AGI:{p.agi}</span>
                    <span>SPD:{p.spd}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-24 text-center">
              <div className="text-6xl mb-6 grayscale opacity-20">🌍</div>
              <h4 className="text-lg font-black text-slate-400 italic">江湖空荡荡...</h4>
              <p className="text-xs text-slate-300 mt-2">暂无其他侠客，快去邀请好友吧！</p>
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
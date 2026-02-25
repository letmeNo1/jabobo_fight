import React, { useState } from 'react';
import { CharacterData, Friend } from '../types';
import FriendCard from './FriendCard';
import { getAllServerPlayers } from '../utils/storage';

// 后端 CharacterData → 前端 Friend（用于战斗挑战）
const convertToFriend = (player: CharacterData): Friend => {
  const winCount = player.win_count || 0;
  const loseCount = player.lose_count || 0;
  const total = winCount + loseCount;
  const winRate = total > 0 ? Math.floor((winCount / total) * 100) : 50;

  return {
    // 修复1：重复取值问题（player.username || player.username 无意义）
    id: player.username || `p${Math.random().toString(36).slice(2)}`,
    name: player.username || '未知玩家',
    level: player.level || 1,
    str: player.str || 5,
    agi: player.agi || 5,
    spd: player.spd || 5,
    avatar: `avatar-${(player.level || 1) % 10}`,
    winRate,
    hp: player.maxHp || 300,
    maxHp: player.maxHp || 300,
    weapons: player.weapons || [],
    skills: player.skills || [],
    dressing: player.dressing || { HEAD: '', BODY: '', WEAPON: '' },
  };
};

interface FriendListProps {
  player: CharacterData;
  onBack: () => void;
  onChallenge: (friend: Friend) => void;
}

const FriendList: React.FC<FriendListProps> = ({
  player,
  onBack,
  onChallenge,
}) => {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Friend[]>([]);

  // 加载全服玩家（唯一列表）
  const loadAllPlayers = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await getAllServerPlayers();
      if (res.success && res.data) {
        const list = res.data
          // 修复2：过滤自身时用 username 而非 name（原始数据是 username）
          .filter(p => p.username !== player.username)
          .map(convertToFriend);
        setPlayers(list);
      } else {
        alert(res.message || '加载失败');
      }
    } catch (err) {
      console.error(err);
      alert('加载全服玩家异常');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[70vh] flex flex-col animate-popIn">
      <div className="p-4 md:p-6 border-b flex justify-between items-center bg-emerald-50">
        <div>
          <h2 className="text-xl font-black text-emerald-800 italic">全服玩家</h2>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">All Players</p>
        </div>
        <button
          onClick={onBack}
          className="bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-xl text-sm font-black shadow-md shadow-emerald-100 active:scale-95 transition-all"
        >
          返回主页
        </button>
      </div>

      <div className="p-4 md:p-8 flex-grow">
        <button
          onClick={loadAllPlayers}
          disabled={loading}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-black shadow-md hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-70 mb-6"
        >
          {loading ? '加载中...' : '刷新全服玩家'}
        </button>

        {players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {players.map(friend => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onChallenge={onChallenge}
                // 修复3：注释移到属性外部，避免 JSX 解析错误
              />
              // 移除 onRemove 传参（已删除该 Props）
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <div className="text-5xl mb-4">🌍</div>
            {loading ? '正在加载玩家...' : '暂无玩家，点击刷新获取列表'}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .animate-popIn { animation: popIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
};

export default FriendList;
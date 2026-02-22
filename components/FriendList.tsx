import React, { useState, useEffect, useRef } from 'react';
import { CharacterData } from '../types';
import { getCurrentUser, getAllServerPlayers } from '../utils/storage';

interface FriendListProps {
  player: CharacterData;
  onBack: () => void;
  onChallenge: (player: CharacterData & { id: string, account_id?: number }) => void;
  // 移除结交/断交相关的props
}

const FriendList: React.FC<FriendListProps> = ({ player, onBack, onChallenge }) => {
  const [allPlayers, setAllPlayers] = useState<CharacterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = getCurrentUser();
  
  // 标记是否已加载过数据，避免重复请求
  const isDataLoaded = useRef(false);
  // 保存当前用户，避免依赖项变化触发重复请求
  const currentUserRef = useRef(currentUser);

  // 初始化：保存当前用户到ref
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // 加载玩家列表（仅执行一次）
  useEffect(() => {
    let isMounted = true;

    const fetchAllPlayers = async () => {
      if (isDataLoaded.current) return; // 已加载过则直接返回
      
      setLoading(true);
      setError(null);
      
      if (!currentUserRef.current) {
        if (isMounted) {
          setLoading(false);
          setError('请先登录查看江湖榜');
        }
        return;
      }

      try {
        // 调用修复后的接口
        const serverPlayers = await getAllServerPlayers();
        const validPlayers = serverPlayers.filter(p => p && p.name);
        
        if (isMounted) {
          setAllPlayers(validPlayers);
          isDataLoaded.current = true;
        }
      } catch (fetchError) {
        console.error('获取玩家列表失败:', fetchError);
        if (isMounted) {
          setError('获取江湖榜失败，请稍后重试');
          setAllPlayers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllPlayers();

    return () => {
      isMounted = false;
    };
  }, []); // 空依赖，仅挂载时执行

  // 手动刷新列表
  const refreshPlayerList = async () => {
    setLoading(true);
    setError(null);
    
    if (!currentUserRef.current) {
      setLoading(false);
      setError('请先登录查看江湖榜');
      return;
    }

    try {
      const serverPlayers = await getAllServerPlayers();
      const validPlayers = serverPlayers.filter(p => p && p.name);
      setAllPlayers(validPlayers);
    } catch (fetchError) {
      console.error('刷新玩家列表失败:', fetchError);
      setError('刷新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 生成唯一ID（用于列表key，保留基础功能）
  const generatePlayerId = (playerData: CharacterData) => {
    return (playerData as any).account_id?.toString() || 
           `${playerData.name}_${Math.floor(Math.random() * 1000)}`;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[70vh] flex flex-col animate-popIn">
      {/* 头部 */}
      <div className="p-4 md:p-6 border-b flex justify-between items-center bg-emerald-50">
        <div>
          <h2 className="text-xl font-black text-emerald-800 italic">江湖榜</h2>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
            {currentUser?.role === 'Admin' ? '所有侠客（管理员视角）' : '江湖侠客'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshPlayerList}
            disabled={loading}
            className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-sm font-black shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? '🔄' : '刷新'}
          </button>
          <button 
            onClick={onBack} 
            className="bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-xl text-sm font-black shadow-md shadow-emerald-100 active:scale-95 transition-all"
          >
            返回主页
          </button>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="p-4 md:p-8 flex-grow overflow-y-auto">
        {/* 错误提示 */}
        {error && (
          <div className="col-span-full py-4 text-center bg-rose-50 border border-rose-100 rounded-xl mb-6">
            <p className="text-rose-500 text-sm font-black">{error}</p>
          </div>
        )}

        {/* 玩家列表 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* 加载状态 */}
          {loading ? (
            <div className="col-span-full py-24 text-center">
              <div className="text-6xl mb-6 grayscale opacity-20">🔄</div>
              <h4 className="text-lg font-black text-slate-400 italic">正在查询江湖榜...</h4>
              <p className="text-xs text-slate-300 mt-2">请稍候</p>
            </div>
          ) : allPlayers.length > 0 ? (
            // 玩家卡片（移除结交/断交按钮）
            allPlayers.map((p) => {
              const playerId = generatePlayerId(p);
              // 构建切磋所需的玩家数据
              const challengePlayerData = {
                ...p,
                id: playerId,
                account_id: (p as any).account_id,
                name: p.name || '无名侠客',
                level: p.level || 1,
                maxHp: p.maxHp || 300,
                str: p.str || 5,
                agi: p.agi || 5,
                spd: p.spd || 5,
              };

              return (
                <div 
                  key={playerId} 
                  className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${p.name || Math.random()}`} 
                      alt={p.name || '无名侠客'} 
                      className="w-12 h-12 rounded-full bg-white border border-slate-200"
                    />
                    <div>
                      <div className="font-black text-slate-700 truncate">{p.name || '无名侠客'}</div>
                      <div className="text-xs font-bold text-slate-400">Lv.{p.level || 1}</div>
                    </div>
                  </div>
                  
                  {/* 仅保留切磋按钮 */}
                  <div className="grid grid-cols-1 gap-2 mb-4">
                    <button 
                      onClick={() => onChallenge(challengePlayerData)}
                      className="bg-orange-500 text-white py-2 rounded-lg text-xs font-black hover:bg-orange-600 active:scale-95 transition-all w-full"
                    >
                      ⚔️ 切磋
                    </button>
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 bg-white p-2 rounded-lg">
                    <span>HP:{p.maxHp || 300}</span>
                    <span>STR:{p.str || 5}</span>
                    <span>AGI:{p.agi || 5}</span>
                    <span>SPD:{p.spd || 5}</span>
                  </div>
                </div>
              );
            })
          ) : (
            // 空状态
            <div className="col-span-full py-24 text-center">
              <div className="text-6xl mb-6 grayscale opacity-20">🌍</div>
              <h4 className="text-lg font-black text-slate-400 italic">
                {currentUser?.role === 'Admin' ? '暂无玩家数据' : '江湖暂无其他侠客'}
              </h4>
              <p className="text-xs text-slate-300 mt-2">
                {currentUser?.role === 'Admin' 
                  ? '请先创建玩家账号' 
                  : '快去邀请好友加入江湖吧！'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 动画样式 */}
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
import React, { useState, useEffect, useCallback } from 'react';
import { CharacterData, Friend } from '../types'; // 先导入基础类型
import { playUISound } from '../utils/audio';
import { loadAllPlayers, updatePlayerData, getCurrentUser } from '../utils/storage';

// 从storage中导入Player类型（因为storage.ts中也定义了Player）
import type { Player } from '../utils/storage';

interface AdminPanelProps {
  onBack: () => void;
  currentAccountId: number | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, currentAccountId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // 临时存储编辑的数据，避免实时提交
  const [editForm, setEditForm] = useState<Partial<Player>>({});
  const [errorMsg, setErrorMsg] = useState('');

  // 加载所有玩家数据（添加权限校验提示）
  useEffect(() => {
    const fetchAllPlayers = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const user = getCurrentUser();
        if (!user || user.role !== 'Admin') {
          setErrorMsg('权限不足！仅管理员可访问此页面');
          return;
        }
        const allPlayers = await loadAllPlayers();
        setPlayers(allPlayers);
        // 默认选中第一个玩家
        if (allPlayers.length > 0) {
          setSelectedPlayer(allPlayers[0]);
          // 初始化编辑表单
          setEditForm({
            level: allPlayers[0].level,
            gold: allPlayers[0].gold,
            str: allPlayers[0].str,
            agi: allPlayers[0].agi,
            spd: allPlayers[0].spd,
            maxHp: allPlayers[0].maxHp,
            weapons: allPlayers[0].weapons,
            skills: allPlayers[0].skills,
            dressing: allPlayers[0].dressing,
          });
        }
      } catch (error) {
        console.error('加载玩家数据失败:', error);
        setErrorMsg('加载玩家数据失败：' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllPlayers();
  }, []);

  // 选中玩家时更新编辑表单
  useEffect(() => {
    if (selectedPlayer) {
      setEditForm({
        level: selectedPlayer.level,
        gold: selectedPlayer.gold,
        str: selectedPlayer.str,
        agi: selectedPlayer.agi,
        spd: selectedPlayer.spd,
        maxHp: selectedPlayer.maxHp,
        weapons: selectedPlayer.weapons,
        skills: selectedPlayer.skills,
        dressing: selectedPlayer.dressing,
      });
      setErrorMsg('');
    }
  }, [selectedPlayer]);

  // 表单字段变更处理
  const handleFormChange = (key: string, value: any) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  // 批量保存修改（优化：点击保存才提交，避免实时请求）
  const handleSaveChanges = async () => {
    if (!selectedPlayer || !currentAccountId) return;
    if (saving) return;

    playUISound('CLICK');
    setSaving(true);
    setErrorMsg('');

    try {
      // 数据验证
      if (editForm.level && editForm.level < 1) {
        throw new Error('等级不能小于1');
      }
      if (editForm.gold && editForm.gold < 0) {
        throw new Error('金币不能为负数');
      }
      if (editForm.str && editForm.str < 1) {
        throw new Error('力量不能小于1');
      }

      // 提交修改
      await updatePlayerData(selectedPlayer.account_id, editForm);
      
      // 刷新列表和选中的玩家数据
      const updatedPlayers = players.map(p => 
        p.account_id === selectedPlayer.account_id ? { ...p, ...editForm } : p
      );
      setPlayers(updatedPlayers);
      setSelectedPlayer({ ...selectedPlayer, ...editForm });
      
      alert('玩家数据修改成功！');
    } catch (error) {
      setErrorMsg('修改失败：' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 min-h-[70vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🔄</div>
        <h3 className="text-xl font-black text-slate-500">加载玩家数据中...</h3>
      </div>
    );
  }

  // 权限错误/加载失败
  if (errorMsg) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 min-h-[70vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 text-red-400">❌</div>
        <h3 className="text-xl font-black text-red-500 mb-2">{errorMsg}</h3>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded-lg"
        >
          刷新页面
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[70vh] flex flex-col animate-popIn">
      {/* 头部 */}
      <div className="p-6 border-b bg-indigo-600 text-white flex justify-between items-center">
        <h2 className="text-2xl font-black italic">⚙️ 管理员控制台</h2>
        <button 
          onClick={onBack}
          className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-black hover:bg-slate-100 transition-all"
        >
          返回主页
        </button>
      </div>

      {/* 主体内容 */}
      <div className="p-6 flex-grow flex gap-6">
        {/* 玩家列表 */}
        <div className="w-1/3 bg-slate-50 rounded-2xl p-4 overflow-y-auto max-h-[80vh]">
          <h3 className="text-lg font-black text-slate-800 mb-4">玩家列表 ({players.length})</h3>
          {players.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <div className="text-4xl mb-2">👥</div>
              <p>暂无玩家数据</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map(player => (
                <div 
                  key={player.account_id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedPlayer?.account_id === player.account_id 
                      ? 'bg-indigo-100 border-indigo-300' 
                      : 'bg-white border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-black">{player.name || `账号${player.account_id}`}</div>
                  <div className="text-xs text-slate-500">
                    Lv.{player.level} | {player.role} | ID:{player.account_id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 玩家编辑面板 */}
        <div className="w-2/3 bg-slate-50 rounded-2xl p-6">
          {!selectedPlayer ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="text-5xl mb-3">👤</div>
                <h4 className="text-lg font-black">请选择要编辑的玩家</h4>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 玩家信息 */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h3 className="text-xl font-black text-slate-800">
                  编辑玩家：{selectedPlayer.name || `账号${selectedPlayer.account_id}`}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-black ${
                  selectedPlayer.role === 'Admin' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {selectedPlayer.role}
                </span>
                <span className="text-xs text-slate-500">
                  创建时间：{new Date(selectedPlayer.created_at).toLocaleString()}
                </span>
              </div>

              {/* 错误提示 */}
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-500 rounded-lg text-sm font-bold">
                  ❌ {errorMsg}
                </div>
              )}

              {/* 基础属性 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">等级</label>
                  <input
                    type="number"
                    value={editForm.level || selectedPlayer.level}
                    onChange={(e) => handleFormChange('level', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">金币</label>
                  <input
                    type="number"
                    value={editForm.gold || selectedPlayer.gold}
                    onChange={(e) => handleFormChange('gold', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">力量 (STR)</label>
                  <input
                    type="number"
                    value={editForm.str || selectedPlayer.str}
                    onChange={(e) => handleFormChange('str', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">敏捷 (AGI)</label>
                  <input
                    type="number"
                    value={editForm.agi || selectedPlayer.agi}
                    onChange={(e) => handleFormChange('agi', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">速度 (SPD)</label>
                  <input
                    type="number"
                    value={editForm.spd || selectedPlayer.spd}
                    onChange={(e) => handleFormChange('spd', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">最大生命值</label>
                  <input
                    type="number"
                    value={editForm.maxHp || selectedPlayer.maxHp}
                    onChange={(e) => handleFormChange('maxHp', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="10"
                  />
                </div>
              </div>

              {/* 道具/技能 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">武器 (逗号分隔)</label>
                  <input
                    type="text"
                    value={editForm.weapons?.join(',') || selectedPlayer.weapons.join(',')}
                    onChange={(e) => handleFormChange('weapons', 
                      e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                    )}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="例如：青龙刀,金箍棒"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">技能 (逗号分隔)</label>
                  <input
                    type="text"
                    value={editForm.skills?.join(',') || selectedPlayer.skills.join(',')}
                    onChange={(e) => handleFormChange('skills', 
                      e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                    )}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="例如：轻功,暴击"
                  />
                </div>
              </div>

              {/* 装扮 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">头部装扮</label>
                  <input
                    type="text"
                    value={editForm.dressing?.HEAD || selectedPlayer.dressing.HEAD}
                    onChange={(e) => handleFormChange('dressing', {
                      ...(editForm.dressing || selectedPlayer.dressing),
                      HEAD: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">身体装扮</label>
                  <input
                    type="text"
                    value={editForm.dressing?.BODY || selectedPlayer.dressing.BODY}
                    onChange={(e) => handleFormChange('dressing', {
                      ...(editForm.dressing || selectedPlayer.dressing),
                      BODY: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">武器装扮</label>
                  <input
                    type="text"
                    value={editForm.dressing?.WEAPON || selectedPlayer.dressing.WEAPON}
                    onChange={(e) => handleFormChange('dressing', {
                      ...(editForm.dressing || selectedPlayer.dressing),
                      WEAPON: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="mt-6">
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className={`px-6 py-3 rounded-lg text-white font-black text-lg transition-all ${
                    saving 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <svg className="inline-block animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </>
                  ) : (
                    '保存修改'
                  )}
                </button>
              </div>
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
};

export default AdminPanel;
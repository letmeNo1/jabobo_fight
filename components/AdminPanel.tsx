import React, { useState, useEffect, useCallback } from 'react';
import { CharacterData, Friend } from '../types';
import { playUISound } from '../utils/audio';
import { loadAllPlayers, updatePlayerData, getCurrentUser } from '../utils/storage';
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
  const [editForm, setEditForm] = useState<Partial<Player>>({});
  const [errorMsg, setErrorMsg] = useState('');

  // 加载所有玩家数据
  useEffect(() => {
    const fetchAllPlayers = async () => {
      console.log('========== 管理员面板日志 ==========');
      console.log('1. 开始加载管理员面板，currentAccountId:', currentAccountId);
      setLoading(true);
      setErrorMsg('');
      
      try {
        const user = getCurrentUser();
        console.log('2. getCurrentUser 返回的用户信息:', user);
        console.log('3. 用户角色判断：', user?.role, '| 是否为Admin:', user?.role === 'Admin');

        if (!user) {
          console.error('4. 权限校验失败：未获取到当前用户信息');
          setErrorMsg('权限不足！未检测到登录用户');
          return;
        }
        if (user.role !== 'Admin') {
          console.error('5. 权限校验失败：用户角色不是Admin，当前角色:', user.role);
          setErrorMsg(`权限不足！仅管理员可访问此页面（当前角色：${user.role}）`);
          return;
        }
        console.log('6. 权限校验通过，当前用户是管理员');

        const allPlayers = await loadAllPlayers();
        console.log('7. 加载到的所有玩家数据:', allPlayers);
        setPlayers(allPlayers);
        
        if (allPlayers.length > 0) {
          setSelectedPlayer(allPlayers[0]);
          console.log('8. 默认选中第一个玩家:', allPlayers[0]);
          // 初始化编辑表单（仅用selectedPlayer值，无兜底）
          setEditForm({
            level: allPlayers[0].level,
            gold: allPlayers[0].gold,
            str: allPlayers[0].str,
            agi: allPlayers[0].agi,
            spd: allPlayers[0].spd,
            maxHp: allPlayers[0].maxHp,
            weapons: [...allPlayers[0].weapons], // 深拷贝避免引用问题
            skills: [...allPlayers[0].skills],
            dressing: { ...allPlayers[0].dressing },
          });
        } else {
          console.log('9. 未加载到任何玩家数据');
        }
      } catch (error) {
        console.error('10. 加载玩家数据失败:', error);
        setErrorMsg('加载玩家数据失败：' + (error as Error).message);
      } finally {
        setLoading(false);
        console.log('11. 管理员面板加载完成，loading状态:', false);
      }
    };
    fetchAllPlayers();
  }, [currentAccountId]);

  // 选中玩家时更新编辑表单
  useEffect(() => {
    if (selectedPlayer) {
      console.log('12. 切换选中玩家:', selectedPlayer.name || `账号${selectedPlayer.account_id}`);
      setEditForm({
        level: selectedPlayer.level,
        gold: selectedPlayer.gold,
        str: selectedPlayer.str,
        agi: selectedPlayer.agi,
        spd: selectedPlayer.spd,
        maxHp: selectedPlayer.maxHp,
        weapons: [...selectedPlayer.weapons], // 深拷贝
        skills: [...selectedPlayer.skills],
        dressing: { ...selectedPlayer.dressing },
      });
      setErrorMsg('');
      console.log('13. 初始化编辑表单数据:', {
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
    } else {
      console.log('14. 未选中任何玩家');
    }
  }, [selectedPlayer]);

  // 修复：处理表单字段变更，支持空值
  const handleFormChange = (key: string, value: any) => {
  console.log(`15. 表单字段变更 - 字段: ${key} | 旧值: ${editForm[key]} | 新值:`, value);
  
    // 对数字类型字段做特殊处理
    let processedValue = value;
    if (['level', 'gold', 'str', 'agi', 'spd', 'maxHp'].includes(key)) {
      processedValue = Number(value);
    }
    
    // 空值/NaN 处理
    const finalValue = processedValue === '' || Number.isNaN(processedValue) ? undefined : processedValue;
    setEditForm(prev => ({ ...prev, [key]: finalValue }));
  };

  // 批量保存修改（修复：提交时兜底空值，保证数据合法性）
  const handleSaveChanges = async () => {
    if (!selectedPlayer || !currentAccountId) {
      console.error('16. 保存失败：未选中玩家或currentAccountId为空', {
        selectedPlayer,
        currentAccountId
      });
      setErrorMsg('保存失败：请先选择要编辑的玩家');
      return;
    }
    if (saving) {
      console.log('17. 重复点击保存按钮，已忽略');
      return;
    }

    playUISound('CLICK');
    setSaving(true);
    setErrorMsg('');
    console.log('18. 开始保存玩家数据修改:', {
      playerId: selectedPlayer.account_id,
      playerName: selectedPlayer.name,
      editForm: editForm,
      originalData: selectedPlayer
    });

    try {
      // 修复：提交前兜底空值，保证数据合法性（仅保存时兜底，不影响表单清空）
      const finalFormData = {
        level: editForm.level ?? selectedPlayer.level, // 空值回退到原始值
        gold: editForm.gold ?? selectedPlayer.gold,
        str: editForm.str ?? selectedPlayer.str,
        agi: editForm.agi ?? selectedPlayer.agi,
        spd: editForm.spd ?? selectedPlayer.spd,
        maxHp: editForm.maxHp ?? selectedPlayer.maxHp,
        weapons: editForm.weapons ?? [], // 空值转为空数组
        skills: editForm.skills ?? [],
        dressing: {
          HEAD: editForm.dressing?.HEAD ?? '',
          BODY: editForm.dressing?.BODY ?? '',
          WEAPON: editForm.dressing?.WEAPON ?? '',
        }
      };

      // 数据验证
      if (finalFormData.level < 1) {
        console.error('19. 数据验证失败：等级小于1，值为', finalFormData.level);
        throw new Error('等级不能小于1');
      }
      if (finalFormData.gold < 0) {
        console.error('20. 数据验证失败：金币为负数，值为', finalFormData.gold);
        throw new Error('金币不能为负数');
      }
      if (finalFormData.str < 1) {
        console.error('21. 数据验证失败：力量小于1，值为', finalFormData.str);
        throw new Error('力量不能小于1');
      }
      console.log('22. 数据验证通过，开始提交修改');

      // 提交修改
      await updatePlayerData(selectedPlayer.account_id, finalFormData);
      console.log('23. 玩家数据修改提交成功');
      
      // 刷新列表和选中的玩家数据
      const updatedPlayers = players.map(p => 
        p.account_id === selectedPlayer.account_id ? { ...p, ...finalFormData } : p
      );
      setPlayers(updatedPlayers);
      setSelectedPlayer({ ...selectedPlayer, ...finalFormData });
      console.log('24. 本地玩家列表已更新:', updatedPlayers);
      
      alert('玩家数据修改成功！');
      console.log('25. 玩家数据修改流程完成');
    } catch (error) {
      console.error('26. 保存修改失败:', error);
      setErrorMsg('修改失败：' + (error as Error).message);
    } finally {
      setSaving(false);
      console.log('27. 保存流程结束，saving状态重置为false');
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
          onClick={() => {
            console.log('28. 用户点击刷新页面按钮');
            window.location.reload();
          }}
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
          onClick={() => {
            console.log('29. 用户点击返回主页按钮');
            onBack();
          }}
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
                  onClick={() => {
                    console.log(`30. 用户选中玩家：ID=${player.account_id} | 名称=${player.name} | 角色=${player.role}`);
                    setSelectedPlayer(player);
                  }}
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

              {/* 基础属性 - 修复：移除兜底逻辑，支持空值显示 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">等级</label>
                  <input
                    type="number"
                    value={editForm.level ?? ''} // 空值显示空字符串
                    onChange={(e) => handleFormChange('level', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">金币</label>
                  <input
                    type="number"
                    value={editForm.gold ?? ''}
                    onChange={(e) => handleFormChange('gold', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">力量 (STR)</label>
                  <input
                    type="number"
                    value={editForm.str ?? ''}
                    onChange={(e) => handleFormChange('str', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">敏捷 (AGI)</label>
                  <input
                    type="number"
                    value={editForm.agi ?? ''}
                    onChange={(e) => handleFormChange('agi', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">速度 (SPD)</label>
                  <input
                    type="number"
                    value={editForm.spd ?? ''}
                    onChange={(e) => handleFormChange('spd', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">最大生命值</label>
                  <input
                    type="number"
                    value={editForm.maxHp ?? ''}
                    onChange={(e) => handleFormChange('maxHp', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="10"
                  />
                </div>
              </div>

              {/* 道具/技能 - 修复：支持清空为空白字符串，转为空数组 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">武器 (逗号分隔)</label>
                  <input
                    type="text"
                    value={editForm.weapons?.join(',') ?? ''} // 空数组显示空字符串
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const weapons = val ? val.split(',').map(item => item.trim()).filter(Boolean) : [];
                      handleFormChange('weapons', weapons);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="例如：青龙刀,金箍棒"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">技能 (逗号分隔)</label>
                  <input
                    type="text"
                    value={editForm.skills?.join(',') ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const skills = val ? val.split(',').map(item => item.trim()).filter(Boolean) : [];
                      handleFormChange('skills', skills);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="例如：轻功,暴击"
                  />
                </div>
              </div>

              {/* 装扮 - 修复：移除兜底，支持空值 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">头部装扮</label>
                  <input
                    type="text"
                    value={editForm.dressing?.HEAD ?? ''}
                    onChange={(e) => handleFormChange('dressing', {
                      ...(editForm.dressing || {}), // 不再依赖selectedPlayer的dressing
                      HEAD: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">身体装扮</label>
                  <input
                    type="text"
                    value={editForm.dressing?.BODY ?? ''}
                    onChange={(e) => handleFormChange('dressing', {
                      ...(editForm.dressing || {}),
                      BODY: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">武器装扮</label>
                  <input
                    type="text"
                    value={editForm.dressing?.WEAPON ?? ''}
                    onChange={(e) => handleFormChange('dressing', {
                      ...(editForm.dressing || {}),
                      WEAPON: e.target.value || undefined
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
    </div>
  );
};

export default AdminPanel;
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CharacterData, 
  Friend,
  Weapon,
  Skill,
  Dressing as DressingItem,
  WeaponType,
  SkillCategory,
  AttackModule
} from '../types';
import { playUISound } from '../utils/audio';
import { loadAllPlayers, updatePlayerData, getCurrentUser, processDressingForSubmit } from '../utils/storage';
import type { Player } from '../utils/storage';
import { WEAPONS, SKILLS, DRESSINGS } from '../constants';

interface AdminPanelProps {
  onBack: () => void;
  currentAccountId: number | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, currentAccountId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CharacterData>>({
    weapons: [], // 存储选中的武器ID数组
    skills: [],  // 存储选中的技能ID数组
    dressing: { HEAD: '', BODY: '', WEAPON: '' }, // 存储穿戴的装扮ID
    unlockedDressings: [], // 存储解锁的装扮ID数组
    friends: [],
  });
  const [errorMsg, setErrorMsg] = useState('');

  // 加载所有玩家数据
  useEffect(() => {
    const fetchAllPlayers = async () => {
      console.log('========== 管理员面板日志 ==========');
      console.log('【步骤1/初始化】开始加载管理员面板，currentAccountId:', currentAccountId);
      setLoading(true);
      setErrorMsg('');
      
      try {
        const user = getCurrentUser();
        console.log('【步骤2/用户校验】getCurrentUser 返回的用户信息:', user);
        console.log('【步骤3/角色判断】用户角色：', user?.role, '| 是否为Admin:', user?.role === 'Admin');

        if (!user) {
          console.error('【步骤4/权限失败】未获取到当前用户信息');
          setErrorMsg('权限不足！未检测到登录用户');
          return;
        }
        if (user.role !== 'Admin') {
          console.error('【步骤5/权限失败】用户角色不是Admin，当前角色:', user.role);
          setErrorMsg(`权限不足！仅管理员可访问此页面（当前角色：${user.role}）`);
          return;
        }
        console.log('【步骤6/权限通过】当前用户是管理员');

        const allPlayers = await loadAllPlayers();
        console.log('【步骤7/数据加载】加载到的所有玩家数据:', allPlayers);
        setPlayers(allPlayers);
        
        if (allPlayers.length > 0) {
          setSelectedPlayer(allPlayers[0]);
          console.log('【步骤8/默认选中】默认选中第一个玩家:', allPlayers[0]);
          // 初始化编辑表单（适配ID数组格式）
          setEditForm({
            name: allPlayers[0].name,
            level: allPlayers[0].level,
            exp: allPlayers[0].exp,
            gold: allPlayers[0].gold,
            str: allPlayers[0].str,
            agi: allPlayers[0].agi,
            spd: allPlayers[0].spd,
            maxHp: allPlayers[0].maxHp,
            role: allPlayers[0].role,
            weapons: convertNamesToIds(allPlayers[0].weapons, WEAPONS, 'name', 'id'),
            skills: convertNamesToIds(allPlayers[0].skills, SKILLS, 'name', 'id'),
            dressing: { ...allPlayers[0].dressing },
            unlockedDressings: convertNamesToIds(allPlayers[0].unlockedDressings, DRESSINGS, 'name', 'id'),
            isConcentrated: allPlayers[0].isConcentrated,
            friends: [...allPlayers[0].friends],
          });
        } else {
          console.log('【步骤9/空数据】未加载到任何玩家数据');
        }
      } catch (error) {
        console.error('【步骤10/加载失败】加载玩家数据失败:', error);
        setErrorMsg('加载玩家数据失败：' + (error as Error).message);
      } finally {
        setLoading(false);
        console.log('【步骤11/加载完成】管理员面板加载完成，loading状态:', false);
      }
    };
    fetchAllPlayers();
  }, [currentAccountId]);

  // 兼容函数：将名称数组转换为ID数组（处理旧数据，增加空值过滤）
  const convertNamesToIds = useCallback(
    (
      values: string[] = [],
      list: Array<{ id: string; name: string }>,
      valueKey: keyof (typeof list)[0] = 'name',
      targetKey: keyof (typeof list)[0] = 'id'
    ) => {
      if (!values.length || !list.length) return [];
      
      // 判断是否已经是ID格式
      const isIdFormat = values.some(v => list.some(item => item[targetKey] === v));
      if (isIdFormat) return values.filter(Boolean); // 过滤空值
      
      // 名称转ID（严格匹配+空值过滤）
      return values.map(name => {
        const item = list.find(i => i[valueKey] === name);
        return item ? item[targetKey] : '';
      }).filter(Boolean); // 过滤转换失败的空字符串
    },
    []
  );

  // 选中玩家时更新编辑表单
  useEffect(() => {
    if (selectedPlayer) {
      console.log('【步骤12/切换玩家】切换选中玩家:', selectedPlayer.name || `账号${selectedPlayer.account_id}`);
      setEditForm({
        name: selectedPlayer.name,
        level: selectedPlayer.level,
        exp: selectedPlayer.exp,
        gold: selectedPlayer.gold,
        str: selectedPlayer.str,
        agi: selectedPlayer.agi,
        spd: selectedPlayer.spd,
        maxHp: selectedPlayer.maxHp,
        role: selectedPlayer.role,
        weapons: convertNamesToIds(selectedPlayer.weapons, WEAPONS, 'name', 'id'),
        skills: convertNamesToIds(selectedPlayer.skills, SKILLS, 'name', 'id'),
        dressing: { ...selectedPlayer.dressing },
        unlockedDressings: convertNamesToIds(selectedPlayer.unlockedDressings, DRESSINGS, 'name', 'id'),
        isConcentrated: selectedPlayer.isConcentrated,
        friends: [...selectedPlayer.friends],
      });
      setErrorMsg('');
      console.log('【步骤13/表单初始化】初始化编辑表单数据:', {
        name: selectedPlayer.name,
        level: selectedPlayer.level,
        exp: selectedPlayer.exp,
        gold: selectedPlayer.gold,
        str: selectedPlayer.str,
        agi: selectedPlayer.agi,
        spd: selectedPlayer.spd,
        maxHp: selectedPlayer.maxHp,
        role: selectedPlayer.role,
        weapons: selectedPlayer.weapons,
        skills: selectedPlayer.skills,
        dressing: selectedPlayer.dressing,
        unlockedDressings: selectedPlayer.unlockedDressings,
        isConcentrated: selectedPlayer.isConcentrated,
        friends: selectedPlayer.friends,
      });
    } else {
      console.log('【步骤14/无选中】未选中任何玩家');
    }
  }, [selectedPlayer, convertNamesToIds]);

  // 处理表单字段变更（增加防抖）
  const handleFormChange = useCallback((key: string, value: any) => {
    console.log(`【步骤15/字段变更】表单字段变更 - 字段: ${key} | 旧值: ${editForm[key]} | 新值:`, value);
    
    // 数字类型字段处理
    let processedValue = value;
    if (['level', 'exp', 'gold', 'str', 'agi', 'spd', 'maxHp'].includes(key)) {
      processedValue = value === '' ? undefined : Number(value);
    }
    
    setEditForm(prev => ({ ...prev, [key]: processedValue }));
  }, [editForm]);

  // 处理多选勾选变更（武器/技能/解锁装扮）
  const handleMultiSelectChange = useCallback((type: 'weapons' | 'skills' | 'unlockedDressings', itemId: string) => {
    setEditForm(prev => {
      const currentValues = prev[type] || [];
      const newValues = currentValues.includes(itemId)
        ? currentValues.filter(id => id !== itemId)
        : [...currentValues, itemId];
      console.log(`【步骤16/多选变更】${type} 勾选变更 - ID: ${itemId} | 新列表:`, newValues);
      return { ...prev, [type]: newValues };
    });
  }, []);

  // 处理穿戴装扮变更（下拉选择，增加合法性校验）
  const handleDressingChange = useCallback((part: 'HEAD' | 'BODY' | 'WEAPON', dressingId: string) => {
    // 校验：穿戴的装扮必须在解锁列表中
    if (dressingId && !editForm.unlockedDressings?.includes(dressingId)) {
      setErrorMsg(`无法穿戴未解锁的装扮：${dressingId}（请先解锁该装扮）`);
      return;
    }
    
    setEditForm(prev => ({
      ...prev,
      dressing: {
        ...prev.dressing,
        [part]: dressingId
      }
    }));
    setErrorMsg('');
    console.log(`【步骤17/装扮变更】穿戴装扮变更 - 部位: ${part} | 选中ID: ${dressingId}`);
  }, [editForm.unlockedDressings]);

  // 处理好友列表编辑（新增/删除）
  const handleFriendChange = useCallback((friends: Friend[]) => {
    setEditForm(prev => ({ ...prev, friends: [...friends] }));
  }, []);

  // 取消编辑，恢复原始数据
  const handleCancelEdit = useCallback(() => {
    if (!selectedPlayer) return;
    playUISound('CLICK');
    setEditForm({
      name: selectedPlayer.name,
      level: selectedPlayer.level,
      exp: selectedPlayer.exp,
      gold: selectedPlayer.gold,
      str: selectedPlayer.str,
      agi: selectedPlayer.agi,
      spd: selectedPlayer.spd,
      maxHp: selectedPlayer.maxHp,
      role: selectedPlayer.role,
      weapons: convertNamesToIds(selectedPlayer.weapons, WEAPONS, 'name', 'id'),
      skills: convertNamesToIds(selectedPlayer.skills, SKILLS, 'name', 'id'),
      dressing: { ...selectedPlayer.dressing },
      unlockedDressings: convertNamesToIds(selectedPlayer.unlockedDressings, DRESSINGS, 'name', 'id'),
      isConcentrated: selectedPlayer.isConcentrated,
      friends: [...selectedPlayer.friends],
    });
    setErrorMsg('');
    console.log('【步骤18/取消编辑】恢复选中玩家的原始数据:', selectedPlayer.name);
  }, [selectedPlayer, convertNamesToIds]);

  // 保存修改
  const handleSaveChanges = useCallback(async () => {
    if (!selectedPlayer || !currentAccountId) {
      console.error('【步骤19/保存失败】未选中玩家或currentAccountId为空', {
        selectedPlayer,
        currentAccountId
      });
      setErrorMsg('保存失败：请先选择要编辑的玩家');
      return;
    }
    if (saving) {
      console.log('【步骤20/保存忽略】重复点击保存按钮');
      return;
    }

    playUISound('CLICK');
    setSaving(true);
    setErrorMsg('');
    console.log('【步骤21/保存开始】玩家数据修改:', {
      playerId: selectedPlayer.account_id,
      playerName: selectedPlayer.name,
      editForm: editForm,
      originalData: selectedPlayer
    });

    try {
      // 最终提交数据（兜底空值+处理dressing）
      const finalFormData = {
        name: editForm.name ?? selectedPlayer.name,
        level: editForm.level ?? selectedPlayer.level,
        exp: editForm.exp ?? selectedPlayer.exp,
        gold: editForm.gold ?? selectedPlayer.gold,
        str: editForm.str ?? selectedPlayer.str,
        agi: editForm.agi ?? selectedPlayer.agi,
        spd: editForm.spd ?? selectedPlayer.spd,
        maxHp: editForm.maxHp ?? selectedPlayer.maxHp,
        role: editForm.role ?? selectedPlayer.role,
        weapons: editForm.weapons ?? [],
        skills: editForm.skills ?? [],
        // 核心修复：处理dressing字段，匹配后端校验规则
        dressing: processDressingForSubmit(editForm.dressing),
        unlockedDressings: editForm.unlockedDressings ?? [],
        isConcentrated: editForm.isConcentrated ?? selectedPlayer.isConcentrated,
        friends: editForm.friends ?? [],
      };

      // 增强数据验证
      const validationErrors: string[] = [];
      if (!finalFormData.name?.trim()) validationErrors.push('玩家名称不能为空');
      if (finalFormData.level < 1) validationErrors.push('等级不能小于1');
      if (finalFormData.gold < 0) validationErrors.push('金币不能为负数');
      if (finalFormData.str < 1) validationErrors.push('力量不能小于1');
      if (finalFormData.agi < 1) validationErrors.push('敏捷不能小于1');
      if (finalFormData.spd < 1) validationErrors.push('速度不能小于1');
      if (finalFormData.maxHp < 10) validationErrors.push('最大生命值不能小于10');
      
      // 校验穿戴的装扮是否都在解锁列表中
      const dressingValues = Object.values(finalFormData.dressing || {});
      const invalidDressing = dressingValues.find(id => id && !finalFormData.unlockedDressings.includes(id));
      if (invalidDressing) {
        validationErrors.push(`穿戴的装扮${invalidDressing}未解锁，请先解锁`);
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('；'));
      }

      console.log('【步骤22/数据验证】数据验证通过，开始提交修改');

      // 提交修改
      await updatePlayerData(selectedPlayer.account_id, finalFormData);
      console.log('【步骤23/提交成功】玩家数据修改提交成功');
      
      // 刷新列表和选中的玩家数据
      const updatedPlayers = players.map(p => 
        p.account_id === selectedPlayer.account_id ? { ...p, ...finalFormData } : p
      );
      setPlayers(updatedPlayers);
      setSelectedPlayer({ ...selectedPlayer, ...finalFormData });
      console.log('【步骤24/本地刷新】本地玩家列表已更新:', updatedPlayers);
      
      alert('玩家数据修改成功！');
      console.log('【步骤25/流程完成】玩家数据修改流程完成');
    } catch (error) {
      console.error('【步骤26/保存失败】修改提交失败:', error);
      setErrorMsg('修改失败：' + (error as Error).message);
    } finally {
      setSaving(false);
      console.log('【步骤27/状态重置】保存流程结束，saving状态重置为false');
    }
  }, [selectedPlayer, currentAccountId, saving, editForm, players]);

  // 按类型分组武器
  const groupedWeapons = {
    [WeaponType.LARGE]: WEAPONS.filter(w => w.type === WeaponType.LARGE),
    [WeaponType.MEDIUM]: WEAPONS.filter(w => w.type === WeaponType.MEDIUM),
    [WeaponType.SMALL]: WEAPONS.filter(w => w.type === WeaponType.SMALL),
    [WeaponType.THROW]: WEAPONS.filter(w => w.type === WeaponType.THROW),
  };

  // 按类型分组技能
  const groupedSkills = {
    [SkillCategory.BASE_STAT]: SKILLS.filter(s => s.category === SkillCategory.BASE_STAT),
    [SkillCategory.PASSIVE]: SKILLS.filter(s => s.category === SkillCategory.PASSIVE),
    [SkillCategory.ACTIVE]: SKILLS.filter(s => s.category === SkillCategory.ACTIVE),
    [SkillCategory.SPECIAL]: SKILLS.filter(s => s.category === SkillCategory.SPECIAL),
  };

  // 按部位分组装扮
  const groupedDressings = {
    HEAD: DRESSINGS.filter(d => d.part === 'HEAD'),
    BODY: DRESSINGS.filter(d => d.part === 'BODY'),
    WEAPON: DRESSINGS.filter(d => d.part === 'WEAPON'),
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
            console.log('【步骤28/页面刷新】用户点击刷新页面按钮');
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
            console.log('【步骤29/返回主页】用户点击返回主页按钮');
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
                    console.log(`【步骤30/选中玩家】用户选中玩家：ID=${player.account_id} | 名称=${player.name} | 角色=${player.role}`);
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

              {/* 基础信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-1">玩家名称</label>
                  <input
                    type="text"
                    value={editForm.name ?? ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="输入玩家名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">等级</label>
                  <input
                    type="number"
                    value={editForm.level ?? ''}
                    onChange={(e) => handleFormChange('level', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">经验值</label>
                  <input
                    type="number"
                    value={editForm.exp ?? ''}
                    onChange={(e) => handleFormChange('exp', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">金币</label>
                  <input
                    type="number"
                    value={editForm.gold ?? ''}
                    onChange={(e) => handleFormChange('gold', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">角色权限</label>
                  <select
                    value={editForm.role ?? 'Player'}
                    onChange={(e) => handleFormChange('role', e.target.value as 'Player' | 'Admin')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Player">普通玩家</option>
                    <option value="Admin">管理员</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">力量 (STR)</label>
                  <input
                    type="number"
                    value={editForm.str ?? ''}
                    onChange={(e) => handleFormChange('str', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">敏捷 (AGI)</label>
                  <input
                    type="number"
                    value={editForm.agi ?? ''}
                    onChange={(e) => handleFormChange('agi', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">速度 (SPD)</label>
                  <input
                    type="number"
                    value={editForm.spd ?? ''}
                    onChange={(e) => handleFormChange('spd', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">最大生命值 (MAX HP)</label>
                  <input
                    type="number"
                    value={editForm.maxHp ?? ''}
                    onChange={(e) => handleFormChange('maxHp', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                    min="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">是否专注训练</label>
                  <select
                    value={editForm.isConcentrated ? 'true' : 'false'}
                    onChange={(e) => handleFormChange('isConcentrated', e.target.value === 'true')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="false">否</option>
                    <option value="true">是</option>
                  </select>
                </div>
              </div>

              {/* 武器选择 */}
              <div>
                <h4 className="text-lg font-bold text-slate-700 mb-3">武器列表</h4>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                  {Object.entries(groupedWeapons).map(([type, weapons]) => (
                    <div key={type} className="mb-2">
                      <h5 className="text-xs font-bold text-slate-500 mb-1">{type}</h5>
                      {weapons.map(weapon => (
                        <div key={weapon.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`weapon-${weapon.id}`}
                            checked={(editForm.weapons || []).includes(weapon.id)}
                            onChange={() => handleMultiSelectChange('weapons', weapon.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                          />
                          <label htmlFor={`weapon-${weapon.id}`} className="text-sm">{weapon.name}</label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 技能选择 */}
              <div>
                <h4 className="text-lg font-bold text-slate-700 mb-3">技能列表</h4>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                  {Object.entries(groupedSkills).map(([category, skills]) => (
                    <div key={category} className="mb-2">
                      <h5 className="text-xs font-bold text-slate-500 mb-1">{category}</h5>
                      {skills.map(skill => (
                        <div key={skill.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`skill-${skill.id}`}
                            checked={(editForm.skills || []).includes(skill.id)}
                            onChange={() => handleMultiSelectChange('skills', skill.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                          />
                          <label htmlFor={`skill-${skill.id}`} className="text-sm">{skill.name}</label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 装扮系统 */}
              <div>
                <h4 className="text-lg font-bold text-slate-700 mb-3">装扮系统</h4>
                
                {/* 解锁装扮 */}
                <div className="mb-4">
                  <h5 className="text-sm font-bold text-slate-600 mb-2">已解锁装扮</h5>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                    {DRESSINGS.map(dressing => (
                      <div key={dressing.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`dressing-unlock-${dressing.id}`}
                          checked={(editForm.unlockedDressings || []).includes(dressing.id)}
                          onChange={() => handleMultiSelectChange('unlockedDressings', dressing.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                        />
                        <label htmlFor={`dressing-unlock-${dressing.id}`} className="text-xs">{dressing.name}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 穿戴装扮 */}
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(groupedDressings).map(([part, dressings]) => (
                    <div key={part} className="mb-2">
                      <h5 className="text-sm font-bold text-slate-600 mb-2">{part} 装扮</h5>
                      <select
                        value={(editForm.dressing as any)?.[part] || ''}
                        onChange={(e) => handleDressingChange(part as 'HEAD' | 'BODY' | 'WEAPON', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none text-sm"
                      >
                        <option value="">未穿戴</option>
                        {dressings.map(dressing => (
                          <option 
                            key={dressing.id} 
                            value={dressing.id}
                            disabled={!editForm.unlockedDressings?.includes(dressing.id)}
                          >
                            {dressing.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 好友列表（简化版） */}
              <div>
                <h4 className="text-lg font-bold text-slate-700 mb-3">好友列表</h4>
                <div className="p-2 border border-slate-200 rounded-lg bg-white">
                  <p className="text-sm text-slate-500 mb-2">当前好友数: {(editForm.friends || []).length}</p>
                  <button
                    onClick={() => alert('好友编辑功能需结合实际业务逻辑实现')}
                    className="text-xs bg-indigo-500 text-white px-2 py-1 rounded"
                  >
                    编辑好友列表
                  </button>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-all"
                  disabled={saving}
                >
                  取消编辑
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
                  disabled={saving}
                >
                  {saving ? '保存中...' : '保存修改'}
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
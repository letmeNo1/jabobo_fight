// api.ts - 乐斗游戏完整前端 API 封装（针对 422 dressing 错误 + getCurrentUser 角色同步修复版）
import { 
  CharacterData, 
  BattleRecord, 
  Friend, 
  Weapon, 
  Skill, 
  Dressing 
} from '../types';

// API基础地址配置（必须带/api前缀，匹配后端路由）
const API_BASE_URL = '/api';
const AUTH_STORAGE_KEY = 'qfight_auth';
// 🔥 新增：存储修正后的真实角色（接口返回的Admin）
const REAL_ROLE_STORAGE_KEY = 'qfight_real_role';

/**
 * 通用请求函数（增强错误处理、类型安全）
 */
const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const fullUrl = `${API_BASE_URL}${url}`;
  console.log('[请求]', fullUrl, options.method, options.body);

  try {
    const res = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const text = await res.text();
    console.log('[响应]', res.status, text);

    const json = text ? JSON.parse(text) : { data: null };

    if (!res.ok) {
      const errorMsg = json.detail 
        ? (typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail)) 
        : `${res.status} ${res.statusText}`;
      throw new Error(errorMsg);
    }

    return json.data as T;
  } catch (error) {
    console.error(`[请求失败] ${fullUrl}:`, error);
    throw error;
  }
};

// 初始玩家数据
export const INITIAL_DATA: CharacterData = {
  name: '乐斗小豆',
  level: 1,
  exp: 0,
  role: 'Player',
  gold: 500,
  str: 5,
  agi: 5,
  spd: 5,
  maxHp: 300,
  weapons: [],
  skills: [],
  dressing: { HEAD: '', BODY: '', WEAPON: '' },
  unlockedDressings: [],
  isConcentrated: false,
  friends: []
};

// 本地存储key常量
export const USERS_KEY = 'qfight_users';
export const DATA_PREFIX = 'qfight_data_';
export const HISTORY_PREFIX = 'qfight_history_';

// 认证相关类型定义
export type LoginRequest = { username: string; password: string; };
export type LoginResponse = {
  account_id: number;
  username: string;
  player_id: number;
  player_name: string;
  role: 'Player' | 'Admin';
};
export type RegisterRequest = {
  username: string;
  password: string;
  player_name?: string;
  role?: 'Player' | 'Admin';
};
export type RegisterResponse = {
  account_id: number;
  username: string;
  player_id: number;
  player_name: string;
};

export interface Player extends CharacterData {
  id: number;
  account_id: number;
  created_at: string;
  updated_at: string;
  role: 'Player' | 'Admin';
}

export interface ServerPlayer extends CharacterData {
  id: number;
  account_id: number;
  user_role: 'Player' | 'Admin';
}

/**
 * 类型安全转换函数
 */
const isValidRole = (role: string): role is 'Player' | 'Admin' => role === 'Player' || role === 'Admin';
const safeConvertRole = (role: string): 'Player' | 'Admin' => isValidRole(role) ? role : 'Player';

// ========== 1. 认证模块 (核心修复 getCurrentUser + 新增角色同步) ==========

/**
 * 🔥 核心修复：getCurrentUser 现在会优先读取修正后的真实角色
 * @returns 包含真实角色的用户信息
 */
export const getCurrentUser = (): LoginResponse | null => {
  try {
    const s = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!s) return null;
    
    // 1. 读取原始缓存的用户信息
    const user = JSON.parse(s);
    // 2. 读取修正后的真实角色（App.tsx中从接口获取的Admin）
    const realRole = localStorage.getItem(REAL_ROLE_STORAGE_KEY);
    
    // 3. 优先使用真实角色，没有则用原始角色
    user.role = realRole ? safeConvertRole(realRole) : safeConvertRole(user.role || 'Player');
    
    console.log('[getCurrentUser] 原始角色:', user.role, '| 真实角色:', realRole || '无');
    return user as LoginResponse;
  } catch (error) {
    console.error('[getCurrentUser] 解析失败:', error);
    return null;
  }
};

/**
 * 🔥 新增：同步接口返回的真实角色到本地存储
 * @param role 接口返回的真实角色（Admin/Player）
 */
export const syncRealRole = (role: 'Player' | 'Admin') => {
  localStorage.setItem(REAL_ROLE_STORAGE_KEY, role);
  console.log('[syncRealRole] 同步真实角色:', role);
};

/**
 * 🔥 新增：清除真实角色缓存（登出时调用）
 */
export const clearRealRole = () => {
  localStorage.removeItem(REAL_ROLE_STORAGE_KEY);
};

export const login = async (req: LoginRequest): Promise<LoginResponse> => {
  const data = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  // 登录时先存原始角色，后续由App.tsx同步真实角色
  data.role = safeConvertRole(data.role || 'Player');
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  return data;
};

export const register = async (req: RegisterRequest): Promise<RegisterResponse> => {
  const data = await request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: req.username,
      password: req.password,
      player_name: req.player_name || '乐斗小豆',
      role: req.role || 'Player'
    }),
  });
  // 注册时同步存储基础用户信息
  const loginRes: LoginResponse = {
    account_id: data.account_id,
    username: data.username,
    player_id: data.player_id,
    player_name: data.player_name,
    role: 'Player' // 初始角色，后续由App.tsx修正
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loginRes));
  return data;
};

export const logout = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  clearRealRole(); // 登出时清除真实角色缓存
};

// ========== 2. 玩家数据模块 (针对 422 报错的核心修正) ==========

/**
 * 保存玩家数据
 * 终极修正：后端 dressing 报错提示 Input should be None，意味着它不接受 {} 对象。
 */
export const saveUserData = async (
  data: Partial<CharacterData>,
  account_id?: number
) => {
  const user = getCurrentUser();
  if (!user) throw new Error('未登录');

  const uid = account_id || user.account_id;

  // 重要：处理 dressing 字段以避开后端的 422 校验
  // 如果 dressing 里的值全是空的，直接把整个 dressing 设为 null，不传子键
  const processedData = { ...data };
  
  if (processedData.dressing) {
    const d = processedData.dressing;
    const isEmpty = !d.HEAD && !d.BODY && !d.WEAPON;
    if (isEmpty) {
      // @ts-ignore 后端由于 Pydantic 定义问题，可能要求 None 而不是对象
      processedData.dressing = null; 
    }
  }

  // 构建符合后端校验（外层）和业务（内层）的双重结构
  const body = {
    account_id: uid,
    username: user.username,
    req: {
      account_id: uid,
      ...processedData,
    }
  };

  return request('/player/update', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

/**
 * 加载玩家数据
 */
export const loadUserData = async (account_id?: number): Promise<CharacterData> => {
  const user = getCurrentUser();
  const uid = account_id || user?.account_id;
  if (!uid) throw new Error('未登录');
  
  try {
    const rawData = await request<CharacterData>(`/player/data`, {
      method: 'POST',
      body: JSON.stringify({ account_id: uid })
    });
    rawData.role = safeConvertRole(rawData.role || 'Player');
    // 🔥 关键：加载数据时自动同步真实角色到存储
    syncRealRole(rawData.role);
    // 加载时，如果 dressing 为空，恢复为 UI 需要的对象结构
    if (!rawData.dressing) {
      rawData.dressing = { HEAD: '', BODY: '', WEAPON: '' };
    }
    return rawData;
  } catch (error) {
    return { ...INITIAL_DATA, name: user?.player_name || INITIAL_DATA.name, role: user?.role || 'Player' };
  }
};

export const resetGameData = async (account_id?: number) => {
  const user = getCurrentUser();
  const uid = account_id || user?.account_id;
  if (!uid || !user) throw new Error('未登录');
  
  return request(`/player/reset`, { 
    method: 'POST',
    body: JSON.stringify({ account_id: uid, username: user.username })
  });
};

// ========== 3. 管理员与社交功能 (全部保留 + 日志增强) ==========

export const loadAllPlayers = async (): Promise<Player[]> => {
  const user = getCurrentUser();
  console.log('[loadAllPlayers] 当前用户信息:', user);
  if (!user || user.role !== 'Admin') throw new Error('权限不足');

  const rawPlayers = await request<Player[]>('/player/all', {
    method: 'POST',
    body: JSON.stringify({ account_id: user.account_id, username: user.username }),
  });

  return rawPlayers.map(player => ({
    ...player,
    role: safeConvertRole(player.role || 'Player')
  }));
};

export const updatePlayerData = async (account_id: number, updateData: Partial<Player>) => {
  const user = getCurrentUser();
  console.log('[updatePlayerData] 当前用户信息:', user);
  if (!user || user.role !== 'Admin') throw new Error('权限不足');
  
  const body = {
    account_id: user.account_id,
    req: { account_id, ...updateData }
  };

  return request('/player/update', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

export const getAllServerPlayers = async (): Promise<ServerPlayer[]> => {
  const user = getCurrentUser();
  if (!user) throw new Error("请先登录");

  const rawPlayers = await request<ServerPlayer[]>("/player/list", {
    method: "POST",
    body: JSON.stringify({ username: user.username, account_id: user.account_id }),
  });

  return rawPlayers.map(p => ({
    ...p,
    role: safeConvertRole(p.role || 'Player'),
    user_role: safeConvertRole(p.user_role || p.role || 'Player')
  }));
};

export const getAllUsersData = async (): Promise<CharacterData[]> => {
  try {
    const user = getCurrentUser();
    if (user?.role === 'Admin') {
      const all = await loadAllPlayers();
      return all.map(p => ({ ...p, role: safeConvertRole(p.role) }));
    }
    const server = await getAllServerPlayers();
    return server.map(p => ({ ...p, role: safeConvertRole(p.user_role || p.role) }));
  } catch { return []; }
};

export const getFriendsData = async (): Promise<Friend[]> => {
  const user = getCurrentUser();
  if (!user) return [];
  try {
    const data = await loadUserData(user.account_id);
    return data.friends || [];
  } catch { return []; }
};

export const addFriend = async (friendId: string, friendData: Friend) => {
  const currentData = await loadUserData();
  const newFriends = [...(currentData.friends || []), friendData];
  await saveUserData({ friends: newFriends });
};

export const removeFriend = async (friendId: string) => {
  const currentData = await loadUserData();
  const newFriends = (currentData.friends || []).filter(f => (f as any).id !== friendId && f.name !== friendId);
  await saveUserData({ friends: newFriends });
};

// ========== 4. 兼容性与本地历史 (保留逻辑) ==========

export const loadPlayerData = async (): Promise<CharacterData> => {
  const s = localStorage.getItem('qfight_save');
  const data = s ? JSON.parse(s) : INITIAL_DATA;
  data.role = safeConvertRole(data.role || 'Player');
  return data;
};

export const savePlayerData = async (data: CharacterData) => {
  localStorage.setItem('qfight_save', JSON.stringify({ ...data, role: safeConvertRole(data.role) }));
};

export const loadUserHistory = async (username: string) => JSON.parse(localStorage.getItem(HISTORY_PREFIX + username) || '[]');
export const saveUserHistory = async (username: string, h: any) => localStorage.setItem(HISTORY_PREFIX + username, JSON.stringify(h));
export const getUsers = () => getAllUsersData();
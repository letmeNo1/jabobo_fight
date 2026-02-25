/// <reference types="vite/client" />
import { CharacterData, BattleRecord } from '../types';

// 环境变量 - 后端接口地址（建议在 .env 文件配置 VITE_API_BASE_URL）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const INITIAL_DATA: CharacterData = {
  name: '乐斗小豆',
  level: 1,
  exp: 0,
  gold: 500,
  str: 5,
  agi: 5,
  spd: 5,
  maxHp: 300,
  role: 'Player',
  weapons: [],
  skills: [],
  dressing: { HEAD: '', BODY: '', WEAPON: '' },
  unlockedDressings: [],
  isConcentrated: false,
  friends: []
};

// --- 通用请求封装（处理 Token、异常）---
const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> => {
  try {
    const fullUrl = `${API_BASE_URL}${url}`;
    const token = localStorage.getItem('qfight_user_token'); // 正常的本地Token读取（非兜底，保留）

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(fullUrl, {
      credentials: 'include',
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`请求失败：${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.code !== 200) {
      return {
        success: false,
        message: result.msg || result.message || `业务错误：状态码 ${result.code}`,
      };
    }

    return {
      success: true,
      data: result.data as T,
      message: result.msg || result.message,
    };
  } catch (error) {
    console.error('接口请求异常：', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '网络请求失败，请检查后端服务',
    };
  }
};

// --- 单独封装登录请求（适配form-data格式）---
const loginRequest = async <T>(
  url: string,
  username: string,
  password: string
): Promise<{ success: boolean; data?: T; message?: string }> => {
  try {
    const fullUrl = `${API_BASE_URL}${url}`;
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(fullUrl, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`登录请求失败：${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.access_token) {
      return {
        success: false,
        message: result.msg || '登录失败：未获取到令牌',
      };
    }

    return {
      success: true,
      data: result as T,
      message: '登录成功',
    };
  } catch (error) {
    console.error('登录请求异常：', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '登录请求失败，请检查后端服务',
    };
  }
};

// --- Auth & Multi-user Storage ---
const USERS_KEY = 'qfight_users';
const DATA_PREFIX = 'qfight_data_';
const HISTORY_PREFIX = 'qfight_history_';
const TOKEN_KEY = 'qfight_user_token';

// 【核心规则】getUsers 不读取本地存储，仅返回空对象
const getUsers = (): Record<string, { password: string }> => {
  return {}; // 完全移除本地存储读取/初始化逻辑，仅返回空对象
};

// --- 注册接口（仅依赖后端，移除本地降级兜底）---
export const registerUser = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
  // 仅调用后端接口，失败直接返回，无本地注册兜底
  const res = await request<{ username: string }>('/register', {
    method: 'POST',
    body: JSON.stringify({ 
      username, 
      password,
      role: 'Player'
    }),
  });

  if (res.success) {
    // 正常的本地存储操作（非兜底，保留）：注册成功后同步本地数据
    const newData = { ...INITIAL_DATA, name: username };
    saveUserData(username, newData);
    saveUserHistory(username, []);
    return { success: true, message: res.message || '注册成功' };
  } else {
    // 失败直接返回，无本地降级兜底
    return { success: false, message: res.message || '注册失败' };
  }
};

// --- 登录接口（仅依赖后端，移除本地降级兜底）---
export const loginUser = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
  // 仅调用后端登录接口，失败直接返回，无本地校验兜底
  const res = await loginRequest<{ access_token: string; username: string; role: string }>('/login', username, password);

  if (res.success && res.data) {
    // 正常的本地Token存储（非兜底，保留）
    localStorage.setItem(TOKEN_KEY, res.data.access_token);
    await fetchAndSaveUserData();
    return { success: true, message: '登录成功' };
  } else {
    // 失败直接返回，无本地降级兜底
    return { success: false, message: res.message || '登录失败' };
  }
};

// --- 拉取后端用户数据（仅依赖后端，移除本地降级兜底）---
export const fetchAndSaveUserData = async (): Promise<{
  success: boolean;
  data?: CharacterData;
  message?: string;
}> => {
  const res = await request<CharacterData>('/player/self', {
    method: 'GET',
  });

  if (res.success && res.data) {
    // 正常的本地数据格式化+存储（非兜底，保留）
    const userData: CharacterData = {
      ...INITIAL_DATA,
      name: res.data.name,
      level: res.data.level || INITIAL_DATA.level,
      gold: res.data.gold || INITIAL_DATA.gold,
      maxHp: res.data.maxHp || INITIAL_DATA.maxHp,
      weapons: res.data.weapons || [],
      skills: res.data.skills || [],
      dressing: res.data.dressing || INITIAL_DATA.dressing,
      exp: 0,
      str: 5,
      agi: 5,
      spd: 5,
      role: res.data.role || 'Player',
      unlockedDressings: [],
      isConcentrated: false,
      friends: []
    };
    saveUserData(res.data.name, userData);
    return { success: true, data: userData };
  }
  
  // 失败直接返回，无本地数据兜底
  return {
    success: false,
    message: res.message || '拉取后端用户数据失败',
    data: undefined,
  };
};

// --- 获取所有服务器玩家数据（仅依赖后端，移除本地降级兜底）---
export const getAllServerPlayers = async (): Promise<{
  success: boolean;
  data?: CharacterData[];
  message?: string;
}> => {
  const res = await request<CharacterData[]>('/player/all', {
    method: 'GET',
  });

  if (res.success && res.data) {
    // 正常的本地数据格式化（非兜底，保留）
    const formatPlayers = res.data.map(player => ({
      ...INITIAL_DATA,
      name: player.name,
      level: player.level || 1,
      gold: player.gold || 500,
      maxHp: player.maxHp || 300,
      weapons: player.weapons || [],
      skills: player.skills || [],
      dressing: player.dressing || INITIAL_DATA.dressing,
      exp: 0,
      str: 5,
      agi: 5,
      spd: 5,
      role: player.role || 'Player',
      unlockedDressings: [],
      isConcentrated: false,
      friends: []
    }));
    return { success: true, data: formatPlayers };
  } else {
    // 失败直接返回，无本地数据兜底
    return {
      success: false,
      message: res.message || '拉取服务器玩家失败',
      data: undefined,
    };
  }
};

// --- 正常的本地数据操作（非兜底，全部保留）---
export const loadUserData = (username: string): CharacterData => {
  try {
    const saved = localStorage.getItem(DATA_PREFIX + username);
    // 保留默认值初始化（正常本地操作，非后端兜底）
    const data = saved ? JSON.parse(saved) : { ...INITIAL_DATA, name: username };
    
    // 保留数据校验/兼容（正常本地操作）
    if (!data.friends) data.friends = [];
    if (typeof data.gold !== 'number') data.gold = INITIAL_DATA.gold;
    
    return data;
  } catch (e) {
    console.error(`Failed to load data for ${username}:`, e);
    // 保留异常时的默认值返回（正常本地容错，非后端兜底）
    return { ...INITIAL_DATA, name: username };
  }
};

export const saveUserData = (username: string, data: CharacterData) => {
  try {
    localStorage.setItem(DATA_PREFIX + username, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save data for ${username}:`, e);
  }
};

export const loadUserHistory = (username: string): BattleRecord[] => {
  try {
    const saved = localStorage.getItem(HISTORY_PREFIX + username);
    // 保留默认值（正常本地操作）
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error(`Failed to load history for ${username}:`, e);
    return [];
  }
};

export const saveUserHistory = (username: string, history: BattleRecord[]) => {
  try {
    localStorage.setItem(HISTORY_PREFIX + username, JSON.stringify(history));
  } catch (e) {
    console.error(`Failed to save history for ${username}:`, e);
  }
};

// --- Legacy Support（保留正常的本地存储操作，移除后端兜底）---
export const loadPlayerData = (): CharacterData => {
  try {
    const saved = localStorage.getItem('qfight_save');
    // 保留正常的本地读取+默认值（非后端兜底）
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  } catch {
    return INITIAL_DATA;
  }
};

export const savePlayerData = (data: CharacterData) => {
  // 保留正常的本地写入
  localStorage.setItem('qfight_save', JSON.stringify(data));
};

export const loadBattleHistory = (): BattleRecord[] => {
  const saved = localStorage.getItem('qfight_history');
  // 保留正常的本地读取+默认值
  return saved ? JSON.parse(saved) : [];
};

export const saveBattleHistory = (history: BattleRecord[]) => {
  // 保留正常的本地写入
  localStorage.setItem('qfight_history', JSON.stringify(history));
};

export const resetGameData = () => {
  // 保留正常的本地数据重置（非后端兜底）
  localStorage.removeItem('qfight_save');
  localStorage.removeItem('qfight_history');
  localStorage.removeItem(TOKEN_KEY); // 同时清除Token
};

// --- 退出登录（保留正常的本地Token清除）---
export const logoutUser = (username: string) => {
  localStorage.removeItem(TOKEN_KEY);
  // 可选保留：清除当前用户本地缓存（正常本地操作，非兜底）
  // localStorage.removeItem(DATA_PREFIX + username);
  // localStorage.removeItem(HISTORY_PREFIX + username);
};
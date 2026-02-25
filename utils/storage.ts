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
    const token = localStorage.getItem('qfight_user_token'); // 登录Token存储键

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
        message: result.message || `业务错误：状态码 ${result.code}`,
      };
    }

    return {
      success: true,
      data: result.data as T,
      message: result.message,
    };
  } catch (error) {
    console.error('接口请求异常：', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '网络请求失败，请检查后端服务',
    };
  }
};

// --- Auth & Multi-user Storage ---
const USERS_KEY = 'qfight_users';
const DATA_PREFIX = 'qfight_data_';
const HISTORY_PREFIX = 'qfight_history_';
const TOKEN_KEY = 'qfight_user_token'; // 新增：存储登录Token

// 【保留原有逻辑】获取本地用户列表（兼容离线模式，可按需关闭）
const getUsers = (): Record<string, { password: string }> => {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (!saved) {
      const defaultUsers = {
        'admin': { password: '123456' }
      };
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
      
      // Initialize admin data with some perks
      const adminData = { 
        ...INITIAL_DATA, 
        name: 'admin', 
        level: 50, 
        gold: 100000, 
        str: 50, 
        agi: 50, 
        spd: 50,
        maxHp: 2000,
        weapons: ['w1', 'w6', 'w21'], // Godly weapons
        skills: ['s30', 's29', 's18'] // Godly skills
      };
      saveUserData('admin', adminData);
      
      return defaultUsers;
    }
    return JSON.parse(saved);
  } catch (e) {
    return {};
  }
};

// --- 注册接口（替换为真实后端调用，保留本地缓存兜底）---
export const registerUser = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
  // 第一步：调用后端注册接口
  const res = await request<{ username: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (res.success) {
    // 后端注册成功：同步本地缓存
    const users = getUsers();
    users[username] = { password };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    const newData = { ...INITIAL_DATA, name: username };
    saveUserData(username, newData);
    saveUserHistory(username, []);
    
    return { success: true, message: '注册成功' };
  } else {
    // 后端失败：降级为本地注册（可选，也可直接返回失败）
    // 若不需要本地降级，直接 return { success: false, message: res.message }
    const users = getUsers();
    if (users[username]) {
      return { success: false, message: res.message || '用户名已存在' };
    }
    users[username] = { password };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const newData = { ...INITIAL_DATA, name: username };
    saveUserData(username, newData);
    saveUserHistory(username, []);
    return { success: true, message: '已使用本地注册（后端服务未响应）' };
  }
};

// --- 登录接口（替换为真实后端调用，保留本地校验兜底）---
export const loginUser = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
  // 第一步：调用后端登录接口
  const res = await request<{ token: string; username: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (res.success && res.data) {
    // 后端登录成功：存储Token + 拉取用户数据
    localStorage.setItem(TOKEN_KEY, res.data.token);
    await fetchAndSaveUserData(username); // 拉取后端用户数据并缓存
    return { success: true, message: '登录成功' };
  } else {
    // 后端失败：降级为本地校验（可选，也可直接返回失败）
    const users = getUsers();
    const user = users[username];
    if (!user) {
      return { success: false, message: res.message || '用户不存在' };
    }
    if (user.password !== password) {
      return { success: false, message: res.message || '密码错误' };
    }
    return { success: true, message: '已使用本地登录（后端服务未响应）' };
  }
};

// --- 新增：拉取后端用户数据并缓存 ---
export const fetchAndSaveUserData = async (username: string): Promise<{
  success: boolean;
  data?: CharacterData;
  message?: string;
}> => {
  const res = await request<CharacterData>('/api/user/info', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

  if (res.success && res.data) {
    saveUserData(username, res.data);
    return { success: true, data: res.data };
  }
  return {
    success: false,
    message: res.message || '拉取后端用户数据失败，使用本地缓存',
    data: loadUserData(username),
  };
};

// --- 新增：获取所有服务器玩家数据（后端接口）---
export const getAllServerPlayers = async (): Promise<{
  success: boolean;
  data?: CharacterData[];
  message?: string;
}> => {
  // 调用后端「获取所有玩家」接口
  const res = await request<CharacterData[]>('/api/player/list', {
    method: 'GET', // 建议后端用GET，也可根据实际改POST
  });

  if (res.success && res.data) {
    return { success: true, data: res.data };
  } else {
    // 后端失败：降级为本地所有用户数据（兼容原有逻辑）
    const users = getUsers();
    const localPlayers = Object.keys(users).map(username => loadUserData(username));
    return {
      success: false,
      message: res.message || '拉取服务器玩家失败，使用本地数据',
      data: localPlayers,
    };
  }
};

// --- 保留原有逻辑：加载本地缓存用户数据 ---
export const loadUserData = (username: string): CharacterData => {
  try {
    const saved = localStorage.getItem(DATA_PREFIX + username);
    const data = saved ? JSON.parse(saved) : { ...INITIAL_DATA, name: username };
    
    // Migration/Safety checks
    if (!data.friends) data.friends = [];
    if (typeof data.gold !== 'number') data.gold = INITIAL_DATA.gold;
    
    return data;
  } catch (e) {
    console.error(`Failed to load data for ${username}:`, e);
    return { ...INITIAL_DATA, name: username };
  }
};

// --- 保留原有逻辑：保存用户数据到本地 ---
export const saveUserData = (username: string, data: CharacterData) => {
  try {
    localStorage.setItem(DATA_PREFIX + username, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save data for ${username}:`, e);
  }
};

// --- 保留原有逻辑：加载用户战斗记录 ---
export const loadUserHistory = (username: string): BattleRecord[] => {
  try {
    const saved = localStorage.getItem(HISTORY_PREFIX + username);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

// --- 保留原有逻辑：保存用户战斗记录 ---
export const saveUserHistory = (username: string, history: BattleRecord[]) => {
  try {
    localStorage.setItem(HISTORY_PREFIX + username, JSON.stringify(history));
  } catch (e) {
    console.error(`Failed to save history for ${username}:`, e);
  }
};

// --- Legacy Support (Optional, can be removed if we force login) ---
export const loadPlayerData = (): CharacterData => {
  try {
    const saved = localStorage.getItem('qfight_save');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  } catch {
    return INITIAL_DATA;
  }
};

export const savePlayerData = (data: CharacterData) => {
  localStorage.setItem('qfight_save', JSON.stringify(data));
};

export const loadBattleHistory = (): BattleRecord[] => {
  const saved = localStorage.getItem('qfight_history');
  return saved ? JSON.parse(saved) : [];
};

export const saveBattleHistory = (history: BattleRecord[]) => {
  localStorage.setItem('qfight_history', JSON.stringify(history));
};

export const resetGameData = () => {
  localStorage.removeItem('qfight_save');
  localStorage.removeItem('qfight_history');
};

// --- 新增：退出登录（清除Token）---
export const logoutUser = (username: string) => {
  localStorage.removeItem(TOKEN_KEY);
  // 可选：清除当前用户本地缓存
  // localStorage.removeItem(DATA_PREFIX + username);
  // localStorage.removeItem(HISTORY_PREFIX + username);
};
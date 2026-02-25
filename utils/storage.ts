/// <reference types="vite/client" />
import { CharacterData, BattleRecord } from '../types';

// 环境变量 - 后端接口地址（建议在 .env 文件配置 VITE_API_BASE_URL）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const INITIAL_DATA: CharacterData = {
  name: '乐斗小豆',
  username: '乐斗小豆',
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
    // 构建form-data（适配后端OAuth2PasswordRequestForm）
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(fullUrl, {
      method: 'POST',
      credentials: 'include',
      body: formData, // 不用JSON，传form-data
    });

    if (!response.ok) {
      throw new Error(`登录请求失败：${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    // 后端登录接口直接返回token，无code字段（特殊处理）
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
const TOKEN_KEY = 'qfight_user_token'; // 新增：存储登录Token

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
    const userData: CharacterData = {
      ...INITIAL_DATA,
      name: res.data.name || res.data.name, // 适配后端返回的username字段
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
    saveUserData(userData.name, userData);
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
    const formatPlayers = res.data.map(player => ({
      ...INITIAL_DATA,
      name: player.name || player.name, // 适配后端返回的username字段
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

// --- 核心修改：loadUserData 调用后端 /player/self 接口（适配实际后端）---
export const loadUserData = async (username?: string): Promise<CharacterData> => {
  try {
    // 调用后端实际存在的 /player/self 接口（通过Token识别用户，无需传用户名）
    const res = await request<CharacterData>('/player/self', {
      method: 'GET',
    });

    if (res.success && res.data) {
      // 适配后端返回格式到 CharacterData 类型
      const userData: CharacterData = {
        ...INITIAL_DATA,
        name: res.data.username || res.data.name, // 后端返回的是username字段，映射到name
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
      // 可选：缓存到本地（非兜底，仅提升体验）
      saveUserData(userData.name, userData);
      return userData;
    } else {
      throw new Error(res.message || '获取当前用户数据失败');
    }
  } catch (e) {
    console.error(`Failed to load user data:`, e);
    // 优化异常处理：抛出友好错误，便于前端捕获
    throw new Error(`加载用户数据失败：${e instanceof Error ? e.message : '未知错误'}`);
  }
};

// --- 保留正常的本地存储写入（缓存后端数据）---
export const saveUserData = (username: string, data: CharacterData) => {
  try {
    localStorage.setItem(DATA_PREFIX + username, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save data for ${username}:`, e);
  }
};

// --- loadUserHistory 适配（若后端有对应接口则调用，无则保留本地逻辑）---
export const loadUserHistory = async (username: string): Promise<BattleRecord[]> => {
  try {
    // 若后端暂未实现战斗记录接口，可先返回空数组（或保留本地读取逻辑）
    // 后续可对接后端 /player/self/history 接口
    return [];
  } catch (e) {
    console.error(`Failed to load history for ${username}:`, e);
    throw new Error(`加载用户战斗记录失败：${e instanceof Error ? e.message : '未知错误'}`);
  }
};

// --- 保留正常的本地存储写入（缓存后端数据）---
export const saveUserHistory = (username: string, history: BattleRecord[]) => {
  try {
    localStorage.setItem(HISTORY_PREFIX + username, JSON.stringify(history));
  } catch (e) {
    console.error(`Failed to save history for ${username}:`, e);
  }
};

// --- Legacy Support（保留正常的本地存储操作）---
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
  localStorage.removeItem(TOKEN_KEY);
};

// --- 退出登录（保留Token清除）---
export const logoutUser = (username: string) => {
  localStorage.removeItem(TOKEN_KEY);
};
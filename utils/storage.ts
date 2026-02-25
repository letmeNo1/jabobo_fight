import { CharacterData, BattleRecord } from '../types';

// 后端接口基础地址
const API_BASE_URL = 'http://localhost:8000';

// 存储JWT令牌的key
const TOKEN_KEY = 'qfight_token';
const CURRENT_USER_KEY = 'qfight_current_user';

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

// --- 工具函数：请求封装 & 认证处理 ---
/**
 * 通用请求封装
 */
const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<{ code: number; data?: T; msg?: string }> => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 如果是需要认证的接口，添加JWT令牌
    if (!url.includes('/login') && !url.includes('/register')) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers
    });

    const result = await response.json();

    // 处理401/403认证错误
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
      throw new Error(result.msg || '登录已失效，请重新登录');
    }

    if (!response.ok) {
      throw new Error(result.msg || '请求失败');
    }

    return result;
  } catch (error) {
    console.error('请求异常:', error);
    throw error;
  }
};

/**
 * 保存当前用户信息和令牌
 */
const saveAuthInfo = (userInfo: { username: string; role: string }, token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
};

/**
 * 获取当前登录用户信息
 */
export const getCurrentUser = (): { username: string; role: string } | null => {
  try {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

/**
 * 退出登录
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
};

// --- 替换后的登录/注册/用户信息方法（保持原有方法名） ---
export const register = async (
  username: string,
  password: string,
  role: string = 'Player'
): Promise<{ success: boolean; message?: string }> => {
  try {
    await request('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || '注册失败' };
  }
};

export const login = async (
  username: string,
  password: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    // 适配OAuth2PasswordRequestForm格式（form-data）
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '账号或密码错误');
    }

    const result = await response.json();
    // 保存令牌和用户信息
    saveAuthInfo(
      { username: result.username, role: result.role },
      result.access_token
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || '登录失败' };
  }
};

export const loadUserData = async (username: string): Promise<CharacterData> => {
  try {
    // 如果是当前登录用户，调用/player/self接口
    const currentUser = getCurrentUser();
    if (currentUser?.username === username) {
      const result = await request<Record<string, any>>('/player/self');
      const data = result.data;
      
      // 映射后端数据到CharacterData格式
      return {
        ...INITIAL_DATA,
        name: data.username,
        level: data.level,
        gold: data.gold,
        maxHp: data.maxHp,
        weapons: data.weapons || [],
        skills: data.skills || [],
        dressing: data.dressing || { HEAD: '', BODY: '', WEAPON: '' },
        role: data.role || currentUser.role,
        friends: [],
        isConcentrated: false,
        exp: 0, // 后端暂未返回exp，用初始值
        str: 5, // 后端暂未返回str，用初始值
        agi: 5, // 后端暂未返回agi，用初始值
        spd: 5, // 后端暂未返回spd，用初始值
        unlockedDressings: []
      };
    }

    // 非当前用户（管理员场景）- 这里简化处理，实际可扩展/admin/players/all接口
    return { ...INITIAL_DATA, name: username };
  } catch (e) {
    console.error(`Failed to load data for ${username}:`, e);
    return { ...INITIAL_DATA, name: username };
  }
};

// --- 保留原有方法（适配接口版） ---
export const saveUserData = async (username: string, data: CharacterData) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.username !== username) {
      throw new Error('仅能修改当前登录用户数据');
    }

    // 构造增量更新参数
    const updateData = {
      add_level: data.level - INITIAL_DATA.level,
      add_maxHp: data.maxHp - INITIAL_DATA.maxHp,
      add_gold: data.gold - INITIAL_DATA.gold,
      weapons: data.weapons,
      skills: data.skills,
      dressing: data.dressing
    };

    await request('/player/self/update', {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
  } catch (e) {
    console.error(`Failed to save data for ${username}:`, e);
  }
};

// --- 历史记录相关（暂保留本地存储，可根据需求扩展后端接口） ---
export const loadUserHistory = (username: string): BattleRecord[] => {
  try {
    const saved = localStorage.getItem(`qfight_history_${username}`);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const saveUserHistory = (username: string, history: BattleRecord[]) => {
  try {
    localStorage.setItem(`qfight_history_${username}`, JSON.stringify(history));
  } catch (e) {
    console.error(`Failed to save history for ${username}:`, e);
  }
};

// --- 遗留方法（兼容旧代码，建议逐步替换） ---
export const loadPlayerData = (): CharacterData => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    // 兼容旧代码，异步转同步（实际项目建议用异步）
    let data = INITIAL_DATA;
    loadUserData(currentUser.username).then(res => {
      data = res;
    });
    return data;
  }
  try {
    const saved = localStorage.getItem('qfight_save');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  } catch {
    return INITIAL_DATA;
  }
};

export const savePlayerData = (data: CharacterData) => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    saveUserData(currentUser.username, data);
  } else {
    localStorage.setItem('qfight_save', JSON.stringify(data));
  }
};

export const loadBattleHistory = (): BattleRecord[] => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    return loadUserHistory(currentUser.username);
  }
  const saved = localStorage.getItem('qfight_history');
  return saved ? JSON.parse(saved) : [];
};

export const saveBattleHistory = (history: BattleRecord[]) => {
  const currentUser = getCurrentUser();
  if (currentUser) {
    saveUserHistory(currentUser.username, history);
  } else {
    localStorage.setItem('qfight_history', JSON.stringify(history));
  }
};

export const resetGameData = () => {
  localStorage.removeItem('qfight_save');
  localStorage.removeItem('qfight_history');
  logout();
};
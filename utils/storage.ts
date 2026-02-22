// api.ts - 乐斗游戏完整前端 API 封装（最终修复版）
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

/**
 * 通用请求函数（增强错误处理、类型安全）
 * @param url 接口路径
 * @param options 请求配置
 * @returns 后端返回的data字段
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

    // 处理空响应
    const json = text ? JSON.parse(text) : { data: null };

    // 非2xx状态码抛错
    if (!res.ok) {
      const errorMsg = json.detail 
        ? (typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail)) 
        : `${res.status} ${res.statusText}`;
      throw new Error(errorMsg);
    }

    return json.data as T;
  } catch (error) {
    console.error(`[请求失败] ${fullUrl}:`, error);
    throw error; // 向上抛错，让调用方处理
  }
};

// 初始玩家数据
export const INITIAL_DATA: CharacterData = {
  name: '乐斗小豆',
  level: 1,
  exp: 0,
  role: 'Player', // 严格匹配 CharacterData 的 role 类型
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

// 认证相关类型
export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  account_id: number;
  username: string;
  player_id: number;
  player_name: string;
  role: 'Player' | 'Admin'; // 改为严格类型
};

export type RegisterRequest = {
  username: string;
  password: string;
  player_name?: string;
  role?: 'Player' | 'Admin'; // 改为严格类型
};

export type RegisterResponse = {
  account_id: number;
  username: string;
  player_id: number;
  player_name: string;
};

// 扩展Player类型（兼容数据库结构 + CharacterData）
export interface Player extends CharacterData {
  id: number;
  account_id: number;
  created_at: string;
  updated_at: string;
  // 覆盖但保持类型一致
  role: 'Player' | 'Admin';
}

// 扩展：兼容后端 /player/list 接口的返回类型
export interface ServerPlayer extends CharacterData {
  id: number;          // 玩家ID
  account_id: number;  // 账号ID
  user_role: 'Player' | 'Admin'; // 严格匹配 CharacterData 的 role 类型
}

/**
 * 类型守卫：验证字符串是否为合法的角色类型
 * @param role 后端返回的角色字符串
 * @returns 是否为合法角色
 */
const isValidRole = (role: string): role is 'Player' | 'Admin' => {
  return role === 'Player' || role === 'Admin';
};

/**
 * 安全转换角色类型（处理后端返回的字符串）
 * @param role 后端返回的角色字符串
 * @returns 严格的角色类型，默认 Player
 */
const safeConvertRole = (role: string): 'Player' | 'Admin' => {
  return isValidRole(role) ? role : 'Player';
};

// ========== 认证相关 ==========
/**
 * 获取当前登录用户信息
 */
export const getCurrentUser = (): LoginResponse | null => {
  try {
    const s = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!s) return null;
    
    const user = JSON.parse(s);
    // 安全转换 role 类型
    user.role = safeConvertRole(user.role || 'Player');
    return user as LoginResponse;
  } catch (error) {
    console.error('解析登录信息失败:', error);
    return null;
  }
};

/**
 * 登录接口
 * @param req 登录参数
 * @returns 登录响应
 */
export const login = async (req: LoginRequest): Promise<LoginResponse> => {
  const data = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(req), // 直接传递，无需嵌套
  });
  
  // 安全转换 role 类型后存储
  data.role = safeConvertRole(data.role || 'Player');
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  return data;
};

/**
 * 注册接口
 * @param req 注册参数
 * @returns 注册响应
 */
export const register = async (req: RegisterRequest): Promise<RegisterResponse> => {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('仅管理员可注册新用户，请先以管理员身份登录');
  
  // 注册请求：携带管理员信息 + 新用户信息
  const requestBody = {
    username: currentUser.username, // 管理员用户名（权限校验）
    ...req // 新用户信息
  };
  
  const data = await request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
  
  return data;
};

/**
 * 退出登录
 */
export const logout = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

// ========== 玩家数据相关 ==========
/**
 * 保存玩家数据到后端
 * @param data 要更新的玩家数据
 * @param account_id 玩家账号ID（可选，默认当前登录用户）
 */
export const saveUserData = async (
  data: Partial<CharacterData>,
  account_id?: number
) => {
  const user = getCurrentUser();
  if (!user) throw new Error('未登录，请先登录');

  const body = {
    account_id: account_id || user.account_id,
    username: user.username, // 用于权限校验
    ...data, // 直接展开更新字段
  };

  console.log('【保存玩家数据】', body);

  return request('/player/update', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

/**
 * 从后端加载玩家数据
 * @param account_id 玩家账号ID（可选，默认当前登录用户）
 * @returns 完整的玩家数据
 */
export const loadUserData = async (account_id?: number): Promise<CharacterData> => {
  const user = getCurrentUser();
  const uid = account_id || user?.account_id;
  
  if (!uid) throw new Error('未登录，请先登录');
  
  try {
    // 优先从后端加载（GET请求无需req嵌套）
    const rawData = await request<CharacterData>(`/player/data?account_id=${uid}`);
    // 安全转换 role 类型
    rawData.role = safeConvertRole(rawData.role || 'Player');
    return rawData;
  } catch (error) {
    console.warn('从后端加载数据失败，使用本地初始数据:', error);
    // 降级返回初始数据（补充role字段）
    return { 
      ...INITIAL_DATA, 
      name: user?.player_name || INITIAL_DATA.name,
      role: user?.role || 'Player', // 严格类型
    };
  }
};

/**
 * 重置玩家数据
 * @param account_id 玩家账号ID（可选，默认当前登录用户）
 */
export const resetGameData = async (account_id?: number) => {
  const user = getCurrentUser();
  const uid = account_id || user?.account_id;
  
  if (!uid || !user) throw new Error('未登录，请先登录');
  
  return request(`/player/reset?account_id=${uid}`, { 
    method: 'POST',
    body: JSON.stringify({
      username: user.username, // 管理员用户名，用于权限校验
    })
  });
};

// ========== 管理员功能相关 ==========
/**
 * 获取所有玩家数据（管理员专用）
 * @returns 所有玩家的完整列表
 */
export const loadAllPlayers = async (): Promise<Player[]> => {
  const user = getCurrentUser();
  // 权限校验：仅管理员可调用
  if (!user || user.role !== 'Admin') {
    throw new Error('权限不足，仅管理员可查看所有玩家数据');
  }

  // 仅传递username用于权限校验
  const rawPlayers = await request<Player[]>('/player/all', {
    method: 'POST',
    body: JSON.stringify({
      username: user.username
    }),
  });

  // 安全转换所有玩家的 role 类型
  return rawPlayers.map(player => ({
    ...player,
    role: safeConvertRole(player.role || 'Player')
  }));
};

/**
 * 更新指定玩家数据（管理员专用）
 * @param account_id 要更新的玩家账号ID
 * @param updateData 要更新的字段
 */
export const updatePlayerData = async (account_id: number, updateData: Partial<Player>) => {
  const user = getCurrentUser();
  if (!user || user.role !== 'Admin') {
    throw new Error('权限不足，仅管理员可修改玩家数据');
  }

  // 确保更新的 role 是严格类型
  if (updateData.role) {
    updateData.role = safeConvertRole(updateData.role);
  }

  const body = {
    account_id,
    username: user.username, // 管理员账号，用于权限校验
    ...updateData, // 直接展开更新字段
  };

  return request('/player/update', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

// ========== 好友相关 ==========
/**
 * 获取所有用户数据（用于好友列表）
 * @returns 所有玩家的简化信息
 */
export const getAllUsersData = async (): Promise<CharacterData[]> => {
  try {
    // 管理员：获取完整列表
    const user = getCurrentUser();
    if (user?.role === 'Admin') {
      const allPlayers = await loadAllPlayers();
      // 转换为CharacterData类型并确保role类型正确
      return allPlayers.map(player => ({
        name: player.name,
        level: player.level,
        exp: player.exp,
        role: safeConvertRole(player.role), // 关键：类型转换
        gold: player.gold,
        str: player.str,
        agi: player.agi,
        spd: player.spd,
        maxHp: player.maxHp,
        weapons: player.weapons,
        skills: player.skills,
        dressing: player.dressing,
        unlockedDressings: player.unlockedDressings,
        isConcentrated: player.isConcentrated,
        friends: player.friends
      }));
    }
    
    // 普通玩家：调用 /player/list 接口
    const serverPlayers = await getAllServerPlayers();
    // 转换为CharacterData类型并确保role类型正确
    return serverPlayers.map(player => ({
      name: player.name,
      level: player.level,
      exp: player.exp,
      role: safeConvertRole(player.user_role || player.role), // 关键：类型转换
      gold: player.gold,
      str: player.str,
      agi: player.agi,
      spd: player.spd,
      maxHp: player.maxHp,
      weapons: player.weapons,
      skills: player.skills,
      dressing: player.dressing,
      unlockedDressings: player.unlockedDressings,
      isConcentrated: player.isConcentrated,
      friends: player.friends
    }));
  } catch (error) {
    console.warn('获取所有用户数据失败，返回空列表:', error);
    return [];
  }
};

/**
 * 获取好友列表数据
 * @returns 玩家的好友列表
 */
export const getFriendsData = async (): Promise<Friend[]> => {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    // 先从当前玩家数据中获取好友列表
    const playerData = await loadUserData(user.account_id);
    return playerData.friends || [];
  } catch (error) {
    console.warn('获取好友列表失败，返回空列表:', error);
    return [];
  }
};

/**
 * 添加好友
 * @param friendId 好友ID
 * @param friendData 好友数据
 */
export const addFriend = async (friendId: string, friendData: Friend): Promise<void> => {
  const user = getCurrentUser();
  if (!user) throw new Error('未登录，请先登录');

  // 获取当前好友列表
  const currentData = await loadUserData();
  const newFriends = [...(currentData.friends || []), friendData];
  
  // 更新好友列表
  await saveUserData({ friends: newFriends });
};

/**
 * 移除好友
 * @param friendId 好友ID
 */
export const removeFriend = async (friendId: string): Promise<void> => {
  const user = getCurrentUser();
  if (!user) throw new Error('未登录，请先登录');

  // 获取当前好友列表
  const currentData = await loadUserData();
  const newFriends = (currentData.friends || []).filter(friend => 
    (friend as any).id !== friendId && friend.name !== friendId
  );
  
  // 更新好友列表
  await saveUserData({ friends: newFriends });
};

// ========== 本地存储兼容函数 ==========
/**
 * 从本地存储加载玩家数据（兼容旧逻辑）
 */
export const loadPlayerData = async (): Promise<CharacterData> => {
  try {
    const s = localStorage.getItem('qfight_save');
    const data = s ? JSON.parse(s) : INITIAL_DATA;
    // 确保role字段是严格类型
    data.role = safeConvertRole(data.role || 'Player');
    return data as CharacterData;
  } catch (error) {
    console.error('解析本地玩家数据失败:', error);
    return INITIAL_DATA;
  }
};

/**
 * 保存玩家数据到本地存储（兼容旧逻辑）
 * @param data 玩家数据
 */
export const savePlayerData = async (data: CharacterData) => {
  try {
    // 确保保存的role是严格类型
    const safeData = {
      ...data,
      role: safeConvertRole(data.role)
    };
    localStorage.setItem('qfight_save', JSON.stringify(safeData));
  } catch (error) {
    console.error('保存本地玩家数据失败:', error);
  }
};

/**
 * 加载玩家战斗记录（本地存储）
 * @param username 用户名
 * @returns 战斗记录列表
 */
export const loadUserHistory = async (username: string): Promise<BattleRecord[]> => {
  try {
    const s = localStorage.getItem(HISTORY_PREFIX + username);
    return s ? JSON.parse(s) : [];
  } catch (error) {
    console.error('加载战斗记录失败:', error);
    return [];
  }
};

/**
 * 保存玩家战斗记录（本地存储）
 * @param username 用户名
 * @param history 战斗记录列表
 */
export const saveUserHistory = async (username: string, history: BattleRecord[]) => {
  try {
    localStorage.setItem(HISTORY_PREFIX + username, JSON.stringify(history));
  } catch (error) {
    console.error('保存战斗记录失败:', error);
  }
};

/**
 * 兼容旧函数：获取用户列表（已废弃，建议使用getAllUsersData）
 */
export const getUsers = async () => {
  console.warn('getUsers已废弃，请使用getAllUsersData');
  return getAllUsersData();
};

// ========== 获取服务器所有玩家列表（分权限） ==========
/**
 * 获取服务器所有玩家列表（分权限）
 * @returns 分权限的玩家列表（管理员看全部，普通玩家看其他普通玩家）
 */
export const getAllServerPlayers = async (): Promise<ServerPlayer[]> => {
  const user = getCurrentUser();
  
  // 1. 未登录校验（明确抛错，让调用方处理）
  if (!user) {
    const error = new Error("获取玩家列表失败：请先登录");
    console.error(error.message);
    throw error;
  }

  try {
    console.log(`[获取服务器玩家列表] 当前用户：${user.username}（角色：${user.role}）`);
    
    // 2. 仅传递username字段（后端 embed=True 要求的格式）
    const requestBody = {
      username: user.username
    };

    // 3. 调用后端 /player/list 接口
    const rawPlayers = await request<ServerPlayer[]>("/player/list", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // 4. 安全转换所有玩家的 role 和 user_role 类型
    const safePlayers = rawPlayers.map(player => ({
      ...player,
      role: safeConvertRole(player.role || 'Player'),
      user_role: safeConvertRole(player.user_role || player.role || 'Player')
    }));

    console.log(`[获取服务器玩家列表成功] 共返回 ${safePlayers.length} 条数据`);
    return safePlayers;

  } catch (error) {
    // 5. 分类处理错误（提升可排查性）
    const errMsg = error instanceof Error ? error.message : "未知错误";
    
    // 区分权限不足/接口异常/其他错误
    if (errMsg.includes("权限不足")) {
      console.error(`[获取玩家列表失败] 权限不足：${user.username}（角色：${user.role}）`);
    } else if (errMsg.includes("数据库")) {
      console.error(`[获取玩家列表失败] 后端数据库异常：${errMsg}`);
    } else {
      console.error(`[获取玩家列表失败] ${errMsg}`);
    }

    // 抛出标准化错误，让调用方决定是否降级处理（如返回空列表）
    throw new Error(`获取服务器玩家列表失败：${errMsg}`);
  }
};
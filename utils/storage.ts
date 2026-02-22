import { CharacterData, BattleRecord } from '../types';

const API_BASE_URL = '/api';
const AUTH_STORAGE_KEY = 'qfight_auth';

const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const fullUrl = `${API_BASE_URL}${url}`;
  console.log('[请求]', fullUrl, options.method, options.body);

  const res = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const text = await res.text();
  console.log('[响应]', res.status, text);

  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    // 精准抛出后端的详细错误
    const errorMsg = json.detail ? JSON.stringify(json.detail) : `${res.status} ${res.statusText}`;
    throw new Error(`422错误详情: ${errorMsg}`);
  }

  return json.data;
};

export const INITIAL_DATA: CharacterData = {
  name: '乐斗小豆',
  level: 1,
  exp: 0,
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

export const USERS_KEY = 'qfight_users';
export const DATA_PREFIX = 'qfight_data_';
export const HISTORY_PREFIX = 'qfight_history_';

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  account_id: number;
  username: string;
  player_id: number;
  player_name: string;
  role: string;
};

export type RegisterRequest = {
  username: string;
  password: string;
  player_name?: string;
  role?: string;
};

export type RegisterResponse = {
  account_id: number;
  username: string;
  player_id: number;
  player_name: string;
};

export const getCurrentUser = (): LoginResponse | null => {
  const s = localStorage.getItem(AUTH_STORAGE_KEY);
  return s ? JSON.parse(s) : null;
};

export const login = async (req: LoginRequest): Promise<LoginResponse> => {
  const data = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  return data;
};

export const register = async (req: RegisterRequest): Promise<RegisterResponse> => {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(req),
  });
};

export const logout = () => localStorage.removeItem(AUTH_STORAGE_KEY);

// 核心修复：严格按后端要求传 username + req 字段
export const saveUserData = async (
  data: Partial<CharacterData>,
  account_id?: number
) => {
  const user = getCurrentUser();
  if (!user) throw new Error('未登录');

  // 完全匹配后端校验规则的请求体
  const body = {
    account_id: account_id || user.account_id,
    player_id: user.player_id,
    username: user.username, // 后端强制要求的必填字段
    req: data, // 后端强制要求的必填字段
    ...data, // 保留原有玩家字段，兼容后端可能的其他校验
  };

  console.log('【最终发送给后端】', body);

  return request('/player/update', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

export const loadUserData = async (account_id?: number): Promise<CharacterData> => {
  const uid = account_id || getCurrentUser()?.account_id;
  if (!uid) throw new Error('未登录');
  return request(`/player/data?account_id=${uid}`);
};

export const resetGameData = async (account_id?: number) => {
  const user = getCurrentUser();
  const uid = account_id || user?.account_id;
  if (!uid || !user) throw new Error('未登录');
  
  return request(`/player/reset?account_id=${uid}`, { 
    method: 'POST',
    body: JSON.stringify({
      username: user.username, // 补充reset接口的必填字段
      req: { action: 'reset' }
    })
  });
};

// 保留原有兼容函数，不修改
export const loadPlayerData = async () => {
  const s = localStorage.getItem('qfight_save');
  return s ? JSON.parse(s) : INITIAL_DATA;
};

export const savePlayerData = async (data: CharacterData) => {
  localStorage.setItem('qfight_save', JSON.stringify(data));
};

export const loadUserHistory = async (username: string) => {
  const s = localStorage.getItem(HISTORY_PREFIX + username);
  return s ? JSON.parse(s) : [];
};

export const saveUserHistory = async (username: string, history: BattleRecord[]) => {
  localStorage.setItem(HISTORY_PREFIX + username, JSON.stringify(history));
};

export const getAllUsersData = async () => [];
export const getFriendsData = async () => [];
export const getUsers = async () => ({});
import { CharacterData, BattleRecord } from '../types';

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

// --- Auth & Multi-user Storage ---

const USERS_KEY = 'qfight_users';
const DATA_PREFIX = 'qfight_data_';
const HISTORY_PREFIX = 'qfight_history_';

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

export const registerUser = (username: string, password: string): { success: boolean; message?: string } => {
  const users = getUsers();
  if (users[username]) {
    return { success: false, message: '用户名已存在' };
  }
  users[username] = { password };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // Initialize data for new user
  const newData = { ...INITIAL_DATA, name: username };
  saveUserData(username, newData);
  saveUserHistory(username, []);
  
  return { success: true };
};

export const loginUser = (username: string, password: string): { success: boolean; message?: string } => {
  const users = getUsers();
  const user = users[username];
  if (!user) {
    return { success: false, message: '用户不存在' };
  }
  if (user.password !== password) {
    return { success: false, message: '密码错误' };
  }
  return { success: true };
};

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
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
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

// --- Legacy Support (Optional, can be removed if we force login) ---
// Keeping these for now but they might not be used if App switches to user-based.

export const loadPlayerData = (): CharacterData => {
  // Fallback for legacy save
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
  // Only resets legacy data
  localStorage.removeItem('qfight_save');
  localStorage.removeItem('qfight_history');
};

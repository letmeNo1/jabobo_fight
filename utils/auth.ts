import { INITIAL_DATA, getUsers, USERS_KEY, DATA_PREFIX, HISTORY_PREFIX, saveUserData, saveUserHistory } from './storage';
import { CharacterData, BattleRecord } from '../types';

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

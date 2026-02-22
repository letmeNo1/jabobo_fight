import { CharacterData } from '../types';

// API Response Types
interface ApiResponse<T> {
  success?: boolean; // Some APIs might not return success field based on description, but usually do
  data?: T;
  // Error fields?
  error?: string;
  account_id?: number; // Login/Register returns these directly?
  player_id?: number;
  player_name?: string;
  role?: string;
}

// Mappers
const mapApiDataToCharacter = (apiData: any): CharacterData => {
  return {
    name: apiData.name || apiData.player_name || 'Unknown',
    level: apiData.level || 1,
    exp: apiData.exp || 0,
    gold: apiData.gold || 0,
    str: apiData.str || 5,
    agi: apiData.agi || 5,
    spd: apiData.spd || 5,
    maxHp: apiData.maxHp || apiData.max_hp || 300,
    weapons: apiData.weapons || [],
    skills: apiData.skills || [],
    dressing: apiData.dressing || { HEAD: '', BODY: '', WEAPON: '' },
    unlockedDressings: apiData.unlockedDressings || apiData.unlocked_dressings || [],
    isConcentrated: !!apiData.isConcentrated,
    friends: apiData.friends || []
  };
};

export const apiRegister = async (adminUsername: string, newUserData: any) => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: adminUsername,
      req: newUserData
    })
  });
  if (!res.ok) throw new Error(`Register failed: ${res.status}`);
  return await res.json();
};

export const apiLogin = async (username: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return await res.json();
};

export const apiGetPlayerData = async (accountId: number): Promise<CharacterData> => {
  const res = await fetch(`/api/player/data?account_id=${accountId}`);
  if (!res.ok) throw new Error(`Get data failed: ${res.status}`);
  const json = await res.json();
  if (json.data) {
    return mapApiDataToCharacter(json.data);
  }
  throw new Error('Invalid data format');
};

export const apiUpdatePlayerData = async (currentUsername: string, updateReq: any) => {
  const res = await fetch('/api/player/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: currentUsername,
      req: updateReq
    })
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return await res.json();
};

export const apiResetPlayerData = async (adminUsername: string, accountId: number) => {
  const res = await fetch(`/api/player/reset?account_id=${accountId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername }) // Wait, body is just string? "admin_test"
    // Prompt says: 请求体：直接传管理员用户名字符串（如："admin_test"）
    // Usually JSON body is object. If it's just string, it might be raw body?
    // "请求体格式（JSON）" usually implies valid JSON value. A string is valid JSON.
    // But standard is object. Let's assume object { username: ... } or just the string if specified.
    // "请求体：直接传管理员用户名字符串" -> Maybe raw string?
    // Let's try JSON string first.
  });
  // Actually, let's look at the prompt again: "请求体：直接传管理员用户名字符串"
  // If I send JSON.stringify("admin_test"), it sends "admin_test" (with quotes).
  // If I send just "admin_test", it's not JSON.
  // I will send JSON string.
  
  if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
  return await res.json(); // "成功提示重置完成"
};

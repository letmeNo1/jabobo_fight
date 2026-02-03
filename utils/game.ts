
import { Friend, CharacterData } from '../types';
import { WEAPONS, SKILLS } from '../constants';

const NPC_NAMES = ["西门吹雪", "叶孤城", "陆小凤", "楚留香", "李寻欢", "沈浪", "燕南天", "花无缺", "谢晓峰", "傅红雪"];

export const generateRandomFriend = (playerLevel: number): Friend => {
  const randomName = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)] + "#" + Math.floor(1000 + Math.random() * 9000);
  const randomLevel = Math.max(1, playerLevel + (Math.floor(Math.random() * 5) - 2));
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: randomName,
    level: randomLevel,
    str: 5 + randomLevel + Math.floor(Math.random() * 3),
    agi: 5 + randomLevel + Math.floor(Math.random() * 3),
    spd: 5 + randomLevel + Math.floor(Math.random() * 3),
    hp: 300 + randomLevel * 10,
    weapons: [...WEAPONS].sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.id),
    skills: [...SKILLS].sort(() => 0.5 - Math.random()).slice(0, 4).map(s => s.id),
    dressing: { HEAD: '', BODY: '', WEAPON: '' }
  };
};

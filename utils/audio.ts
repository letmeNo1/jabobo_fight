
/**
 * 高级音效管理器 - 基于 Web Audio API
 */

let globalVolume = 0.5;
let audioContext: AudioContext | null = null;
const audioBufferMap = new Map<string, AudioBuffer>();

// 初始化 AudioContext (单例)
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 44100,
    });
  }
  return audioContext;
};

/**
 * 恢复音频上下文 - 必须在用户手势回调中调用
 */
export const resumeAudio = async () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.error('Failed to resume AudioContext:', e);
    }
  }
};

export const setVolume = (v: number) => {
  globalVolume = Math.max(0, Math.min(1, v));
};

/**
 * 预加载并解码音效
 */
export const preloadAudio = async (sfxId: string, arrayBuffer: ArrayBuffer) => {
  // 如果文件太小，可能是错误的占位符
  if (arrayBuffer.byteLength < 100) return;

  const ctx = getAudioContext();
  try {
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, (err) => {
        reject(err);
      });
    });
    audioBufferMap.set(sfxId, audioBuffer);
  } catch (err) {
    console.warn(`Audio decode failed for [${sfxId}]:`, err);
  }
};

/**
 * 播放指定音效
 */
export const playSFX = (sfxId: string) => {
  if (!sfxId || sfxId === 'NONE') return;
  
  const ctx = getAudioContext();
  let buffer = audioBufferMap.get(sfxId);

  if (!buffer) {
    // 自动回退逻辑：如果找不到特定受击声，尝试回退到通用打击声
    if (sfxId !== 'punch') {
      buffer = audioBufferMap.get('punch');
    }
    
    if (!buffer) {
      // 如果连通用打击声都没有，则静默退出，不再打印大量警告
      return;
    }
  }

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    gainNode.gain.value = globalVolume;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    // 只有在真正的播放错误时才记录
    console.error(`Playback Error [${sfxId}]:`, e);
  }
};

/**
 * 系统音效快捷调用
 */
export const playUISound = (type: 'CLICK' | 'EQUIP' | 'BUY' | 'LEVEL_UP' | 'WIN' | 'LOSS') => {
  const map: Record<string, string> = {
    CLICK: 'ui_click',
    EQUIP: 'ui_equip',
    BUY: 'ui_buy',
    LEVEL_UP: 'ui_levelup',
    WIN: 'battle_win',
    LOSS: 'battle_loss'
  };
  playSFX(map[type]);
};

export const stopAllSounds = () => {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
};

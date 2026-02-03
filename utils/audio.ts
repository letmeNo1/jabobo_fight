
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
      console.log('AudioContext resumed successfully via user gesture.');
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
  if (arrayBuffer.byteLength < 500) return;

  const ctx = getAudioContext();
  try {
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, (err) => {
        reject(err);
      });
    });
    audioBufferMap.set(sfxId, audioBuffer);
  } catch (err) {
    // 静默处理解码错误
  }
};

/**
 * 播放指定音效
 */
export const playSFX = (sfxId: string) => {
  if (!sfxId || sfxId === 'NONE') return;
  
  const ctx = getAudioContext();
  const buffer = audioBufferMap.get(sfxId);

  if (!buffer) {
    console.warn(`Audio buffer not found for: ${sfxId}. Asset might still be loading or failed.`);
    return;
  }

  try {
    // 即使不在直接手势回调中，如果之前已经 resume 过，这里调用也是合法的
    if (ctx.state === 'suspended') {
      ctx.resume().catch(e => console.warn('Could not resume context on play attempt', e));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    gainNode.gain.value = globalVolume;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    console.error(`Error playing SFX [${sfxId}]:`, e);
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

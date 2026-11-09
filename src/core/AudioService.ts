import { useSettings } from './settings';

/**
 * Sonidos sintetizados con WebAudio: sin archivos de audio (offline-first).
 *
 * Cada nota es una voz suave (onda senoidal o triangular más un armónico
 * tenue, por un filtro paso bajo) con envolvente de ataque y caída, para que
 * no haya chasquidos. Todo pasa por un eco corto generado en código y por un
 * limitador. En modo sereno suena más bajo y algo más lento.
 * Respeta el interruptor de sonido de los ajustes.
 */
export type SoundName =
  | 'click'
  | 'pop'
  | 'tick'
  | 'correct'
  | 'wrong'
  | 'word'
  | 'hint'
  | 'win'
  | 'lose'
  | 'reward';

interface Note {
  /** Hz. */
  freq: number;
  /** Inicio respecto al sonido (s). */
  at: number;
  /** Duración audible antes de apagarse (s). */
  dur: number;
  /** Volumen pico. */
  gain: number;
  wave?: OscillatorType;
  /** Glissando: frecuencia final (Hz). */
  to?: number;
  /** Peso del armónico (2.ª o 3.ª), para timbre de campana. */
  bell?: number;
  /** Corte del filtro paso bajo (Hz). */
  cutoff?: number;
}

// Notas (Hz). Escala de do mayor y pentatónica: siempre suenan bien juntas.
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1568;
const C4 = 261.63;
const G4 = 392;
const E4 = 329.63;

/** Proporción de eco por sonido (0 = seco). */
const WET: Partial<Record<SoundName, number>> = {
  correct: 0.25,
  word: 0.35,
  hint: 0.3,
  win: 0.4,
  lose: 0.3,
  reward: 0.4,
};

const SOUNDS: Record<SoundName, Note[]> = {
  // Toque de interfaz: un «tic» de madera muy corto.
  click: [{ freq: 1400, to: 900, at: 0, dur: 0.03, gain: 0.05, cutoff: 3000 }],
  // Colocar algo en el tablero: gota suave.
  pop: [{ freq: 880, to: 620, at: 0, dur: 0.07, gain: 0.09, cutoff: 2600 }],
  // Cuenta regresiva: un pulso apenas audible.
  tick: [{ freq: 1250, at: 0, dur: 0.035, gain: 0.04, cutoff: 3500 }],
  // Acierto: dos notas de campanita, ascendentes (tercera mayor).
  correct: [
    { freq: E6, at: 0, dur: 0.12, gain: 0.08, bell: 0.25 },
    { freq: G6, at: 0.07, dur: 0.18, gain: 0.08, bell: 0.25 },
  ],
  // Error: nota grave y redonda que baja un poco; avisa sin regañar.
  wrong: [
    { freq: 233, to: 196, at: 0, dur: 0.18, gain: 0.11, wave: 'triangle', cutoff: 900 },
  ],
  // Palabra encontrada: tres notas pentatónicas que suben.
  word: [
    { freq: C6, at: 0, dur: 0.12, gain: 0.07, bell: 0.3 },
    { freq: E6, at: 0.07, dur: 0.12, gain: 0.07, bell: 0.3 },
    { freq: G6, at: 0.14, dur: 0.28, gain: 0.08, bell: 0.3 },
  ],
  // Pista: destello suave hacia arriba.
  hint: [{ freq: A5, to: E6, at: 0, dur: 0.22, gain: 0.05, bell: 0.4, cutoff: 5000 }],
  // Resuelto o fin de ejercicio: arpegio y acorde final que se apaga despacio.
  win: [
    { freq: C5, at: 0, dur: 0.16, gain: 0.08, bell: 0.2 },
    { freq: E5, at: 0.1, dur: 0.16, gain: 0.08, bell: 0.2 },
    { freq: G5, at: 0.2, dur: 0.16, gain: 0.08, bell: 0.2 },
    { freq: C6, at: 0.3, dur: 0.9, gain: 0.07, bell: 0.25 },
    { freq: G5, at: 0.3, dur: 0.9, gain: 0.04 },
    { freq: E5, at: 0.3, dur: 0.9, gain: 0.04 },
    { freq: C4, at: 0.3, dur: 0.9, gain: 0.05, wave: 'triangle', cutoff: 1200 },
  ],
  // No salió: dos notas que bajan, suaves (ánimo, no castigo).
  lose: [
    { freq: E5, at: 0, dur: 0.22, gain: 0.07 },
    { freq: C5, at: 0.18, dur: 0.45, gain: 0.07 },
    { freq: G4, at: 0.18, dur: 0.45, gain: 0.04, wave: 'triangle', cutoff: 1000 },
  ],
  // Nivel desbloqueado o logro: brillo ascendente con acorde.
  reward: [
    { freq: G5, at: 0, dur: 0.1, gain: 0.06, bell: 0.3 },
    { freq: C6, at: 0.07, dur: 0.1, gain: 0.06, bell: 0.3 },
    { freq: E6, at: 0.14, dur: 0.1, gain: 0.06, bell: 0.3 },
    { freq: G6, at: 0.21, dur: 0.6, gain: 0.06, bell: 0.35 },
    { freq: D5, at: 0.21, dur: 0.6, gain: 0.03 },
    { freq: E4, at: 0.21, dur: 0.6, gain: 0.04, wave: 'triangle', cutoff: 1200 },
  ],
};

/** Respuesta al impulso de una sala pequeña: ruido que se apaga (eco suave). */
function makeImpulse(ctx: AudioContext, seconds = 1.1, decay = 3.2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

class Audio {
  private ctx: AudioContext | null = null;
  private dry: GainNode | null = null;
  private reverb: ConvolverNode | null = null;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      const ctx = new Ctor();
      // Limitador al final: ningún sonido suena de golpe ni distorsiona.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      limiter.connect(ctx.destination);
      this.dry = ctx.createGain();
      this.dry.connect(limiter);
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = makeImpulse(ctx);
      this.reverb.connect(limiter);
      this.ctx = ctx;
    }
    return this.ctx;
  }

  private voice(
    ctx: AudioContext,
    n: Note,
    t0: number,
    scale: number,
    volume: number,
    wet: number,
  ) {
    const start = t0 + n.at * scale;
    const dur = n.dur * scale;
    const attack = Math.min(0.012, dur / 4);
    const end = start + dur;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(n.gain * volume, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = n.cutoff ?? 4200;
    filter.Q.value = 0.5;
    filter.connect(env);

    const oscs: OscillatorNode[] = [];
    const add = (mult: number, level: number, wave: OscillatorType) => {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.setValueAtTime(n.freq * mult, start);
      if (n.to) o.frequency.exponentialRampToValueAtTime(n.to * mult, end);
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(filter);
      oscs.push(o);
    };
    add(1, 1, n.wave ?? 'sine');
    // Armónicos tenues: timbre de campana sin aspereza.
    if (n.bell) {
      add(2, n.bell, 'sine');
      add(3, n.bell / 3, 'sine');
    }

    env.connect(this.dry!);
    if (wet > 0) {
      const send = ctx.createGain();
      send.gain.value = wet;
      env.connect(send).connect(this.reverb!);
    }
    for (const o of oscs) {
      o.start(start);
      o.stop(end + 0.05);
    }
  }

  play(name: SoundName) {
    const { sound, serene } = useSettings.getState();
    if (!sound) return;
    const ctx = this.getCtx();
    if (!ctx || !this.dry) return;
    void ctx.resume();
    // Modo sereno: más bajo y un poco más lento.
    const volume = serene ? 0.65 : 1;
    const scale = serene ? 1.25 : 1;
    const t0 = ctx.currentTime + 0.005;
    const wet = WET[name] ?? 0;
    for (const n of SOUNDS[name]) this.voice(ctx, n, t0, scale, volume, wet);
  }
}

export const AudioService = new Audio();

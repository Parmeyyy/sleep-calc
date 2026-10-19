// Чистая логика калькулятора сна. Без DOM — используется и при сборке, и в браузере.

export const MINUTES_IN_DAY = 24 * 60;

export const FALL_ASLEEP = { min: 0, max: 60, default: 15 } as const;
export const CYCLE = { min: 70, max: 120, default: 90 } as const;
export const MAX_CYCLES = 6;

export type Mode = 'wake' | 'bed';
export type Quality = 'optimal' | 'normal' | 'short';

export interface Settings {
  /** Сколько минут уходит на засыпание. */
  fallAsleep: number;
  /** Длина одного цикла сна в минутах. */
  cycle: number;
}

export interface SleepOption {
  /** Время в формате HH:MM (24 ч). */
  time: string;
  /** Минуты от полуночи, 0…1439. */
  minutes: number;
  cycles: number;
  /** Чистая длительность сна (без засыпания), минуты. */
  sleepMinutes: number;
  quality: Quality;
}

export const DEFAULT_SETTINGS: Settings = {
  fallAsleep: FALL_ASLEEP.default,
  cycle: CYCLE.default,
};

/** Приводит любое число минут к диапазону 0…1439 (переход через полночь в обе стороны). */
export function normalizeMinutes(total: number): number {
  return ((Math.round(total) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
}

/** «07:00», «7:00», «7.00» → минуты от полуночи. Некорректный ввод → null. */
export function parseTime(value: string): number | null {
  const match = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function formatTime(minutes: number): string {
  const n = normalizeMinutes(minutes);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 450 → «7 ч 30 мин», 360 → «6 ч», 45 → «45 мин». */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/** Русское склонение: 1 цикл, 2 цикла, 5 циклов. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function cyclesLabel(n: number): string {
  return `${n} ${pluralRu(n, 'цикл', 'цикла', 'циклов')}`;
}

export function qualityOf(cycles: number): Quality {
  if (cycles >= 5) return 'optimal';
  if (cycles === 4) return 'normal';
  return 'short';
}

export const QUALITY_LABEL: Record<Quality, string> = {
  optimal: 'оптимально',
  normal: 'нормально',
  short: 'мало',
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Приводит настройки (в т.ч. прочитанные из localStorage) к допустимым значениям. */
export function sanitizeSettings(raw: Partial<Record<keyof Settings, unknown>> | null | undefined): Settings {
  return {
    fallAsleep: clampInt(raw?.fallAsleep, FALL_ASLEEP.min, FALL_ASLEEP.max, FALL_ASLEEP.default),
    cycle: clampInt(raw?.cycle, CYCLE.min, CYCLE.max, CYCLE.default),
  };
}

function option(minutes: number, cycles: number, cycle: number): SleepOption {
  const n = normalizeMinutes(minutes);
  return {
    time: formatTime(n),
    minutes: n,
    cycles,
    sleepMinutes: cycles * cycle,
    quality: qualityOf(cycles),
  };
}

/**
 * Режим «Хочу встать в…»: когда ложиться.
 * отбой = подъём − засыпание − k × цикл, k = 6…1 (от самого раннего отбоя к самому позднему).
 */
export function bedtimesFor(wakeMinutes: number, settings: Settings = DEFAULT_SETTINGS): SleepOption[] {
  const { fallAsleep, cycle } = sanitizeSettings(settings);
  const result: SleepOption[] = [];
  for (let k = MAX_CYCLES; k >= 1; k--) {
    result.push(option(wakeMinutes - fallAsleep - k * cycle, k, cycle));
  }
  return result;
}

/**
 * Режим «Ложусь в…»: когда вставать.
 * подъём = отбой + засыпание + k × цикл, k = 1…6.
 */
export function wakeTimesFor(bedMinutes: number, settings: Settings = DEFAULT_SETTINGS): SleepOption[] {
  const { fallAsleep, cycle } = sanitizeSettings(settings);
  const result: SleepOption[] = [];
  for (let k = 1; k <= MAX_CYCLES; k++) {
    result.push(option(bedMinutes + fallAsleep + k * cycle, k, cycle));
  }
  return result;
}

export function calculate(mode: Mode, minutes: number, settings: Settings = DEFAULT_SETTINGS): SleepOption[] {
  return mode === 'wake' ? bedtimesFor(minutes, settings) : wakeTimesFor(minutes, settings);
}

export function resultsHeading(mode: Mode, minutes: number): string {
  const t = formatTime(minutes);
  return mode === 'wake'
    ? `Если хотите встать в ${t}, ложитесь в:`
    : `Если ляжете в ${t}, вставайте в:`;
}

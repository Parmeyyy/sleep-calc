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

/** Неразрывный пробел: число не отрывается от единицы при переносе строки. */
export const NBSP = '\u00A0';

/** 450 → «7 ч 30 мин», 360 → «6 ч», 45 → «45 мин» (между числом и единицей — неразрывный пробел). */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}${NBSP}мин`;
  if (m === 0) return `${h}${NBSP}ч`;
  return `${h}${NBSP}ч${NBSP}${m}${NBSP}мин`;
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
  return `${n}${NBSP}${pluralRu(n, 'цикл', 'цикла', 'циклов')}`;
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

export interface Timing {
  /** past[i] — вариант options[i] сегодня уже прошёл. */
  past: boolean[];
  /** Индекс ближайшего варианта, который ещё можно успеть, или -1. */
  nearest: number;
}

/**
 * Для режима «Хочу встать в…»: какие варианты отбоя уже прошли к моменту now.
 * Подъём — ближайшее наступление времени wake после now. Помечаем только когда
 * часть вариантов прошла, а часть ещё впереди: если всё впереди, пользователь
 * планирует заранее; если всё позади, подсказывать нечего.
 */
export function bedtimeTiming(wakeMinutes: number, nowMinutes: number, settings: Settings = DEFAULT_SETTINGS): Timing {
  const { fallAsleep, cycle } = sanitizeSettings(settings);
  const untilWake = normalizeMinutes(wakeMinutes - nowMinutes) || MINUTES_IN_DAY;
  const past: boolean[] = [];
  for (let k = MAX_CYCLES; k >= 1; k--) past.push(fallAsleep + k * cycle > untilWake);
  const pastCount = past.filter(Boolean).length;
  if (pastCount === 0 || pastCount === past.length) {
    return { past: past.map(() => false), nearest: -1 };
  }
  return { past, nearest: pastCount };
}

export interface NapOption {
  /** Сколько длится сам сон, минуты. */
  sleepMinutes: number;
  /** Время будильника, HH:MM. */
  time: string;
  minutes: number;
}

/** Дневной сон: будильник = начало + засыпание + длительность. 10 и 20 минут и один полный цикл. */
export function napOptions(startMinutes: number, settings: Settings = DEFAULT_SETTINGS): NapOption[] {
  const { fallAsleep, cycle } = sanitizeSettings(settings);
  return [10, 20, cycle].map((sleepMinutes) => {
    const minutes = normalizeMinutes(startMinutes + fallAsleep + sleepMinutes);
    return { sleepMinutes, minutes, time: formatTime(minutes) };
  });
}

export function isDefaultSettings(settings: Settings): boolean {
  return settings.fallAsleep === DEFAULT_SETTINGS.fallAsleep && settings.cycle === DEFAULT_SETTINGS.cycle;
}

export interface AlarmFit {
  /** Чистый сон от засыпания до будильника, минуты. */
  sleepMinutes: number;
  fullCycles: number;
  /** Сколько минут идёт текущий цикл в момент будильника (0 — ровно граница). */
  intoCycle: number;
}

/** Куда попадает будильник wake, если лечь в bed. */
export function alarmFit(bedMinutes: number, wakeMinutes: number, settings: Settings = DEFAULT_SETTINGS): AlarmFit {
  const { fallAsleep, cycle } = sanitizeSettings(settings);
  const sleepMinutes = normalizeMinutes(wakeMinutes - bedMinutes - fallAsleep);
  return { sleepMinutes, fullCycles: Math.floor(sleepMinutes / cycle), intoCycle: sleepMinutes % cycle };
}

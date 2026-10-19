import { describe, expect, it } from 'vitest';
import {
  bedtimesFor,
  calculate,
  cyclesLabel,
  formatDuration,
  formatTime,
  normalizeMinutes,
  parseTime,
  qualityOf,
  resultsHeading,
  sanitizeSettings,
  wakeTimesFor,
} from './sleep';

const t = (s: string) => {
  const m = parseTime(s);
  if (m === null) throw new Error(`bad time ${s}`);
  return m;
};
const times = (opts: { time: string }[]) => opts.map((o) => o.time);

describe('parseTime / formatTime', () => {
  it('парсит корректное время', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('07:30')).toBe(450);
    expect(parseTime('7:05')).toBe(425);
    expect(parseTime('23:59')).toBe(1439);
    expect(parseTime(' 9.15 ')).toBe(555);
  });

  it('отклоняет некорректное время', () => {
    for (const bad of ['', '24:00', '12:60', '7', 'abc', '7:5', '-1:00', '123:00']) {
      expect(parseTime(bad)).toBeNull();
    }
  });

  it('форматирует в 24 ч с ведущими нулями и нормализует', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(1439)).toBe('23:59');
    expect(formatTime(1440)).toBe('00:00');
    expect(formatTime(-15)).toBe('23:45');
    expect(formatTime(-1440 * 2 - 60)).toBe('23:00');
  });

  it('normalizeMinutes держит диапазон 0…1439', () => {
    expect(normalizeMinutes(1500)).toBe(60);
    expect(normalizeMinutes(-1)).toBe(1439);
  });
});

describe('formatDuration / cyclesLabel', () => {
  it('длительность сна', () => {
    expect(formatDuration(450)).toBe('7 ч 30 мин');
    expect(formatDuration(540)).toBe('9 ч');
    expect(formatDuration(45)).toBe('45 мин');
    expect(formatDuration(0)).toBe('0 мин');
  });

  it('склонение циклов', () => {
    expect(cyclesLabel(1)).toBe('1 цикл');
    expect(cyclesLabel(2)).toBe('2 цикла');
    expect(cyclesLabel(4)).toBe('4 цикла');
    expect(cyclesLabel(5)).toBe('5 циклов');
    expect(cyclesLabel(6)).toBe('6 циклов');
    expect(cyclesLabel(11)).toBe('11 циклов');
    expect(cyclesLabel(21)).toBe('21 цикл');
  });
});

describe('режим «Хочу встать в…»', () => {
  it('подъём 07:00, засыпание 15, цикл 90', () => {
    const r = bedtimesFor(t('07:00'), { fallAsleep: 15, cycle: 90 });
    expect(r.map((o) => o.cycles)).toEqual([6, 5, 4, 3, 2, 1]);
    expect(times(r)).toEqual(['21:45', '23:15', '00:45', '02:15', '03:45', '05:15']);
    expect(r[0].sleepMinutes).toBe(540);
    expect(r[1].sleepMinutes).toBe(450);
  });

  it('корректно уходит в предыдущие сутки при раннем подъёме', () => {
    const r = bedtimesFor(t('00:30'), { fallAsleep: 15, cycle: 90 });
    expect(times(r)).toEqual(['15:15', '16:45', '18:15', '19:45', '21:15', '22:45']);
  });

  it('подъём ровно в полночь', () => {
    const r = bedtimesFor(0, { fallAsleep: 0, cycle: 90 });
    expect(r.at(-1)!.time).toBe('22:30');
    expect(r[0].time).toBe('15:00');
  });
});

describe('режим «Ложусь в…»', () => {
  it('отбой 23:00, засыпание 15, цикл 90 — переход через полночь', () => {
    const r = wakeTimesFor(t('23:00'), { fallAsleep: 15, cycle: 90 });
    expect(r.map((o) => o.cycles)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(times(r)).toEqual(['00:45', '02:15', '03:45', '05:15', '06:45', '08:15']);
  });

  it('отбой 23:59 + засыпание 1 мин даёт ровно полночь + циклы', () => {
    const r = wakeTimesFor(t('23:59'), { fallAsleep: 1, cycle: 120 });
    expect(times(r)).toEqual(['02:00', '04:00', '06:00', '08:00', '10:00', '12:00']);
  });

  it('засыпание учитывается одинаково в обоих режимах (режимы взаимно обратны)', () => {
    const settings = { fallAsleep: 25, cycle: 95 };
    const wake = t('06:30');
    for (const bed of bedtimesFor(wake, settings)) {
      const back = wakeTimesFor(bed.minutes, settings).find((o) => o.cycles === bed.cycles)!;
      expect(back.time).toBe('06:30');
    }
  });
});

describe('граничные значения настроек', () => {
  it('засыпание 0 и 60, цикл 70 и 120', () => {
    expect(bedtimesFor(t('07:00'), { fallAsleep: 0, cycle: 70 }).at(-1)!.time).toBe('05:50');
    expect(bedtimesFor(t('07:00'), { fallAsleep: 60, cycle: 120 })[0].time).toBe('18:00');
    expect(wakeTimesFor(t('22:00'), { fallAsleep: 60, cycle: 120 }).at(-1)!.time).toBe('11:00');
  });

  it('значения вне диапазона и мусор зажимаются', () => {
    expect(sanitizeSettings({ fallAsleep: -5, cycle: 500 })).toEqual({ fallAsleep: 0, cycle: 120 });
    expect(sanitizeSettings({ fallAsleep: 999, cycle: 10 })).toEqual({ fallAsleep: 60, cycle: 70 });
    expect(sanitizeSettings({ fallAsleep: 'abc', cycle: NaN })).toEqual({ fallAsleep: 15, cycle: 90 });
    expect(sanitizeSettings(null)).toEqual({ fallAsleep: 15, cycle: 90 });
    expect(sanitizeSettings({ fallAsleep: '20', cycle: 89.6 })).toEqual({ fallAsleep: 20, cycle: 90 });
  });

  it('расчёт использует зажатые настройки', () => {
    expect(times(bedtimesFor(t('07:00'), { fallAsleep: -100, cycle: 1000 })))
      .toEqual(times(bedtimesFor(t('07:00'), { fallAsleep: 0, cycle: 120 })));
  });
});

describe('оценка и заголовки', () => {
  it('5–6 оптимально, 4 нормально, 1–3 мало', () => {
    expect([1, 2, 3, 4, 5, 6].map(qualityOf)).toEqual(['short', 'short', 'short', 'normal', 'optimal', 'optimal']);
  });

  it('calculate выбирает режим', () => {
    expect(calculate('wake', 420)).toEqual(bedtimesFor(420));
    expect(calculate('bed', 1380)).toEqual(wakeTimesFor(1380));
  });

  it('заголовки результатов', () => {
    expect(resultsHeading('wake', 420)).toBe('Если хотите встать в 07:00, ложитесь в:');
    expect(resultsHeading('bed', 1380)).toBe('Если ляжете в 23:00, вставайте в:');
  });
});

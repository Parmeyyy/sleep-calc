import { describe, expect, it } from 'vitest';
import {
  NBSP,
  alarmFit,
  bedtimeTiming,
  bedtimesFor,
  calculate,
  isDefaultSettings,
  napOptions,
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
const nb = (s: string) => s.replace(/ /g, NBSP);
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
  it('длительность сна (неразрывные пробелы между числом и единицей)', () => {
    expect(formatDuration(450)).toBe(`7${NBSP}ч${NBSP}30${NBSP}мин`);
    expect(formatDuration(540)).toBe(nb('9 ч'));
    expect(formatDuration(45)).toBe(nb('45 мин'));
    expect(formatDuration(0)).toBe(nb('0 мин'));
  });

  it('склонение циклов', () => {
    expect(cyclesLabel(1)).toBe(nb('1 цикл'));
    expect(cyclesLabel(2)).toBe(nb('2 цикла'));
    expect(cyclesLabel(4)).toBe(nb('4 цикла'));
    expect(cyclesLabel(5)).toBe(nb('5 циклов'));
    expect(cyclesLabel(6)).toBe(nb('6 циклов'));
    expect(cyclesLabel(11)).toBe(nb('11 циклов'));
    expect(cyclesLabel(21)).toBe(nb('21 цикл'));
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
  it('5–6 в норме, 4 запасной, 1–3 мало', () => {
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

describe('bedtimeTiming: «уже прошло» и «ближайший»', () => {
  const s = { fallAsleep: 15, cycle: 90 };
  // Подъём 07:00 → варианты 21:45, 23:15, 00:45, 02:15, 03:45, 05:15.

  it('днём ничего не помечает — человек планирует заранее', () => {
    expect(bedtimeTiming(t('07:00'), t('14:00'), s)).toEqual({ past: [false, false, false, false, false, false], nearest: -1 });
  });

  it('в 23:40 прошли 21:45 и 23:15, ближайший — 00:45', () => {
    expect(bedtimeTiming(t('07:00'), t('23:40'), s)).toEqual({ past: [true, true, false, false, false, false], nearest: 2 });
  });

  it('ровно в момент отбоя вариант ещё не прошёл', () => {
    expect(bedtimeTiming(t('07:00'), t('23:15'), s).nearest).toBe(1);
  });

  it('после полуночи считает от того же утра', () => {
    expect(bedtimeTiming(t('07:00'), t('02:00'), s)).toEqual({ past: [true, true, true, false, false, false], nearest: 3 });
  });

  it('когда до подъёма меньше одного цикла, ничего не помечает', () => {
    expect(bedtimeTiming(t('07:00'), t('06:00'), s).nearest).toBe(-1);
  });

  it('текущее время совпадает с подъёмом — значит, подъём завтра', () => {
    expect(bedtimeTiming(t('07:00'), t('07:00'), s).nearest).toBe(-1);
  });
});

describe('napOptions', () => {
  it('10, 20 минут и полный цикл с учётом засыпания и полуночи', () => {
    expect(napOptions(t('13:00'), { fallAsleep: 5, cycle: 90 }).map((o) => o.time)).toEqual(['13:15', '13:25', '14:35']);
    expect(napOptions(t('23:50'), { fallAsleep: 10, cycle: 100 }).map((o) => o.time)).toEqual(['00:10', '00:20', '01:40']);
  });
});

describe('isDefaultSettings', () => {
  it('сравнивает с настройками по умолчанию', () => {
    expect(isDefaultSettings({ fallAsleep: 15, cycle: 90 })).toBe(true);
    expect(isDefaultSettings({ fallAsleep: 30, cycle: 90 })).toBe(false);
  });
});

describe('alarmFit', () => {
  it('отбой 23:00, будильник 07:00 — 15 минут после пятого цикла', () => {
    expect(alarmFit(t('23:00'), t('07:00'))).toEqual({ sleepMinutes: 465, fullCycles: 5, intoCycle: 15 });
  });
  it('граница цикла и переход через полночь', () => {
    expect(alarmFit(t('23:00'), t('06:45'))).toEqual({ sleepMinutes: 450, fullCycles: 5, intoCycle: 0 });
    expect(alarmFit(t('01:00'), t('07:00'))).toEqual({ sleepMinutes: 345, fullCycles: 3, intoCycle: 75 });
  });
});

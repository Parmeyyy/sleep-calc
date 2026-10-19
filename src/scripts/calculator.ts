import {
  DEFAULT_SETTINGS,
  QUALITY_LABEL,
  bedtimeTiming,
  calculate,
  cyclesLabel,
  formatDuration,
  formatTime,
  isDefaultSettings,
  normalizeMinutes,
  parseTime,
  resultsHeading,
  sanitizeSettings,
  type Mode,
  type Settings,
} from '../lib/sleep';

const STORAGE_KEY = 'sleep-calc:settings';

export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Приватный режим или запрет хранилища — просто не запоминаем.
  }
}

export function initCalculator(root: HTMLElement): void {
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panel = $<HTMLElement>('[role="tabpanel"]');
  const timeInput = $<HTMLInputElement>('#calc-time');
  const timeLabel = $<HTMLElement>('#calc-time-label');
  const fall = $<HTMLInputElement>('#calc-fall');
  const fallOut = $<HTMLOutputElement>('#calc-fall-out');
  const cycle = $<HTMLInputElement>('#calc-cycle');
  const cycleOut = $<HTMLOutputElement>('#calc-cycle-out');
  const title = $<HTMLElement>('#calc-title');
  const cards = [...root.querySelectorAll<HTMLElement>('.card')].map((card) => ({
    card,
    time: card.querySelector<HTMLElement>('.card-time')!,
    cycles: card.querySelector<HTMLElement>('.card-cycles')!,
    dur: card.querySelector<HTMLElement>('.card-dur')!,
    badge: card.querySelector<HTMLElement>('.card-badge')!,
  }));

  let mode: Mode = root.dataset.mode === 'bed' ? 'bed' : 'wake';
  const times: Record<Mode, number> = {
    wake: parseTime(root.dataset.wake ?? '') ?? 7 * 60,
    bed: parseTime(root.dataset.bed ?? '') ?? 23 * 60,
  };

  const nearestNote = $<HTMLElement>('[data-nearest-note]');
  const customNote = $<HTMLElement>('[data-custom]');
  const customText = $<HTMLElement>('[data-custom-text]');
  const shareBtn = $<HTMLButtonElement>('[data-share]');

  // Время из ссылки: ?wake=07:15 или ?bed=23:10.
  const params = new URLSearchParams(location.search);
  for (const m of ['wake', 'bed'] as const) {
    const fromUrl = parseTime(params.get(m) ?? '');
    if (fromUrl !== null) {
      times[m] = fromUrl;
      mode = m;
    }
  }

  const stored = loadSettings();
  if (stored) {
    fall.value = String(stored.fallAsleep);
    cycle.value = String(stored.cycle);
  }

  const settings = (): Settings => sanitizeSettings({ fallAsleep: fall.valueAsNumber, cycle: cycle.valueAsNumber });

  function render(): void {
    const s = settings();
    fallOut.value = `${s.fallAsleep} мин`;
    cycleOut.value = `${s.cycle} мин`;

    for (const tab of tabs) {
      const active = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) panel.setAttribute('aria-labelledby', tab.id);
    }
    root.dataset.mode = mode;
    timeLabel.textContent = mode === 'wake' ? 'Время подъёма' : 'Время отбоя';

    const value = formatTime(times[mode]);
    if (timeInput.value !== value) timeInput.value = value;

    title.textContent = resultsHeading(mode, times[mode]);
    const options = calculate(mode, times[mode], s);
    const now = nowMinutes();
    const timing = mode === 'wake' ? bedtimeTiming(times.wake, now, s) : { past: [], nearest: -1 };
    options.forEach((o, i) => {
      const c = cards[i];
      const past = timing.past[i] === true;
      c.card.dataset.quality = o.quality;
      c.card.toggleAttribute('data-past', past);
      c.card.toggleAttribute('data-nearest', i === timing.nearest);
      c.time.textContent = o.time;
      c.cycles.textContent = cyclesLabel(o.cycles);
      c.dur.textContent = formatDuration(o.sleepMinutes);
      c.badge.textContent = past ? 'прошло' : QUALITY_LABEL[o.quality];
    });

    if (timing.nearest >= 0) {
      const o = options[timing.nearest];
      const strong = document.createElement('strong');
      strong.textContent = o.time;
      nearestNote.replaceChildren(
        `Сейчас ${formatTime(now)}. Ближайший вариант, который ещё можно успеть: `,
        strong,
        `, ${cyclesLabel(o.cycles)} (${QUALITY_LABEL[o.quality]}).`,
      );
    }
    nearestNote.hidden = timing.nearest < 0;

    customNote.hidden = isDefaultSettings(s);
    customText.textContent = `Расчёт с вашими настройками: засыпание ${s.fallAsleep} мин, цикл ${s.cycle} мин.`;
  }

  // Адрес страницы повторяет выбранное время: ссылку можно сохранить или отправить.
  function syncUrl(): void {
    const url = new URL(location.href);
    url.searchParams.delete('wake');
    url.searchParams.delete('bed');
    url.searchParams.set(mode, formatTime(times[mode]));
    // Двоеточие в запросе допустимо, а «07:15» читается лучше, чем «07%3A15».
    history.replaceState(history.state, '', url.href.replace(/%3A/g, ':'));
  }

  function changed(): void {
    render();
    syncUrl();
  }

  function setMode(next: Mode): void {
    mode = next;
    changed();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode as Mode));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      setMode(next.dataset.mode as Mode);
    });
  });

  timeInput.addEventListener('input', () => {
    const m = parseTime(timeInput.value);
    if (m === null) return;
    times[mode] = m;
    changed();
  });
  // Пустое поле (стёрли время) — возвращаем последнее корректное значение.
  timeInput.addEventListener('blur', render);

  // Кнопки ±: одно нажатие — один шаг, удержание — быстрая прокрутка.
  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    const step = () => {
      times[mode] = normalizeMinutes(times[mode] + Number(btn.dataset.step));
      changed();
    };
    let delay: number | undefined;
    let repeat: number | undefined;
    const stop = () => {
      clearTimeout(delay);
      clearInterval(repeat);
    };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      step();
      delay = window.setTimeout(() => {
        repeat = window.setInterval(step, 70);
      }, 400);
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'blur'] as const) {
      btn.addEventListener(type, stop);
    }
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    // Клавиатура (Enter/Space) даёт click без pointerdown.
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) step();
    });
  }


  $<HTMLButtonElement>('[data-now]').addEventListener('click', () => {
    times.bed = nowMinutes();
    setMode('bed');
  });

  for (const input of [fall, cycle]) {
    input.addEventListener('input', () => {
      render();
      saveSettings(settings());
    });
  }

  $<HTMLButtonElement>('[data-reset]').addEventListener('click', () => {
    fall.value = String(DEFAULT_SETTINGS.fallAsleep);
    cycle.value = String(DEFAULT_SETTINGS.cycle);
    saveSettings(DEFAULT_SETTINGS);
    render();
  });

  const canShare = typeof navigator.share === 'function';
  if (canShare || navigator.clipboard) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', async () => {
      syncUrl();
      const data = { title: document.title, text: title.textContent ?? '', url: location.href };
      try {
        if (canShare) {
          await navigator.share(data);
        } else {
          await navigator.clipboard.writeText(data.url);
          shareBtn.textContent = 'Ссылка скопирована';
          setTimeout(() => (shareBtn.textContent = 'Поделиться'), 2000);
        }
      } catch {
        // Пользователь закрыл окно «Поделиться» — ничего не делаем.
      }
    });
  }

  render();
  // Пометки «прошло» зависят от текущего времени.
  setInterval(render, 30_000);
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

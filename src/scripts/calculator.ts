import {
  QUALITY_LABEL,
  calculate,
  cyclesLabel,
  formatDuration,
  formatTime,
  normalizeMinutes,
  parseTime,
  resultsHeading,
  sanitizeSettings,
  type Mode,
  type Settings,
} from '../lib/sleep';

const STORAGE_KEY = 'sleep-calc:settings';
const FINE_KEY = 'sleep-calc:fine';

function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveSettings(settings: Settings): void {
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
    timeLabel.textContent = mode === 'wake' ? 'Подъём' : 'Отбой';

    const value = formatTime(times[mode]);
    if (timeInput.value !== value) timeInput.value = value;

    title.textContent = resultsHeading(mode, times[mode]);
    calculate(mode, times[mode], s).forEach((o, i) => {
      const c = cards[i];
      c.card.dataset.quality = o.quality;
      c.time.textContent = o.time;
      c.cycles.textContent = cyclesLabel(o.cycles);
      c.dur.textContent = formatDuration(o.sleepMinutes);
      c.badge.textContent = QUALITY_LABEL[o.quality];
    });
  }

  function setMode(next: Mode): void {
    mode = next;
    render();
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
    render();
  });
  // Пустое поле (стёрли время) — возвращаем последнее корректное значение.
  timeInput.addEventListener('blur', render);

  // Кнопки ±: одно нажатие — один шаг, удержание — быстрая прокрутка.
  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    const step = () => {
      times[mode] = normalizeMinutes(times[mode] + Number(btn.dataset.step));
      render();
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

  const fineToggle = $<HTMLInputElement>('#calc-fine-toggle');
  const finePanel = $<HTMLElement>('#calc-fine');
  const applyFine = () => {
    finePanel.hidden = !fineToggle.checked;
    fineToggle.setAttribute('aria-expanded', String(fineToggle.checked));
  };
  try {
    fineToggle.checked = localStorage.getItem(FINE_KEY) === '1';
  } catch {}
  applyFine();
  fineToggle.addEventListener('change', () => {
    applyFine();
    try {
      localStorage.setItem(FINE_KEY, fineToggle.checked ? '1' : '0');
    } catch {}
  });

  $<HTMLButtonElement>('[data-now]').addEventListener('click', () => {
    const now = new Date();
    times.bed = now.getHours() * 60 + now.getMinutes();
    setMode('bed');
  });

  for (const input of [fall, cycle]) {
    input.addEventListener('input', () => {
      render();
      saveSettings(settings());
    });
  }

  render();
}

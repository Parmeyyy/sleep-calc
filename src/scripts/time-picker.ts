// Выбор времени мышью для компьютеров. Safari на Mac не показывает список для
// <input type="time">, а Chrome открывает его только по значку. На сенсорных
// экранах остаётся родное колесо браузера, этот модуль там не включается.
import { formatTime, parseTime } from '../lib/sleep';

const pad = (n: number) => String(n).padStart(2, '0');

export function attachTimePicker(input: HTMLInputElement, onPick: (minutes: number) => void): void {
  if (!matchMedia('(pointer: fine)').matches) return;

  const host = input.parentElement!;
  host.classList.add('tp-host');

  const pop = document.createElement('div');
  pop.className = 'tp';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Выбор времени');

  const column = (label: string, count: number) => {
    const col = document.createElement('div');
    col.className = 'tp-col';
    col.setAttribute('role', 'listbox');
    col.setAttribute('aria-label', label);
    for (let i = 0; i < count; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tp-opt';
      b.dataset.value = String(i);
      b.textContent = pad(i);
      b.setAttribute('role', 'option');
      col.append(b);
    }
    return col;
  };
  const hours = column('Часы', 24);
  const minutes = column('Минуты', 60);
  pop.append(hours, minutes);
  host.append(pop);

  const current = () => parseTime(input.value) ?? 0;

  const mark = (col: HTMLElement, value: number, scroll: boolean) => {
    for (const b of col.querySelectorAll<HTMLButtonElement>('.tp-opt')) {
      const on = Number(b.dataset.value) === value;
      b.setAttribute('aria-selected', String(on));
      if (on && scroll) col.scrollTop = b.offsetTop - col.clientHeight / 2 + b.offsetHeight / 2;
    }
  };

  const sync = (scroll: boolean) => {
    const m = current();
    mark(hours, Math.floor(m / 60), scroll);
    mark(minutes, m % 60, scroll);
  };

  const open = () => {
    if (!pop.hidden) return;
    pop.hidden = false;
    sync(true);
  };
  const close = () => {
    pop.hidden = true;
  };

  input.addEventListener('click', open);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      input.focus();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !host.contains(e.target as Node)) close();
  });

  hours.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.tp-opt');
    if (!b) return;
    const m = current();
    const next = Number(b.dataset.value) * 60 + (m % 60);
    input.value = formatTime(next);
    onPick(next);
    sync(false);
  });
  minutes.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.tp-opt');
    if (!b) return;
    const m = current();
    const next = Math.floor(m / 60) * 60 + Number(b.dataset.value);
    input.value = formatTime(next);
    onPick(next);
    close();
    input.focus();
  });

  // Время могли поменять кнопками ± или с клавиатуры — держим отметки в актуальном виде.
  input.addEventListener('input', () => sync(false));
}

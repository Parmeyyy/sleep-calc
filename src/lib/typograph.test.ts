import { describe, expect, it } from 'vitest';
import { typographHtml, typographText } from './typograph';

const N = ' ';

describe('typographText', () => {
  it('короткие слова не остаются в конце строки', () => {
    expect(typographText('ложитесь в 22:15')).toBe(`ложитесь в${N}22:15`);
    expect(typographText('и в начале')).toBe(`и${N}в${N}начале`);
    expect(typographText('Не спите на работе')).toBe(`Не${N}спите на${N}работе`);
  });

  it('не трогает буквы внутри слов', () => {
    expect(typographText('сон и отдых')).toBe(`сон и${N}отдых`);
    expect(typographText('засыпание')).toBe('засыпание');
  });

  it('связывает число со словом и ставит неразрывный пробел перед тире', () => {
    expect(typographText('5 циклов — это 7 ч 30 мин')).toBe(`5${N}циклов${N}— это 7${N}ч${N}30${N}мин`);
  });
});

describe('typographHtml', () => {
  it('меняет только текст, не атрибуты и не скрипты', () => {
    const html = '<a title="в лесу" href="/a">в лесу</a><script>const a = "в лесу";</script><p>и всё</p>';
    expect(typographHtml(html)).toBe(
      `<a title="в лесу" href="/a">в${N}лесу</a><script>const a = "в лесу";</script><p>и${N}всё</p>`,
    );
  });

  it('работает на стыке текста и тега', () => {
    expect(typographHtml('ложитесь в <strong>22:15</strong> — это')).toBe(`ложитесь в${N}<strong>22:15</strong>${N}— это`);
  });
});

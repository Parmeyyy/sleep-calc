// Простой типограф для готового HTML: неразрывные пробелы там, где перенос строки
// разрывает смысл. Работает только с текстом между тегами, не трогает атрибуты,
// <script>, <style> и <textarea>.

const NBSP = ' ';

// Короткие слова, которые не должны оставаться в конце строки.
const SHORT = 'в|к|с|о|у|и|а|я|во|ко|со|об|не|ни|на|по|до|от|из|за|но|же|ли';
const SHORT_WORD = new RegExp(`(^|[\\s(«„ ])(${SHORT}) (?=\\S|$)`, 'giu');
// Число и следующее за ним слово: «5 циклов», «7 ч», «15 мин».
const NUMBER_WORD = /(\d) (?=[а-яё])/giu;
// Пробел перед длинным тире.
const BEFORE_DASH = / —/g;

// «7 ч 30 мин» не разрывается между часами и минутами.
const HOURS_MINUTES = /(\d\u00A0ч) (?=\d)/g;

export function typographText(text: string): string {
  let out = text.replace(BEFORE_DASH, `${NBSP}—`).replace(NUMBER_WORD, `$1${NBSP}`).replace(HOURS_MINUTES, `$1${NBSP}`);
  // Дважды: «и в начале» — оба коротких слова подряд.
  out = out.replace(SHORT_WORD, `$1$2${NBSP}`).replace(SHORT_WORD, `$1$2${NBSP}`);
  return out;
}

const SKIP_BLOCK = /<(script|style|textarea)\b[\s\S]*?<\/\1>/gi;

export function typographHtml(html: string): string {
  const parts: string[] = [];
  let last = 0;
  for (const m of html.matchAll(SKIP_BLOCK)) {
    parts.push(processChunk(html.slice(last, m.index)), m[0]);
    last = m.index! + m[0].length;
  }
  parts.push(processChunk(html.slice(last)));
  return parts.join('');
}

function processChunk(chunk: string): string {
  // Делим на теги и текст между ними; меняем только текст.
  return chunk.replace(/(^|>)([^<]+)/g, (_, gt: string, text: string) => gt + typographText(text));
}

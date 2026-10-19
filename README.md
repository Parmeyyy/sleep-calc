# Калькулятор сна

Статический сайт на Astro: во сколько лечь, чтобы встать в нужное время, и когда вставать, если ложишься сейчас. Считает по циклам сна с учётом времени засыпания.

**Сайт:** https://parmeyyy.github.io/sleep-calc/

- без внешних CDN, шрифтов, аналитики и cookies; шрифты системные;
- ~10 КБ на страницу (gzip), JS — только калькулятор и переключатель темы;
- PWA: работает офлайн, можно добавить на главный экран;
- главная, 9 страниц «во сколько лечь, чтобы встать в 05:00…09:00», 9 страниц «если лечь в 21:00…01:00, во сколько вставать»;
- калькулятор дневного сна, страница «Сколько нужно спать» (нормы по возрасту), «О сайте» (источники, конфиденциальность);
- поздно вечером прошедшие варианты отбоя помечаются, ближайший подсвечивается;
- выбранное время попадает в адрес (`?wake=07:15` / `?bed=23:10`), кнопка «Поделиться»;
- типограф при сборке расставляет неразрывные пробелы во всём HTML.

## Команды

```sh
npm install
npm run dev       # http://localhost:4321/sleep-calc/
npm test          # юнит-тесты логики и типографа (vitest)
npm run check     # проверка типов (astro check)
npm run build     # сборка в dist/ (+ генерация sw.js)
npm run preview   # локальная проверка собранного сайта
npm run icons     # перегенерировать иконки и og.png из scripts/make-icons.mjs
```

Деплой — автоматически при пуше в `main` (`.github/workflows/deploy.yml`: тесты → проверка типов → сборка → GitHub Pages).

## Структура

| Путь | Что там |
| --- | --- |
| `site.config.mjs` | адрес сайта, название, настройки рекламы |
| `src/lib/sleep.ts` | вся логика расчёта (чистые функции) + `sleep.test.ts` |
| `src/lib/typograph.ts` | неразрывные пробелы в готовом HTML + тесты |
| `src/scripts/calculator.ts` | клиентский скрипт калькулятора, localStorage |
| `src/components/` | калькулятор, шапка, подвал, «Как это работает», FAQ, блок рекламы |
| `src/data/faq.ts` | вопросы FAQ (они же идут в JSON-LD FAQPage) |
| `src/data/time-pages.ts` | тексты 18 посадочных страниц (время подставляется из расчёта) |
| `src/data/sources.ts` | источники с DOI, на которые ссылаются тексты |
| `src/pages/` | главная, `[slug].astro` (посадочные), статьи, 404, sitemap.xml, robots.txt, manifest |
| `integrations/postbuild.mjs` | после сборки: типограф для HTML и `dist/sw.js` со списком файлов для офлайна |

## Как переехать на свой домен

1. В `site.config.mjs` поменяйте одну строку:
   ```js
   export const SITE_URL = process.env.SITE_URL || 'https://ваш-домен.ru/';
   ```
   Base path, canonical, sitemap, robots.txt, manifest и service worker пересчитаются автоматически.
2. Добавьте файл `public/CNAME` с одной строкой: `ваш-домен.ru`.
3. У регистратора домена создайте DNS-записи для GitHub Pages: четыре `A`-записи на `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (и при желании `CNAME` для `www` → `parmeyyy.github.io`).
4. В репозитории: Settings → Pages → Custom domain → `ваш-домен.ru`, включите Enforce HTTPS.
5. Запушьте — сайт соберётся уже под новый адрес.

> На GitHub Pages по подпути `/sleep-calc/` поисковики не читают `robots.txt` (он должен лежать в корне домена). После переезда на свой домен он заработает сам. До этого sitemap можно добавить вручную в Яндекс.Вебмастере и Google Search Console: `https://parmeyyy.github.io/sleep-calc/sitemap.xml`.

## Куда вставить Яндекс Метрику

В `src/layouts/Base.astro` в `<head>` есть комментарий `<!-- Яндекс Метрика: вставить счётчик сюда -->`. Вставьте туда код счётчика, обернув `<script>` в `is:inline`, чтобы Astro не пытался его бандлить:

```astro
<script is:inline>
  (function(m,e,t,r,i,k,a){ /* код из интерфейса Метрики */ })(...);
  ym(XXXXXXXX, 'init', { /* ... */ });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/XXXXXXXX" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
```

Счётчик ставит cookies — после подключения добавьте на сайт уведомление о cookies и обновите раздел «Какие данные сохраняет сайт» на странице `src/pages/o-sayte.astro` (требование 152-ФЗ).

Service worker перехватывает только запросы к своему сайту, поэтому запросы к `mc.yandex.ru` идут напрямую.

## Реклама РСЯ

Под калькулятором стоит `<AdSlot />` (`src/components/AdSlot.astro`). Пока в `site.config.mjs` `ADS.enabled = false`, блок скрыт (`display: none`) и не занимает места.

Чтобы включить:

1. В `site.config.mjs`: `enabled: true`, `blockId: 'R-A-XXXXXXX-1'`.
2. Вставьте загрузчик РСЯ в `<head>` в `Base.astro` рядом с Метрикой:
   ```astro
   <script is:inline>window.yaContextCb = window.yaContextCb || []</script>
   <script is:inline src="https://yandex.ru/ads/system/context.js" async></script>
   ```
3. В `AdSlot.astro` после контейнера добавьте вызов отрисовки:
   ```astro
   <script is:inline define:vars={{ id: ADS.blockId }}>
     window.yaContextCb.push(() => Ya.Context.AdvManager.render({ blockId: id, renderTo: 'yandex_rtb_' + id }));
   </script>
   ```

Высота блока зарезервирована (`min-height: 280px`), поэтому показ рекламы не сдвигает вёрстку. Подстройте её под реальный формат блока.

## Логика расчёта

- «Хочу встать в…»: отбой = подъём − засыпание − k × цикл, k = 6…1;
- «Ложусь в…» и «Ложусь сейчас»: подъём = отбой + засыпание + k × цикл, k = 1…6;
- 5–6 циклов — «в норме», 4 — «запасной», 1–3 — «мало»;
- в режиме «Хочу встать в…» варианты, которые к текущему моменту уже прошли, помечаются «прошло» (`bedtimeTiming`);
- засыпание 0–60 мин (по умолчанию 15), цикл 70–120 мин (по умолчанию 90), настройки сохраняются в `localStorage`.

## Тексты

Тексты вычитаны по правилам скилла [ru-text](https://github.com/talkstream/ru-text): `/ru-check` для полной вычитки, `/ru-score` для оценки. Новые тексты стоит прогонять через него же.

Это справочный расчёт, а не медицинская рекомендация.

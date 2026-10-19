// ЕДИНСТВЕННОЕ место, где задаётся адрес сайта.
// GitHub Pages:   'https://parmeyyy.github.io/sleep-calc/'
// Свой домен:     'https://example.ru/'
// Можно переопределить переменной окружения SITE_URL при сборке.
export const SITE_URL = process.env.SITE_URL || 'https://parmeyyy.github.io/sleep-calc/';

export const SITE_NAME = 'Калькулятор сна';

// Реклама РСЯ: пока false — контейнер скрыт и не занимает места.
// Чтобы включить, см. README → «Реклама РСЯ».
export const ADS = {
  enabled: false,
  blockId: '', // например 'R-A-1234567-1'
};

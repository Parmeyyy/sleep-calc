// Источники, на которые ссылаются тексты сайта. Все DOI проверены через doi.org.
export interface Source {
  id: string;
  /** Короткое имя для текста: «National Sleep Foundation (2015)». */
  short: string;
  /** Полная ссылка для списка литературы. */
  full: string;
  url?: string;
}

export const SOURCES: Record<string, Source> = {
  nsf: {
    id: 'nsf',
    short: 'National Sleep Foundation (2015)',
    full: 'Hirshkowitz M. et al. National Sleep Foundation’s sleep time duration recommendations: methodology and results summary. Sleep Health, 2015.',
    url: 'https://doi.org/10.1016/j.sleh.2014.12.010',
  },
  aasmAdults: {
    id: 'aasmAdults',
    short: 'AASM и Sleep Research Society (2015)',
    full: 'Watson N. F. et al. Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society. Sleep, 2015.',
    url: 'https://doi.org/10.5665/sleep.4716',
  },
  aasmKids: {
    id: 'aasmKids',
    short: 'AASM (2016)',
    full: 'Paruthi S. et al. Recommended Amount of Sleep for Pediatric Populations: A Consensus Statement of the American Academy of Sleep Medicine. Journal of Clinical Sleep Medicine, 2016.',
    url: 'https://doi.org/10.5664/jcsm.5866',
  },
  carskadon: {
    id: 'carskadon',
    short: 'Carskadon и Dement',
    full: 'Carskadon M. A., Dement W. C. Normal Human Sleep: An Overview. В книге: Kryger M., Roth T., Dement W. C. (ред.) Principles and Practice of Sleep Medicine, 6-е изд. Elsevier, 2017.',
  },
  aasmInsomnia: {
    id: 'aasmInsomnia',
    short: 'AASM (2021)',
    full: 'Edinger J. D. et al. Behavioral and psychological treatments for chronic insomnia disorder in adults: an American Academy of Sleep Medicine clinical practice guideline. Journal of Clinical Sleep Medicine, 2021.',
    url: 'https://doi.org/10.5664/jcsm.8986',
  },
  drake: {
    id: 'drake',
    short: 'Drake и соавторы (2013)',
    full: 'Drake C. et al. Caffeine Effects on Sleep Taken 0, 3, or 6 Hours before Going to Bed. Journal of Clinical Sleep Medicine, 2013.',
    url: 'https://doi.org/10.5664/jcsm.3170',
  },
  brooks: {
    id: 'brooks',
    short: 'Brooks и Lack (2006)',
    full: 'Brooks A., Lack L. A Brief Afternoon Nap Following Nocturnal Sleep Restriction: Which Nap Duration is Most Recuperative? Sleep, 2006.',
    url: 'https://doi.org/10.1093/sleep/29.6.831',
  },
};

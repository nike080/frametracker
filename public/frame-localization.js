import { frameNames } from './frame-names.js';

export const frameName = (frame, language = 'ru') =>
  (language === 'en' ? frame?.name : frameNames[frame?.id] ?? frame?.nameRu ?? frame?.name) ?? '';

export const normalizeSearch = value => String(value ?? '').normalize('NFKC')
  .toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim();

export function matchesFrame(frame, query) {
  const key = normalizeSearch(query);
  return [frame.name, frame.nameRu, frameNames[frame.id]].some(name => normalizeSearch(name).includes(key));
}

const collators = {
  ru: new Intl.Collator('ru-RU', { sensitivity: 'variant', numeric: true }),
  en: new Intl.Collator('en-US', { sensitivity: 'variant', numeric: true }),
};
export function compareFrames(a, b, language = 'ru') {
  return collators[language === 'en' ? 'en' : 'ru'].compare(frameName(a, language), frameName(b, language)) || a.id.localeCompare(b.id);
}

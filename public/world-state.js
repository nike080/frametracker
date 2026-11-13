export function nextReset(now = Date.now()) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}
export function countdown(expiry, now = Date.now()) {
  const end = typeof expiry === 'number' ? expiry : Date.parse(expiry);
  if (!Number.isFinite(end)) return '—';
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(v => String(v).padStart(2, '0')).join(':');
}
export function worldStateService({ fetcher = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  return async (language = 'ru') => {
    language = language === 'en' ? 'en' : 'ru';
    const previous = cache.get(language);
    if (previous && now() - Date.parse(previous.updatedAt) < 60000) return previous;
    if (pending.has(language)) return pending.get(language);
    const task = (async () => {
      try {
        const keys = ['earthCycle', 'cetusCycle', 'vallisCycle', 'cambionCycle', 'duviriCycle', 'zarimanCycle', 'sortie', 'nightwave'];
        const sections = await Promise.allSettled(keys.map(async key => {
          const response = await fetcher('https://api.warframestat.us/pc/' + key + '?language=' + language, { headers: { 'Accept-Language': language }, signal: AbortSignal.timeout(12000) });
          if (!response.ok) throw new Error('World section unavailable');
          const value = await response.json();
          if (!value || typeof value !== 'object' || Array.isArray(value) || !Number.isFinite(Date.parse(value.expiry))) throw new Error('Invalid world section');
          return value;
        }));
        const data = {}, failed = [], sectionDates = {};
        sections.forEach((result, i) => {
          const key = keys[i];
          if (result.status === 'fulfilled') { data[key] = result.value; sectionDates[key] = new Date(now()).toISOString(); }
          else { failed.push(key); if (previous?.data[key]) { data[key] = previous.data[key]; sectionDates[key] = previous.sectionDates?.[key] ?? previous.updatedAt; } }
        });
        if (failed.length === keys.length) throw new Error('World unavailable');
        const result = { data, sectionDates, failed, updatedAt: new Date(now()).toISOString(), stale: failed.length > 0 };
        cache.set(language, result);
        return result;
      } catch { return { ...previous, data: previous?.data ?? {}, stale: true, error: true }; }
    })();
    pending.set(language, task);
    try { return await task; } finally { pending.delete(language); }
  };
}

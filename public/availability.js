export const relicSource = 'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Relics.json';
export const traderSource = 'https://api.warframe.com/cdn/worldState.php';
const stamp = value => Number(value?.$date?.$numberLong);
const nodes = node => node ? [node, ...node.parts.flatMap(nodes)] : [];
const recent = (date, now, ttl) => Number.isFinite(Date.parse(date)) && now >= Date.parse(date) && now - Date.parse(date) < ttl;

export function parseRelics(input) {
  if (!Array.isArray(input)) throw new Error('Invalid relic feed');
  const rows = input.filter(row => /^(Lith|Meso|Neo|Axi) \w+ Intact$/.test(row.name));
  if (!rows.length || rows.some(row => typeof row.uniqueName !== 'string' || !Array.isArray(row.rewards) || !row.rewards.length || row.rewards.some(reward => typeof reward.item?.uniqueName !== 'string'))) throw new Error('Incomplete relic feed');
  return rows.map(row => ({ id: row.uniqueName, name: row.name.replace(/ Intact$/, ''), vaulted: typeof row.vaulted === 'boolean' ? row.vaulted : null,
    rewards: row.rewards.map(reward => reward.item.uniqueName),
    locations: [...new Set((row.locations ?? row.drops ?? []).map(drop => drop.location).filter(value => typeof value === 'string'))] }));
}
export function parseTraders(input) {
  if (!Array.isArray(input?.PrimeVaultTraders) || !input.PrimeVaultTraders.length) throw new Error('Missing Varzia feed');
  return input.PrimeVaultTraders.map(trader => {
    const start = stamp(trader.Activation), end = stamp(trader.Expiry);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Array.isArray(trader.Manifest) || !Array.isArray(trader.EvergreenManifest)) throw new Error('Invalid Varzia rotation');
    const relics = [...trader.Manifest, ...trader.EvergreenManifest].filter(item =>
      typeof item.ItemType === 'string' && item.ItemType.includes('/Projections/') && Number.isFinite(item.RegularPrice) && item.RegularPrice > 0 && !item.PrimePrice)
      .map(item => item.ItemType.replace('/StoreItems/', '/'));
    return { start, end, relics };
  });
}

export function buildAvailability(frames, snapshot, now = Date.now()) {
  const relics = snapshot.relics?.data ?? [];
  const traders = snapshot.traders?.data ?? [];
  const current = traders.filter(trader => trader.start <= now && now < trader.end);
  const resurgenceKnown = current.length > 0 && !snapshot.traders?.error && recent(snapshot.traders?.date, now, 900000);
  const resurgence = new Set(current.flatMap(trader => trader.relics));
  const unknownOffers = [...resurgence].some(id => !relics.some(relic => relic.id === id));
  const ordinaryKnown = !snapshot.relics?.error && recent(snapshot.relics?.date, now, 900000);
  const byReward = new Map();
  for (const relic of relics) for (const reward of relic.rewards) {
    if (!byReward.has(reward)) byReward.set(reward, []);
    byReward.get(reward).push(relic);
  }
  const result = {};
  for (const frame of frames.filter(frame => frame.prime && !frame.founder && frame.recipe)) {
    const parts = nodes(frame.recipe).map(node => {
      const matches = byReward.get(node.id) ?? [];
      const active = matches.filter(relic => relic.vaulted === false || resurgence.has(relic.id)).map(relic => ({
        name: relic.name, channel: relic.vaulted === false ? 'regular' : 'resurgence', locations: relic.vaulted === false ? relic.locations : [],
      }));
      // Cached positives remain visible, but are never presented as live certainty.
      const known = ordinaryKnown && resurgenceKnown && !unknownOffers;
      const status = !known ? 'unknown' : active.length ? 'available' : matches.length && matches.every(relic => relic.vaulted === true) ? 'vaulted' : 'unknown';
      return { id: node.id, status, relics: active };
    });
    const available = parts.filter(part => part.status === 'available').length;
    const status = parts.some(part => part.status === 'unknown') ? 'unknown' : available === parts.length ? 'available' : available > 0 ? 'partial' : 'vaulted';
    result[frame.id] = { status, available, total: parts.length, resurgence: parts.some(part => part.relics.some(relic => relic.channel === 'resurgence')), parts };
  }
  const relicStatus = Object.fromEntries(relics.map(relic => [relic.name, {
    status: !ordinaryKnown || !resurgenceKnown || unknownOffers ? 'unknown' : relic.vaulted === false || resurgence.has(relic.id) ? 'available' : relic.vaulted === true ? 'vaulted' : 'unknown',
    channel: resurgence.has(relic.id) ? 'resurgence' : 'regular', locations: relic.locations,
  }]));
  return { frames: result, relics: relicStatus, sources: { relics: snapshot.relics?.date ?? null, traders: snapshot.traders?.date ?? null },
    stale: !ordinaryKnown || !resurgenceKnown || unknownOffers, expiry: current.length ? new Date(Math.min(...current.map(t => t.end))).toISOString() : null };
}

export function availabilityService({ frames, initial = {}, fetcher = fetch, persist = async () => {}, clock = Date.now }) {
  let snapshot = {}, pending, lastAttempt = -Infinity;
  try {
    if (Array.isArray(initial?.relics?.data) && initial.relics.data.every(row => typeof row.id === 'string' && typeof row.name === 'string' && Array.isArray(row.rewards) && Array.isArray(row.locations))) snapshot.relics = initial.relics;
    if (Array.isArray(initial?.traders?.data) && initial.traders.data.every(row => Number.isFinite(row.start) && Number.isFinite(row.end) && Array.isArray(row.relics))) snapshot.traders = initial.traders;
  } catch { snapshot = {}; }
  return async function load(force = false) {
    const now = clock();
    const fresh = ['relics', 'traders'].every(key => snapshot[key]?.data && !snapshot[key].error && recent(snapshot[key].date, now, 300000));
    if (pending) return pending;
    if ((!force && fresh) || now - lastAttempt < 60000) return buildAvailability(frames, snapshot, now);
    lastAttempt = now;
    pending = (async () => {
      await Promise.all([['relics', relicSource, parseRelics], ['traders', traderSource, parseTraders]].map(async ([key, url, parse]) => {
        try {
          const response = await fetcher(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'FrameTracker/1.3.0' } });
          if (!response.ok) throw new Error('Upstream unavailable');
          const data = parse(await response.json());
          snapshot[key] = { data, date: new Date(clock()).toISOString() };
        } catch { snapshot[key] = { ...snapshot[key], error: true }; }
      }));
      try { await persist(snapshot); } catch { /* Online results remain usable if cache cannot be written. */ }
      return buildAvailability(frames, snapshot, clock());
    })().finally(() => { pending = undefined; });
    return pending;
  };
}

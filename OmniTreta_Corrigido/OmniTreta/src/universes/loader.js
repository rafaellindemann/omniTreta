const PREFIX = 'omnitreta:universe:';
const defaultCatalog = [{ id: 'dinotreta', name: 'DinoTreta', description: 'Arena jurássica', url: '/universes/dinotreta/universe.json' }];
export async function catalog() { try {
    const r = await fetch('/catalog.json');
    if (!r.ok)
        throw Error('Catálogo indisponível');
    const j = await r.json();
    return j.universes;
}
catch {
    return defaultCatalog;
} }
function validate(u) { if (!u || u.schemaVersion !== 1 || !Array.isArray(u.characters) || !u.id)
    throw Error('Formato de universo inválido'); for (const c of u.characters) {
    if (!c.id || !c.stats || !Array.isArray(c.abilities))
        throw Error('Personagem inválido');
} return u; }
export async function loadUniverse(entry) { const key = PREFIX + entry.id; try {
    const r = await fetch(entry.url);
    if (!r.ok)
        throw Error('Falha no download');
    const u = validate(await r.json());
    const base = new URL(entry.url, location.href);
    u.characters = u.characters.map(c => ({ ...c, image: c.image ? new URL(c.image, base).href : null }));
    try {
        localStorage.setItem(key, JSON.stringify(u));
    }
    catch { }
    if ('caches' in window) {
        const cache = await caches.open('omnitreta-v1');
        await Promise.allSettled(u.characters.filter(c => c.image).map(c => cache.add(c.image)));
    }
    return { universe: u, offline: false };
}
catch (err) {
    const cached = localStorage.getItem(key);
    if (cached)
        return { universe: validate(JSON.parse(cached)), offline: true };
    throw err;
} }
export function cacheStatus(id) { return !!localStorage.getItem(PREFIX + id); }


import { EFFECTS } from './catalog.js';
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const copy = x => structuredClone(x);
const active = (s, team) => s.units.filter(u => u.team === team && u.hp > 0);
const status = (u, id) => u.status.find(e => e.id === id);
const remove = (u, id) => { u.status = u.status.filter(e => e.id !== id); };
const add = (u, id, power, duration) => {
    const old = status(u, id);
    if (old) {
        old.duration = Math.max(old.duration, duration);
        old.power = id === 'poison' ? Math.min(3, old.power + 1) : Math.max(old.power, power);
    }
    else
        u.status.push({ id, power: id === 'poison' ? 1 : power, duration });
};
const initiative = (u, s) => u.stats.initiative - u.status.filter(e => ['slow', 'freeze'].includes(e.id)).reduce((a, e) => a + e.power, 0) - (s.delays[u.uid] || 0);
const log = (s, msg) => { s.logs = [msg, ...s.logs].slice(0, 80); };
export function createBattle(universe, teams, settings = {}) {
    const chars = new Map(universe.characters.map(c => [c.id, c]));
    const units = teams.flatMap((ids, team) => ids.map((id, slot) => { const c = chars.get(id); if (!c)
        throw Error('Personagem desconhecido: ' + id); return { ...copy(c), uid: `${team}:${slot}`, team, slot, hp: c.stats.hp, status: [], cooldowns: {} }; }));
    const s = { units, round: 1, acted: [], delays: {}, turn: null, winner: null, logs: [], settings: { turnSeconds: settings.turnSeconds ?? 25 } };
    log(s, '⚔️ A batalha começou!');
    return nextTurn(s);
}
function tick(s, u) {
    for (const e of [...u.status]) {
        if (['bleed', 'poison', 'burn'].includes(e.id)) {
            const damage = e.id === 'poison' ? e.power * 4 : e.power;
            u.hp = Math.max(0, u.hp - damage);
            log(s, `${EFFECTS[e.id].icon} ${u.name} sofre ${damage} de ${EFFECTS[e.id].name.toLowerCase()}.`);
        }
        // Effects last for the given number of owner's turns; delay is round-scoped instead.
        e.duration--;
        if (e.duration <= 0)
            remove(u, e.id);
    }
    for (const id in u.cooldowns)
        u.cooldowns[id] = Math.max(0, u.cooldowns[id] - 1);
}
function winner(s) { const a = active(s, 0).length, b = active(s, 1).length; return a && b ? null : a ? 0 : b ? 1 : -1; }
export function nextTurn(input) {
    const s = copy(input);
    if (s.winner !== null)
        return s;
    while (true) {
        const win = winner(s);
        if (win !== null) {
            s.winner = win;
            s.turn = null;
            log(s, win < 0 ? '🤝 Empate!' : `🏆 Equipe ${win + 1} venceu!`);
            return s;
        }
        const remaining = s.units.filter(u => u.hp > 0 && !s.acted.includes(u.uid)).sort((a, b) => initiative(b, s) - initiative(a, s) || a.team - b.team || a.slot - b.slot);
        if (!remaining.length) {
            s.round++;
            s.acted = [];
            s.delays = {};
            log(s, `↗️ Rodada ${s.round}`);
            continue;
        }
        const u = remaining[0];
        s.acted.push(u.uid);
        tick(s, u);
        if (u.hp === 0) {
            log(s, `☠️ ${u.name} caiu antes de agir.`);
            continue;
        }
        s.turn = u.uid;
        return s;
    }
}
function targets(s, actor, effect, selected) {
    const team = actor.team;
    if (effect.target === 'self')
        return [actor];
    if (effect.target === 'all_enemies')
        return active(s, 1 - team);
    if (effect.target === 'pending_enemies')
        return active(s, 1 - team).filter(u => !s.acted.includes(u.uid));
    if (effect.target === 'all_allies')
        return active(s, team);
    if (effect.target === 'ally')
        return active(s, team).filter(u => u.uid === selected);
    return active(s, 1 - team).filter(u => u.uid === selected);
}
export function legalTargets(s, ability) {
    const actor = s.units.find(u => u.uid === s.turn);
    if (!actor)
        return [];
    if (ability.effects.some(e => e.target === 'enemy'))
        return active(s, 1 - actor.team).map(u => u.uid);
    return [];
}
export function resolveAction(input, abilityId, targetUid, rng = Math.random) {
    const s = copy(input);
    if (s.winner !== null)
        throw Error('Partida encerrada');
    const a = s.units.find(u => u.uid === s.turn);
    if (!a)
        throw Error('Sem turno');
    const ability = a.abilities.find(x => x.id === abilityId);
    if (!ability)
        throw Error('Habilidade inválida');
    if (a.cooldowns[ability.id] > 0)
        throw Error('Habilidade em recarga');
    const legal = legalTargets(s, ability);
    if (legal.length && !legal.includes(targetUid))
        throw Error('Alvo inválido');
    let hitAny = false;
    for (const e of ability.effects) {
        const ts = targets(s, a, e, targetUid);
        if (!ts.length)
            continue;
        for (const t of ts) {
            if (t.hp <= 0)
                continue;
            if (e.id === 'damage') {
                const dodged = rng() < clamp(t.stats.dodge + (status(t, 'evasion')?.power || 0) * .2, 0, .72);
                const crit = rng() < clamp(a.stats.critical + (status(a, 'critical_boost')?.power || 0) * .15, 0, .85);
                const pierce = status(a, 'pierce') ? 0.4 : 1;
                const armor = Math.max(0, t.stats.armor + (status(t, 'armor_up')?.power || 0) * 5 - (status(t, 'burn') ? 3 : 0));
                let damage = dodged ? 0 : Math.max(1, Math.round((a.stats.attack * e.power / (e.distribution === 'split' ? ts.length : 1)) * (crit ? 1.5 : 1) * (status(a, 'weaken') ? .75 : 1) - armor * .55 * pierce));
                t.hp = Math.max(0, t.hp - damage);
                hitAny = hitAny || damage > 0;
                log(s, `${a.name} usa ${ability.name} em ${t.name}: ${dodged ? 'ESQUIVOU!' : damage + ' dano' + (crit ? ' 💥 crítico!' : '')}`);
                const thorns = status(t, 'thorns');
                if (damage && thorns) {
                    a.hp = Math.max(0, a.hp - 6);
                    log(s, `🌵 ${a.name} recebe 6 de retaliação.`);
                }
            }
            else if (e.id === 'heal') {
                const healed = Math.min(t.stats.hp - t.hp, e.power || 12);
                t.hp += healed;
                log(s, `💚 ${t.name} recupera ${healed} de vida.`);
            }
            else if (e.id === 'delay') {
                if (!s.acted.includes(t.uid)) {
                    s.delays[t.uid] = (s.delays[t.uid] || 0) + (e.power || 8);
                    log(s, `⏳ ${t.name} sofre atraso nesta rodada.`);
                }
            }
            else {
                // Interactions are centralized and work for any universe or character.
                if (e.id === 'burn' && status(t, 'freeze')) {
                    remove(t, 'freeze');
                    log(s, `🔥 ${t.name}: fogo derrete o gelo!`);
                }
                if (e.id === 'freeze' && status(t, 'burn')) {
                    remove(t, 'burn');
                    log(s, `❄️ ${t.name}: gelo apaga as chamas!`);
                }
                if (e.id === 'burn' && status(t, 'poison')) {
                    const p = status(t, 'poison');
                    p.power--;
                    t.hp = Math.max(0, t.hp - 6);
                    if (p.power <= 0)
                        remove(t, 'poison');
                    log(s, `💥 ${t.name}: combustão tóxica causa 6 de dano!`);
                }
                add(t, e.id, e.power ?? 1, e.duration ?? 2);
                log(s, `${EFFECTS[e.id]?.icon || '✨'} ${t.name}: ${EFFECTS[e.id]?.name || e.id}.`);
            }
        }
    }
    a.cooldowns[ability.id] = (ability.cooldown || 0) + 1;
    return nextTurn(s);
}
export function autoAction(s, rng = Math.random) {
    const a = s.units.find(u => u.uid === s.turn);
    if (!a)
        return s;
    const basic = a.abilities.find(x => x.effects.some(e => e.id === 'damage') && (!a.cooldowns[x.id] || a.cooldowns[x.id] <= 0)) || a.abilities.find(x => !a.cooldowns[x.id]);
    if (!basic)
        return nextTurn(s);
    const targets = legalTargets(s, basic);
    const target = targets.length ? targets[Math.floor(rng() * targets.length)] : null;
    return resolveAction(s, basic.id, target, rng);
}
export function getTurnOrder(s) { return s.units.filter(u => u.hp > 0 && !s.acted.includes(u.uid)).sort((a, b) => initiative(b, s) - initiative(a, s) || a.team - b.team || a.slot - b.slot); }


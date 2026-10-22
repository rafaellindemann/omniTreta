import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { catalog, loadUniverse, cacheStatus } from './universes/loader.js';
import { EFFECTS, INTERACTIONS } from './engine/catalog.js';
import { createBattle, resolveAction, autoAction, legalTargets, getTurnOrder } from './engine/combat.js';
import './style.css';
import BattleArena from './components/BattleArena.jsx';
function Art({ c }) { const [bad, setBad] = useState(false); useEffect(() => setBad(false), [c.image]); return <div className="art">{c.image && !bad ? <img src={c.image} onError={() => setBad(true)} alt={c.name}/> : <span>{c.emoji || '🦖'}</span>}</div>; }
function App() {
    const actionLock = useRef(false), sequenceTimers = useRef([]);
    const nav = useNavigate(), location = useLocation(), id = location.pathname.match(/^\/u\/([^/]+)\/?$/)?.[1], [list, setList] = useState([]), [universe, setUniverse] = useState(null), [error, setError] = useState(''), [offline, setOffline] = useState(false), [page, setPage] = useState('select'), [mode, setMode] = useState('pve'), [size, setSize] = useState(3), [seconds, setSeconds] = useState(25), [left, setLeft] = useState(25), [teams, setTeams] = useState([[], []]), [battle, setBattle] = useState(null), [move, setMove] = useState(null), [guide, setGuide] = useState(null), [loading, setLoading] = useState(false), [presentation, setPresentation] = useState(null), [teamNames, setTeamNames] = useState(['Equipe 1', 'Equipe 2']);
    const [timerPreferences, setTimerPreferences] = useState(() => { try {
        return JSON.parse(localStorage.getItem('omnitreta:timers:v1') || '{}');
    }
    catch {
        return {};
    } });
    const clearSequence = () => { sequenceTimers.current.forEach(clearTimeout); sequenceTimers.current = []; actionLock.current = false; setPresentation(null); };
    useEffect(() => () => sequenceTimers.current.forEach(clearTimeout), []);
    const updateSeconds = value => { setSeconds(value); const next = { ...timerPreferences, [size]: value }; setTimerPreferences(next); localStorage.setItem('omnitreta:timers:v1', JSON.stringify(next)); };
    useEffect(() => { catalog().then(setList); }, []);
    useEffect(() => { setSeconds(timerPreferences[size] ?? 25); }, [size]);
    useEffect(() => {
        if (!id) {
            setUniverse(null);
            setPage('select');
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError('');
        const entry = list.find(e => e.id === id) || { id, url: `/universes/${id}/universe.json` };
        loadUniverse(entry).then(({ universe, offline }) => {
            if (!cancelled) {
                setUniverse(universe);
                setOffline(offline);
                setPage('select');
                setTeams([[], []]);
                setBattle(null);
            }
        }).catch(e => !cancelled && setError(e.message)).finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [id, list]);
    const actor = battle?.units.find(u => u.uid === battle.turn), winner = battle?.winner;
    const aiTurn = mode === 'pve' && actor?.team === 1;
    useEffect(() => {
        if (!battle || winner !== null || !actor)
            return;
        setLeft(seconds);
        setMove(null);
    }, [battle?.turn, battle?.round, !!battle?.winner, seconds]);
    useEffect(() => {
        if (!battle || winner !== null || !actor || seconds === 0 || presentation)
            return;
        const timer = setInterval(() => setLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(timer);
    }, [battle?.turn, battle?.round, !!battle?.winner]);
    // Preview first, commit damage only after both announcement phases.
    function performAction(abilityId, targetUid, automatic = false) {
        if (!battle || battle.winner !== null || actionLock.current)
            return;
        try {
            const source = battle.units.find(u => u.uid === battle.turn);
            const ability = source?.abilities.find(a => a.id === abilityId);
            if (!source || !ability)
                return;
            const result = resolveAction(battle, abilityId, targetUid);
            const changes = result.units.filter((u, i) => {
                const old = battle.units[i];
                return u.hp !== old.hp || JSON.stringify(u.status) !== JSON.stringify(old.status);
            }).map(u => {
                const old = battle.units.find(x => x.uid === u.uid);
                const difference = u.hp - old.hp;
                const effects = u.status.filter(e => !old.status.some(o => o.id === e.id && o.power === e.power && o.duration === e.duration)).map(e => EFFECTS[e.id]?.icon || '✦');
                return { uid: u.uid, name: u.name, difference, effects };
            });
            actionLock.current = true;
            setMove(null);
            setPresentation({ phase: 'attack', actor: source.name, ability: ability.name, changes, automatic });
            sequenceTimers.current.push(setTimeout(() => setPresentation({ phase: 'impact', actor: source.name, ability: ability.name, changes, automatic }), 950));
            sequenceTimers.current.push(setTimeout(() => {
                setBattle(result);
                setPresentation(null);
                actionLock.current = false;
                sequenceTimers.current = [];
            }, 2300));
        }
        catch (e) {
            actionLock.current = false;
            setError(e.message);
        }
    }
    useEffect(() => {
        if (!battle || winner !== null || !actor || actionLock.current || presentation)
            return;
        if (!aiTurn && (seconds === 0 || left > 0))
            return;
        const timer = setTimeout(() => {
            const a = battle.units.find(u => u.uid === battle.turn);
            const available = a?.abilities.filter(x => !(a.cooldowns[x.id] > 0)) || [];
            const basic = available.find(x => x.effects.some(e => e.id === 'damage')) || available[0];
            if (!basic)
                return;
            const chosen = aiTurn && available.length > 1 && Math.random() < 0.72
                ? available[Math.floor(Math.random() * available.length)] : basic;
            const targets = legalTargets(battle, chosen);
            performAction(chosen.id, targets.length ? targets[Math.floor(Math.random() * targets.length)] : null, true);
        }, aiTurn ? 750 : 0);
        return () => clearTimeout(timer);
    }, [left, aiTurn, battle?.turn, battle?.round, !!battle?.winner, seconds, presentation]);
    const selectedCount = teams[0].length;
    const selectingTeam = mode === 'pvp' && teams[0].length === size ? 1 : 0;
    function toggle(id) {
        setTeams(old => {
            const t = old.map(a => [...a]);
            const own = t[selectingTeam];
            if (own.includes(id))
                t[selectingTeam] = own.filter(x => x !== id);
            else if (own.length < size)
                own.push(id);
            return t;
        });
    }
    function begin() {
        if (teams[0].length !== size || (mode === 'pvp' && teams[1].length !== size))
            return;
        const pool = universe.characters.map(c => c.id).filter(id => !teams[0].includes(id));
        const enemy = mode === 'pve' ? pool.sort(() => Math.random() - .5).slice(0, size) : teams[1];
        if (enemy.length !== size) {
            setError('Este universo não possui personagens suficientes para esse tamanho de equipe.');
            return;
        }
        clearSequence();
        setBattle(createBattle(universe, [teams[0], enemy], { turnSeconds: seconds }));
        setPage('battle');
    }
    function act(ability, target) { if (ability && !actionLock.current)
        performAction(ability.id, target); }
    function selectAbility(ability) {
        const ts = legalTargets(battle, ability);
        if (ts.length === 0)
            act(ability, null);
        else
            setMove(ability);
    }
    const actionTargets = move && battle ? legalTargets(battle, move) : [];
    const allChars = universe?.characters || [];
    return <><header><button className="logo" onClick={() => nav('/')}>◈ OMNI<span>TRETA</span></button><span className="strap">UM MOTOR · INFINITOS UNIVERSOS · MUITA TRETA</span><nav>{universe && <><button onClick={() => setPage('select')}>⚔ Arena</button><button onClick={() => setPage('guide')}>📖 Guia</button></>}</nav></header><div className={`wrap ${page === "battle" && battle ? "battle-page" : ""}`}>{!id ? <><section className="hero"><p className="eyebrow">ESCOLHA SUA ARENA</p><h1>Qual é a sua <em>treta?</em></h1><p>Selecione um universo para jogar. Os dados são armazenados localmente após o primeiro carregamento.</p></section><div className="universe-grid">{list.map(x => <button className="universe-card" key={x.id} onClick={() => nav('/u/' + x.id)}><div className="big-emoji">🦖</div><h2>{x.name}</h2><p>{x.description}</p><small>{cacheStatus(x.id) ? '✓ Dados disponíveis offline' : '↓ Carregar universo'}</small></button>)}</div></> : loading ? <div className="notice">Carregando universo…</div> : universe ? <>{page !== "battle" && <section className="hero compact"><p className="eyebrow">UNIVERSO {universe.version} {offline ? '· CACHE LOCAL' : ''}</p><h1>{universe.name}<em>!</em></h1><p>{universe.description} · {allChars.length} personagens</p></section>}{page === 'guide' ? <><div className="section-heading"><h2>📖 Guia do universo</h2><button onClick={() => setPage('select')}>← Voltar à seleção</button></div><p className="muted">Consulte atributos, habilidades e efeitos antes de escolher sua equipe.</p><div className="guide-grid">{allChars.map(c => <article className="guide-card" key={c.id}><Art c={c}/><div className="guide-body"><p className="eyebrow">{c.type}</p><h3>{c.name}</h3><p>{c.description}</p><div className="statline">♥ {c.stats.hp} · ⚔ {c.stats.attack} · ↗ {c.stats.initiative} · 🛡 {c.stats.armor} · 💨 {Math.round(c.stats.dodge * 100)}% · 🎯 {Math.round(c.stats.critical * 100)}%</div>{c.abilities.map(a => <div className="ability-info" key={a.id}><strong>{a.name}</strong><small>Recarga: {a.cooldown} · {a.description}</small><div className="chips">{a.effects.map((e, i) => <span key={i} title={EFFECTS[e.id]?.description}>{EFFECTS[e.id]?.icon} {EFFECTS[e.id]?.name || e.id}</span>)}</div></div>)}</div></article>)}</div><h2>📚 Enciclopédia de efeitos</h2><div className="effect-grid">{Object.entries(EFFECTS).map(([id, e]) => <div className="effect-card" key={id}><b>{e.icon} {e.name}</b><p>{e.description}</p><code>{id}</code></div>)}</div><h2>⚗️ Interações elementais</h2><div className="effect-grid">{INTERACTIONS.map((e, i) => <div className="effect-card" key={i}>{e.description}</div>)}</div></> : page === 'battle' && battle ? <><div className="section-heading"><h2>⚔ Rodada {battle.round}</h2><button onClick={() => { clearSequence(); setBattle(null); setPage('select'); }}>↩ Nova partida</button></div><div className="battle-meta"><div><b>{winner !== null ? '🏆 Partida encerrada' : `Vez de ${actor?.name}`}</b><p>{winner !== null ? (winner === -1 ? 'Empate!' : `${teamNames[winner]} venceu!`) : `${teamNames[actor?.team] || "Equipe"} · ${aiTurn ? 'IA escolhendo…' : 'Escolha uma habilidade'}`}</p></div>{winner === null && seconds > 0 && <div className="timer" aria-live="polite">⏱ {left}s<div className="timer-track"><div style={{ width: (left / seconds * 100) + '%' }}/></div></div>}</div><BattleArena teamNames={teamNames} presentation={presentation} onReplay={() => { clearSequence(); setBattle(null); setPage("select"); }} battle={battle} actor={actor} aiTurn={aiTurn} winner={winner} selectedAbility={move} onAbility={presentation ? () => { } : selectAbility} onTarget={(uid) => { if (!presentation)
        act(move, uid); }} onCancel={() => setMove(null)}/><details className="order"><summary>↗ Próximas ações</summary><div className="chips">{getTurnOrder(battle).map(u => <span key={u.uid}>{u.team === 0 ? '🟢' : '🟠'} {u.name}</span>)}</div></details><div className="arena-bottom"><details className="panel"><summary>📜 Diário da batalha</summary><div className="logs">{battle.logs.map((x, i) => <p key={i}>{x}</p>)}</div></details></div></> : <><div className="config"><div><label>Nomes das equipes</label><div className="team-name-inputs"><input maxLength="24" aria-label="Nome da equipe 1" value={teamNames[0]} onChange={e => setTeamNames(n => [e.target.value, n[1]])}/><input maxLength="24" aria-label="Nome da equipe 2" value={teamNames[1]} onChange={e => setTeamNames(n => [n[0], e.target.value])}/></div></div><div><label>Modo</label><div className="buttons"><button className={mode === 'pve' ? 'active' : ''} onClick={() => { setMode('pve'); setTeams([[], []]); }}>🤖 Contra IA</button><button className={mode === 'pvp' ? 'active' : ''} onClick={() => { setMode('pvp'); setTeams([[], []]); }}>👥 PvP local</button></div></div><div><label>Dinossauros por equipe: {size} × {size}</label><input type="range" min="1" max={Math.min(6, Math.floor(allChars.length / 2))} value={size} onChange={e => { setSize(Number(e.target.value)); setTeams([[], []]); }}/></div><div><label>Tempo por jogada</label><select value={seconds} onChange={e => updateSeconds(Number(e.target.value))}><option value="0">♾ Tempo livre</option><option value="10">10 segundos</option><option value="15">15 segundos</option><option value="25">25 segundos</option><option value="40">40 segundos</option><option value="60">60 segundos</option></select></div></div><div className="section-heading"><div><h2>{mode === 'pvp' ? `Equipe ${selectingTeam + 1}` : 'Monte sua equipe'} · {teams[selectingTeam].length}/{size}</h2><p className="muted">Clique no personagem para escalar. Use o guia para comparar habilidades.</p></div><button onClick={() => setPage('guide')}>📖 Ver guia completo</button></div><div className="roster">{allChars.map(c => <button key={c.id} className={'character ' + (teams[selectingTeam].includes(c.id) ? 'selected' : '')} onClick={() => toggle(c.id)}><Art c={c}/><p className="eyebrow">{c.type}</p><h3>{c.name}</h3><p>{c.description}</p><div className="statline">♥ {c.stats.hp} · ⚔ {c.stats.attack} · ↗ {c.stats.initiative}</div><div className="chips">{c.abilities.slice(1).flatMap(a => a.effects.filter(e => e.id !== 'damage')).slice(0, 3).map((e, i) => <span key={i}>{EFFECTS[e.id]?.icon} {EFFECTS[e.id]?.name}</span>)}</div></button>)}</div><div className="startbar"><span>🟢 {teams[0].length}/{size} {mode === 'pvp' && `· 🟠 ${teams[1].length}/${size}`}</span><button className="primary" disabled={teams[0].length !== size || (mode === 'pvp' && teams[1].length !== size)} onClick={begin}>INICIAR BATALHA ↗</button></div></>}</> : <div className="notice">{error || 'Universo não encontrado.'} <button onClick={() => nav('/')}>Voltar ao catálogo</button></div>}{error && universe && <div className="toast" role="alert" onClick={() => setError('')}>{error} ✕</div>}</div><footer>OMNITRETA · MVP local · Motor de combate em JavaScript · Universos JSON</footer></>;
}
if (import.meta.env.PROD && 'serviceWorker' in navigator)
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { }));
createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);


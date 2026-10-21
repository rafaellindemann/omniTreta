import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { catalog, loadUniverse, cacheStatus } from './universes/loader.js';
import { EFFECTS, INTERACTIONS } from './engine/catalog.js';
import { createBattle, resolveAction, autoAction, legalTargets, getTurnOrder } from './engine/combat.js';
import './style.css';
function Art({ c }) { const [bad, setBad] = useState(false); useEffect(() => setBad(false), [c.image]); return <div className="art">{c.image && !bad ? <img src={c.image} onError={() => setBad(true)} alt={c.name}/> : <span>{c.emoji || '🦖'}</span>}</div>; }
function App() {
    const nav = useNavigate(), location = useLocation(), id = location.pathname.match(/^\/u\/([^/]+)\/?$/)?.[1], [list, setList] = useState([]), [universe, setUniverse] = useState(null), [error, setError] = useState(''), [offline, setOffline] = useState(false), [page, setPage] = useState('select'), [mode, setMode] = useState('pve'), [size, setSize] = useState(3), [seconds, setSeconds] = useState(25), [left, setLeft] = useState(25), [teams, setTeams] = useState([[], []]), [battle, setBattle] = useState(null), [move, setMove] = useState(null), [guide, setGuide] = useState(null), [loading, setLoading] = useState(false);
    useEffect(() => { catalog().then(setList); }, []);
    useEffect(() => { if (!id) {
        setUniverse(null);
        setPage('select');
        return;
    } let cancelled = false; setLoading(true); setError(''); const entry = list.find(e => e.id === id) || { id, url: `/universes/${id}/universe.json` }; loadUniverse(entry).then(({ universe, offline }) => { if (!cancelled) {
        setUniverse(universe);
        setOffline(offline);
        setPage('select');
        setTeams([[], []]);
        setBattle(null);
    } }).catch(e => !cancelled && setError(e.message)).finally(() => !cancelled && setLoading(false)); return () => { cancelled = true; }; }, [id, list]);
    const actor = battle?.units.find(u => u.uid === battle.turn), winner = battle?.winner;
    const aiTurn = mode === 'pve' && actor?.team === 1;
    useEffect(() => { if (!battle || winner !== null || !actor)
        return; setLeft(seconds); setMove(null); }, [battle?.turn, battle?.round, !!battle?.winner, seconds]);
    useEffect(() => { if (!battle || winner !== null || !actor)
        return; const timer = setInterval(() => setLeft(t => Math.max(0, t - 1)), 1000); return () => clearInterval(timer); }, [battle?.turn, battle?.round, !!battle?.winner]);
    useEffect(() => { if (!battle || winner !== null || !actor)
        return; if (left > 0 && !aiTurn)
        return; const timer = setTimeout(() => { setBattle(prev => { if (!prev || prev.winner !== null || prev.turn !== actor.uid)
        return prev; return autoAction(prev); }); }, aiTurn ? 650 : 0); return () => clearTimeout(timer); }, [left, aiTurn, battle?.turn, battle?.round, !!battle?.winner]);
    const selectedCount = teams[0].length;
    const selectingTeam = mode === 'pvp' && teams[0].length === size ? 1 : 0;
    function toggle(id) { setTeams(old => { const t = old.map(a => [...a]); const own = t[selectingTeam]; if (own.includes(id))
        t[selectingTeam] = own.filter(x => x !== id);
    else if (own.length < size)
        own.push(id); return t; }); }
    function begin() { if (teams[0].length !== size || (mode === 'pvp' && teams[1].length !== size))
        return; const pool = universe.characters.map(c => c.id).filter(id => !teams[0].includes(id)); const enemy = mode === 'pve' ? pool.sort(() => Math.random() - .5).slice(0, size) : teams[1]; if (enemy.length !== size) {
        setError('Este universo não possui personagens suficientes para esse tamanho de equipe.');
        return;
    } setBattle(createBattle(universe, [teams[0], enemy], { turnSeconds: seconds })); setPage('battle'); }
    function act(ability, target) { try {
        setBattle(prev => resolveAction(prev, ability.id, target));
        setMove(null);
    }
    catch (e) {
        setError(e.message);
    } }
    function selectAbility(ability) { const ts = legalTargets(battle, ability); if (ts.length === 0)
        act(ability, null);
    else
        setMove(ability); }
    const actionTargets = move && battle ? legalTargets(battle, move) : [];
    const allChars = universe?.characters || [];
    return <><header><button className="logo" onClick={() => nav('/')}>◈ OMNI<span>TRETA</span></button><span className="strap">UM MOTOR · INFINITOS UNIVERSOS · MUITA TRETA</span><nav>{universe && <><button onClick={() => setPage('select')}>⚔ Arena</button><button onClick={() => setPage('guide')}>📖 Guia</button></>}</nav></header><div className="wrap">{!id ? <><section className="hero"><p className="eyebrow">ESCOLHA SUA ARENA</p><h1>Qual é a sua <em>treta?</em></h1><p>Selecione um universo para jogar. Os dados são armazenados localmente após o primeiro carregamento.</p></section><div className="universe-grid">{list.map(x => <button className="universe-card" key={x.id} onClick={() => nav('/u/' + x.id)}><div className="big-emoji">🦖</div><h2>{x.name}</h2><p>{x.description}</p><small>{cacheStatus(x.id) ? '✓ Dados disponíveis offline' : '↓ Carregar universo'}</small></button>)}</div></> : loading ? <div className="notice">Carregando universo…</div> : universe ? <><section className="hero compact"><p className="eyebrow">UNIVERSO {universe.version} {offline ? '· CACHE LOCAL' : ''}</p><h1>{universe.name}<em>!</em></h1><p>{universe.description} · {allChars.length} personagens</p></section>{page === 'guide' ? <><div className="section-heading"><h2>📖 Guia do universo</h2><button onClick={() => setPage('select')}>← Voltar à seleção</button></div><p className="muted">Consulte atributos, habilidades e efeitos antes de escolher sua equipe.</p><div className="guide-grid">{allChars.map(c => <article className="guide-card" key={c.id}><Art c={c}/><div className="guide-body"><p className="eyebrow">{c.type}</p><h3>{c.name}</h3><p>{c.description}</p><div className="statline">♥ {c.stats.hp} · ⚔ {c.stats.attack} · ↗ {c.stats.initiative} · 🛡 {c.stats.armor} · 💨 {Math.round(c.stats.dodge * 100)}% · 🎯 {Math.round(c.stats.critical * 100)}%</div>{c.abilities.map(a => <div className="ability-info" key={a.id}><strong>{a.name}</strong><small>Recarga: {a.cooldown} · {a.description}</small><div className="chips">{a.effects.map((e, i) => <span key={i} title={EFFECTS[e.id]?.description}>{EFFECTS[e.id]?.icon} {EFFECTS[e.id]?.name || e.id}</span>)}</div></div>)}</div></article>)}</div><h2>📚 Enciclopédia de efeitos</h2><div className="effect-grid">{Object.entries(EFFECTS).map(([id, e]) => <div className="effect-card" key={id}><b>{e.icon} {e.name}</b><p>{e.description}</p><code>{id}</code></div>)}</div><h2>⚗️ Interações elementais</h2><div className="effect-grid">{INTERACTIONS.map((e, i) => <div className="effect-card" key={i}>{e.description}</div>)}</div></> : page === 'battle' && battle ? <><div className="section-heading"><h2>⚔ Rodada {battle.round}</h2><button onClick={() => { setBattle(null); setPage('select'); }}>↩ Nova partida</button></div><div className="battle-meta"><div><b>{winner !== null ? '🏆 Partida encerrada' : `Vez de ${actor?.name}`}</b><p>{winner !== null ? (winner === -1 ? 'Empate!' : `Equipe ${winner + 1} venceu!`) : `Equipe ${actor?.team + 1} · ${aiTurn ? 'IA escolhendo…' : 'Escolha uma habilidade'}`}</p></div>{winner === null && <div className="timer" aria-live="polite">⏱ {left}s<div className="timer-track"><div style={{ width: (left / seconds * 100) + '%' }}/></div></div>}</div><div className="battle-teams">{[0, 1].map(team => <section key={team}><h3>{team === 0 ? '🟢' : '🟠'} Equipe {team + 1}</h3><div className="unit-grid">{battle.units.filter(u => u.team === team).map(u => <button key={u.uid} disabled={!actionTargets.includes(u.uid) || aiTurn} className={'unit ' + (u.hp === 0 ? 'dead ' : '') + (u.uid === battle.turn ? 'current ' : '') + (actionTargets.includes(u.uid) ? 'target ' : '')} onClick={() => act(move, u.uid)}><Art c={u}/><b>{u.name}</b><div className="hp">♥ {u.hp}/{u.stats.hp}<div><span style={{ width: u.hp / u.stats.hp * 100 + '%' }}/></div></div><div className="chips">{u.status.map((e, i) => <span key={i} title={EFFECTS[e.id]?.description}>{EFFECTS[e.id]?.icon} {e.duration}</span>)}</div></button>)}</div></section>)}</div><div className="order"><strong>↗ Próximas ações</strong><div className="chips">{getTurnOrder(battle).map(u => <span key={u.uid}>{u.team === 0 ? '🟢' : '🟠'} {u.name}</span>)}</div></div><div className="bottom"><section className="panel"><h3>{move ? '🎯 Selecione um inimigo destacado' : 'Habilidades disponíveis'}</h3>{!aiTurn && winner === null && actor?.abilities.map(a => <button className={'skill ' + (move?.id === a.id ? 'chosen' : '')} disabled={!!actor.cooldowns[a.id]} onClick={() => selectAbility(a)} key={a.id}><b>{a.name}</b><span>{a.description}</span><small>{actor.cooldowns[a.id] ? `Recarga: ${actor.cooldowns[a.id]} turno(s)` : `Disponível · recarga ${a.cooldown}`}</small></button>)}{move && <button onClick={() => setMove(null)}>Cancelar alvo</button>}{winner !== null && <button className="primary" onClick={() => { setBattle(null); setPage('select'); }}>Jogar novamente</button>}</section><section className="panel"><h3>📜 Diário da batalha</h3><div className="logs">{battle.logs.map((x, i) => <p key={i}>{x}</p>)}</div></section></div></> : <><div className="config"><div><label>Modo</label><div className="buttons"><button className={mode === 'pve' ? 'active' : ''} onClick={() => { setMode('pve'); setTeams([[], []]); }}>🤖 Contra IA</button><button className={mode === 'pvp' ? 'active' : ''} onClick={() => { setMode('pvp'); setTeams([[], []]); }}>👥 PvP local</button></div></div><div><label>Dinossauros por equipe: {size} × {size}</label><input type="range" min="1" max={Math.min(6, Math.floor(allChars.length / 2))} value={size} onChange={e => { setSize(Number(e.target.value)); setTeams([[], []]); }}/></div><div><label>Tempo por jogada</label><select value={seconds} onChange={e => setSeconds(Number(e.target.value))}><option value="10">10 segundos</option><option value="15">15 segundos</option><option value="25">25 segundos</option><option value="40">40 segundos</option><option value="60">60 segundos</option></select></div></div><div className="section-heading"><div><h2>{mode === 'pvp' ? `Equipe ${selectingTeam + 1}` : 'Monte sua equipe'} · {teams[selectingTeam].length}/{size}</h2><p className="muted">Clique no personagem para escalar. Use o guia para comparar habilidades.</p></div><button onClick={() => setPage('guide')}>📖 Ver guia completo</button></div><div className="roster">{allChars.map(c => <button key={c.id} className={'character ' + (teams[selectingTeam].includes(c.id) ? 'selected' : '')} onClick={() => toggle(c.id)}><Art c={c}/><p className="eyebrow">{c.type}</p><h3>{c.name}</h3><p>{c.description}</p><div className="statline">♥ {c.stats.hp} · ⚔ {c.stats.attack} · ↗ {c.stats.initiative}</div><div className="chips">{c.abilities.slice(1).flatMap(a => a.effects.filter(e => e.id !== 'damage')).slice(0, 3).map((e, i) => <span key={i}>{EFFECTS[e.id]?.icon} {EFFECTS[e.id]?.name}</span>)}</div></button>)}</div><div className="startbar"><span>🟢 {teams[0].length}/{size} {mode === 'pvp' && `· 🟠 ${teams[1].length}/${size}`}</span><button className="primary" disabled={teams[0].length !== size || (mode === 'pvp' && teams[1].length !== size)} onClick={begin}>INICIAR BATALHA ↗</button></div></>}</> : <div className="notice">{error || 'Universo não encontrado.'} <button onClick={() => nav('/')}>Voltar ao catálogo</button></div>}{error && universe && <div className="toast" role="alert" onClick={() => setError('')}>{error} ✕</div>}</div><footer>OMNITRETA · MVP local · Motor de combate em JavaScript · Universos JSON</footer></>;
}
if (import.meta.env.PROD && 'serviceWorker' in navigator)
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { }));
createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);


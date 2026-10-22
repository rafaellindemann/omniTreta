import React from 'react';
import { EFFECTS } from '../engine/catalog.js';
import { legalTargets } from '../engine/combat.js';

const ICONS = ['⚔️', '✦', '💥', '🔥', '❄️', '☠️', '🛡️', '💚'];
const abilityIcon = (ability, index) => {
  const effect = ability.effects.find(e => e.id !== 'damage') || ability.effects[0];
  return EFFECTS[effect?.id]?.icon || ICONS[index % ICONS.length];
};
const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

function Portrait({ unit, side }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [unit.image]);
  const flip = side === 1;
  return (
    <div className="arena-portrait">
      {unit.image && !failed ? (
        <img
          className={flip ? 'arena-flipped' : ''}
          src={unit.image}
          alt={unit.name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={flip ? 'arena-flipped' : ''} role="img" aria-label={unit.name}>
          {unit.emoji || '🦖'}
        </span>
      )}
    </div>
  );
}

function UnitAttributes({ unit, battle }) {
  const s = unit.stats;
  const reduction = unit.status.filter(e => ['slow', 'freeze'].includes(e.id))
    .reduce((sum, e) => sum + (e.power || 0), 0) + (battle.delays[unit.uid] || 0);
  return (
    <div className="arena-attributes" aria-label={`Atributos de ${unit.name}`}>
      <span title="Ataque">⚔ {s.attack}</span>
      <span title="Armadura">⬡ {s.armor}</span>
      <span title="Chance de crítico">🎯 {pct(s.critical)}</span>
      <span title={reduction ? `Iniciativa base: ${s.initiative}; redução: ${reduction}` : 'Iniciativa'}>
        ↗ {Math.max(0, s.initiative - reduction)}{reduction > 0 && <small> −{reduction}</small>}
      </span>
      <span title="Chance de esquiva">💨 {pct(s.dodge)}</span>
    </div>
  );
}

function SkillButtons({ unit, isTurn, canPlay, selectedAbility, onAbility }) {
  return (
    <div className="arena-skills" aria-label={`Habilidades de ${unit.name}`}>
      {unit.abilities.map((ability, index) => {
        const cd = unit.cooldowns[ability.id] || 0;
        const disabled = !isTurn || !canPlay || cd > 0;
        const details = `${ability.name}\n${ability.description}\nRecarga: ${ability.cooldown} turno(s)${cd ? ` · faltam ${cd}` : ''}\n${ability.effects.map(e => `${EFFECTS[e.id]?.name || e.id} (${e.target})`).join(', ')}`;
        return (
          <button
            key={ability.id}
            type="button"
            className={`arena-skill ${selectedAbility?.id === ability.id ? 'is-selected' : ''}`}
            disabled={disabled}
            title={details}
            aria-label={details}
            onClick={() => onAbility(ability)}
          >
            <span>{abilityIcon(ability, index)}</span>
            {cd > 0 && <small className="skill-cd">{cd}</small>}
          </button>
        );
      })}
    </div>
  );
}

function Fighter({ unit, battle, side, actor, canPlay, selectedAbility, validTargets, onAbility, onTarget }) {
  const isTurn = unit.uid === actor?.uid && battle.winner === null;
  const canTarget = Boolean(selectedAbility && validTargets.includes(unit.uid) && unit.hp > 0 && canPlay);
  return (
    <div className={`arena-fighter ${isTurn ? 'is-acting' : ''} ${unit.hp <= 0 ? 'is-defeated' : ''} ${canTarget ? 'is-targetable' : ''}`}>
      {side === 0 && <UnitAttributes unit={unit} battle={battle} />}
      {side === 1 && <SkillButtons unit={unit} isTurn={isTurn} canPlay={canPlay} selectedAbility={selectedAbility} onAbility={onAbility} />}
      <button
        type="button"
        className="arena-figure"
        disabled={!canTarget}
        onClick={() => onTarget(unit.uid)}
        aria-label={`${unit.name}: ${unit.hp} de ${unit.stats.hp} pontos de vida${canTarget ? '. Selecionar alvo' : ''}`}
      >
        <Portrait unit={unit} side={side} />
        <strong className="arena-name">{unit.name}</strong>
        <div className="arena-health"><span>♥ {unit.hp}/{unit.stats.hp}</span><div className="arena-health-track"><i style={{ width: `${Math.max(0, unit.hp / unit.stats.hp * 100)}%` }} /></div></div>
        <div className="arena-effects" aria-label="Efeitos ativos">
          {unit.status.map((effect, index) => (
            <span key={`${effect.id}-${index}`} title={`${EFFECTS[effect.id]?.name || effect.id}: ${EFFECTS[effect.id]?.description || ''} · ${effect.duration} turno(s)`}>
              {EFFECTS[effect.id]?.icon || '✦'}{effect.power > 1 && effect.id === 'poison' ? `×${effect.power}` : ''}
            </span>
          ))}
        </div>
      </button>
      {side === 0 && <SkillButtons unit={unit} isTurn={isTurn} canPlay={canPlay} selectedAbility={selectedAbility} onAbility={onAbility} />}
      {side === 1 && <UnitAttributes unit={unit} battle={battle} />}
    </div>
  );
}

export default function BattleArena({ battle, actor, aiTurn, winner, selectedAbility, onAbility, onTarget, onCancel }) {
  const validTargets = selectedAbility ? legalTargets(battle, selectedAbility) : [];
  const canPlay = winner === null && !aiTurn;
  return (
    <section className="arena-stage" aria-label="Arena de combate">
      <div className="arena-topline">
        <span>🟢 EQUIPE 1</span>
        <span className="arena-vs">VS</span>
        <span>🟠 EQUIPE 2</span>
      </div>
      <div className="arena-formations">
        {[0, 1].map(side => (
          <div className={`arena-team arena-team-${side}`} key={side}>
            {battle.units.filter(u => u.team === side).map(unit => (
              <Fighter
                key={unit.uid}
                unit={unit}
                battle={battle}
                side={side}
                actor={actor}
                canPlay={canPlay}
                selectedAbility={selectedAbility}
                validTargets={validTargets}
                onAbility={onAbility}
                onTarget={onTarget}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="arena-prompt" aria-live="polite">
        {winner !== null ? '🏆 Combate encerrado' : aiTurn ? '🤖 A IA está escolhendo a jogada…' : selectedAbility ? (
          <><span>🎯 {selectedAbility.name}: escolha um alvo destacado</span><button type="button" onClick={onCancel}>Cancelar</button></>
        ) : <span>⚔ {actor?.name}: escolha uma habilidade nos ícones ao lado do personagem</span>}
      </div>
      {actor && !aiTurn && winner === null && (
        <div className="arena-mobile-help">Toque e segure um ícone para ver o nome da habilidade; consulte o Guia para detalhes completos.</div>
      )}
    </section>
  );
}

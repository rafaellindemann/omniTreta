import React from 'react';
import { EFFECTS } from '../engine/catalog.js';

export default function BattleUnitStats({ unit }) {
  const { stats, status = [] } = unit;
  const percent = value => `${Math.round((value ?? 0) * 100)}%`;
  return (
    <div className="combat-stats">
      <div className="combat-stats-grid" aria-label={`Atributos de ${unit.name}`}>
        <span title="Ataque base">⚔ {stats.attack}</span>
        <span title="Iniciativa base">↗ {stats.initiative}</span>
        <span title="Armadura base">🛡 {stats.armor}</span>
        <span title="Chance de esquiva">💨 {percent(stats.dodge)}</span>
        <span title="Chance de crítico">🎯 {percent(stats.critical)}</span>
      </div>
      <div className="combat-status-list" aria-label="Efeitos ativos">
        {status.length ? status.map((effect, index) => {
          const info = EFFECTS[effect.id];
          return (
            <span key={`${effect.id}-${index}`} className="combat-status" title={`${info?.description ?? effect.id} · duração: ${effect.duration ?? '?'}`}>
              {info?.icon ?? '✦'} {info?.name ?? effect.id}
              {effect.stacks > 1 ? ` ×${effect.stacks}` : ''}
              {effect.duration != null ? ` · ${effect.duration}t` : ''}
            </span>
          );
        }) : <span className="combat-no-status">Sem efeitos ativos</span>}
      </div>
    </div>
  );
}

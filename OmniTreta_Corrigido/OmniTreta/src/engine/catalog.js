export const EFFECTS = {
    damage: { name: 'Dano', icon: '⚔️', description: 'Causa dano físico. Pode ser dividido entre vários alvos.' },
    heal: { name: 'Cura', icon: '💚', description: 'Restaura pontos de vida.' },
    bleed: { name: 'Sangramento', icon: '🩸', description: 'Dano periódico no início do turno.' },
    poison: { name: 'Veneno', icon: '☠️', description: 'Dano periódico acumulável até 3 cargas.' },
    burn: { name: 'Em chamas', icon: '🔥', description: 'Dano periódico; reduz a armadura e descongela.' },
    freeze: { name: 'Congelamento', icon: '❄️', description: 'Reduz a iniciativa; é removido por fogo.' },
    slow: { name: 'Lentidão', icon: '🐌', description: 'Reduz a iniciativa por várias rodadas.' },
    delay: { name: 'Atraso', icon: '⏳', description: 'Atrasa apenas inimigos que ainda não agiram nesta rodada.' },
    weaken: { name: 'Fraqueza', icon: '📉', description: 'Reduz o dano causado.' },
    evasion: { name: 'Evasão', icon: '💨', description: 'Aumenta a chance de esquiva.' },
    armor_up: { name: 'Armadura', icon: '🛡️', description: 'Reduz dano recebido.' },
    shield: { name: 'Escudo', icon: '🔰', description: 'Proteção adicional.' },
    thorns: { name: 'Espinhos', icon: '🌵', description: 'Reflete parte do dano recebido.' },
    critical_boost: { name: 'Precisão', icon: '🎯', description: 'Aumenta chance de crítico.' },
    pierce: { name: 'Perfuração', icon: '🗡️', description: 'Ignora parte da armadura.' }
};
export const INTERACTIONS = [
    { incoming: 'burn', existing: 'freeze', description: '🔥 Fogo derrete o gelo e remove o congelamento.' },
    { incoming: 'freeze', existing: 'burn', description: '❄️ Gelo apaga as chamas e remove a queimadura.' },
    { incoming: 'burn', existing: 'poison', description: '💥 Fogo consome uma carga de veneno e causa dano extra.' }
];


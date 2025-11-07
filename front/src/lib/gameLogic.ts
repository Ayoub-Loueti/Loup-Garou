import { Role, Player } from '../types/game';

export function generateCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getRolesForPlayerCount(count: number): Role[] {
  if (count < 6 || count > 8) {
    throw new Error('Player count must be between 6 and 8');
  }

  const baseRoles: Role[] = [
    'loup_garou',  // Only 1 Loup-Garou
    'voyante',
    'sorciere',
    'chasseur',
    'salvateur',
  ];

  if (count === 6) {
    // For 6 players: base roles + 1 villageois
    return [...baseRoles, 'villageois'];
  } else if (count === 7) {
    // For 7 players: base roles + 2 villageois
    return [...baseRoles, 'villageois', 'villageois'];
  } else {
    // For 8 players: base roles + 3 villageois
    return [...baseRoles, 'villageois', 'villageois', 'villageois'];
  }
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function checkWinCondition(players: Player[]): 'villagers' | 'werewolves' | null {
  const alivePlayers = players.filter(p => p.is_alive);
  const aliveWerewolves = alivePlayers.filter(p => p.role === 'loup_garou');
  const aliveVillagers = alivePlayers.filter(p => p.role !== 'loup_garou');

  if (aliveWerewolves.length === 0) {
    return 'villagers';
  }

  if (aliveWerewolves.length >= aliveVillagers.length) {
    return 'werewolves';
  }

  return null;
}

export function getNightTurnOrder(): Role[] {
  return ['loup_garou', 'voyante', 'sorciere', 'salvateur'];
}

export function getNextNightTurn(currentTurn: string, players: Player[]): string {
  const turnOrder = getNightTurnOrder();
  const alivePlayers = players.filter(p => p.is_alive);

  if (currentTurn === '') {
    const firstRole = turnOrder.find(role =>
      alivePlayers.some(p => p.role === role)
    );
    return firstRole || 'done';
  }

  const currentIndex = turnOrder.indexOf(currentTurn as Role);
  if (currentIndex === -1) return 'done';

  for (let i = currentIndex + 1; i < turnOrder.length; i++) {
    const role = turnOrder[i];
    if (alivePlayers.some(p => p.role === role)) {
      return role;
    }
  }

  return 'done';
}

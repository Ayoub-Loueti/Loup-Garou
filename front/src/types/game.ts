export type Role = 'loup_garou' | 'voyante' | 'sorciere' | 'chasseur' | 'villageois' | 'salvateur';

export type GameStatus = 'waiting' | 'distributing_roles' | 'night' | 'day' | 'ended';

export type GamePhase = 'night' | 'discussion' | 'voting';

export type NightTurn = 'loup_garou' | 'voyante' | 'sorciere' | 'salvateur' | 'done';

export interface Game {
  id: string;
  host_code: string;
  join_code: string;
  status: GameStatus;
  phase: GamePhase;
  day_number: number;
  current_turn: NightTurn | '';
  winner: 'villagers' | 'werewolves' | null;
  discussion_end_time: string | null;
  voting_end_time: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  role: Role | '';
  is_alive: boolean;
  is_host: boolean;
  position: number;
  protected_tonight: boolean;
  witch_heal_used: boolean;
  witch_poison_used: boolean;
  last_seen: string;
  created_at: string;
}

export interface NightAction {
  id: string;
  game_id: string;
  day_number: number;
  actor_id: string;
  target_id: string;
  action_type: 'werewolf_kill' | 'seer_vision' | 'witch_heal' | 'witch_poison' | 'salvateur_protect';
  result: any;
  created_at: string;
}

export interface DayVote {
  id: string;
  game_id: string;
  day_number: number;
  voter_id: string;
  target_id: string;
  created_at: string;
}

export const ROLE_NAMES: Record<Role, string> = {
  loup_garou: 'Loup-Garou',
  voyante: 'Voyante',
  sorciere: 'Sorcière',
  chasseur: 'Chasseur',
  villageois: 'Simple Villageois',
  salvateur: 'Salvateur',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  loup_garou: 'Chaque nuit, vous vous réveillez avec les autres loups-garous pour dévorer un villageois.',
  voyante: 'Chaque nuit, vous pouvez découvrir la vraie nature d\'un joueur.',
  sorciere: 'Vous disposez de deux potions : une pour sauver la victime des loups-garous, une pour éliminer un joueur. Chaque potion ne peut être utilisée qu\'une fois.',
  chasseur: 'Si vous êtes éliminé, vous pouvez emporter un joueur de votre choix dans la tombe.',
  villageois: 'Vous n\'avez pas de pouvoir spécial. Utilisez votre logique pour identifier les loups-garous.',
  salvateur: 'Chaque nuit, vous pouvez protéger un joueur contre les loups-garous. Vous ne pouvez pas protéger la même personne deux nuits de suite.',
};

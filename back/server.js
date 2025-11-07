// Express API server for Loup Garou game
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load all game classes
function loadClass(filename) {
  const filePath = path.join(__dirname, filename);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInThisContext(code, filePath);
}

loadClass('Icard.js');
loadClass('ICommand.js');
loadClass('IPlayerState.js');
loadClass('CardDecorator.js');
loadClass('SimpleVillageois.js');
loadClass('DeadCard.js');
loadClass('DeadPhase.js');
loadClass('SleepPhase.js');
loadClass('DiscussionPhase.js');
loadClass('PlayRolePhase.js');
loadClass('VotePhase.js');
loadClass('Graveyard.js');
loadClass('LoupGarou.js');
loadClass('Voyante.js');
loadClass('Salvateur.js');
loadClass('Chasseur.js');
loadClass('Sorciere.js');
loadClass('RoleActionCommand.js');
loadClass('VoteCommand.js');
loadClass('Game.js');
loadClass('Player.js');
loadClass('GameController.js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// In-memory game storage (replace with database later)
const games = new Map(); // gameCode -> Game instance
const gameControllers = new Map(); // gameCode -> GameController instance
const gameCodeToId = new Map(); // gameCode -> gameId (for frontend compatibility)
const playerNameToGame = new Map(); // playerName -> gameCode
const nightActions = new Map(); // gameCode -> Set of roles that have acted this night
const dayVotesStore = new Map(); // key: `${gameCode}:${day}` -> Map<voterName, targetName>
const resolvedDays = new Set(); // Set of keys `${gameCode}:${day}` to prevent double resolution
const resolvingGames = new Set(); // gameCode currently resolving vote to avoid concurrent increments
const lastResolvedRound = new Map(); // gameCode -> last round number resolved

// Helper to get or create GameController for a game
function getGameController(gameCode, game) {
  if (!gameControllers.has(gameCode)) {
    const controller = new GameController();
    controller.game = game; // Use the existing game instance
    gameControllers.set(gameCode, controller);
  }
  return gameControllers.get(gameCode);
}

// Helper to set role references
function setRoleRefs(player, game) {
  const role = player.getRole();
  if (!role) return;
  if (typeof role.setGame === 'function') role.setGame(game);
  if (typeof role.setOwner === 'function') role.setOwner(player);
}

// Role factory - support both with and without space for Simple Villageois
const roleFactory = {
  'Simple Villageois': () => new SimpleVillageois(null), // Backend class returns "Simple Villageois"
  'SimpleVillageois': () => new SimpleVillageois(null), // Also support without space
  'Loup-Garou': (base) => new LoupGarou(base || new SimpleVillageois(null)),
  'Voyante': (base) => new Voyante(base || new SimpleVillageois(null)),
  'Salvateur': (base) => new Salvateur(base || new SimpleVillageois(null)),
  'Chasseur': (base) => new Chasseur(base || new SimpleVillageois(null)),
  'Sorcière': (base) => new Sorciere(base || new SimpleVillageois(null)),
};

// Map frontend role names to backend role names
const roleMap = {
  'loup_garou': 'Loup-Garou',
  'voyante': 'Voyante',
  'sorciere': 'Sorcière',
  'chasseur': 'Chasseur',
  'villageois': 'Simple Villageois', // Backend class.getName() returns "Simple Villageois" (with space)
  'salvateur': 'Salvateur',
};

// Reverse map for frontend role names display
const ROLE_NAMES_MAP = {
  'loup_garou': 'Loup-Garou',
  'voyante': 'Voyante',
  'sorciere': 'Sorcière',
  'chasseur': 'Chasseur',
  'villageois': 'Simple Villageois',
  'salvateur': 'Salvateur',
};

// Convert backend game state to frontend format
function gameToFrontend(game, gameId) {
  const livingPlayers = game.getLivingPlayers();
  const wolves = livingPlayers.filter(p => {
    const role = p.getRole();
    return role && role.getName && role.getName() === 'Loup-Garou';
  });
  const villagers = livingPlayers.filter(p => {
    const role = p.getRole();
    return role && role.getName && role.getName() !== 'Loup-Garou';
  });

  // Get gameCode for this gameId
  const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0] || '';

  // Check if roles are assigned and minimum players joined
  const minPlayersJoined = game.players && game.players.length >= 6; // Lobby requires 6-8
  const allPlayersHaveRoles = livingPlayers.length > 0 && livingPlayers.every(p => p.getRole() !== null);
  const anyWolfAssigned = game.players.some(p => {
    const r = p.getRole();
    return r && r.getName && r.getName() === 'Loup-Garou';
  });

  // Check win condition only when game has enough players AND roles context makes sense
  let winner = null;
  if (minPlayersJoined && (allPlayersHaveRoles || anyWolfAssigned) && typeof game.checkWinCondition === 'function') {
    const winResult = game.checkWinCondition();
    if (winResult === 'villagers') winner = 'villagers';
    else if (winResult === 'werewolves') winner = 'werewolves';
  }

  // Determine status based on winner or phase
  let status = 'waiting';
  if (winner) {
    // Game has ended
    status = 'ended';
  } else {
    if (!minPlayersJoined) {
      status = 'waiting';
    } else if (allPlayersHaveRoles && game.currentPhase === 'sleep') {
      status = 'distributing_roles'; // Roles assigned but not started
    } else if (game.currentPhase === 'playRole') {
      status = 'night';
    } else if (game.currentPhase === 'discussion') {
      status = 'day';
    } else if (game.currentPhase === 'vote') {
      status = 'day';
    } else if (game.currentPhase === 'sleep') {
      status = 'waiting';
    }
  }

  // Determine current turn based on roles alive and turn order
  // Convert backend role name to frontend role key for current_turn
  let currentTurn = '';
  if (game.currentPhase === 'playRole') {
    const turnOrder = ['Voyante', 'Salvateur', 'Loup-Garou', 'Sorcière'];
    const actedRoles = nightActions.get(gameCode) || new Set();
    
    for (const roleName of turnOrder) {
      const playerWithRole = livingPlayers.find(p => {
        const role = p.getRole();
        return role && role.getName && role.getName() === roleName;
      });
      if (playerWithRole && !actedRoles.has(roleName)) {
        // This role hasn't acted yet, it's their turn
        // Map backend role name to frontend role key
        const frontendRole = Object.keys(roleMap).find(key => roleMap[key] === roleName);
        currentTurn = frontendRole || '';
        console.log(`[gameToFrontend] Role "${roleName}" mapped to frontend key "${currentTurn}"`);
        if (!currentTurn) {
          console.warn(`[gameToFrontend] No mapping found for role "${roleName}" in roleMap. Available mappings:`, Object.entries(roleMap));
          // Fallback: try to find by case-insensitive match
          const fallbackKey = Object.keys(roleMap).find(key => roleMap[key].toLowerCase() === roleName.toLowerCase());
          if (fallbackKey) {
            currentTurn = fallbackKey;
            console.log(`[gameToFrontend] Found fallback mapping: "${roleName}" -> "${currentTurn}"`);
          }
        }
        break;
      }
    }
    // If all roles have acted, currentTurn remains empty (night is done)
  }

  return {
    id: gameId,
    host_code: game.code,
    join_code: game.code,
    status,
    phase: game.currentPhase === 'playRole' ? 'night' : game.currentPhase === 'discussion' ? 'discussion' : game.currentPhase === 'vote' ? 'voting' : 'night',
    day_number: game.round || 1,
    current_turn: currentTurn,
    winner,
    discussion_end_time: null,
    voting_end_time: null,
    created_at: new Date().toISOString(),
    started_at: status !== 'waiting' ? new Date().toISOString() : null,
    ended_at: winner ? new Date().toISOString() : null,
  };
}

// Convert backend player to frontend format
function playerToFrontend(player, gameId, position, isHost) {
  const role = player.getRole();
  const roleName = role ? role.getName() : '';
  
  // Map backend role name to frontend role key
  // Simple Villageois returns "Simple Villageois" with space, but roleMap uses "Simple Villageois"
  let frontendRole = Object.keys(roleMap).find(key => roleMap[key] === roleName) || '';
  
  // If not found and roleName is "Simple Villageois", try direct match
  if (!frontendRole && roleName === 'Simple Villageois') {
    frontendRole = 'villageois';
  }
  
  // Debug: log if role mapping fails
  if (role && !frontendRole) {
    console.warn(`[PlayerToFrontend] Role "${roleName}" not found in roleMap for player ${player.getName()}. Available keys:`, Object.keys(roleMap));
  }

  return {
    id: `${gameId}-${player.getName()}`,
    game_id: gameId,
    name: player.getName(),
    role: frontendRole,
    is_alive: player.getState().constructor.name !== 'DeadPhase',
    is_host: isHost,
    position,
    protected_tonight: false, // TODO: track from Salvateur
    witch_heal_used: false, // TODO: track from Sorciere
    witch_poison_used: role && role.used !== undefined ? role.used : false,
    last_seen: '',
    created_at: new Date().toISOString(),
  };
}

// API Routes

// Create a new game
app.post('/api/games', (req, res) => {
  try {
    const { playerName } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name required' });
    }

    const game = new Game();
    const gameCode = game.getCode();
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    games.set(gameCode, game);
    gameCodeToId.set(gameCode, gameId);
    playerNameToGame.set(playerName, gameCode);

    // Create host player
    const hostPlayer = new Player(playerName);
    game.addPlayer(hostPlayer, gameCode);

    const gameData = gameToFrontend(game, gameId);
    const playerData = playerToFrontend(hostPlayer, gameId, 0, true);
    
    // Include all players in response so frontend knows who has joined
    const allPlayers = game.players.map((p, idx) => 
      playerToFrontend(p, gameId, idx, idx === 0)
    );
    
    res.json({
      game: gameData,
      player: playerData,
      players: allPlayers, // Send all players
      join_code: game.code, // Also send join code explicitly
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Join a game
app.post('/api/games/join', (req, res) => {
  try {
    const { joinCode, playerName } = req.body;

    if (!joinCode || !playerName) {
      return res.status(400).json({ error: 'Join code and player name required' });
    }

    const game = games.get(joinCode.toUpperCase());
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const livingPlayers = game.getLivingPlayers();
    if (livingPlayers.length >= 8) {
      return res.status(400).json({ error: 'Game is full (8 players maximum)' });
    }
    
    // Also check total players (including dead) to prevent duplicates
    if (game.players.length >= 8) {
      return res.status(400).json({ error: 'Game is full (8 players maximum)' });
    }

    // Check if player name already exists in this game
    const existingPlayer = game.players.find(p => p.getName() === playerName);
    if (existingPlayer) {
      const gameId = gameCodeToId.get(joinCode.toUpperCase());
      const gameData = gameToFrontend(game, gameId);
      const playerData = playerToFrontend(existingPlayer, gameId, game.players.indexOf(existingPlayer), game.players.indexOf(existingPlayer) === 0);
      const allPlayers = game.players.map((p, idx) => 
        playerToFrontend(p, gameId, idx, idx === 0)
      );
      
      return res.json({
        game: gameData,
        player: playerData,
        players: allPlayers,
        join_code: joinCode.toUpperCase(),
      });
    }

    const gameId = gameCodeToId.get(joinCode.toUpperCase());
    const newPlayer = new Player(playerName);
    game.addPlayer(newPlayer, joinCode.toUpperCase());
    playerNameToGame.set(playerName, joinCode.toUpperCase());

    const gameData = gameToFrontend(game, gameId);
    const playerData = playerToFrontend(newPlayer, gameId, game.players.length - 1, false);
    
    // Include all players in response so frontend knows who has joined
    const allPlayers = game.players.map((p, idx) => 
      playerToFrontend(p, gameId, idx, idx === 0)
    );
    
    res.json({
      game: gameData,
      player: playerData,
      players: allPlayers, // Send all players
      join_code: joinCode.toUpperCase(), // Also send join code explicitly
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Get game state
app.get('/api/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Safety: if night actions are effectively done, advance to discussion
    if (game.currentPhase === 'playRole') {
      const livingPlayers = game.getLivingPlayers();
      const requiredRoles = ['Voyante', 'Salvateur', 'Loup-Garou', 'Sorcière'];
      const acted = nightActions.get(gameCode) || new Set();
      const roleDone = (backendRoleName) => {
        const holder = livingPlayers.find(p => {
          const r = p.getRole();
          return r && r.getName && r.getName() === backendRoleName;
        });
        if (!holder) return true;
        return acted.has(backendRoleName);
      };
      const allNightDone = requiredRoles.every(roleDone);
      if (allNightDone) {
        game.setPhase('discussion');
      }
    }

    const gameData = gameToFrontend(game, gameId);
    res.json(gameData);
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: 'Failed to get game', details: error.message });
  }
});

// Get all players in a game
app.get('/api/games/:gameId/players', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Return players sorted by position (order they joined)
    const players = game.players.map((p, idx) => 
      playerToFrontend(p, gameId, idx, idx === 0)
    );

    res.json(players);
  } catch (error) {
    console.error('Error getting players:', error);
    res.status(500).json({ error: 'Failed to get players', details: error.message });
  }
});

// Assign role to player
app.post('/api/games/:gameId/players/:playerName/role', (req, res) => {
  try {
    const { gameId, playerName } = req.params;
    const { role } = req.body;

    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const player = game.players.find(p => p.getName() === playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Log for debugging
    console.log(`[Assign Role] Player: ${playerName}, Frontend Role: ${role}`);
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const backendRole = roleMap[role];
    if (!backendRole) {
      console.error(`[Assign Role] Invalid role mapping. Frontend role: ${role}, Available mappings:`, Object.keys(roleMap));
      return res.status(400).json({ error: `Invalid role: ${role}. Valid roles are: ${Object.keys(roleMap).join(', ')}` });
    }

    // Get factory - check both with and without space for Simple Villageois
    let factory = roleFactory[backendRole];
    if (!factory && backendRole === 'Simple Villageois') {
      factory = roleFactory['SimpleVillageois']; // Try without space
    }
    
    if (!factory) {
      console.error(`[Assign Role] No factory for backend role: ${backendRole}. Available factories:`, Object.keys(roleFactory));
      return res.status(400).json({ error: `Role factory not found for: ${backendRole}` });
    }
    
    console.log(`[Assign Role] Mapped ${role} -> ${backendRole}`);

    const roleInstance = factory();
    const actualRoleName = roleInstance.getName();
    console.log(`[Assign Role] Created role instance with name: "${actualRoleName}"`);
    
    player.setRole(roleInstance);
    setRoleRefs(player, game);

    res.json({ success: true, player: playerToFrontend(player, gameId, game.players.indexOf(player), game.players.indexOf(player) === 0) });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Set target for night action
app.post('/api/games/:gameId/players/:playerName/target', (req, res) => {
  try {
    const { gameId, playerName } = req.params;
    const { targetName } = req.body;

    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    const player = game.players.find(p => p.getName() === playerName);
    const target = game.players.find(p => p.getName() === targetName);

    if (!player || !target) {
      return res.status(404).json({ error: 'Player or target not found' });
    }

    const role = player.getRole();
    if (role && typeof role.setTarget === 'function') {
      role.setTarget(target);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Role does not support target setting' });
    }
  } catch (error) {
    console.error('Error setting target:', error);
    res.status(500).json({ error: 'Failed to set target' });
  }
});

// Execute night action
app.post('/api/games/:gameId/players/:playerName/action', (req, res) => {
  try {
    const { gameId, playerName } = req.params;

    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    const player = game.players.find(p => p.getName() === playerName);
    if (!player) {
      return res.status(400).json({ error: 'Player not found' });
    }

    const role = player.getRole();
    if (!role) {
      return res.status(400).json({ error: 'Player has no role' });
    }

    const roleName = role.getName();
    // Allow Chasseur to act even if dead (to perform death shot)
    if (player.getState().constructor.name === 'DeadPhase' && roleName !== 'Chasseur') {
      return res.status(400).json({ error: 'Player is dead' });
    }
    
    // Check if this role has already acted
    const actedRoles = nightActions.get(gameCode) || new Set();
    if (actedRoles.has(roleName)) {
      return res.status(400).json({ error: 'This role has already acted this night' });
    }

    // Execute the action and capture result
    let actionResult = null;
    if (typeof role.performAction === 'function') {
      // Capture target name before executing
      const targetName = role.forcedTarget ? role.forcedTarget.getName() : null;
      
      // For Voyante, capture the result before executing
      if (roleName === 'Voyante' && role.forcedTarget) {
        const targetRole = role.forcedTarget.getRole();
        const targetRoleName = targetRole ? targetRole.getName() : 'No role';
        // Map backend role name to frontend role key
        const frontendTargetRole = Object.keys(roleMap).find(key => roleMap[key] === targetRoleName) || '';
        actionResult = {
          actionType: 'seer_vision',
          targetName: targetName,
          targetRole: frontendTargetRole,
          targetRoleName: frontendTargetRole ? ROLE_NAMES_MAP[frontendTargetRole] || targetRoleName : targetRoleName,
          message: `Vous avez vu que ${targetName} est ${frontendTargetRole ? ROLE_NAMES_MAP[frontendTargetRole] || targetRoleName : targetRoleName}`
        };
      } else if (targetName) {
        // For other roles, create confirmation message
        if (roleName === 'Loup-Garou') {
          actionResult = {
            actionType: 'werewolf_kill',
            targetName: targetName,
            message: `Vous avez choisi ${targetName} comme victime`
          };
        } else if (roleName === 'Salvateur') {
          actionResult = {
            actionType: 'salvateur_protect',
            targetName: targetName,
            message: `Vous protégez ${targetName} cette nuit`
          };
        } else if (roleName === 'Sorcière') {
          actionResult = {
            actionType: 'witch_poison',
            targetName: targetName,
            message: `Vous avez utilisé votre potion sur ${targetName}`
          };
        } else if (roleName === 'Chasseur') {
          actionResult = {
            actionType: 'hunter_shot',
            targetName: targetName,
            message: `Vous avez tiré sur ${targetName}`
          };
        }
      }
      
      // Execute the action using Command pattern
      const controller = getGameController(gameCode, game);
      const actionCommand = new RoleActionCommand(player);
      controller.executeCommand(actionCommand);
      
      // Mark this role as having acted
      if (!nightActions.has(gameCode)) {
        nightActions.set(gameCode, new Set());
      }
      nightActions.get(gameCode).add(roleName);
      
      // Move any newly dead to graveyard
      for (const p of game.players) {
        if (p.getState().constructor.name === 'DeadPhase') {
          game.moveToGraveyard(p);
        }
      }
      
      // Check win condition after moving dead players
      const winner = game.checkWinCondition();
      
      // If there's a winner, update game status to ended
      if (winner) {
        // Game will show as ended in next poll
        console.log(`[Execute Action] Game ended! Winner: ${winner}`);
      }
      
      // If game not ended, check if night should end (all roles done or missing)
      if (!winner) {
        const livingPlayers = game.getLivingPlayers();
        const requiredRoles = ['Voyante', 'Salvateur', 'Loup-Garou', 'Sorcière'];
        const acted = nightActions.get(gameCode) || new Set();

        const roleDone = (backendRoleName) => {
          const holder = livingPlayers.find(p => {
            const r = p.getRole();
            return r && r.getName && r.getName() === backendRoleName;
          });
          // If no living holder for this role, treat as done
          if (!holder) return true;
          // Otherwise, must have acted
          return acted.has(backendRoleName);
        };

        const allNightDone = requiredRoles.every(roleDone);
        if (allNightDone) {
          // Move to day discussion
          game.setPhase('discussion');
        }
      }
      
      res.json({ 
        success: true, 
        hasActed: true,
        actionResult: actionResult,
        game: gameToFrontend(game, gameId)
      });
    } else {
      res.status(400).json({ error: 'Player has no action to perform' });
    }
  } catch (error) {
    console.error('Error executing action:', error);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

// Vote to eliminate
app.post('/api/games/:gameId/vote', (req, res) => {
  try {
    const { gameId } = req.params;
    const { voterName, targetName } = req.body;

    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    const voter = game.players.find(p => p.getName() === voterName);
    const target = game.players.find(p => p.getName() === targetName);

    if (!voter || !target || voter.getState().constructor.name === 'DeadPhase') {
      return res.status(400).json({ error: 'Invalid voter or target' });
    }

    // Use Command pattern for voting
    const controller = getGameController(gameCode, game);
    // Ensure voter is in VotePhase state (if not, temporarily set it for the command)
    const originalState = voter.getState();
    if (originalState.constructor.name !== 'VotePhase') {
      voter.setState(new VotePhase());
    }
    
    const voteCommand = new VoteCommand(voter, target);
    controller.executeCommand(voteCommand);
    
    // Restore original state if it was changed
    if (originalState.constructor.name !== 'VotePhase') {
      voter.setState(originalState);
    }
    
    // Also store in our vote store for resolution
    const key = `${gameCode}:${game.round}`;
    if (!dayVotesStore.has(key)) dayVotesStore.set(key, new Map());
    dayVotesStore.get(key).set(voterName, targetName);
    console.log(`[DayVote] Day ${game.round} | ${voterName} -> ${targetName} (game ${gameCode})`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Get day votes (for current or specified day)
app.get('/api/games/:gameId/day-votes', (req, res) => {
  try {
    const { gameId } = req.params;
    const dayParam = req.query.day ? parseInt(String(req.query.day), 10) : undefined;
    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = games.get(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const day = dayParam || game.round;
    const key = `${gameCode}:${day}`;
    const votesMap = dayVotesStore.get(key) || new Map();
    const votes = Array.from(votesMap.entries()).map(([voter, target]) => ({ voterName: voter, targetName: target }));
    res.json({ day, votes });
  } catch (error) {
    console.error('Error getting day votes:', error);
    res.status(500).json({ error: 'Failed to get day votes' });
  }
});

// Resolve day voting: eliminates top-voted (if unique), triggers death actions, advances to next night
app.post('/api/games/:gameId/resolve-vote', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = games.get(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Only resolve when we are in voting phase (day resolution)
    if (game.currentPhase !== 'vote') {
      return res.json({ success: true, alreadyResolved: true, reason: 'not_in_voting_phase', game: gameToFrontend(game, gameId) });
    }

    const day = game.round;
    const key = `${gameCode}:${day}`;

    // Prevent concurrent and duplicate resolutions across clients
    if (resolvingGames.has(gameCode)) {
      return res.json({ success: true, alreadyResolved: true, game: gameToFrontend(game, gameId) });
    }
    const last = lastResolvedRound.get(gameCode);
    if (last !== undefined && last === day) {
      return res.json({ success: true, alreadyResolved: true, game: gameToFrontend(game, gameId) });
    }
    resolvingGames.add(gameCode);

    // If already resolved, just return current state
    if (resolvedDays.has(key)) {
      return res.json({ success: true, alreadyResolved: true, game: gameToFrontend(game, gameId) });
    }

    // Idempotency: lock resolution immediately to avoid double-increment from concurrent callers
    if (!resolvedDays.has(key)) {
      resolvedDays.add(key);
    } else {
      resolvingGames.delete(gameCode);
      return res.json({ success: true, alreadyResolved: true, game: gameToFrontend(game, gameId) });
    }

    const votesMap = dayVotesStore.get(key) || new Map();
    const counts = new Map(); // targetName -> count
    for (const [, targetName] of votesMap.entries()) {
      counts.set(targetName, (counts.get(targetName) || 0) + 1);
    }

    let victimName = null;
    if (counts.size > 0) {
      const max = Math.max(...Array.from(counts.values()));
      const top = Array.from(counts.entries()).filter(([, c]) => c === max);
      if (top.length === 1) {
        victimName = top[0][0];
      }
    }

    if (victimName) {
      const target = game.players.find(p => p.getName() === victimName);
      if (target && target.getState().constructor.name !== 'DeadPhase') {
        target.setState(new DeadPhase());
        // Trigger death action if any
        const role = target.getRole();
        if (role && typeof role.triggerDeathAction === 'function') {
          try { role.triggerDeathAction(); } catch (e) { console.error('[ResolveVote] Death action error:', e); }
        }
      }
    }

    // Move all newly dead to graveyard
    for (const p of game.players) {
      if (p.getState().constructor.name === 'DeadPhase') {
        game.moveToGraveyard(p);
      }
    }

    // Clear votes for that day (resolution already locked above)
    dayVotesStore.delete(key);

    // Check win condition
    const winner = game.checkWinCondition();
    if (winner) {
      lastResolvedRound.set(gameCode, day);
      resolvingGames.delete(gameCode);
      return res.json({ success: true, winner, game: gameToFrontend(game, gameId) });
    }

    // Advance to next night
    if (typeof game.nextRound === 'function') {
      game.nextRound();
    }
    game.setPhase('playRole');
    // Reset night actions and protection
    nightActions.set(gameCode, new Set());
    game.players.forEach(p => {
      const r = p.getRole();
      if (r && typeof r.resetProtection === 'function') r.resetProtection();
    });

    lastResolvedRound.set(gameCode, day);
    resolvingGames.delete(gameCode);
    res.json({ success: true, game: gameToFrontend(game, gameId) });
  } catch (error) {
    console.error('Error resolving vote:', error);
    res.status(500).json({ error: 'Failed to resolve vote' });
  }
});

// Eliminate player (after voting)
app.post('/api/games/:gameId/eliminate', (req, res) => {
  try {
    const { gameId } = req.params;
    const { targetName } = req.body;

    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    const target = game.players.find(p => p.getName() === targetName);

    if (!target || target.getState().constructor.name === 'DeadPhase') {
      return res.status(400).json({ error: 'Target not found or already dead' });
    }

    target.setState(new DeadPhase());

    // Trigger death actions (e.g., Chasseur random shot)
    const role = target.getRole();
    if (role && typeof role.triggerDeathAction === 'function') {
      try {
        role.triggerDeathAction();
      } catch (e) {
        console.error('[Eliminate] Error triggering death action:', e);
      }
    }

    // Move newly dead players (including target and any killed by death action) to graveyard
    for (const p of game.players) {
      if (p.getState().constructor.name === 'DeadPhase') {
        game.moveToGraveyard(p);
      }
    }

    res.json({ success: true, game: gameToFrontend(game, gameId) });
  } catch (error) {
    console.error('Error eliminating player:', error);
    res.status(500).json({ error: 'Failed to eliminate player' });
  }
});

// Set phase
app.post('/api/games/:gameId/phase', (req, res) => {
  try {
    const { gameId } = req.params;
    const { phase } = req.body;

    console.log(`[Set Phase] Setting phase to ${phase} for game ${gameId}`);

    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    let backendPhase = 'sleep';
    if (phase === 'night') backendPhase = 'playRole';
    else if (phase === 'discussion') backendPhase = 'discussion';
    else if (phase === 'voting') backendPhase = 'vote';

    console.log(`[Set Phase] Backend phase: ${backendPhase}, Current round: ${game.round}`);
    
    game.setPhase(backendPhase);

    // Reset night actions when starting a new night
    if (backendPhase === 'playRole') {
      nightActions.set(gameCode, new Set()); // Clear previous night's actions
      console.log(`[Set Phase] Night actions cleared for game ${gameCode}`);
      
      // Reset Salvateur protection at start of night
      game.players.forEach(p => {
        const r = p.getRole();
        if (r && typeof r.resetProtection === 'function') r.resetProtection();
      });
    }

    const gameData = gameToFrontend(game, gameId);
    console.log(`[Set Phase] Game status: ${gameData.status}, Current turn: ${gameData.current_turn}, Day number: ${gameData.day_number}`);
    
    res.json({ success: true, game: gameData });
  } catch (error) {
    console.error('Error setting phase:', error);
    res.status(500).json({ error: 'Failed to set phase' });
  }
});

// Next round
app.post('/api/games/:gameId/next-round', (req, res) => {
  try {
    const { gameId } = req.params;

    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    if (typeof game.nextRound === 'function') {
      game.nextRound();
    }

    res.json({ success: true, game: gameToFrontend(game, gameId) });
  } catch (error) {
    console.error('Error advancing round:', error);
    res.status(500).json({ error: 'Failed to advance round' });
  }
});

// Get graveyard
app.get('/api/games/:gameId/graveyard', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameCode = Array.from(gameCodeToId.entries()).find(([_, id]) => id === gameId)?.[0];
    
    if (!gameCode) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameCode);
    const deadCards = game.getGraveyard().getDeadCards();

    res.json(deadCards.map(card => ({
      player: card.getPlayerName(),
      role: card.getRoleName(),
    })));
  } catch (error) {
    console.error('Error getting graveyard:', error);
    res.status(500).json({ error: 'Failed to get graveyard' });
  }
});

const server = createServer(app);

// WebSocket for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      // Echo for now - can implement real-time game state updates
      ws.send(JSON.stringify({ type: 'pong', data: message }));
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Loup Garou API server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

// Handle server errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`💡 Solutions:`);
    console.error(`   1. Kill the process using port ${PORT}:`);
    console.error(`      netstat -ano | findstr :${PORT}`);
    console.error(`      taskkill /PID <PID> /F`);
    console.error(`   2. Or change the PORT in server.js`);
    console.error(`\n⚠️  Server failed to start.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    throw err;
  }
});


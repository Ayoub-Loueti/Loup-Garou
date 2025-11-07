import { useState, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import RoleRevealScreen from './components/RoleRevealScreen';
import GameScreen from './components/GameScreen';
import GameEndScreen from './components/GameEndScreen';
import { api } from './lib/api';
import { Game, Player } from './types/game';

type Screen = 'home' | 'lobby' | 'role_reveal' | 'game' | 'game_end';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!gameId) return;

    let pollCount = 0;
    const maxPollAttempts = 5; // Stop after 5 failed attempts
    let pollInterval: NodeJS.Timeout | null = null;

    // Poll for game updates
    const poll = async () => {
      try {
        const gameData = await api.getGame(gameId);
        pollCount = 0; // Reset on success
        
        setGame(gameData);

        console.log('[App] Polling game, status:', gameData.status, 'screen:', screen);
        
        if (gameData.status === 'distributing_roles' && screen === 'lobby') {
          console.log('[App] Transitioning to role_reveal');
          setScreen('role_reveal');
        } else if (gameData.status === 'night') {
          // Force transition to game screen when night starts
          if (screen === 'role_reveal' || screen === 'lobby') {
            console.log('[App] Transitioning to game screen (night phase)');
            console.log('[App] Night game data:', {
              status: gameData.status,
              day_number: gameData.day_number,
              current_turn: gameData.current_turn
            });
            setScreen('game');
          }
        } else if (gameData.status === 'day') {
          if (screen === 'role_reveal' || screen === 'lobby') {
            console.log('[App] Transitioning to game screen (day phase)');
            setScreen('game');
          }
        } else if (gameData.status === 'ended' && screen !== 'game_end' && screen !== 'lobby') {
          setScreen('game_end');
        }
      } catch (error: any) {
        pollCount++;
        console.error('Error polling game:', error);
        
        // Stop polling if game not found after multiple attempts
        if ((error.message?.includes('not found') || error.message?.includes('404')) && pollCount >= maxPollAttempts) {
          console.error('Game not found, stopping polling');
          if (pollInterval) clearInterval(pollInterval);
          // Reset to home screen
          setScreen('home');
          setGameId(null);
          setPlayerId(null);
        }
      }
    };

    // Initial fetch
    poll();

    // Poll continuously to detect phase changes
    // But reduce frequency on role_reveal to avoid spam
    if (screen === 'role_reveal') {
      pollInterval = setInterval(poll, 2000); // Poll more frequently during role reveal
    } else if (screen !== 'game_end') {
      pollInterval = setInterval(poll, 2000); // Poll every 2 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [gameId, screen]);

  useEffect(() => {
    if (!playerId || !gameId) return;

    // Extract player name from playerId (format: gameId-playerName)
    const playerName = playerId.split('-').slice(1).join('-');

    const fetchPlayer = async () => {
      try {
        const players = await api.getPlayers(gameId);
        const player = players.find(p => p.id === playerId || p.name === playerName);
        if (player) {
          setCurrentPlayer(player);
        }
      } catch (error) {
        console.error('Error fetching player:', error);
      }
    };

    fetchPlayer();

    // Poll for player updates
    const pollInterval = setInterval(fetchPlayer, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [playerId, gameId]);

  const handleJoinGame = (gId: string, pId: string) => {
    setGameId(gId);
    setPlayerId(pId);
    setScreen('lobby');
  };

  const handleStartGame = () => {
    setScreen('role_reveal');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {screen === 'home' && <HomeScreen onJoinGame={handleJoinGame} />}
      {screen === 'lobby' && gameId && playerId && (
        <LobbyScreen
          gameId={gameId}
          playerId={playerId}
          onStartGame={handleStartGame}
        />
      )}
      {screen === 'role_reveal' && playerId && (
        <RoleRevealScreen
          playerId={playerId}
          currentPlayer={currentPlayer}
          onContinue={() => setScreen('game')}
        />
      )}
      {screen === 'game' && gameId && playerId && game && currentPlayer && (
        <GameScreen
          gameId={gameId}
          playerId={playerId}
          game={game}
          currentPlayer={currentPlayer}
        />
      )}
      {screen === 'game_end' && gameId && game && (
        <GameEndScreen game={game} gameId={gameId} />
      )}
    </div>
  );
}

export default App;

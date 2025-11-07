import { useState, useEffect } from 'react';
import { Game, Player } from '../types/game';
import { api } from '../lib/api';
import NightPhase from './NightPhase';
import DayPhase from './DayPhase';

interface GameScreenProps {
  gameId: string;
  playerId: string;
  game: Game;
  currentPlayer: Player;
}

export default function GameScreen({ gameId, playerId, game, currentPlayer }: GameScreenProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameData, setGameData] = useState<Game>(game);

  useEffect(() => {
    fetchPlayers();
    fetchGame();

    // Poll for player updates and game state
    const pollInterval = setInterval(() => {
      fetchPlayers();
      fetchGame();
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [gameId]);

  const fetchPlayers = async () => {
    try {
      const playersData = await api.getPlayers(gameId);
      if (playersData && Array.isArray(playersData)) {
        const sortedPlayers = [...playersData].sort((a, b) => a.position - b.position);
        setPlayers(sortedPlayers);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchGame = async () => {
    try {
      const g = await api.getGame(gameId);
      if (g) setGameData(g);
    } catch (error) {
      console.error('Error fetching game:', error);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('[GameScreen] Game status:', gameData.status);
    console.log('[GameScreen] Day number:', gameData.day_number);
    console.log('[GameScreen] Current turn:', gameData.current_turn);
    console.log('[GameScreen] Players count:', players.length);
  }, [gameData.status, gameData.day_number, gameData.current_turn, players.length]);

  if (gameData.status === 'night') {
    console.log('[GameScreen] Rendering NightPhase');
    return (
      <NightPhase
        game={gameData}
        gameId={gameId}
        currentPlayer={currentPlayer}
        players={players}
      />
    );
  }

  if (gameData.status === 'day') {
    console.log('[GameScreen] Rendering DayPhase');
    return (
      <DayPhase
        game={gameData}
        gameId={gameId}
        currentPlayer={currentPlayer}
        players={players}
      />
    );
  }

  // Show loading if status is not night or day
  console.log('[GameScreen] Waiting for game to start, status:', gameData.status);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-slate-400 mb-2">En attente du début de la partie...</div>
        <div className="text-slate-500 text-sm">Statut: {gameData.status}</div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Users, Copy, Check, Crown } from 'lucide-react';
import { api } from '../lib/api';
import { Player, Game } from '../types/game';
import { getRolesForPlayerCount, shuffleArray } from '../lib/gameLogic';

interface LobbyScreenProps {
  gameId: string;
  playerId: string;
  onStartGame: () => void;
}

export default function LobbyScreen({ gameId, playerId, onStartGame }: LobbyScreenProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    
    const fetch = async () => {
      if (!isMounted) return;
      await fetchGameAndPlayers();
    };
    
    fetch(); // Initial fetch
    
    // Poll every 3 seconds (reduced frequency)
    pollInterval = setInterval(fetch, 3000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [gameId]);

  const fetchGameAndPlayers = async () => {
    try {
      const [gameData, playersData] = await Promise.all([
        api.getGame(gameId),
        api.getPlayers(gameId),
      ]);

      if (gameData) {
        setGame(gameData);
      }

      if (playersData && Array.isArray(playersData)) {
        // Sort players by position
        const sortedPlayers = [...playersData].sort((a, b) => a.position - b.position);
        setPlayers(sortedPlayers);
      } else {
        setPlayers([]);
      }
    } catch (error) {
      // Silently handle - game might not exist yet
      setPlayers([]);
    }
  };

  const copyJoinCode = () => {
    if (game?.join_code) {
      navigator.clipboard.writeText(game.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    if (players.length < 6 || players.length > 8) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const roles = getRolesForPlayerCount(players.length);
      const shuffledRoles = shuffleArray(roles);

      console.log(`[Start Game] Assigning roles:`, shuffledRoles);
      console.log(`[Start Game] To players:`, players.map(p => p.name));

      // Assign roles to players via API
      for (let i = 0; i < players.length; i++) {
        const role = shuffledRoles[i];
        const playerName = players[i].name;
        
        if (!role) {
          throw new Error(`No role for player ${playerName}`);
        }
        
        console.log(`[Start Game] Assigning ${role} to ${playerName}`);
        await api.assignRole(gameId, playerName, role);
      }

      console.log(`Successfully assigned ${players.length} roles`);

      // Wait for backend to update status
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Refresh game state to check status
      let updatedGame;
      try {
        updatedGame = await api.getGame(gameId);
        setGame(updatedGame);
        console.log('Updated game status:', updatedGame.status);
        
        // If status is still not distributing_roles, force refresh again
        if (updatedGame.status !== 'distributing_roles') {
          await new Promise(resolve => setTimeout(resolve, 500));
          updatedGame = await api.getGame(gameId);
          setGame(updatedGame);
          console.log('Re-checked game status:', updatedGame.status);
        }
      } catch (err) {
        console.warn('Could not fetch updated game state:', err);
      }

      // Transition to role reveal screen
      onStartGame();
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to start game:', err);
      setError(err.message || 'Erreur lors du démarrage de la partie');
      setLoading(false);
    }
  };

  const currentPlayer = players.find(p => p.id === playerId);
  const isHost = currentPlayer?.is_host || false;
  const canStart = players.length >= 6 && players.length <= 8 && isHost;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-600/20 rounded-full mb-4">
              <Users className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-amber-100 mb-2">
              Salle d'attente
            </h1>
            <p className="text-slate-400">
              En attente des joueurs (6-8 requis)
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Code de partie</p>
                <p className="text-2xl font-mono font-bold text-amber-400 tracking-wider">
                  {game?.join_code || 'Chargement...'}
                </p>
                {game?.join_code && (
                  <p className="text-xs text-slate-500 mt-1">
                    Partagez ce code avec les autres joueurs
                  </p>
                )}
              </div>
              <button
                onClick={copyJoinCode}
                disabled={!game?.join_code}
                className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-slate-300" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-200">
                Joueurs ({players.length}/8)
              </h2>
              <div className="flex gap-1">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < players.length
                        ? 'bg-amber-500'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {players.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun joueur dans la partie</p>
                  <p className="text-sm mt-1">Les joueurs apparaîtront ici lorsqu'ils rejoindront</p>
                </div>
              ) : (
                players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      player.id === playerId
                        ? 'bg-amber-900/30 border border-amber-600/50'
                        : 'bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        {player.is_host && (
                          <Crown className="w-4 h-4 text-amber-400 absolute -top-1 -right-1" />
                        )}
                      </div>
                      <div>
                        <span className="text-slate-100 font-medium block">
                          {player.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          Position {player.position + 1}
                        </span>
                      </div>
                    </div>
                    {player.is_host && (
                      <div className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                        <span>Hôte</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {players.length < 6 && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-4">
              <p className="text-blue-200 text-sm text-center">
                Minimum 6 joueurs requis pour commencer
              </p>
            </div>
          )}

          {isHost && (
            <div>
              {error && (
                <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
              <button
                onClick={handleStartGame}
                disabled={!canStart || loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
              >
                {loading ? 'Démarrage...' : 'Commencer la partie'}
              </button>
            </div>
          )}

          {!isHost && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-300 text-center text-sm">
                En attente que l'hôte démarre la partie...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { Player, ROLE_NAMES, ROLE_DESCRIPTIONS } from '../types/game';

interface RoleRevealScreenProps {
  playerId: string;
  currentPlayer: Player | null;
  onContinue: () => void;
}

export default function RoleRevealScreen({ playerId, currentPlayer, onContinue }: RoleRevealScreenProps) {
  const [revealed, setRevealed] = useState(false);
  const [player, setPlayer] = useState<Player | null>(currentPlayer);

  useEffect(() => {
    if (currentPlayer && currentPlayer.role) {
      setPlayer(currentPlayer);
    } else {
      fetchPlayer();
    }
  }, [playerId, currentPlayer]);

  const fetchPlayer = async () => {
    if (!playerId) return;
    
    // Extract gameId and playerName from playerId (format: gameId-playerName)
    const parts = playerId.split('-');
    if (parts.length < 3) return;
    
    const gameId = parts[0] + '-' + parts[1];
    const playerName = parts.slice(2).join('-');

    try {
      const players = await api.getPlayers(gameId);
      const foundPlayer = players.find(p => p.name === playerName || p.id === playerId);
      if (foundPlayer && foundPlayer.role) {
        setPlayer(foundPlayer);
      } else {
        // Poll until role is assigned (with limit to avoid infinite loop)
        let attempts = 0;
        const maxAttempts = 15;
        const pollRole = setInterval(async () => {
          attempts++;
          try {
            const updatedPlayers = await api.getPlayers(gameId);
            const updatedPlayer = updatedPlayers.find(p => p.name === playerName || p.id === playerId);
            if (updatedPlayer && updatedPlayer.role) {
              setPlayer(updatedPlayer);
              clearInterval(pollRole);
            } else if (attempts >= maxAttempts) {
              clearInterval(pollRole);
              console.warn('Role not assigned after maximum attempts');
            }
          } catch (error) {
            clearInterval(pollRole);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching player:', error);
    }
  };

  const handleContinue = async () => {
    if (!player?.game_id) return;

    try {
      const gameData = await api.getGame(player.game_id);
      console.log('[RoleReveal] Current game status:', gameData?.status);
      console.log('[RoleReveal] Is host?', player.is_host);
      
      // If roles are distributed and host clicks, start the night phase
      if (gameData?.status === 'distributing_roles' && player.is_host) {
        console.log('[RoleReveal] Starting night phase...');
        
        // Start the night phase (round is already 1, don't call nextRound)
        const result = await api.setPhase(player.game_id, 'night');
        console.log('[RoleReveal] Set phase result:', result);
        
        if (result?.game) {
          console.log('[RoleReveal] Game after setPhase:', {
            status: result.game.status,
            day_number: result.game.day_number,
            current_turn: result.game.current_turn
          });
        }
        
        // Wait a moment for state to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('[RoleReveal] Error continuing:', error);
    }

    // Always call onContinue to transition to game screen
    // The parent component will poll and detect the status change
    onContinue();
  };

  if (!player || !player.role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  const roleName = ROLE_NAMES[player.role];
  const roleDescription = ROLE_DESCRIPTIONS[player.role];
  const isWerewolf = player.role === 'loup_garou';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2">
            Votre rôle secret
          </h1>
          <p className="text-slate-400">
            Ne le montrez à personne
          </p>
        </div>

        {!revealed ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700 p-8">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center mb-6 border-4 border-amber-600/50">
                <EyeOff className="w-16 h-16 text-slate-600" />
              </div>
              <p className="text-slate-300 text-center mb-6">
                Cliquez pour révéler votre rôle
              </p>
              <button
                onClick={() => setRevealed(true)}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-amber-500 hover:to-orange-500 transition-all transform hover:scale-105 shadow-lg"
              >
                Révéler mon rôle
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div
              className={`rounded-xl shadow-2xl border-4 p-8 mb-6 ${
                isWerewolf
                  ? 'bg-gradient-to-br from-red-900/80 to-red-950/80 border-red-600'
                  : 'bg-gradient-to-br from-blue-900/80 to-blue-950/80 border-blue-600'
              }`}
            >
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                  isWerewolf ? 'bg-red-800/50' : 'bg-blue-800/50'
                }`}>
                  <Eye className={`w-10 h-10 ${
                    isWerewolf ? 'text-red-300' : 'text-blue-300'
                  }`} />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">
                  {roleName}
                </h2>
                <div className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${
                  isWerewolf
                    ? 'bg-red-800/50 text-red-200'
                    : 'bg-blue-800/50 text-blue-200'
                }`}>
                  {isWerewolf ? 'Loup-Garou' : 'Villageois'}
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 mb-4">
                <p className="text-white text-center leading-relaxed">
                  {roleDescription}
                </p>
              </div>

              {isWerewolf && (
                <div className="bg-red-950/50 rounded-lg p-4 border border-red-800">
                  <p className="text-red-200 text-sm text-center">
                    Vous vous réveillez chaque nuit avec les autres loups-garous pour choisir une victime.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-slate-700 text-slate-100 py-4 rounded-lg font-semibold text-lg hover:bg-slate-600 transition-all shadow-lg"
            >
              J'ai compris
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

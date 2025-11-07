import { useState, useEffect } from 'react';
import { Moon, Eye, Skull, Shield, Droplet } from 'lucide-react';
import { Game, Player, ROLE_NAMES } from '../types/game';
import { api } from '../lib/api';
import Graveyard from './Graveyard';

interface NightPhaseProps {
  game: Game;
  gameId: string;
  currentPlayer: Player;
  players: Player[];
}

export default function NightPhase({ game, gameId, currentPlayer, players }: NightPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasActed, setHasActed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState<any>(null);
  // Dead Hunter manual UI removed; backend auto-handles random shot

  // Determine if it's this player's turn based on current_turn and their role
  // current_turn is now a frontend role key (e.g., 'voyante', 'loup_garou')
  // Order: voyante → salvateur → loup_garou → sorciere
  // Normalize both values to lowercase for comparison (handle case mismatches)
  const normalizedCurrentTurn = game.current_turn?.toLowerCase().trim();
  const normalizedMyRole = currentPlayer.role?.toLowerCase().trim();
  const isMyTurn = normalizedCurrentTurn === normalizedMyRole && game.current_turn && currentPlayer.role;
  const canAct = currentPlayer.is_alive && isMyTurn && !hasActed;
  
  // Debug: Log comparison details
  useEffect(() => {
    if (game.current_turn) {
      console.log('[NightPhase] Turn comparison:', {
        'game.current_turn (original)': game.current_turn,
        'game.current_turn (normalized)': normalizedCurrentTurn,
        'currentPlayer.role (original)': currentPlayer.role,
        'currentPlayer.role (normalized)': normalizedMyRole,
        'match': normalizedCurrentTurn === normalizedMyRole,
        'isMyTurn': isMyTurn
      });
    }
  }, [game.current_turn, currentPlayer.role, normalizedCurrentTurn, normalizedMyRole, isMyTurn]);

  // Reset selections on turn/day, but do not clear hasActed/actionResult to keep message visible
  useEffect(() => {
    setSelectedTarget(null);
    // no-op for removed hunter target
  }, [game.current_turn, game.day_number]);

  // (No countdown timer; message is transient)
  
  // Debug logging
  useEffect(() => {
    console.log('[NightPhase] Game status:', game.status);
    console.log('[NightPhase] Day number:', game.day_number);
    console.log('[NightPhase] Current turn:', game.current_turn);
    console.log('[NightPhase] Current player role:', currentPlayer.role);
    console.log('[NightPhase] Current player name:', currentPlayer.name);
    console.log('[NightPhase] Current player alive:', currentPlayer.is_alive);
    console.log('[NightPhase] Has acted:', hasActed);
    console.log('[NightPhase] Is my turn?', isMyTurn);
    console.log('[NightPhase] Can act?', canAct);
    console.log('[NightPhase] Comparison:', {
      'game.current_turn': game.current_turn,
      'currentPlayer.role': currentPlayer.role,
      'match': game.current_turn === currentPlayer.role
    });
  }, [game.status, game.day_number, game.current_turn, currentPlayer.role, currentPlayer.name, currentPlayer.is_alive, hasActed, isMyTurn, canAct]);

  // Auto-skip Sorcière if her poison was already used (single-use)
  useEffect(() => {
    const autoSkip = async () => {
      try {
        if (isMyTurn && currentPlayer.role === 'sorciere' && (currentPlayer as any).witch_poison_used && !hasActed) {
          await api.executeAction(gameId, currentPlayer.name);
          setHasActed(true);
          const g = await api.getGame(gameId);
          if (g && g.status === 'night' && (!g.current_turn || g.current_turn === '')) {
            try { await api.setPhase(gameId, 'discussion'); } catch {}
          }
        }
      } catch (e) {
        console.error('Failed to auto-skip sorciere:', e);
      }
    };
    autoSkip();
  }, [isMyTurn, currentPlayer.role, (currentPlayer as any).witch_poison_used, hasActed, gameId, currentPlayer.name]);

  // Get alive players excluding self
  // For Salvateur: also exclude last protected player (if applicable)
  const availableTargets = players.filter(p => {
    if (!p.is_alive) return false;
    if (p.id === currentPlayer.id) return false;
    
    // Salvateur can't protect the same person twice in a row
    // TODO: Track last protected player via backend
    return true;
  });

  // Debug: Log available targets
  useEffect(() => {
    console.log('[NightPhase] Available targets:', availableTargets.map(p => ({ name: p.name, alive: p.is_alive })));
    console.log('[NightPhase] Total players:', players.length);
    console.log('[NightPhase] Alive players:', players.filter(p => p.is_alive).length);
  }, [availableTargets, players]);

  const handleAction = async () => {
    // Sorcière can skip without a target
    const isWitch = currentPlayer.role === 'sorciere';
    if ((!selectedTarget && !isWitch) || !canAct || loading) return;

    const targetPlayer = selectedTarget ? players.find(p => p.id === selectedTarget) : null;
    if (selectedTarget && !targetPlayer) return;

    setLoading(true);

    try {
      console.log(`[NightPhase] Player ${currentPlayer.name} (${currentPlayer.role}) acting on ${targetPlayer ? targetPlayer.name : 'no target (skip)'}`);
      
      // Set target first (if any)
      if (targetPlayer) {
        await api.setTarget(gameId, currentPlayer.name, targetPlayer.name);
      }
      
      // Then execute the action
      const result = await api.executeAction(gameId, currentPlayer.name);

      if (result.success || result.hasActed) {
        setHasActed(true);

        // Store action result if available (e.g., Voyante seeing a role)
        if (result.actionResult) {
          setActionResult(result.actionResult);
          console.log(`[NightPhase] Action result:`, result.actionResult);
        } else if (isWitch && !targetPlayer) {
          setActionResult({ message: 'Vous passez votre tour' });
        }

        console.log(`[NightPhase] Action executed successfully`);

        // Keep message visible ~7s
        setTimeout(() => setHasActed(false), 7000);

        // Refresh game state and ensure transition to day if all roles done
        const g = await api.getGame(gameId);
        if (g && g.status === 'night' && (!g.current_turn || g.current_turn === '')) {
          try {
            await api.setPhase(gameId, 'discussion');
          } catch {}
        }
      }
    } catch (err: any) {
      console.error('Failed to perform action:', err);
      alert(err.message || 'Erreur lors de l\'action');
    } finally {
      setLoading(false);
    }
  };

  // Removed hunter shot handler (auto on backend)

  // Not needed - backend handles turn progression automatically after action
  // This is just for refreshing if needed

  const getRoleIcon = () => {
    switch (currentPlayer.role) {
      case 'loup_garou':
        return <Skull className="w-8 h-8" />;
      case 'voyante':
        return <Eye className="w-8 h-8" />;
      case 'salvateur':
        return <Shield className="w-8 h-8" />;
      case 'sorciere':
        return <Droplet className="w-8 h-8" />;
      default:
        return <Moon className="w-8 h-8" />;
    }
  };

  const getRoleAction = () => {
    switch (currentPlayer.role) {
      case 'loup_garou':
        return 'Choisissez une victime';
      case 'voyante':
        return 'Choisissez un joueur à examiner';
      case 'salvateur':
        return 'Choisissez un joueur à protéger';
      default:
        return 'Attendez votre tour';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-900/30 rounded-full mb-4">
            <Moon className="w-8 h-8 text-blue-300" />
          </div>
          <h1 className="text-4xl font-bold text-blue-100 mb-2">
            Nuit {game.day_number}
          </h1>
          <p className="text-blue-300">
            Le village dort...
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-blue-800/50 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center text-blue-300">
              {getRoleIcon()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-100">
                {ROLE_NAMES[currentPlayer.role as keyof typeof ROLE_NAMES] || 'Sans rôle'}
              </h2>
              <p className="text-blue-300 text-sm">
                {isMyTurn ? getRoleAction() : 'En attente...'}
              </p>
            </div>
          </div>

          {!currentPlayer.is_alive && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200 text-center">
                Vous êtes mort. Vous ne pouvez plus agir.
              </p>
            </div>
          )}

          {currentPlayer.is_alive && !isMyTurn && (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <p className="text-blue-200 text-center">
                {game.current_turn ? `C'est le tour des ${ROLE_NAMES[game.current_turn as keyof typeof ROLE_NAMES] || game.current_turn}` : 'En attente...'}
              </p>
            </div>
          )}

          {canAct && (
            <div className="space-y-4">
              {availableTargets.length === 0 ? (
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
                  <p className="text-yellow-200 text-center">
                    Aucun joueur disponible (Total: {players.length}, Vivants: {players.filter(p => p.is_alive).length})
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableTargets.map(player => (
                      <button
                        key={player.id}
                        onClick={() => {
                          console.log('[NightPhase] Clicked on player:', player.name, player.id);
                          setSelectedTarget(player.id);
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedTarget === player.id
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold mx-auto mb-2">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium">{player.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleAction}
                    disabled={!selectedTarget || loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Action en cours...' : 'Confirmer'}
                  </button>
                  {currentPlayer.role === 'sorciere' && (
                    <button
                      onClick={handleAction}
                      disabled={loading}
                      className="w-full bg-slate-700 text-slate-100 py-3 rounded-lg font-semibold hover:bg-slate-600 transition-all"
                    >
                      Passer
                    </button>
                  )}
                </>
              )}
            </div>
          )}

        {/* Dead Hunter UI removed - handled automatically by backend */}

          {/* Debug info - remove this later */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
              <p>Debug: canAct={canAct ? 'true' : 'false'}, isMyTurn={isMyTurn ? 'true' : 'false'}, currentTurn={game.current_turn || 'none'}, myRole={currentPlayer.role || 'none'}</p>
              <p>Players: {players.length}, Alive: {players.filter(p => p.is_alive).length}, Available: {availableTargets.length}</p>
            </div>
          )}

          {hasActed && (
            <div className="space-y-4">
              <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                <p className="text-green-200 text-center font-medium mb-2">
                  ✓ Votre action a été effectuée
                </p>
                
                {/* Display action result/confirmation */}
                {actionResult && (
                  <div className="mt-4 bg-blue-900/40 border border-blue-500/50 rounded-lg p-4">
                    {actionResult.actionType === 'seer_vision' && (
                      <>
                        <p className="text-blue-100 text-center text-sm mb-2">
                          🔍 Résultat de votre vision :
                        </p>
                        <p className="text-blue-200 text-center font-semibold text-lg">
                          {actionResult.targetName} est {actionResult.targetRole && actionResult.targetRole in ROLE_NAMES 
                            ? ROLE_NAMES[actionResult.targetRole as keyof typeof ROLE_NAMES]
                            : actionResult.targetRoleName || 'Sans rôle'}
                        </p>
                      </>
                    )}
                    {(actionResult.actionType === 'werewolf_kill' || 
                      actionResult.actionType === 'salvateur_protect' || 
                      actionResult.actionType === 'witch_poison') && (
                      <p className="text-blue-200 text-center font-semibold text-lg">
                        {actionResult.message || (actionResult.targetName ? `Action sur ${actionResult.targetName} confirmée` : 'Action confirmée')}
                      </p>
                    )}
                  </div>
                )}
                
                <p className="text-green-300 text-center text-sm mt-3">Message affiché 7 secondes…</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-blue-800/50 p-6">
          <h3 className="text-lg font-semibold text-blue-100 mb-4">
            Joueurs vivants
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {players.filter(p => p.is_alive).map(player => (
              <div
                key={player.id}
                className="bg-slate-800/50 rounded-lg p-3 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold mx-auto mb-2">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-slate-300 text-sm">{player.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Graveyard gameId={gameId} isNightPhase={true} />
        </div>
      </div>
    </div>
  );
}

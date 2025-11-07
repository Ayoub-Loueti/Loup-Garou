import { useState, useEffect } from 'react';
import { Sun, MessageCircle, Vote, Skull } from 'lucide-react';
import { Game, Player, DayVote } from '../types/game';
import { supabase } from '../lib/supabase';
import { checkWinCondition } from '../lib/gameLogic';
import Graveyard from './Graveyard';
import { api } from '../lib/api';

interface DayPhaseProps {
  game: Game;
  gameId: string;
  currentPlayer: Player;
  players: Player[];
}

export default function DayPhase({ game, gameId, currentPlayer, players }: DayPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  // Removed dead hunter manual UI; Hunter kill is automatic now
  const [votes, setVotes] = useState<{ voterName: string; targetName: string }[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentDeath, setRecentDeath] = useState<Player | null>(null);
  const [discussionEndsAt, setDiscussionEndsAt] = useState<string | null>(null);
  const [votingEndsAt, setVotingEndsAt] = useState<string | null>(null);

  useEffect(() => {
    checkRecentDeath();
    fetchVotes();
  }, [game.day_number]);

  // Poll votes during voting phase so counts update live
  useEffect(() => {
    if (game.phase !== 'voting') return;
    const interval = setInterval(() => {
      fetchVotes();
    }, 2000);
    return () => clearInterval(interval);
  }, [game.phase, gameId, game.day_number]);

  useEffect(() => {
    // If we enter discussion without an end time, start a local 15s countdown
    if (game.phase === 'discussion' && !game.discussion_end_time) {
      setDiscussionEndsAt(new Date(Date.now() + 15000).toISOString());
    } else if (game.phase !== 'discussion') {
      setDiscussionEndsAt(null);
    }
    // If we enter voting without an end time, start a local 30s countdown
    if (game.phase === 'voting' && !game.voting_end_time) {
      setVotingEndsAt(new Date(Date.now() + 30000).toISOString());
    } else if (game.phase !== 'voting') {
      setVotingEndsAt(null);
    }
  }, [game.phase, game.discussion_end_time]);

  useEffect(() => {
    const endTime = game.phase === 'discussion'
      ? (game.discussion_end_time || discussionEndsAt)
      : (game.voting_end_time || votingEndsAt);

    if (!endTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        if (game.phase === 'discussion') {
          // Prefer backend transition; fallback to Supabase
          api.setPhase(gameId, 'voting').catch(() => handleDiscussionEnd());
        } else {
          handleVotingEnd();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game.phase, game.discussion_end_time, game.voting_end_time, discussionEndsAt, votingEndsAt, gameId]);

  const checkRecentDeath = async () => {
    if (game.day_number <= 1) return;

    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_alive', false);

    if (data && data.length > 0) {
      const lastDeath = data[data.length - 1];
      setRecentDeath(lastDeath);
    }
  };

  const fetchVotes = async () => {
    try {
      const { votes } = await api.getDayVotes(gameId, game.day_number);
      setVotes(votes);
      const voted = votes.some(v => v.voterName === currentPlayer.name);
      setHasVoted(voted);
    } catch (e) {
      console.error('Failed to fetch votes:', e);
    }
  };

  const handleDiscussionEnd = async () => {
    if (game.phase !== 'discussion') return;

    // Switch to voting via backend API; fallback to Supabase if API fails
    try {
      await api.setPhase(gameId, 'voting');
    } catch (e) {
    const votingEndTime = new Date(Date.now() + 30000).toISOString();
    await supabase
      .from('games')
      .update({
        phase: 'voting',
        voting_end_time: votingEndTime,
      })
      .eq('id', gameId);
    }
  };

  const handleVote = async () => {
    if (!selectedTarget || !currentPlayer.is_alive || loading) return;

    setLoading(true);

    try {
      const target = players.find(p => p.id === selectedTarget);
      if (!target) throw new Error('Target not found');
      await api.submitDayVote(gameId, currentPlayer.name, target.name);

      // Optimistic update
      setHasVoted(true);
      setVotes(prev => {
        const filtered = prev.filter(v => v.voterName !== currentPlayer.name);
        return [...filtered, { voterName: currentPlayer.name, targetName: target.name }];
      });
      // Also refresh from backend
      fetchVotes();
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVotingEnd = async () => {
    if (game.phase !== 'voting' || loading) return;

    setLoading(true);

    try {
      // Let backend resolve votes atomically and advance loop
      await api.resolveVote(gameId);
    } catch (err) {
      console.error('Failed to process votes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dead Hunter manual shot removed (auto-handled on death)

  const getVoteCount = (playerId: string) => {
    return votes.filter(v => {
      const t = players.find(p => p.name === v.targetName);
      return t && t.id === playerId;
    }).length;
  };

  const alivePlayers = players.filter(p => p.is_alive);
  const availableTargets = alivePlayers.filter(p => p.id !== currentPlayer.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-600/20 rounded-full mb-4">
            <Sun className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-4xl font-bold text-amber-900 mb-2">
            Jour {game.day_number}
          </h1>
          <p className="text-amber-700">
            {game.phase === 'discussion' ? 'Discussion' : 'Vote'}
          </p>
        </div>

        {recentDeath && game.day_number > 1 && (
          <div className="bg-red-100 border-2 border-red-400 rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Skull className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl font-bold text-red-900">
                Tragédie cette nuit
              </h2>
            </div>
            <p className="text-center text-red-800 text-lg">
              <span className="font-bold">{recentDeath.name}</span> a été retrouvé mort ce matin...
            </p>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-amber-300 p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {game.phase === 'discussion' ? (
                <MessageCircle className="w-8 h-8 text-amber-600" />
              ) : (
                <Vote className="w-8 h-8 text-amber-600" />
              )}
              <h2 className="text-2xl font-bold text-amber-900">
                {game.phase === 'discussion' ? 'Discussion' : 'Temps de voter'}
              </h2>
            </div>
            <div className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>

          {!currentPlayer.is_alive && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <p className="text-red-800 text-center">
                Vous êtes mort. Vous ne pouvez plus participer au vote.
              </p>
            </div>
          )}

          {currentPlayer.is_alive && game.phase === 'discussion' && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
              <p className="text-blue-800 text-center">
                Discutez avec les autres joueurs pour identifier les loups-garous.
                Le vote commencera bientôt...
              </p>
            </div>
          )}

          {currentPlayer.is_alive && game.phase === 'voting' && !hasVoted && (
            <div className="space-y-4">
              <p className="text-amber-800 text-center font-medium">
                Votez pour éliminer un joueur suspect
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableTargets.map(player => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedTarget(player.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTarget === player.id
                        ? 'bg-amber-600 border-amber-700 text-white'
                        : 'bg-white border-amber-300 text-amber-900 hover:border-amber-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold mx-auto mb-2">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {getVoteCount(player.id)} votes
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleVote}
                disabled={!selectedTarget || loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Vote en cours...' : 'Confirmer le vote'}
              </button>
            </div>
          )}

          {hasVoted && game.phase === 'voting' && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <p className="text-green-800 text-center">
                Votre vote a été enregistré. En attente des autres joueurs...
              </p>
            </div>
          )}
        </div>

      {/* Dead Hunter UI removed - handled automatically */}

        <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-amber-300 p-6 shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">
            Joueurs vivants ({alivePlayers.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {alivePlayers.map(player => (
              <div
                key={player.id}
                className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold mx-auto mb-2">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-amber-900 text-sm font-medium">{player.name}</p>
                {game.phase === 'voting' && (
                  <p className="text-amber-600 text-xs mt-1">
                    {getVoteCount(player.id)} votes
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <Graveyard gameId={gameId} isNightPhase={false} />
      </div>
    </div>
  );
}

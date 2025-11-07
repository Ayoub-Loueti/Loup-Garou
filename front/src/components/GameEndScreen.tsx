import { useState, useEffect } from 'react';
import { Trophy, Moon, Users, Skull } from 'lucide-react';
import { Game, Player, ROLE_NAMES } from '../types/game';
import { api } from '../lib/api';

interface GameEndScreenProps {
  game: Game;
  gameId: string;
}

export default function GameEndScreen({ game, gameId }: GameEndScreenProps) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    fetchPlayers();
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

  const villageoisWon = game.winner === 'villagers';
  const werewolves = players.filter(p => p.role === 'loup_garou');
  const winners = villageoisWon
    ? players.filter(p => p.role !== 'loup_garou')
    : werewolves;

  return (
    <div className={`min-h-screen p-4 ${
      villageoisWon
        ? 'bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100'
        : 'bg-gradient-to-b from-red-950 via-red-900 to-slate-950'
    }`}>
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            villageoisWon
              ? 'bg-amber-600/20'
              : 'bg-red-900/50'
          }`}>
            <Trophy className={`w-10 h-10 ${
              villageoisWon ? 'text-amber-600' : 'text-red-300'
            }`} />
          </div>
          <h1 className={`text-5xl font-bold mb-2 ${
            villageoisWon ? 'text-amber-900' : 'text-red-100'
          }`}>
            {villageoisWon ? 'Victoire des Villageois!' : 'Victoire des Loups-Garous!'}
          </h1>
          <p className={`text-lg ${
            villageoisWon ? 'text-amber-700' : 'text-red-300'
          }`}>
            {villageoisWon
              ? 'Le village est sauvé! Tous les loups-garous ont été éliminés.'
              : 'Les loups-garous ont pris le contrôle du village...'}
          </p>
        </div>

        <div className={`rounded-xl p-8 mb-6 shadow-2xl ${
          villageoisWon
            ? 'bg-white/80 backdrop-blur-sm border-2 border-amber-300'
            : 'bg-slate-900/50 backdrop-blur-sm border-2 border-red-800'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Trophy className={`w-8 h-8 ${
              villageoisWon ? 'text-amber-600' : 'text-red-400'
            }`} />
            <h2 className={`text-3xl font-bold ${
              villageoisWon ? 'text-amber-900' : 'text-red-100'
            }`}>
              Gagnants
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {winners.map(player => (
              <div
                key={player.id}
                className={`p-4 rounded-lg text-center ${
                  villageoisWon
                    ? 'bg-amber-50 border-2 border-amber-300'
                    : 'bg-red-900/30 border-2 border-red-700'
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3 ${
                  villageoisWon
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                    : 'bg-gradient-to-br from-red-600 to-red-800'
                }`}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <p className={`font-semibold mb-1 ${
                  villageoisWon ? 'text-amber-900' : 'text-red-100'
                }`}>
                  {player.name}
                </p>
                <p className={`text-sm ${
                  villageoisWon ? 'text-amber-700' : 'text-red-300'
                }`}>
                  {player.role && player.role in ROLE_NAMES ? ROLE_NAMES[player.role as keyof typeof ROLE_NAMES] : 'Sans rôle'}
                </p>
                {player.is_alive && (
                  <p className={`text-xs mt-1 ${
                    villageoisWon ? 'text-green-600' : 'text-green-400'
                  }`}>
                    Survivant
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl p-8 mb-6 shadow-2xl ${
          villageoisWon
            ? 'bg-white/80 backdrop-blur-sm border-2 border-amber-300'
            : 'bg-slate-900/50 backdrop-blur-sm border-2 border-red-800'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Users className={`w-8 h-8 ${
              villageoisWon ? 'text-amber-600' : 'text-red-400'
            }`} />
            <h2 className={`text-3xl font-bold ${
              villageoisWon ? 'text-amber-900' : 'text-red-100'
            }`}>
              Tous les joueurs
            </h2>
          </div>

          <div className="space-y-3">
            {players.map(player => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  villageoisWon
                    ? 'bg-amber-50'
                    : 'bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                    player.role === 'loup_garou'
                      ? 'bg-gradient-to-br from-red-600 to-red-800'
                      : 'bg-gradient-to-br from-blue-500 to-blue-700'
                  }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-semibold ${
                      villageoisWon ? 'text-amber-900' : 'text-red-100'
                    }`}>
                      {player.name}
                    </p>
                    <p className={`text-sm ${
                      villageoisWon ? 'text-amber-700' : 'text-red-300'
                    }`}>
                      {player.role && player.role in ROLE_NAMES ? ROLE_NAMES[player.role as keyof typeof ROLE_NAMES] : 'Sans rôle'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!player.is_alive && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      villageoisWon
                        ? 'bg-red-100 text-red-700'
                        : 'bg-red-900/50 text-red-300'
                    }`}>
                      <Skull className="w-4 h-4" />
                      <span className="text-xs font-medium">Mort</span>
                    </div>
                  )}
                  {player.is_alive && (
                    <div className={`px-3 py-1 rounded-full ${
                      villageoisWon
                        ? 'bg-green-100 text-green-700'
                        : 'bg-green-900/50 text-green-300'
                    }`}>
                      <span className="text-xs font-medium">Vivant</span>
                    </div>
                  )}
                  {player.role === 'loup_garou' && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      villageoisWon
                        ? 'bg-red-600 text-white'
                        : 'bg-red-800 text-red-200'
                    }`}>
                      <Moon className="w-4 h-4" />
                      <span className="text-xs font-medium">Loup</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl p-6 text-center ${
          villageoisWon
            ? 'bg-amber-600 text-white'
            : 'bg-red-900 text-red-100'
        }`}>
          <p className="text-lg font-semibold mb-2">
            Partie terminée après {game.day_number} jours
          </p>
          <p className="text-sm opacity-90">
            Merci d'avoir joué à Loup-Garou!
          </p>
        </div>
      </div>
    </div>
  );
}

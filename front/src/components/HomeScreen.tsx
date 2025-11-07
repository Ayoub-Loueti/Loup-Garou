import { useState } from 'react';
import { Moon, Users } from 'lucide-react';
import { api } from '../lib/api';

interface HomeScreenProps {
  onJoinGame: (gameId: string, playerId: string) => void;
}

export default function HomeScreen({ onJoinGame }: HomeScreenProps) {
  const [mode, setMode] = useState<'menu' | 'host' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleHostGame = async () => {
    if (!playerName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.createGame(playerName.trim());
      
      // Backend returns { game, player, players, join_code }
      console.log('Game created:', {
        code: result.join_code || result.game.join_code,
        players: result.players || [result.player]
      });
      
      onJoinGame(result.game.id, result.player.id);
    } catch (err: any) {
      setError(err.message || 'Échec de la création de la partie. Veuillez réessayer.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }

    if (!joinCode.trim()) {
      setError('Veuillez entrer un code de partie');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.joinGame(joinCode.trim(), playerName.trim());
      
      // Backend returns { game, player, players, join_code }
      console.log('Game joined:', {
        code: result.join_code || result.game.join_code,
        totalPlayers: result.players?.length || 0,
        players: result.players?.map((p: any) => p.name) || []
      });

      onJoinGame(result.game.id, result.player.id);
    } catch (err: any) {
      setError(err.message || 'Échec de la connexion à la partie. Veuillez réessayer.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-600/20 rounded-full mb-4">
            <Moon className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-5xl font-bold text-amber-100 mb-2 tracking-wide">
            Loup-Garou
          </h1>
          <p className="text-slate-400 text-sm">
            Un jeu de déduction sociale pour 6-8 joueurs
          </p>
        </div>

        {mode === 'menu' && (
          <div className="space-y-4 animate-fadeIn">
            <button
              onClick={() => setMode('host')}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-amber-500 hover:to-orange-500 transition-all transform hover:scale-105 shadow-lg"
            >
              Héberger une partie
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-slate-700 text-slate-100 py-4 rounded-lg font-semibold text-lg hover:bg-slate-600 transition-all transform hover:scale-105 shadow-lg"
            >
              Rejoindre une partie
            </button>
          </div>
        )}

        {mode === 'host' && (
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-slate-700 animate-fadeIn">
            <h2 className="text-2xl font-bold text-amber-100 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Héberger une partie
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Votre nom
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Entrez votre nom"
                  maxLength={20}
                />
              </div>
              {error && (
                <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode('menu');
                    setError('');
                  }}
                  className="flex-1 bg-slate-700 text-slate-100 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleHostGame}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-lg font-medium hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-slate-700 animate-fadeIn">
            <h2 className="text-2xl font-bold text-amber-100 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Rejoindre une partie
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Votre nom
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Entrez votre nom"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Code de partie
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider font-mono"
                  placeholder="XXXXXX"
                  maxLength={6}
                />
              </div>
              {error && (
                <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode('menu');
                    setError('');
                  }}
                  className="flex-1 bg-slate-700 text-slate-100 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleJoinGame}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-lg font-medium hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connexion...' : 'Rejoindre'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

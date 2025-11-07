import { useEffect, useState } from 'react';
import { Skull } from 'lucide-react';
import { ROLE_NAMES, Role } from '../types/game';
import { ROLE_IMAGES } from '../lib/images';
import { api } from '../lib/api';

interface GraveyardProps {
  gameId: string;
  isNightPhase?: boolean;
}

// Map backend role names to frontend role keys
const backendToFrontendRole: Record<string, Role> = {
  'Loup-Garou': 'loup_garou',
  'Voyante': 'voyante',
  'Sorcière': 'sorciere',
  'Chasseur': 'chasseur',
  'Simple Villageois': 'villageois',
  'Salvateur': 'salvateur',
};

export default function Graveyard({ gameId, isNightPhase = false }: GraveyardProps) {
  const [deadCards, setDeadCards] = useState<{ player: string; role: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!gameId) return;
        const data = await api.getGraveyard(gameId);
        setDeadCards(data);
      } catch (e) {
        console.error('Failed to fetch graveyard:', e);
      }
    };
    if (!gameId) return;
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  if (!gameId || !Array.isArray(deadCards) || deadCards.length === 0) return null;

  return (
    <div className={`rounded-xl p-6 shadow-lg border-2 ${
      isNightPhase
        ? 'bg-slate-900/50 backdrop-blur-sm border-blue-800/50'
        : 'bg-white/80 backdrop-blur-sm border-amber-300'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <Skull className={`w-6 h-6 ${isNightPhase ? 'text-blue-300' : 'text-amber-700'}`} />
        <h3 className={`text-lg font-semibold ${
          isNightPhase ? 'text-blue-100' : 'text-amber-900'
        }`}>
          Cimetière ({deadCards.length})
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {deadCards.map((card, idx) => {
          const roleKey = backendToFrontendRole[card.role] as Role | undefined;
          const img = roleKey ? ROLE_IMAGES[roleKey] : undefined;
          const roleLabel = roleKey ? ROLE_NAMES[roleKey] : card.role;
          return (
          <div
            key={`${card.player}-${idx}`}
            className={`rounded-lg overflow-hidden shadow-md border-2 ${
              isNightPhase
                ? 'bg-slate-800/50 border-slate-700'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="relative aspect-[2/3]">
              {img && (
              <img
                  src={img}
                  alt={roleLabel}
                className="w-full h-full object-cover opacity-60 grayscale"
              />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Skull className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <div className={`p-2 text-center ${
              isNightPhase ? 'bg-slate-900/50' : 'bg-amber-100'
            }`}>
              <p className={`font-medium text-sm truncate ${
                isNightPhase ? 'text-blue-200' : 'text-amber-900'
              }`}>
                {card.player}
              </p>
              <p className={`text-xs ${
                isNightPhase ? 'text-blue-400' : 'text-amber-700'
              }`}>
                {roleLabel}
              </p>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

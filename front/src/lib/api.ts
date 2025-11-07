const API_BASE_URL = 'http://localhost:3002/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async createGame(playerName: string): Promise<{ game: any; player: any }> {
    const response = await fetch(`${this.baseUrl}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create game' }));
      throw new Error(error.error || 'Failed to create game');
    }

    return response.json();
  }

  async joinGame(joinCode: string, playerName: string): Promise<{ game: any; player: any }> {
    const response = await fetch(`${this.baseUrl}/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinCode: joinCode.toUpperCase(), playerName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to join game' }));
      
      if (response.status === 404) {
        throw new Error('Game not found');
      }
      
      throw new Error(error.error || 'Failed to join game');
    }

    return response.json();
  }

  async getGame(gameId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get game' }));
      
      if (response.status === 404) {
        throw new Error('Game not found');
      }
      
      throw new Error(error.error || 'Failed to get game');
    }

    return response.json();
  }

  async getPlayers(gameId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/players`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get players' }));
      throw new Error(error.error || 'Failed to get players');
    }

    return response.json();
  }

  async assignRole(gameId: string, playerName: string, role: string): Promise<any> {
    if (!role) {
      throw new Error('Role is required');
    }

    console.log(`[API] Assigning role ${role} to ${playerName} in game ${gameId}`);

    const response = await fetch(`${this.baseUrl}/games/${gameId}/players/${encodeURIComponent(playerName)}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to assign role' }));
      console.error(`[API] Failed to assign role:`, error);
      throw new Error(error.error || 'Failed to assign role');
    }

    const result = await response.json();
    console.log(`[API] Successfully assigned role ${role} to ${playerName}`);
    return result;
  }

  async setTarget(gameId: string, playerName: string, targetName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/players/${playerName}/target`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to set target' }));
      throw new Error(error.error || 'Failed to set target');
    }

    return response.json();
  }

  async executeAction(gameId: string, playerName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/players/${playerName}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to execute action' }));
      throw new Error(error.error || 'Failed to execute action');
    }

    return response.json();
  }

  async eliminate(gameId: string, targetName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/eliminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to eliminate player' }));
      throw new Error(error.error || 'Failed to eliminate player');
    }

    return response.json();
  }

  async setPhase(gameId: string, phase: string): Promise<any> {
    console.log(`[API] Setting phase to ${phase} for game ${gameId}`);
    
    const response = await fetch(`${this.baseUrl}/games/${gameId}/phase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to set phase' }));
      console.error(`[API] Failed to set phase:`, error);
      throw new Error(error.error || 'Failed to set phase');
    }

    const result = await response.json();
    console.log(`[API] Phase set successfully:`, result);
    return result;
  }

  async nextRound(gameId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/next-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to advance round' }));
      throw new Error(error.error || 'Failed to advance round');
    }

    return response.json();
  }

  async submitDayVote(gameId: string, voterName: string, targetName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterName, targetName })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to submit vote' }));
      throw new Error(error.error || 'Failed to submit vote');
    }
    return response.json();
  }

  async getDayVotes(gameId: string, day?: number): Promise<{ day: number; votes: { voterName: string; targetName: string }[] }> {
    const url = day ? `${this.baseUrl}/games/${gameId}/day-votes?day=${day}` : `${this.baseUrl}/games/${gameId}/day-votes`;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get day votes' }));
      // If backend not ready for this route, treat as no votes yet
      if (response.status === 404) {
        return { day: day || 1, votes: [] };
      }
      throw new Error(error.error || 'Failed to get day votes');
    }
    return response.json();
  }

  async resolveVote(gameId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/resolve-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to resolve vote' }));
      throw new Error(error.error || 'Failed to resolve vote');
    }
    return response.json();
  }

  async getGraveyard(gameId: string): Promise<{ player: string; role: string }[]> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/graveyard`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get graveyard' }));
      throw new Error(error.error || 'Failed to get graveyard');
    }
    return response.json();
  }
}

export const api = new ApiClient();

// Game class
class Game {
  constructor() {
    this.players = []; // Array to hold all players
    this.currentPhase = "sleep"; // Initial phase: "sleep", "playRole", "discussion", "vote"
    this.graveyard = new Graveyard(); // Use Graveyard to track eliminated players
    this.code = this.generateCode(); // Unique code for the game
    this.round = 1; // Track current round
  }

  // Generate a random 6-character alphanumeric code
  generateCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Add a player to the game with code validation
  addPlayer(player, joinCode) {
    if (joinCode === this.code && player && !this.players.includes(player)) {
      this.players.push(player);
      console.log(`${player.getName()} joined the game with code ${this.code}`);
    } else if (joinCode !== this.code) {
      console.log(`Invalid code ${joinCode} for ${player.getName()}, join failed.`);
    }
  }

  // Get the game code
  getCode() {
    return this.code;
  }

  // Set the current phase for all players
  setPhase(phase) {
    this.currentPhase = phase;
    this.players.forEach(player => {
      // Do not change state for dead players
      if (player.getState().constructor.name === "DeadPhase") {
        return;
      }
      switch (phase) {
        case "sleep":
          player.setState(new SleepPhase());
          break;
        case "playRole":
          player.setState(new PlayRolePhase());
          break;
        case "discussion":
          player.setState(new DiscussionPhase());
          break;
        case "vote":
          player.setState(new VotePhase());
          break;
      }
    });
    console.log(`Game phase changed to ${phase}`);
  }

  // Start the night phase, triggering role actions
  startNight() {
    this.setPhase("playRole");
    this.players.forEach(player => {
      if (player.getState().canAct()) {
        player.performAction();
      }
    });
  }

  // Start the day phase, including discussion and voting
  startDay() {
    this.setPhase("discussion");
    this.players.forEach(player => {
      if (player.getState().canAct()) {
        player.performAction();
      }
    });
    this.setPhase("vote");
    this.players.forEach(player => {
      if (player.getState().canAct()) {
        player.performAction();
      }
    });
  }

  // Move eliminated players to graveyard (using Graveyard class)
  moveToGraveyard(player) {
    if (player.getState().constructor.name === "DeadPhase") {
      // Avoid duplicates
      if (this.graveyard.hasPlayer && this.graveyard.hasPlayer(player)) {
        return;
      }
      // Create a DeadCard for the player's last role and add to graveyard
      const deadCard = new DeadCard(player);
      this.graveyard.addCard(deadCard);
      if (player.getRole()) {
        const role = player.getRole();
        const roleName = role && role.getName ? role.getName() : '';
        // Do not remove Chasseur role until after they shoot (keep role so UI can target)
        if (roleName === 'Chasseur' && role.isActive) {
          // Keep role; will be removed after shot by role logic
        } else {
          player.removeRole();
        }
      }
    }
  }

  // Expose graveyard
  getGraveyard() {
    return this.graveyard;
  }

  // Get the number of living players
  getLivingPlayers() {
    return this.players.filter(player => player.getState().constructor.name !== "DeadPhase");
  }

  // Round helpers
  getRound() {
    return this.round;
  }

  nextRound() {
    this.round += 1;
    console.log(`\n=== Starting Round ${this.round} ===`);
  }

  // Win condition helpers
  isWolf(player) {
    const role = player.getRole();
    return !!role && role.getName && role.getName() === 'Loup-Garou';
  }

  getLivingWolvesCount() {
    return this.getLivingPlayers().filter(p => this.isWolf(p)).length;
  }

  evaluateWin() {
    const living = this.getLivingPlayers();
    const wolves = living.filter(p => this.isWolf(p)).length;
    const others = living.length - wolves;
    if (wolves === 0) return 'villagers';
    if (wolves >= others) return 'wolves';
    return null;
  }

  // Alias for checkWinCondition (used by server)
  checkWinCondition() {
    const result = this.evaluateWin();
    if (result === 'wolves') return 'werewolves';
    return result;
  }
}

class Graveyard extends ICard {
  constructor() {
    super();
    this.deadCards = []; // Array to hold DeadCard objects
  }

  performAction() {
    if (this.deadCards.length === 0) {
      console.log("Graveyard is empty, no actions to perform.");
    } else {
      console.log("Graveyard actions:");
      this.deadCards.forEach(deadCard => deadCard.performAction());
    }
  }

  getAbility() {
    return `Contains ${this.deadCards.length} role cards`;
  }

  getName() {
    return "Graveyard";
  }

  // Add a DeadCard to the graveyard (preferred API)
  addCard(deadCard) {
    if (!deadCard || !(deadCard instanceof DeadCard)) {
      console.log(`Invalid role card, cannot add to the ${this.getName()}.`);
      return;
    }
    if (!this.deadCards.some(card => card.getPlayerName() === deadCard.getPlayerName())) {
      this.deadCards.push(deadCard);
      console.log(`Added role card: ${deadCard.getRoleName()} to the ${this.getName()}`);
    } else {
      console.log(`${deadCard.getPlayerName()} is already in the ${this.getName()}.`);
    }
  }

  // Backward-compat helper: accept a player and convert to DeadCard
  addPlayer(player) {
    if (player && player.getState().constructor.name === "DeadPhase") {
      this.addCard(new DeadCard(player));
    } else if (player) {
      console.log(`${player.getName()} is not dead or cannot be added to the ${this.getName()}.`);
    }
  }

  hasPlayer(player) {
    if (!player) return false;
    return this.deadCards.some(card => card.getPlayerName() === player.getName());
  }

  // Get the list of DeadCard objects
  getDeadCards() {
    return this.deadCards;
  }

  // Log the current state of the graveyard
  logGraveyard() {
    if (this.deadCards.length === 0) {
      console.log(`${this.getName()} is empty.`);
    } else {
      console.log(`${this.getName()} contains roles:`);
      this.deadCards.forEach(card => {
        console.log(`- ${card.getRoleName()}`);
      });
    }
  }
}
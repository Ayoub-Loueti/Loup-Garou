class VotePhase extends IPlayerState {
  constructor() {
    super();
    this.voteCount = 0; // Track number of votes per phase
  }

  canAct() {
    return this.voteCount < 1; // Limit to one vote per player per phase
  }

  handleAction(player) {
    if (this.canAct()) {
      const target = null; // Placeholder for voting target (to be implemented with game logic)
      if (target && target.getState().constructor.name !== "DeadPhase") {
        console.log(`${player.getName()} voted to eliminate ${target.getName()}`);
        // Simulate a simple majority (e.g., random decision for now)
        if (Math.random() > 0.5) {
          target.setState(new DeadPhase());
          console.log(`${target.getName()} was eliminated by vote`);
        }
        this.voteCount++;
      } else {
        console.log(`${player.getName()} cannot vote for a dead player or no target.`);
      }
    } else {
      console.log(`${player.getName()} has already voted in this phase.`);
    }
  }
}
class VoteCommand extends ICommand {
  constructor(voter, target) {
    super();
    this.voter = voter; // The player casting the vote
    this.target = target; // The player being voted against
    this.executed = false; // Track if command was successfully executed
    this.previousVoteCount = null; // Store vote count before action
  }

  execute() {
    if (!this.voter) {
      console.log("VoteCommand: No voter provided.");
      return;
    }

    if (!this.target) {
      console.log(`${this.voter.getName()} cannot vote without a target.`);
      return;
    }

    // Check if voter is dead
    if (this.voter.getState().constructor.name === "DeadPhase") {
      console.log(`${this.voter.getName()} cannot vote - player is dead.`);
      return;
    }

    // Check if target is dead
    if (this.target.getState().constructor.name === "DeadPhase") {
      console.log(`${this.voter.getName()} cannot vote for ${this.target.getName()} - target is already dead.`);
      return;
    }

    // Get or create vote state
    const state = this.voter.getState();
    const isVotePhase = state.constructor.name === "VotePhase";
    
    // If not in VotePhase, we still allow the vote (state might be DiscussionPhase)
    // The actual vote storage happens in server.js vote store
    
    if (isVotePhase) {
      // Store previous vote count for undo
      this.previousVoteCount = state.voteCount || 0;
      
      // Check if voter can act
      if (!state.canAct || !state.canAct()) {
        console.log(`${this.voter.getName()} has already voted in this phase.`);
        return;
      }
      
      // Increment vote count
      if (state.voteCount !== undefined) {
        state.voteCount++;
      }
    }

    // Note: Actual vote storage happens in server.js dayVotesStore
    // This command just validates and tracks the vote action
    this.executed = true;
    console.log(`${this.voter.getName()} executed a vote command against ${this.target.getName()}`);
  }

  undo() {
    if (!this.executed) {
      console.log(`VoteCommand: Cannot undo - command was not successfully executed.`);
      return;
    }

    // Reset vote count if we stored it
    const state = this.voter.getState();
    if (state.constructor.name === "VotePhase" && this.previousVoteCount !== null) {
      state.voteCount = this.previousVoteCount;
      console.log(`Vote count reset for ${this.voter.getName()}.`);
    }
    
    // Note: Removing vote from dayVotesStore would need to be handled in server.js
    // since the command doesn't have direct access to the store
    console.log(`Vote undo requested. Note: Vote must be removed from vote store separately.`);
  }
}
// Load all necessary classes dynamically
const fs = require('fs');
const path = require('path');

// Define a function to load a class from file
function loadClass(filename) {
  const filePath = path.join(__dirname, filename);
  const code = fs.readFileSync(filePath, 'utf8');
  // Use vm to execute in the global context
  const vm = require('vm');
  vm.runInThisContext(code, filePath);
}

// Load classes in proper order (dependencies first)
loadClass('Icard.js');
loadClass('ICommand.js');
loadClass('IPlayerState.js');
loadClass('CardDecorator.js');  // Load before SimpleVillageois and other decorators
loadClass('SimpleVillageois.js');
loadClass('DeadCard.js');
loadClass('DeadPhase.js');
loadClass('SleepPhase.js');
loadClass('DiscussionPhase.js');
loadClass('PlayRolePhase.js');
loadClass('VotePhase.js');
loadClass('Graveyard.js');
loadClass('LoupGarou.js');
loadClass('Voyante.js');
loadClass('Salvateur.js');
loadClass('Chasseur.js');
loadClass('Sorciere.js');
loadClass('RoleActionCommand.js');
loadClass('VoteCommand.js');
loadClass('Game.js');
loadClass('Player.js');
loadClass('GameController.js');

// Create a new game instance
const game = new Game();

// Display the game code
console.log(`New game created with code: ${game.getCode()}`);

// Example: Add some players to the game
const player1 = new Player("Zoro");
const player2 = new Player("Yasmine");
const player3 = new Player("Ryan");
const player4 = new Player("Samer");
const player5 = new Player("Sirine");
const player6 = new Player("Roua");

// Add players to the game with the game code
const gameCode = game.getCode();
game.addPlayer(player1, gameCode);
game.addPlayer(player2, gameCode);
game.addPlayer(player3, gameCode);
game.addPlayer(player4, gameCode);
game.addPlayer(player5, gameCode);
game.addPlayer(player6, gameCode);

console.log(`Players in game: ${game.players.length}`);
console.log(`Living players: ${game.getLivingPlayers().length}\n`);

// Assign roles to players
console.log("=== Assigning Roles ===");
const baseRole = new SimpleVillageois(null); // Base role for all special roles
player1.setRole(new Voyante(baseRole));      // Zoro - Voyante (Seer)
player2.setRole(new Salvateur(baseRole));    // Yasmine - Salvateur (Savior)
player3.setRole(new LoupGarou(baseRole));    // Ryan - Loup Garou (Werewolf)
player4.setRole(new Sorciere(baseRole));     // Samer - Sorciere (Witch)
player5.setRole(new Chasseur(baseRole)); // Sirine - Chasseur
player6.setRole(new SimpleVillageois(null)); // Roua - Simple Villageois

// Set game and owner references for each role
player1.getRole().setGame(game);
player1.getRole().setOwner(player1);
player2.getRole().setGame(game);
player2.getRole().setOwner(player2);
player3.getRole().setGame(game);
player3.getRole().setOwner(player3);
player5.getRole().setGame(game);
player5.getRole().setOwner(player5);

console.log("All roles assigned\n");

// Start the night phase (sets phase but doesn't auto-execute for controlled flow)
console.log("=== Night Phase Begins ===");
console.log("Each role will select their own target during their turn.\n");
game.setPhase("playRole"); // Set phase without auto-executing

console.log("=== Player Actions in Order ===");
// 1. Voyante (Zoro) sees role of Sirine (player5)
console.log("\n1. Voyante's turn:");
player1.getRole().performAction();

// 2. Salvateur (Yasmine) protects Sirine (player5)
console.log("\n2. Salvateur's turn:");
player2.getRole().performAction();

// 3. Loup Garou (Ryan) tries to attack Sirine (player5) - should be protected
console.log("\n3. Loup Garou's turn:");
player3.getRole().performAction();

// 4. Sorciere (Samer) skips
console.log("\n4. Sorciere's turn:");
console.log("Sorciere chose to skip this turn.");

console.log("\n=== Night Phase Ends ===");
console.log(`Living players: ${game.getLivingPlayers().length}\n`);

// Day: Discussion Phase
console.log("=== Discussion Phase ===");
game.setPhase("discussion");
game.players.forEach(player => {
  if (player.getState().canAct()) {
    player.performAction();
  }
});

// Day: Vote Phase - all vote to eliminate Roua (player6)
console.log("\n=== Vote Phase ===");
game.setPhase("vote");
console.log("All players vote to eliminate Roua.");
// Simulate votes (logging only)
game.getLivingPlayers().forEach(voter => {
  if (voter !== player6) {
    console.log(`${voter.getName()} votes for ${player6.getName()}`);
  }
});
// Apply result: eliminate Roua
player6.setState(new DeadPhase());
game.moveToGraveyard(player6);
console.log(`\n${player6.getName()} has been eliminated by vote.`);

console.log(`\nLiving players: ${game.getLivingPlayers().length}`);
console.log("Players and states:");
game.players.forEach(player => {
  console.log(`- ${player.getName()} (${player.getState().constructor.name})`);
});

console.log("\nGraveyard:");
game.getGraveyard().logGraveyard();

// ROUND 2
game.nextRound();

// Update role refs (no role changes mid-game)
player1.getRole().setGame(game); player1.getRole().setOwner(player1);
player2.getRole().setGame(game); player2.getRole().setOwner(player2);
player3.getRole().setGame(game); player3.getRole().setOwner(player3);
player4.getRole().setGame(game); player4.getRole().setOwner(player4);

console.log("\n=== Night Phase (Round 2) ===");
game.setPhase("playRole");

// Forced targets for round 2 per requirements
// Reset any previous night protection for Salvateur
if (player2.getRole().resetProtection) player2.getRole().resetProtection();
player1.getRole().setTarget(player5); // Voyante sees Chasseur (player5)
player2.getRole().setTarget(player4); // Salvateur protects Sorciere (player4)
player3.getRole().setTarget(player4); // LoupGarou attacks Sorciere (player4)
player4.getRole().setTarget(player1); // Sorciere kills Voyante (player1) with potion

console.log("\n1. Voyante's turn:");
player1.getRole().performAction();

console.log("\n2. Salvateur's turn:");
player2.getRole().performAction();

console.log("\n3. Loup Garou's turn:");
player3.getRole().performAction();

console.log("\n4. Sorciere's turn:");
if (player4.getState().constructor.name !== 'DeadPhase') {
  player4.getRole().performAction();
  if (player1.getState().constructor.name === 'DeadPhase') {
    game.moveToGraveyard(player1);
  }
} else {
  console.log("Sorciere is dead and cannot use the potion.");
}

console.log("\n=== Discussion Phase (Round 2) ===");
game.setPhase("discussion");
game.players.forEach(player => { if (player.getState().canAct()) player.performAction(); });

console.log("\n=== Vote Phase (Round 2) ===");
game.setPhase("vote");
console.log("Votes: 2 for Sorciere (Samer), 2 for Loup-Garou (Ryan) -> Draw");
console.log("Zoro votes Sorciere");
console.log("Yasmine votes Sorciere");
console.log("Ryan votes Loup-Garou");
console.log("Samer votes Loup-Garou");
console.log("It's a draw. No one is eliminated this round.");

// Advance to round 3
game.nextRound();

// === Night Phase (Round 3) ===
console.log("\n=== Night Phase (Round 3) ===");
game.setPhase("playRole");

// Salvateur protects player3; Loup kills player5; Chasseur (player5) shoots player3
if (player2.getRole().resetProtection) player2.getRole().resetProtection();
player2.getRole().setTarget(player3); // protect player3
player3.getRole().setTarget(player5); // wolves target player5
if (player5.getRole() && player5.getRole().setTarget) {
  player5.getRole().setTarget(player3); // Chasseur will shoot player3 upon death
}

console.log("\n1. Voyante's turn (no forced action in round 3):");
if (player1.getState().constructor.name !== 'DeadPhase') {
  player1.getRole().performAction();
} else {
  console.log("Voyante is dead and cannot act.");
}

console.log("\n2. Salvateur's turn:");
player2.getRole().performAction();

console.log("\n3. Loup Garou's turn:");
player3.getRole().performAction();

console.log("\n4. Sorciere's turn:");
console.log("Sorciere has already used the potion and cannot act.");

console.log("\n=== Discussion Phase (Round 3) ===");
game.setPhase("discussion");
game.players.forEach(player => { if (player.getState().canAct()) player.performAction(); });

console.log("\n=== Vote Phase (Round 3) ===");
game.setPhase("vote");
console.log("All players vote to eliminate Ryan (Loup-Garou).\n");
game.getLivingPlayers().forEach(voter => {
  if (voter !== player3 && voter.getState().constructor.name !== 'DeadPhase') {
    console.log(`${voter.getName()} votes for ${player3.getName()}`);
  }
});
// Apply result: eliminate Ryan
if (player3.getState().constructor.name !== 'DeadPhase') {
  player3.setState(new DeadPhase());
  game.moveToGraveyard(player3);
  console.log(`\n${player3.getName()} has been eliminated by vote.`);
}

// Check win condition
const winner = game.evaluateWin();
if (winner === 'villagers') {
  console.log("\nVillagers win! All Loup-Garou are dead.");
} else if (winner === 'wolves') {
  console.log("\nLoup-Garou win! They have reached parity with others.");
} else {
  console.log("\nNo winner yet. Proceed to next round.");
}


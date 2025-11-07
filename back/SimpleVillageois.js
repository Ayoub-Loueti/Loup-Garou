class SimpleVillageois extends CardDecorator {
  constructor(card) {
    super(card);
    this.name = "Simple Villageois";
  }

  performAction() {
    console.log(`${this.name} has no special action.`);
  }

  getAbility() {
    return "None";
  }

  getName() {
    return this.name;
  }
}
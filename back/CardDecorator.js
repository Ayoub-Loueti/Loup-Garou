/**
 * Decorator base class for role cards.
 * Allows wrapping base roles with additional functionality.
 */
class CardDecorator extends ICard {
  constructor(card) {
    super();
    this.card = card; // The wrapped card (base role or another decorator)
  }

  /**
   * Perform the role's action.
   * Subclasses should call super.performAction() to maintain decorator chain.
   */
  performAction() {
    if (this.card) {
      this.card.performAction(); // Delegate to the wrapped card
    }
  }

  getAbility() {
    return this.card ? this.card.getAbility() : "No ability";
  }

  getName() {
    // Return the decorator's own name if set, otherwise delegate to wrapped card
    if (this.name) {
      return this.name;
    }
    return this.card ? this.card.getName() : "Unknown Role";
  }
}

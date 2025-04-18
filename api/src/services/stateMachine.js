class StateMachine {
  static ANY_ROLE = Symbol('ANY_ROLE');

  constructor({ states, transitions }) {
    this.states = new Set(states);
    this.transitions = transitions.map((t) => ({
      from: t.from,
      to: t.to,
      roles: new Set(t.roles),
    }));
    this.currentState = null;
  }

  setState(state) {
    if (!this.states.has(state)) {
      throw new Error(`Invalid state: ${state}`);
    }
    this.currentState = state;
  }

  getCurrentState() {
    return this.currentState;
  }

  getStates() {
    return Array.from(this.states);
  }

  getAllowedTransitions({ from, role }) {
    if (!this.states.has(from)) return [];
    return this.transitions
      .filter((t) => t.from === from
        && (t.roles.has(role) || t.roles.has(StateMachine.ANY_ROLE)))
      .map((t) => t.to);
  }

  canTransition({ from, to, role }) {
    return this.transitions.some(
      (t) => t.from === from
        && t.to === to
        && (t.roles.has(role) || t.roles.has(StateMachine.ANY_ROLE)),
    );
  }
}
module.exports = StateMachine;

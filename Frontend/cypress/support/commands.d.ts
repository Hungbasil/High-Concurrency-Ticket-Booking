/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    loginUser(email: string, password: string): Chainable<void>;
    selectSeat(seatCode: string): Chainable<void>;
    proceedToCheckout(): Chainable<void>;
  }
}

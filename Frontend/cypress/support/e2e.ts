/// <reference types="cypress" />
// Cypress support file
// Global configuration and custom commands

beforeEach(() => {
  // Start MSW before each test
  cy.window().then((win) => {
    expect(win.navigator.serviceWorker).to.exist;
  });
});

// Custom command examples
Cypress.Commands.add('loginUser', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/');
});

Cypress.Commands.add('selectSeat', (seatCode: string) => {
  cy.get(`button[title*="${seatCode}"]`).click();
});

Cypress.Commands.add('proceedToCheckout', () => {
  cy.get('button').contains('Tiến hành thanh toán').click();
  cy.url().should('include', '/checkout');
});

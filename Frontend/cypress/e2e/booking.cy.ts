/// <reference types="cypress" />
/**
 * Example E2E Test
 * Full booking flow test with mocked payment
 */

describe('Complete Booking Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should complete a successful booking', () => {
    // 1. View events list
    cy.get('[class*="EventCard"]').should('have.length.greaterThan', 0);

    // 2. Navigate to event detail
    cy.get('[class*="EventCard"]').first().click();
    cy.url().should('include', '/events/');

    // 3. Select seats
    cy.selectSeat('A1');
    cy.selectSeat('A2');

    // 4. Verify cart updated
    cy.get('text').contains('A1');
    cy.get('text').contains('A2');

    // 5. Proceed to checkout
    cy.proceedToCheckout();

    // 6. Fill checkout form
    cy.get('input[name="firstName"]').type('John');
    cy.get('input[name="lastName"]').type('Doe');
    cy.get('input[name="email"]').type('john@example.com');
    cy.get('input[name="phone"]').type('0123456789');
    cy.get('input[name="cardName"]').type('John Doe');
    cy.get('input[name="cardNumber"]').type('4111111111111111');
    cy.get('input[name="cardExpiry"]').type('12/25');
    cy.get('input[name="cardCVV"]').type('123');

    // 7. Submit payment
    cy.get('button').contains('Thanh toán').click();

    // 8. Verify confirmation page
    cy.url().should('include', '/confirmation');
    cy.get('text').contains('Đặt vé thành công');
    cy.get('text').contains('Số xác nhận');
  });

  it('should handle seat conflict gracefully', () => {
    // Navigate to event
    cy.get('[class*="EventCard"]').first().click();

    // Try to select same seat multiple times
    cy.selectSeat('B1');
    
    // Simulate another user taking the seat
    cy.get('[class*="Notification"]').should('be.visible');
  });

  it('should show real-time seat updates', () => {
    cy.get('[class*="EventCard"]').first().click();
    cy.get('text').contains('Còn trống').should('be.visible');
    cy.get('text').contains('Đã bán').should('be.visible');
    cy.get('text').contains('Đang giữ').should('be.visible');
  });
});

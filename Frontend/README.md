# High-Concurrency Ticket Booking - Frontend

A production-ready React + TypeScript frontend for a high-concurrency ticket booking system. Features real-time seat availability updates, optimistic hold management, and a complete booking flow with conflict resolution.

## ✨ Features

- **Real-time Updates**: WebSocket integration for live seat status changes
- **Optimistic UI**: Hold seats locally with 5-minute countdowns
- **Conflict Resolution**: Handle race conditions when seats are taken by other users
- **Responsive Design**: Mobile-friendly using Tailwind CSS
- **State Management**: Zustand for lightweight, scalable state
- **Server State**: React Query for caching and synchronization
- **Type Safety**: Full TypeScript coverage with comprehensive types
- **Accessibility**: WCAG AA compliance for keyboard navigation and ARIA labels
- **Testing**: Unit tests with Vitest, E2E tests with Cypress
- **Mock Server**: MSW (Mock Service Worker) for local development
- **CI/CD**: GitHub Actions for automated testing and deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd Frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
```

### Development

```bash
# Start development server with mocks
npm run dev

# Or use real backend API
VITE_API_BASE_URL=http://localhost:3000/api npm run dev
```

Visit `http://localhost:5173` in your browser.

### Build

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── api/
│   └── client.ts                 # Axios instance & API endpoints
├── components/
│   ├── Button.tsx
│   ├── EventCard.tsx
│   ├── Modal.tsx
│   ├── Notification.tsx
│   ├── Seat.tsx
│   ├── SeatMap.tsx
│   └── index.ts
├── hooks/
│   ├── index.ts                  # React Query hooks
│   └── useSocket.ts              # WebSocket hook
├── mocks/
│   ├── browser.ts                # MSW browser setup
│   ├── handlers.ts               # API handlers
│   └── init.ts                   # MSW initialization
├── pages/
│   ├── CheckoutPage.tsx
│   ├── ConfirmationPage.tsx
│   ├── EventDetailPage.tsx
│   ├── HomePage.tsx
│   ├── NotFoundPage.tsx
│   └── index.ts
├── store/
│   └── useBookingStore.ts        # Zustand store
├── tests/                        # Test files
├── types/
│   └── index.ts                  # TypeScript interfaces
├── utils/
│   └── formatting.ts             # Utility functions
├── App.tsx
├── index.css                     # Tailwind styles
└── main.tsx
```

## 🔌 API Integration

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_APP_ENV=development
```

### Backend API Endpoints

The frontend consumes these endpoints from the backend:

```typescript
// Events
POST   /api/events                    // Create event
GET    /api/events/:id                // Get event
GET    /api/events/:id/seats          // Get seats with status
GET    /api/events/:id/stats          // Get event stats

// Reservations
POST   /api/reservations/hold         // Hold a seat (5 min timeout)
POST   /api/reservations/checkout     // Confirm payment
```

See [api/client.ts](src/api/client.ts) for detailed endpoint documentation.

### WebSocket Events

```typescript
// Listen for real-time seat updates
socket.on('seatStatusChanged', (data: SeatUpdate) => {
  // { eventId, seatCode, status, holdId?, expiresAt? }
});
```

## 🧪 Testing

### Unit Tests

```bash
npm run test                 # Run tests
npm run test:ui             # Open test UI
npm run test:coverage       # Generate coverage report
```

### E2E Tests

```bash
npm run e2e                 # Open Cypress
npm run e2e:run             # Run headless
```

### Mock Server

The frontend uses MSW to mock the API for development and testing:

```bash
npm run dev  # Starts with MSW enabled by default

# Or disable MSW in production:
# Comment out MSW initialization in src/main.tsx
```

## 🎨 UI Components

### SeatMap
Interactive seat grid with real-time updates and hold countdowns.

```tsx
<SeatMap
  eventId="event-1"
  seats={seats}
  selectedSeats={selectedSeats}
  onSelectSeat={handleSelectSeat}
  onDeselectSeat={handleDeselectSeat}
  isLoading={isHolding}
/>
```

### Button
Customizable button component with variants and loading states.

```tsx
<Button variant="primary" size="lg" loading={isLoading}>
  Thanh toán
</Button>
```

### Notification
Toast notifications for feedback.

```tsx
const { showNotification } = useBookingStore();
showNotification('Success!', 'success');
```

## 🔗 React Query Hooks

```typescript
// Fetch event seats with caching
const { data, isLoading, error } = useEventSeats(eventId);

// Get event statistics
const { data: stats } = useEventStats(eventId);

// Hold a seat
const holdMutation = useHoldSeat();
await holdMutation.mutateAsync({ userId, eventId, seatCode });

// Checkout
const checkoutMutation = useCheckout();
await checkoutMutation.mutateAsync({ userId, reservationId, eventId, seatCode });
```

## 🏗️ State Management

### Zustand Store

```typescript
const { cart, addToCart, removeFromCart } = useBookingStore();
const { selectSeat, deselectSeat } = useBookingStore();
const { showNotification } = useBookingStore();
```

## 🚀 Deployment

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Docker
```bash
docker build -t ticket-booking-frontend .
docker run -p 80:5173 ticket-booking-frontend
```

See [Dockerfile](Dockerfile) for details.

## 📝 Performance Checklist

- [ ] Code splitting enabled (Vite bundles)
- [ ] Images optimized
- [ ] CSS minified
- [ ] JS minified and gzipped
- [ ] Cache strategy configured
- [ ] Lazy loading for pages
- [ ] React.memo for expensive components

## ♿ Accessibility

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ ARIA labels on interactive elements
- ✅ Color contrast WCAG AA compliant
- ✅ Semantic HTML structure
- ✅ Focus indicators visible

Test with:
```bash
npm run test -- --grep accessibility
```

## 🔒 Security

- ✅ CORS configured in vite.config.ts
- ✅ Token stored in httpOnly cookies (future)
- ✅ Input validation in forms
- ✅ XSS protection with React
- ✅ CSRF tokens for mutations

## 📊 Concurrency Handling

The frontend handles high-concurrency scenarios:

1. **Optimistic Holds**: Show immediate feedback while hold request processes
2. **Conflict Detection**: Detect if seat was taken by another user
3. **Auto Rollback**: Revert selection if hold fails
4. **Real-time Sync**: WebSocket updates reconcile UI with server state
5. **Retry Logic**: Automatic retry with exponential backoff

See [SeatMap.tsx](src/components/SeatMap.tsx) for implementation.

## 🐛 Debugging

```bash
# Enable React DevTools
npm run dev

# View WebSocket messages in browser console
# Check localStorage for auth tokens
# Use React Query DevTools (included)

# Check build stats
npm run build -- --stats
```

## 📚 Documentation

- [API Adapter](src/api/client.ts) - Backend integration points
- [Component API](src/components/) - Component propTypes
- [Types](src/types/index.ts) - TypeScript interfaces
- [Copilot Instructions](../.github/copilot-instructions.md) - Full project spec

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing`
2. Commit changes: `git commit -m "Add amazing feature"`
3. Push to branch: `git push origin feature/amazing`
4. Open PR with tests

## 📄 License

ISC

## 💡 Tips

- MSW is enabled by default in dev mode. Comment it out to test against real API.
- Use browser DevTools Network tab to inspect API calls
- React Query DevTools available in dev (press Ctrl+K+J)
- Customize colors in [tailwind.config.js](tailwind.config.js)

## 🚨 Troubleshooting

### Port 5173 already in use
```bash
npm run dev -- --port 3001
```

### CORS errors
Check `vite.config.ts` proxy configuration and backend CORS settings.

### WebSocket connection fails
Ensure `VITE_WS_URL` is correct and backend is running.

### Styling not applied
Run `npm run build` to ensure Tailwind CSS is compiled.

---

**Built with ❤️ for high-concurrency ticket booking**

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

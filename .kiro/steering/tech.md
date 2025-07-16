---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies
- **Frontend**: React 18 + TypeScript, Tailwind CSS, React Query
- **Backend**: Cloudflare Workers with Hono framework, TypeScript
- **Storage**: Cloudflare R2 (direct bindings only), Cloudflare KV for sessions
- **Authentication**: JWT tokens with KV-based session storage

## Code Standards

### TypeScript
- Use strict TypeScript with proper type definitions
- Define interfaces in `types/` directories
- Never use `any` - create explicit types
- Export types from dedicated index files

### Backend Architecture (Hono + Workers)
- Handlers in `handlers/` directory, organized by feature
- Business logic in `services/` directory
- Use Hono's built-in middleware (CORS, JWT, error handling)
- Direct R2 bindings only - no S3 SDK compatibility
- Stream large file operations
- Validate all inputs with proper error responses

### Frontend Architecture (React)
- Components in `components/` directory by feature
- Custom hooks in `hooks/` directory
- API calls centralized in `services/` directory
- React Query for server state and caching
- Error boundaries for graceful failures

## Security & Performance
- Never store credentials in browser storage
- JWT sessions with KV storage backend
- Proper CORS headers for cross-origin requests
- Streaming uploads for large files
- Virtual scrolling for large lists
- Bundle optimization with tree shaking

## Error Handling
- Consistent format: `{ error: string, code?: string }`
- User-friendly messages in frontend
- No sensitive data in logs
- Graceful network failure handling with retry logic

## Testing
- Unit tests for all new functionality
- Frontend: Jest + React Testing Library
- Backend: Vitest for Workers
- Mock external dependencies (R2, KV)
- Test error scenarios and edge cases

## Development Commands
```bash
wrangler dev        # Start Worker with hot reload
npm run dev         # Start React dev server
npm test           # Run all tests
npm run test:watch # Watch mode
```
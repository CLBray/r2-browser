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
- Streaming uploads for large files
- Virtual scrolling for large lists
- Bundle optimization with tree shaking

## Error Handling
- Consistent format: `{ error: string, code?: string }`
- User-friendly messages in frontend
- No sensitive data in logs
- Graceful network failure handling with retry logic

## Testing
- Always add new tests when adding new functionality via task execution
- Always re-run the unit tests before considering a task complete
- Always re-run the frontend, worker and integration tests before considering a task complete
- Before marking a task complete, pause and ask if there are any adjustments that need to be made to the codebase
- Before marking a task complete, draft a detailed commit message that includes:
   - What task was completed
   - What files were changed as part of the task
   - Brief description of the changes made
- Then, pause and request manual review of the commit message
- Then, commit all staged changes with this approved commit message
- Then, push the commit to the remote repository
- **Workers**: Use Cloudflare Workers Vitest integration (`@cloudflare/vitest-pool-workers`)
- **Unit Tests**: Test individual services and functions with real bindings
- **Integration Tests**: Test complete API workflows using `SELF` fetcher
- **Frontend**: Vitest + React Testing Library
- **Isolated Storage**: Each test runs with isolated KV/R2 storage
- **Real Runtime**: Tests run inside actual Workers runtime via Miniflare
- **No Mocking**: Use real bindings instead of mocks for Workers tests
- **Error Scenarios**: Test all error paths and edge cases
- **Type Safety**: Declare `cloudflare:test` module interfaces for bindings

## Development Commands
```bash
wrangler dev        # Start Worker with hot reload
npm run dev         # Start React dev server
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Implementation best pratices and standards
Review the Context7 documentation on Node web applications, Cloudflare Workers and Cloudflare R2, then use Sequential Thinking to plan and complete the task.
# Technology Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router for navigation
- **State Management**: React Query for API state and caching
- **Styling**: Tailwind CSS
- **File Uploads**: React Dropzone
- **HTTP Client**: Fetch API

## Backend
- **Runtime**: Cloudflare Workers
- **Language**: JavaScript/TypeScript with Hono framework
- **Storage**: Direct R2 bindings (no S3 SDK needed)
- **Session Storage**: Cloudflare KV
- **Authentication**: JWT tokens

## Infrastructure
- **Compute**: Cloudflare Workers (serverless, global edge)
- **Storage**: Cloudflare R2 for object storage
- **Session Management**: Cloudflare KV
- **Frontend Hosting**: Cloudflare Workers with Static Assets
- **CDN**: Cloudflare global network

## Development Tools
- **Local Development**: Wrangler CLI for Workers development
- **Package Manager**: npm/yarn for both frontend and backend
- **Testing**: Jest + React Testing Library (frontend), Vitest (backend)

## Observability
- **API Observability**: Workers Analytics Engine for data points

## Testing
- **Testing**: Local unit tests are created as functionality is modified

## Common Commands

### Development
```bash
# Start local development
wrangler dev                    # Start Worker locally
npm run dev                     # Start React dev server

# Build
npm run build                   # Build frontend
wrangler publish               # Deploy Worker

# Testing
npm test                       # Run frontend tests
npm run test:worker            # Run Worker tests
```

### Deployment
```bash
# Build frontend and deploy Worker with static assets
cd frontend && npm run build
cd ../worker && wrangler deploy --env production
```

## Configuration Files
- `wrangler.toml` - Worker configuration and bindings
- `package.json` - Frontend and Worker dependencies and scripts
- `tsconfig.json` - TypeScript configuration
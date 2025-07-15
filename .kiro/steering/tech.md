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
- **Language**: Rust with worker-rs framework
- **Storage**: Direct R2 bindings (no S3 SDK needed)
- **Session Storage**: Cloudflare KV
- **Authentication**: JWT tokens

## Infrastructure
- **Compute**: Cloudflare Workers (serverless, global edge)
- **Storage**: Cloudflare R2 for object storage
- **Session Management**: Cloudflare KV
- **Frontend Hosting**: Cloudflare Pages
- **CDN**: Cloudflare global network

## Development Tools
- **Local Development**: Wrangler CLI for Workers development
- **Package Manager**: npm/yarn for frontend, Cargo for Rust
- **Testing**: Jest + React Testing Library (frontend), Rust test framework (backend)

## Observability
- **API Observability**: Workers Analytics Engine for data points

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
cargo test                     # Run Rust tests
```

### Deployment
```bash
# Deploy to production
wrangler publish --env production
npm run build && npm run deploy
```

## Configuration Files
- `wrangler.toml` - Worker configuration and bindings
- `package.json` - Frontend dependencies and scripts
- `Cargo.toml` - Rust dependencies and metadata
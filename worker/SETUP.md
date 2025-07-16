# Cloudflare Worker Setup Guide

## Prerequisites

1. **Node.js 18+**: Install via nvm, homebrew, or official installer
2. **npm or yarn**: Package manager (comes with Node.js)
3. **Wrangler CLI**: Install globally with `npm install -g wrangler`

## Development Setup

### 1. Install Dependencies

```bash
# Install Worker dependencies
npm install

# Install Wrangler CLI globally if not already installed
npm install -g wrangler
```

### 2. Configure Cloudflare Resources

Before running the worker locally, you need to create the required Cloudflare resources for each environment:

#### Development Environment
1. **R2 Bucket**: `file-explorer-storage-dev`
2. **KV Namespace**: `file-explorer-sessions-dev` (with preview: `file-explorer-sessions-dev-preview`)
3. **Analytics Engine Dataset**: `r2_file_explorer_analytics_dev`

#### Staging Environment
1. **R2 Bucket**: `file-explorer-storage-staging`
2. **KV Namespace**: `file-explorer-sessions-staging` (with preview: `file-explorer-sessions-staging-preview`)
3. **Analytics Engine Dataset**: `r2_file_explorer_analytics_staging`

#### Production Environment
1. **R2 Bucket**: `file-explorer-storage-prod`
2. **KV Namespace**: `file-explorer-sessions-prod` (with preview: `file-explorer-sessions-prod-preview`)
3. **Analytics Engine Dataset**: `r2_file_explorer_analytics_prod`

#### Resource Creation Commands
```bash
# Development resources
wrangler r2 bucket create file-explorer-storage-dev
wrangler kv:namespace create "file-explorer-sessions-dev"
wrangler kv:namespace create "file-explorer-sessions-dev" --preview

# Staging resources
wrangler r2 bucket create file-explorer-storage-staging
wrangler kv:namespace create "file-explorer-sessions-staging"
wrangler kv:namespace create "file-explorer-sessions-staging" --preview

# Production resources
wrangler r2 bucket create file-explorer-storage-prod
wrangler kv:namespace create "file-explorer-sessions-prod"
wrangler kv:namespace create "file-explorer-sessions-prod" --preview
```

**Important**: Update the KV namespace IDs in `wrangler.toml` with the actual IDs returned by the creation commands.

### 3. Environment Variables

The worker uses the following environment variables (configured in wrangler.toml):

- `JWT_SECRET`: Secret key for JWT token signing
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `JWT_EXPIRY_HOURS`: JWT token expiration time in hours
- `MAX_FILE_SIZE_MB`: Maximum file upload size in MB
- `ENVIRONMENT`: Current environment (development/staging/production)

### 4. Build Frontend Assets

Before running the worker locally, build the React frontend:

```bash
# Build the React frontend
cd ../frontend
npm install
npm run build

# Return to worker directory
cd ../worker
```

### 5. Local Development

```bash
# Start the worker in development mode (serves both API and frontend)
wrangler dev --local --port 8787

# Or for remote development (uses actual Cloudflare resources)
wrangler dev --port 8787
```

### 6. Testing the Setup

Once the worker is running, you can test both the API and frontend:

```bash
# Health check
curl http://localhost:8787/health

# Basic API response
curl http://localhost:8787/api

# Frontend (React app)
open http://localhost:8787
```

## Deployment

### Environment-Specific Deployments

```bash
# Deploy to staging environment
wrangler deploy --env staging

# Deploy to production environment
wrangler deploy --env production

# Deploy to development (default environment)
wrangler deploy
```

### Environment Summary

| Environment | Worker Name | R2 Bucket | KV Namespace | Analytics Dataset | JWT Expiry | Max File Size |
|-------------|-------------|-----------|--------------|-------------------|------------|---------------|
| **Development** | `r2-file-explorer-api` | `file-explorer-storage-dev` | `file-explorer-sessions-dev` | `r2_file_explorer_analytics_dev` | 24 hours | 50MB |
| **Staging** | `r2-file-explorer-api-staging` | `file-explorer-storage-staging` | `file-explorer-sessions-staging` | `r2_file_explorer_analytics_staging` | 12 hours | 100MB |
| **Production** | `r2-file-explorer-api-prod` | `file-explorer-storage-prod` | `file-explorer-sessions-prod` | `r2_file_explorer_analytics_prod` | 8 hours | 200MB |

## Development Commands

```bash
# Type checking
npm run type-check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Deploy to specific environments
npm run deploy:staging
npm run deploy:production
```

## Troubleshooting

### Common Issues

1. **TypeScript compilation errors**: Run `npm run type-check` to identify and fix type issues
2. **Resource binding errors**: Ensure your R2 bucket and KV namespace exist and the IDs in wrangler.toml are correct
3. **CORS issues**: Check that your frontend URL is included in the `CORS_ORIGINS` environment variable
4. **Authentication errors**: Verify that `JWT_SECRET` is properly configured for your environment

### Build Process

For JavaScript/TypeScript Workers with Hono:
1. TypeScript code → JavaScript (via esbuild in wrangler)
2. JavaScript → Worker bundle (via wrangler)

If you encounter build issues, try:
```bash
# Check TypeScript compilation
npm run type-check

# Clear wrangler cache
wrangler dev --local --port 8787
```
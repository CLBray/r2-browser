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

Before running the worker locally, you need to create the required Cloudflare resources:

1. **R2 Buckets**: Create environment-specific buckets:
   - `file-explorer-storage-dev` (development)
   - `file-explorer-storage-staging` (staging)
   - `file-explorer-storage-prod` (production)
2. **KV Namespaces**: Create environment-specific KV namespaces:
   - `file-explorer-sessions-dev` (development)
   - `file-explorer-sessions-staging` (staging)
   - `file-explorer-sessions-prod` (production)
3. **Update wrangler.toml**: Replace the placeholder IDs with your actual resource IDs

### 3. Environment Variables

The worker uses the following environment variables (configured in wrangler.toml):

- `JWT_SECRET`: Secret key for JWT token signing
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `JWT_EXPIRY_HOURS`: JWT token expiration time in hours
- `MAX_FILE_SIZE_MB`: Maximum file upload size in MB
- `ENVIRONMENT`: Current environment (development/staging/production)

### 4. Local Development

```bash
# Start the worker in development mode
wrangler dev --local --port 8787

# Or for remote development (uses actual Cloudflare resources)
wrangler dev --port 8787
```

### 5. Testing the Setup

Once the worker is running, you can test the endpoints:

```bash
# Health check
curl http://localhost:8787/health

# Basic API response
curl http://localhost:8787/
```

## Deployment

### Development/Staging
```bash
wrangler publish --env staging
```

### Production
```bash
wrangler publish --env production
```

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
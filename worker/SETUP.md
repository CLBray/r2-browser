# Worker Setup Guide

## Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers enabled
- Wrangler CLI installed globally: `npm install -g wrangler`

## Initial Setup

1. **Install dependencies**
   ```bash
   cd worker
   npm install
   ```

2. **Authenticate with Cloudflare**
   ```bash
   wrangler login
   ```

3. **Set up secrets for development**
   ```bash
   # Generate a secure JWT secret (minimum 32 characters)
   wrangler secret put JWT_SECRET --env development
   # Enter a secure random string when prompted
   ```

4. **Create required Cloudflare resources**
   ```bash
   # Create R2 bucket for development
   wrangler r2 bucket create file-explorer-storage-dev
   
   # Create KV namespace for sessions
   wrangler kv:namespace create "KV_SESSIONS" --env development
   wrangler kv:namespace create "KV_SESSIONS" --env development --preview
   
   # Update wrangler.toml with the generated KV namespace IDs
   ```

5. **Update wrangler.toml**
   - Replace the KV namespace IDs with the ones generated in step 4
   - Ensure all bucket names match your created resources

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check
```

## Environment Configuration

### Development
- Uses local Miniflare for R2 and KV storage
- JWT secret set via `wrangler secret`
- File size limit: 50MB
- JWT expiry: 24 hours

### Staging
- Separate R2 bucket and KV namespace
- Reduced JWT expiry: 12 hours
- Increased file size limit: 100MB

### Production
- Production R2 bucket and KV namespace
- Shortest JWT expiry: 8 hours
- Highest file size limit: 200MB

## Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Troubleshooting

### Common Issues

1. **KV namespace not found**
   - Ensure KV namespaces are created and IDs match wrangler.toml
   - Check that preview IDs are also set correctly

2. **R2 bucket access denied**
   - Verify bucket exists and name matches wrangler.toml
   - Check Cloudflare account permissions

3. **JWT secret not set**
   - Run `wrangler secret put JWT_SECRET --env <environment>`
   - Ensure secret is at least 32 characters long

4. **Tests failing**
   - Check that test bindings in vitest.config.ts match your setup
   - Ensure all dependencies are installed

### Logs and Debugging

```bash
# View real-time logs during development
wrangler dev --local=false

# View production logs
wrangler tail --env production

# View staging logs
wrangler tail --env staging
```
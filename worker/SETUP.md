# Cloudflare Worker Setup Guide

## Prerequisites

1. **Rust and Cargo**: Install via rustup (recommended) or your system package manager
2. **Wrangler CLI**: Install globally with `npm install -g wrangler`
3. **wasm-pack**: Install with `cargo install wasm-pack`
4. **WebAssembly target**: Add with `rustup target add wasm32-unknown-unknown`

## Development Setup

### 1. Install Dependencies

```bash
# Install Rust dependencies
cargo build

# Install wasm-pack if not already installed
cargo install wasm-pack

# Add WebAssembly target
rustup target add wasm32-unknown-unknown
```

### 2. Configure Cloudflare Resources

Before running the worker locally, you need to create the required Cloudflare resources:

1. **R2 Bucket**: Create a bucket named `file-explorer-storage` in your Cloudflare dashboard
2. **KV Namespace**: Create a KV namespace for session storage
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

## Troubleshooting

### Common Issues

1. **"No loader is configured for .rs files"**: This indicates wrangler needs to build the Rust code to WebAssembly first
2. **"wasm32-unknown-unknown target not found"**: Install the WebAssembly target with `rustup target add wasm32-unknown-unknown`
3. **Resource binding errors**: Ensure your R2 bucket and KV namespace exist and the IDs in wrangler.toml are correct

### Build Process

For Rust Workers, the build process is:
1. Rust code → WebAssembly (via wasm-pack or cargo)
2. WebAssembly → Worker bundle (via wrangler)

If you encounter build issues, try:
```bash
# Clean build
cargo clean
wrangler build --env development
```
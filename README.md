# R2 File Explorer

A web-based file management application that provides a familiar desktop file manager interface for Cloudflare R2 buckets. Users can browse, upload, download, organize, and manage their R2 storage through an intuitive web interface.

## Features

- **File Browser**: Navigate R2 buckets with familiar file explorer UI
- **File Operations**: Upload, download, rename, delete files and folders
- **Drag & Drop**: Intuitive file upload via drag-and-drop interface
- **Authentication**: Secure access using Cloudflare API credentials
- **Multi-file Support**: Batch operations and progress tracking
- **Error Handling**: Graceful error management with user-friendly messages

## Architecture

- **Frontend**: React 18 with TypeScript, Tailwind CSS, hosted on Cloudflare Pages
- **Backend**: Cloudflare Workers (Rust) with direct R2 bindings
- **Storage**: Cloudflare R2 for object storage, KV for session management
- **Authentication**: JWT tokens with secure credential handling

## Project Structure

```
r2-file-explorer/
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client and utilities
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Helper functions
│   └── package.json
├── worker/            # Cloudflare Worker (Rust)
│   ├── src/
│   │   ├── handlers/      # Request handlers
│   │   ├── services/      # Business logic services
│   │   ├── models/        # Data structures
│   │   └── utils/         # Helper functions
│   ├── Cargo.toml
│   └── wrangler.toml
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- Rust and Cargo
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with R2 enabled

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd r2-file-explorer

# Install frontend dependencies
cd frontend
npm install

# Install Rust dependencies (if Rust is installed)
cd ../worker
cargo build
```

### 2. Configure Cloudflare Resources

1. Create an R2 bucket in your Cloudflare dashboard
2. Create a KV namespace for session storage
3. Create an Analytics Engine dataset for metrics
4. Update `worker/wrangler.toml` with your resource IDs

### 3. Environment Configuration

Update `worker/wrangler.toml`:

```toml
# Update with your actual resource names/IDs
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket-name"

[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "your-kv-namespace-id"

[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "your-analytics-dataset"

[vars]
JWT_SECRET = "your-secure-jwt-secret"
CORS_ORIGINS = "http://localhost:5173,https://your-domain.pages.dev"
```

### 4. Development

```bash
# Start the Cloudflare Worker locally
cd worker
wrangler dev

# In another terminal, start the React development server
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:8787`.

### 5. Deployment

```bash
# Deploy the Worker
cd worker
wrangler publish

# Build and deploy the frontend to Cloudflare Pages
cd frontend
npm run build
# Deploy to Pages via dashboard or wrangler pages
```

## Usage

1. Open the application in your browser
2. Enter your Cloudflare API credentials:
   - Account ID
   - R2 Access Key ID
   - R2 Secret Access Key
   - Bucket Name
3. Browse, upload, download, and manage your R2 files

## Development Commands

### Frontend
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
```

### Worker
```bash
cd worker
wrangler dev         # Start local development
wrangler publish     # Deploy to production
cargo test           # Run Rust tests
cargo build          # Build the project
```

## Security Notes

- API credentials are never stored persistently
- JWT tokens have short expiration times (1 hour)
- All communication uses HTTPS in production
- CORS is properly configured for security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license here]
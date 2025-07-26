# R2 File Explorer

A web-based file management application that provides a familiar desktop file manager interface for Cloudflare R2 buckets. Users can browse, upload, download, organize, and manage their R2 storage through an intuitive web interface.

## Features

- **File Browser**: Navigate R2 buckets with familiar file explorer UI
- **File Operations**: Upload, download, rename, delete files and folders
- **Drag & Drop**: Intuitive file upload via drag-and-drop interface
- **Authentication**: Secure access using Cloudflare API credentials
- **Multi-file Support**: Batch operations and progress tracking
- **Error Handling**: Graceful error management with user-friendly messages

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router for navigation
- **State Management**: React Query for API state and caching
- **Styling**: Tailwind CSS
- **File Uploads**: React Dropzone
- **HTTP Client**: Fetch API
- **Hosting**: Cloudflare Workers with Static Assets

### Backend
- **Runtime**: Cloudflare Workers
- **Language**: JavaScript/TypeScript with Hono framework
- **Storage**: Direct R2 bindings (no S3 SDK needed)
- **Session Storage**: Cloudflare KV
- **Authentication**: JWT tokens

## Project Structure

```
r2-file-explorer/
├── frontend/                  # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API client and utilities
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Helper functions
│   ├── public/                # Static assets
│   └── package.json           # Frontend dependencies
├── worker/                    # Cloudflare Worker (JavaScript/TypeScript)
│   ├── src/
│   │   ├── index.ts           # Main Worker entry point
│   │   ├── handlers/          # Request handlers
│   │   ├── services/          # Business logic services
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Helper functions
│   ├── package.json           # Worker dependencies
│   ├── tsconfig.json          # TypeScript configuration
│   └── wrangler.toml          # Worker configuration
└── README.md                  # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with R2 and Workers enabled

### Integrated Development Setup (Recommended)

This setup builds the frontend and serves it through the worker, which matches the production environment:

```bash
# Install dependencies for both frontend and worker
cd frontend && npm install && cd ../worker && npm install && cd ..

# Start the integrated development environment
npm run dev
```

This will:
1. Build the frontend
2. Start the worker with the frontend assets
3. Serve the application at `http://localhost:8787`

### Separate Development Setup (Alternative)

If you prefer to run the frontend and worker separately:

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### Worker Setup

```bash
cd worker
npm install
wrangler dev
```

The Worker will be available at `http://localhost:8787`

### Configuration

#### Basic Configuration

1. Update `worker/wrangler.toml` with your Cloudflare account details
2. Create R2 bucket and KV namespace in your Cloudflare dashboard
3. Update the binding names in wrangler.toml to match your resources

#### Security Configuration (Required)

The application requires encryption keys for secure credential storage. 

**🔧 Quick Setup:**
```bash
cd worker
./scripts/setup-secrets.sh
```

**📖 For complete security setup instructions, see [SECURITY.md](SECURITY.md)**

This covers:
- Required environment variables (`JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`)
- Local development and production configuration
- Key generation and security best practices
- Troubleshooting and emergency procedures

## Development Commands

### Root Project
```bash
npm run dev                    # Build frontend and start worker with frontend assets
npm run build:frontend         # Build frontend only
npm run dev:worker             # Start worker with frontend assets
npm run test                   # Run all tests (frontend and worker)
```

### Frontend
```bash
cd frontend
npm run dev                    # Start standalone frontend development server
npm run build                  # Build for production
npm run preview                # Preview production build
npm run lint                   # Run ESLint
npm test                       # Run frontend tests
```

### Worker
```bash
cd worker
npm install                    # Install dependencies
npm run dev                    # Start standalone worker development server
npm run type-check             # Check TypeScript types
npm test                       # Run worker tests
wrangler deploy                # Deploy to production
```

## Deployment

The application is deployed as a single Cloudflare Worker with static assets serving the React frontend.

### Build and Deploy
```bash
# Build the React frontend
cd frontend
npm run build

# Deploy Worker with static assets
cd ../worker
wrangler deploy --env production
```

### Environment-specific Deployments
```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

## Authentication

The application requires Cloudflare R2 API credentials:
- Account ID
- Access Key ID
- Secret Access Key
- Bucket Name

These credentials are used to authenticate with the R2 API and are not stored permanently.

## License

MIT License - see LICENSE file for details
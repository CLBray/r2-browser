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

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Worker Setup

```bash
cd worker
wrangler dev
```

The Worker will be available at `http://localhost:8787`

### Configuration

1. Update `worker/wrangler.toml` with your Cloudflare account details
2. Create R2 bucket and KV namespace in your Cloudflare dashboard
3. Update the binding names in wrangler.toml to match your resources

## Development Commands

### Frontend
```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run preview                # Preview production build
npm run lint                   # Run ESLint
```

### Worker
```bash
npm install                    # Install dependencies
npm run dev                    # Start local development
npm run type-check             # Check TypeScript types
npm test                       # Run tests
wrangler publish               # Deploy to production
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
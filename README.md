# R2 File Explorer

A web-based file management application that provides a familiar desktop file manager interface for Cloudflare R2 buckets. Users can browse, upload, download, organize, and manage their R2 storage through an intuitive web interface.

## ⚠️ IMPORTANT DISCLAIMER - PROOF OF CONCEPT

**This application is a proof of concept and is NOT ready for production use.** The application was build utilzing a preview version of [Kiro](https://kiro.dev/) and the code has not been peer reviewed. Please read the following warnings carefully:

### 🚨 Security Warnings
- **Incomplete Security Implementation**: Authentication and authorization mechanisms are not fully implemented or tested
- **Credential Handling**: The current credential storage and encryption may have vulnerabilities
- **No Access Controls**: Missing proper user access controls and permission systems
- **Unvalidated Inputs**: Input validation and sanitization may be incomplete
- **Session Management**: Session handling and security measures are not production-ready

### 🔧 Feature Limitations
- **Incomplete Features**: Many advertised features are partially implemented or non-functional
- **Error Handling**: Error handling and edge cases are not fully covered
- **Performance**: Not optimized for production workloads or large-scale usage
- **Data Loss Risk**: File operations may fail or cause data loss
- **Browser Compatibility**: Limited testing across different browsers and devices

### 🧪 Development Status
- **Active Development**: This is an experimental project under active development
- **Breaking Changes**: Expect frequent breaking changes and API modifications
- **No Support**: No official support or maintenance guarantees
- **Testing**: Insufficient testing coverage for production reliability

### ⚖️ Usage Recommendations
- **Development Only**: Use only in development or testing environments
- **No Sensitive Data**: Do not use with sensitive or production data
- **Backup Everything**: Always maintain backups of any data you work with
- **Review Code**: Thoroughly review and audit the code before any usage
- **Contribute**: Contributions to improve security and functionality are welcome

**By using this application, you acknowledge these risks and limitations.**

## Development Progress

Track the completion status of our development tasks and specifications:

### Overall Progress
| Metric | Status |
|--------|--------|
| Overall Task Completion | ![Overall Progress](badges/overall-progress.svg) |
| Total Tasks | ![Total Tasks](badges/total-tasks.svg) |
| Completed Tasks | ![Completed Tasks](badges/completed-tasks.svg) |

### Specification Progress
| Specification | Progress | Tasks |
|---------------|----------|-------|
| R2 File Explorer | ![R2 File Explorer Progress](badges/r2-file-explorer-progress.svg) | ![R2 File Explorer Tasks](badges/r2-file-explorer-tasks.svg) |
| Authentication Testing | ![Auth Testing Progress](badges/auth-testing-progress.svg) | ![Auth Testing Tasks](badges/auth-testing-tasks.svg) |
| File Upload Functionality | ![File Upload Progress](badges/file-upload-functionality-progress.svg) | ![File Upload Tasks](badges/file-upload-functionality-tasks.svg) |
| Security Posture Enhancement | ![Security Progress](badges/enhance-security-posture-progress.svg) | ![Security Tasks](badges/enhance-security-posture-tasks.svg) |
| UI Redesign | ![UI Redesign Progress](badges/fresh-fun-ui-redesign-progress.svg) | ![UI Redesign Tasks](badges/fresh-fun-ui-redesign-tasks.svg) |

*Badges are automatically updated on each commit via GitHub Actions*

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

⚠️ **Before You Begin**: This is a proof of concept application. Only use in development environments with non-sensitive data.

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

⚠️ **Security Notice**: The authentication system is incomplete and not secure for production use.

The application requires Cloudflare R2 API credentials:
- Account ID
- Access Key ID
- Secret Access Key
- Bucket Name

**Important**: While these credentials are intended not to be stored permanently, the current implementation may have security vulnerabilities. Do not use with production credentials or sensitive data.

## Contributing

This is an open-source proof of concept project. Contributions are welcome, especially:
- Security improvements and vulnerability fixes
- Feature completion and bug fixes
- Documentation improvements
- Test coverage expansion

Please review the code thoroughly and test any changes in isolated environments.

## Reporting Issues

If you discover security vulnerabilities or critical bugs:
1. **Do not** create public GitHub issues for security vulnerabilities
2. Contact the maintainers privately for security issues
3. For non-security bugs, feel free to open GitHub issues
4. Include detailed reproduction steps and environment information

## License

Apache 2.0 - see LICENSE file for details

**Note**: This license applies to the code, but remember this is proof of concept software not suitable for production use.
# Project Structure

## Root Directory Organization

```
r2-file-explorer/
├── .kiro/                     # Kiro configuration and specs
│   ├── specs/                 # Feature specifications
│   ├── steering/              # AI assistant guidance rules
│   └── settings/              # Tool configurations
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
│   │   ├── models/            # Data structures and types
│   │   └── utils/             # Helper functions
│   ├── package.json           # Worker dependencies
│   ├── tsconfig.json          # TypeScript configuration
│   └── wrangler.toml          # Worker configuration
└── README.md                  # Project documentation
```

## Frontend Component Architecture

- **App Component**: Main container with routing and global state
- **FileExplorer**: Primary interface with toolbar and file list
- **FileList**: Grid/list view of files and folders
- **Toolbar**: Navigation, upload, and view controls
- **UploadZone**: Drag-and-drop file upload interface
- **ContextMenu**: Right-click operations menu
- **AuthForm**: Credential input and validation

## Backend Service Architecture

- **Hono App**: Main application with routing and middleware
- **AuthHandler**: Authentication and session management with Hono JWT middleware
- **FileHandler**: File operation endpoints using Hono routes
- **R2Service**: Direct R2 bucket operations
- **AuthService**: JWT and session management with KV storage
- **Middleware**: CORS, authentication, error handling, and logging

## Key Conventions

- **TypeScript**: Strict typing throughout frontend
- **Error Handling**: Consistent error types and user-friendly messages
- **API Design**: RESTful endpoints with consistent response formats
- **Security**: No credential persistence, JWT-based sessions
- **Performance**: Streaming uploads, virtual scrolling, caching
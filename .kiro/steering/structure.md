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
├── worker/                    # Cloudflare Worker (Rust)
│   ├── src/
│   │   ├── lib.rs             # Main Worker entry point
│   │   ├── handlers/          # Request handlers
│   │   ├── services/          # Business logic services
│   │   ├── models/            # Data structures
│   │   └── utils/             # Helper functions
│   ├── Cargo.toml             # Rust dependencies
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

- **Router**: Request routing and middleware
- **AuthHandler**: Authentication and session management
- **FileHandler**: File operation endpoints
- **R2Service**: Direct R2 bucket operations
- **S3Service**: S3-compatible API client (fallback)
- **AuthService**: JWT and session management

## Key Conventions

- **TypeScript**: Strict typing throughout frontend
- **Error Handling**: Consistent error types and user-friendly messages
- **API Design**: RESTful endpoints with consistent response formats
- **Security**: No credential persistence, JWT-based sessions
- **Performance**: Streaming uploads, virtual scrolling, caching
# R2 File Explorer Frontend

A React-based web application that provides a familiar file manager interface for Cloudflare R2 buckets.

## Features

- **Authentication**: Secure login using Cloudflare R2 API credentials
- **File Browser**: Navigate R2 buckets with familiar file explorer UI
- **Responsive Design**: Built with Tailwind CSS for modern, responsive layouts
- **State Management**: React Query for efficient API state management and caching
- **Routing**: React Router for seamless navigation

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for API state management
- **Vite** for fast development and building

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/          # React components
│   ├── AuthForm.tsx    # Authentication form
│   ├── FileExplorer.tsx # Main file explorer (placeholder)
│   └── Layout.tsx      # App layout wrapper
├── contexts/           # React contexts
│   ├── auth.ts         # Auth context definition
│   └── AuthContext.tsx # Auth provider component
├── hooks/              # Custom React hooks
│   └── useAuth.ts      # Authentication hook
├── providers/          # Context providers
│   └── QueryProvider.tsx # React Query provider
├── services/           # API services
│   └── api.ts          # API client
├── types/              # TypeScript type definitions
│   └── index.ts        # Core types
├── App.tsx             # Main app component with routing
└── main.tsx            # App entry point
```

## Authentication

The app uses Cloudflare R2 API credentials for authentication:

- **Account ID**: Your Cloudflare account ID
- **Access Key ID**: R2 API access key ID
- **Secret Access Key**: R2 API secret access key  
- **Bucket Name**: Target R2 bucket name

Credentials are validated against the backend API and stored securely using JWT tokens.
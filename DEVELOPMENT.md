# Development Guide

This document provides detailed instructions for setting up and working with the R2 File Explorer development environment.

## Integrated Development Environment

The R2 File Explorer uses an integrated development approach where the frontend is built and then served through the Cloudflare Worker. This matches the production environment and ensures that what you see during development is what users will see in production.

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/r2-file-explorer.git
   cd r2-file-explorer
   ```

2. **Run the setup script**:
   ```bash
   ./setup.sh
   ```
   This will install all dependencies for the root project, frontend, and worker.

   Alternatively, you can install dependencies manually:
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   
   # Install worker dependencies
   cd worker && npm install && cd ..
   ```

3. **Configure environment variables**:
   ```bash
   # Create a .dev.vars file in the worker directory
   cp worker/.dev.vars.example worker/.dev.vars
   # Edit the file to add your JWT secret
   ```

   Available environment variables:
   - `JWT_SECRET`: Secret key for JWT token generation and validation (in .dev.vars)


### Development Workflow

1. **Start the integrated development environment**:
   ```bash
   npm run dev
   ```
   This will:
   - Build the frontend
   - Start the worker with the frontend assets
   - Serve the application at `http://localhost:8787`

2. **Make changes to the frontend**:
   When you make changes to the frontend code, you'll need to rebuild it:
   ```bash
   npm run build:frontend
   ```
   Then refresh your browser to see the changes.

3. **Make changes to the worker**:
   When you make changes to the worker code, the development server will automatically reload.

### Testing

1. **Run all tests**:
   ```bash
   npm test
   ```

2. **Run frontend tests only**:
   ```bash
   npm run test:frontend
   ```

3. **Run worker tests only**:
   ```bash
   npm run test:worker
   ```

## Advanced Development Options

### Watching Frontend Changes

For a more streamlined development experience, you can use a file watcher to automatically rebuild the frontend when files change:

1. **Install nodemon globally**:
   ```bash
   npm install -g nodemon
   ```

2. **Create a watch script**:
   ```bash
   # In a separate terminal
   nodemon --watch frontend/src --ext js,jsx,ts,tsx,css --exec "npm run build:frontend"
   ```

3. **Start the worker in another terminal**:
   ```bash
   npm run dev:worker
   ```

### Using Separate Development Servers

If you prefer to run the frontend and worker separately:

1. **Start the frontend development server**:
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

2. **Start the worker development server**:
   ```bash
   cd worker
   npm run dev
   ```
   The worker will be available at `http://localhost:8787`

3. **Configure CORS in the worker** to allow requests from the frontend development server:
   
   In your worker's `index.ts`, add CORS headers:
   ```typescript
   app.use('*', async (c, next) => {
     // Allow requests from the frontend development server
     c.header('Access-Control-Allow-Origin', 'http://localhost:5173');
     c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
     c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
     
     // Handle preflight requests
     if (c.req.method === 'OPTIONS') {
       return c.text('', 204);
     }
     
     await next();
   });
   ```

4. **Configure the frontend** to use the worker API:
   
   In your frontend code, set the API URL to the worker's development server:
   ```typescript
   // In frontend/src/services/api.ts or similar
   const API_BASE_URL = 'http://localhost:8787';
   ```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**:
   ```bash
   # Reinstall dependencies
   npm run clean
   ./setup.sh
   ```

2. **Worker fails to start**:
   ```bash
   # Check if another process is using port 8787
   lsof -i :8787
   # Kill the process if needed
   kill -9 <PID>
   ```

3. **Frontend build fails**:
   ```bash
   # Check for TypeScript errors
   cd frontend
   npm run type-check
   ```

4. **Authentication issues**:
   ```bash
   # Make sure JWT_SECRET is set in worker/.dev.vars
   echo "JWT_SECRET=your_secret_here" > worker/.dev.vars
   ```

### Debugging

#### Enabling Debug Logging

To enable debug logging in the worker:

1. Set the `LOG_LEVEL` environment variable to `debug` in the `wrangler.toml` file:
   ```toml
   [env.development.vars]
   LOG_LEVEL = "debug"
   ```

2. For production or staging environments, you can set different log levels:
   ```toml
   [env.production.vars]
   LOG_LEVEL = "error"  # Only show errors in production
   
   [env.staging.vars]
   LOG_LEVEL = "info"   # Show info and errors in staging
   ```

3. When running the worker, you'll see detailed debug logs in the console, including:
   - API requests and responses
   - Authentication events
   - File operations
   - Performance metrics

#### Using the Browser DevTools

1. When running the worker with `npm run dev:worker`, press `d` in the terminal to open the DevTools.
2. You can also click the link that appears in the terminal to open the DevTools in your browser.
3. The DevTools provide access to:
   - Console logs
   - Network requests
   - Performance metrics
   - Storage (KV, R2)

### Getting Help

If you encounter issues not covered here, please:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information about the problem
3. Include steps to reproduce, error messages, and your environment details
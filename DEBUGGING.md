# Debugging the R2 File Explorer

This document provides instructions for debugging the R2 File Explorer application using the Kiro IDE.

## Prerequisites

1. Make sure all dependencies are installed:
   ```bash
   npm install
   cd frontend && npm install
   cd worker && npm install
   ```

2. Ensure you have the required Cloudflare resources set up:
   ```bash
   cd worker
   npm run setup:resources
   npm run setup:secrets
   ```

## Debugging Options

### Option 1: Debug Frontend Only

1. Open the Debug panel in Kiro IDE (click the bug icon in the sidebar)
2. Select "Debug Frontend (Chrome)" from the dropdown
3. Click the green play button
4. This will:
   - Start the frontend development server
   - Launch Chrome with debugging enabled
   - Connect the debugger to your frontend code

### Option 2: Debug Worker Only

1. Open the Debug panel in Kiro IDE
2. Select "Debug Worker" from the dropdown
3. Click the green play button
4. This will:
   - Start the worker in development mode
   - Connect the debugger to your worker code

### Option 3: Debug Full Stack

1. Open the Debug panel in Kiro IDE
2. Select "Debug Full Stack" from the dropdown
3. Click the green play button
4. This will:
   - Build the frontend
   - Start the worker with the built frontend assets
   - Connect the debugger to your code

### Option 3b: Debug Full Stack with Chrome

1. Open the Debug panel in Kiro IDE
2. Select "Debug Full Stack (Chrome)" from the dropdown
3. Click the green play button
4. This will:
   - Build the frontend
   - Start the worker with the built frontend assets
   - Launch Chrome with debugging enabled for the frontend
   - Connect the debugger to both your backend and frontend code

### Option 4: Debug Frontend & Worker Simultaneously

1. Open the Debug panel in Kiro IDE
2. Select "Debug Frontend & Worker" from the dropdown
3. Click the green play button
4. This will:
   - Start both the frontend and worker in development mode
   - Connect the debugger to both components

## Setting Breakpoints

1. Open the file where you want to set a breakpoint
2. Click in the gutter (the space to the left of the line numbers) on the line where you want to set a breakpoint
3. A red dot will appear, indicating a breakpoint is set

## Debugging Tips

1. **Frontend Debugging:**
   - Use the Debug Console to evaluate expressions
   - Inspect variables in the Variables panel
   - Use the Call Stack to navigate through the execution path

2. **Worker Debugging:**
   - Worker logs will appear in the Debug Console
   - You can use conditional breakpoints for complex scenarios
   - The Debug Console supports evaluating expressions in the context of the worker

3. **Network Debugging:**
   - Use the Network tab in Chrome DevTools to inspect API requests
   - You can also use the Network panel in the Kiro IDE Debug view

4. **Common Issues:**
   - If breakpoints aren't hitting, check that source maps are properly generated
   - For worker debugging issues, try restarting the debugging session
   - If Chrome doesn't launch, check that you don't have another debugging session active
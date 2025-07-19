// This file helps with debugging the worker
// It ensures that source maps are properly loaded
process.env.NODE_OPTIONS = '--enable-source-maps';

// Import and run wrangler
require('wrangler/bin/wrangler.js');
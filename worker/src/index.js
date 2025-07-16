// ES Module wrapper for Rust WebAssembly Worker
import { fetch as wasmFetch } from '../pkg/r2_file_explorer_worker.js';

export default {
  async fetch(request, env, ctx) {
    // Call the Rust fetch function directly
    return await wasmFetch(request, env, ctx);
  }
};
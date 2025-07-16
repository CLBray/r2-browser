import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import type { Bindings } from './types'
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth'
import { loginHandler, logoutHandler, verifyHandler, refreshHandler } from './handlers/auth'

// Create Hono app with type bindings
const app = new Hono<{ Bindings: Bindings }>()

// Global middleware
app.use('*', logger())
app.use('*', prettyJSON())

// Note: CORS not needed since frontend and API are served from the same Worker domain

// Health check endpoint
app.get('/health', async (c) => {
    // Track health check analytics
    if (c.env.ANALYTICS) {
        c.env.ANALYTICS.writeDataPoint({
            blobs: ['health_check'],
            doubles: [1],
            indexes: [c.env.ENVIRONMENT]
        })
    }

    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: c.env.ENVIRONMENT,
        version: '1.0.0'
    })
})

// API root endpoint
app.get('/api', (c) => {
    return c.json({
        name: 'R2 File Explorer API',
        version: '1.0.0',
        environment: c.env.ENVIRONMENT,
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            files: '/api/files'
        }
    })
})

// Authentication routes
app.post('/api/auth/login', loginHandler)
app.post('/api/auth/logout', logoutHandler)
app.get('/api/auth/verify', verifyHandler)
app.post('/api/auth/refresh', refreshHandler)

// File operation routes (protected)
app.get('/api/files', authMiddleware, async (c) => {
    try {
        const bucket = c.env.R2_BUCKET
        const prefix = c.req.query('prefix') || ''

        const objects = await bucket.list({ prefix })

        // Track file listing analytics
        if (c.env.ANALYTICS) {
            c.env.ANALYTICS.writeDataPoint({
                blobs: ['file_list'],
                doubles: [objects.objects.length],
                indexes: [c.env.ENVIRONMENT, prefix || 'root']
            })
        }

        return c.json({
            success: true,
            objects: objects.objects.map(obj => ({
                key: obj.key,
                size: obj.size,
                lastModified: obj.uploaded,
                etag: obj.etag
            })),
            truncated: objects.truncated,
            ...(objects.truncated && 'cursor' in objects ? { cursor: objects.cursor } : {})
        })
    } catch (error) {
        console.error('Error listing files:', error)
        
        // Track error analytics
        if (c.env.ANALYTICS) {
            c.env.ANALYTICS.writeDataPoint({
                blobs: ['file_list_error'],
                doubles: [1],
                indexes: [c.env.ENVIRONMENT, error instanceof Error ? error.message : 'unknown']
            })
        }

        return c.json({
            success: false,
            error: 'Failed to list files'
        }, 500)
    }
})

app.post('/api/files/upload', authMiddleware, async (c) => {
    try {
        const bucket = c.env.R2_BUCKET
        const maxSizeMB = parseInt(c.env.MAX_FILE_SIZE_MB)

        // Get file from request
        const body = await c.req.blob()

        // Check file size
        if (body.size > maxSizeMB * 1024 * 1024) {
            // Track file size exceeded analytics
            if (c.env.ANALYTICS) {
                c.env.ANALYTICS.writeDataPoint({
                    blobs: ['file_upload_size_exceeded'],
                    doubles: [body.size / (1024 * 1024)], // Size in MB
                    indexes: [c.env.ENVIRONMENT, maxSizeMB.toString()]
                })
            }

            return c.json({
                success: false,
                error: `File size exceeds maximum of ${maxSizeMB}MB`
            }, 413)
        }

        // Get filename from query or generate one
        const filename = c.req.query('filename') || `upload-${Date.now()}`

        // Upload to R2
        await bucket.put(filename, body)

        // Track successful file upload analytics
        if (c.env.ANALYTICS) {
            c.env.ANALYTICS.writeDataPoint({
                blobs: ['file_upload_success'],
                doubles: [body.size / (1024 * 1024)], // Size in MB
                indexes: [c.env.ENVIRONMENT, filename.split('.').pop() || 'unknown'] // File extension
            })
        }

        return c.json({
            success: true,
            message: 'File uploaded successfully',
            filename,
            size: body.size
        })
    } catch (error) {
        console.error('Error uploading file:', error)

        // Track upload error analytics
        if (c.env.ANALYTICS) {
            c.env.ANALYTICS.writeDataPoint({
                blobs: ['file_upload_error'],
                doubles: [1],
                indexes: [c.env.ENVIRONMENT, error instanceof Error ? error.message : 'unknown']
            })
        }

        return c.json({
            success: false,
            error: 'Failed to upload file'
        }, 500)
    }
})

app.get('/api/files/:filename', authMiddleware, async (c) => {
    try {
        const bucket = c.env.R2_BUCKET
        const filename = c.req.param('filename')

        const object = await bucket.get(filename)

        if (!object) {
            return c.json({
                success: false,
                error: 'File not found'
            }, 404)
        }

        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
                'Content-Length': object.size.toString(),
                'ETag': object.etag,
                'Last-Modified': object.uploaded.toUTCString()
            }
        })
    } catch (error) {
        console.error('Error downloading file:', error)
        return c.json({
            success: false,
            error: 'Failed to download file'
        }, 500)
    }
})

app.delete('/api/files/:filename', authMiddleware, async (c) => {
    try {
        const bucket = c.env.R2_BUCKET
        const filename = c.req.param('filename')

        await bucket.delete(filename)

        return c.json({
            success: true,
            message: 'File deleted successfully',
            filename
        })
    } catch (error) {
        console.error('Error deleting file:', error)
        return c.json({
            success: false,
            error: 'Failed to delete file'
        }, 500)
    }
})

// Static asset serving for React frontend
app.get('*', async (c) => {
    try {
        // Check if ASSETS binding is available (not available in tests)
        if (!c.env.ASSETS) {
            return c.json({
                success: false,
                error: 'Not Found',
                message: 'The requested resource does not exist'
            }, 404)
        }

        // Try to serve the requested static asset
        const url = new URL(c.req.url)
        const assetResponse = await c.env.ASSETS.fetch(c.req.raw)

        // If asset found, return it
        if (assetResponse.status !== 404) {
            return assetResponse
        }

        // For SPA routing, serve index.html for non-API routes
        if (!url.pathname.startsWith('/api/')) {
            const indexResponse = await c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)))
            if (indexResponse.status === 200) {
                return new Response(indexResponse.body, {
                    headers: {
                        ...Object.fromEntries(indexResponse.headers),
                        'Content-Type': 'text/html'
                    }
                })
            }
        }

        // If no static asset found and not an API route, return 404
        return c.json({
            success: false,
            error: 'Not Found',
            message: 'The requested resource does not exist'
        }, 404)
    } catch (error) {
        console.error('Error serving static asset:', error)
        return c.json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to serve static asset'
        }, 500)
    }
})

// 404 handler for API routes (this won't be reached due to the catch-all above)
app.notFound((c) => {
    return c.json({
        success: false,
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
    }, 404)
})

// Error handler
app.onError((err, c) => {
    console.error('Unhandled error:', err)
    return c.json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
    }, 500)
})

export default app
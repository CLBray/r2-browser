import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import type { Bindings } from './types'
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth'
import { errorHandlerMiddleware } from './middleware/error-handler'
import { loginHandler, logoutHandler, verifyHandler, refreshHandler } from './handlers/auth'
import { analyticsRouter } from './handlers/analytics'
import { R2Service } from './services/r2'
import { ErrorCode, ErrorHandler } from './utils'

// Create Hono app with type bindings
const app = new Hono<{ Bindings: Bindings }>()

// Global middleware
app.use('*', errorHandlerMiddleware) // Add error handling middleware first
app.use('*', logger())
app.use('*', prettyJSON())

// Note: CORS not needed since frontend and API are served from the same Worker domain

// Health check endpoint
app.get('/health', async (c) => {
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
            files: '/api/files',
            analytics: '/api/analytics'
        }
    })
})

// Mount analytics router
app.route('/api/analytics', analyticsRouter)

// Authentication routes
app.post('/api/auth/login', loginHandler)
app.post('/api/auth/logout', logoutHandler)
app.get('/api/auth/verify', verifyHandler)
app.post('/api/auth/refresh', refreshHandler)

// Create R2 service instance for each request
const getR2Service = (c: any) => new R2Service(c.env.R2_BUCKET)

// File operation routes (protected)
app.get('/api/files', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)
        const prefix = c.req.query('prefix') || ''
        const cursor = c.req.query('cursor')

        const listing = await r2Service.listDirectory(prefix, cursor)

        return c.json({
            success: true,
            ...listing
        })
    } catch (error) {
        console.error('Error listing files:', error)

        return c.json({
            success: false,
            error: 'Failed to list files'
        }, 500)
    }
})

app.post('/api/files/upload', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)
        const maxSizeMB = parseInt(c.env.MAX_FILE_SIZE_MB)

        // Get file from request
        const body = await c.req.blob()

        // Check file size
        if (body.size > maxSizeMB * 1024 * 1024) {
            return c.json({
                success: false,
                error: `File size exceeds maximum of ${maxSizeMB}MB`
            }, 413)
        }

        // Get path and filename from query
        const path = c.req.query('path') || ''
        const filename = c.req.query('filename') || `upload-${Date.now()}`

        // Combine path and filename for the full key
        const key = path ? (path.endsWith('/') ? `${path}${filename}` : `${path}/${filename}`) : filename

        // Get content type from request or infer from filename
        const contentType = body.type || inferContentType(filename)

        // Upload to R2
        const result = await r2Service.uploadFile(key, body, contentType)

        return c.json(result)
    } catch (error) {
        console.error('Error uploading file:', error)

        return c.json({
            success: false,
            error: 'Failed to upload file'
        }, 500)
    }
})

// Multipart upload initiation
app.post('/api/files/multipart/create', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)

        // Get request body
        const { key, contentType } = await c.req.json<{ key: string, contentType?: string }>()

        if (!key) {
            return c.json({
                success: false,
                error: 'Missing required parameter: key'
            }, 400)
        }

        const uploadId = await r2Service.createMultipartUpload(key, contentType)

        return c.json({
            success: true,
            uploadId,
            key
        })
    } catch (error) {
        console.error('Error creating multipart upload:', error)
        return c.json({
            success: false,
            error: 'Failed to create multipart upload'
        }, 500)
    }
})

// Upload part
app.post('/api/files/multipart/upload-part', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)

        // Get query parameters
        const key = c.req.query('key')
        const uploadId = c.req.query('uploadId')
        const partNumberStr = c.req.query('partNumber')

        if (!key || !uploadId || !partNumberStr) {
            return c.json({
                success: false,
                error: 'Missing required parameters: key, uploadId, partNumber'
            }, 400)
        }

        const partNumber = parseInt(partNumberStr)
        if (isNaN(partNumber) || partNumber < 1 || partNumber > 10000) {
            return c.json({
                success: false,
                error: 'Invalid part number. Must be between 1 and 10000'
            }, 400)
        }

        // Get part data
        const body = await c.req.blob()

        const part = await r2Service.uploadPart(key, uploadId, partNumber, body)

        return c.json({
            success: true,
            ...part
        })
    } catch (error) {
        console.error('Error uploading part:', error)
        return c.json({
            success: false,
            error: 'Failed to upload part'
        }, 500)
    }
})

// Complete multipart upload
app.post('/api/files/multipart/complete', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)

        // Get request body
        const { key, uploadId, parts } = await c.req.json<{
            key: string,
            uploadId: string,
            parts: { partNumber: number, etag: string }[]
        }>()

        if (!key || !uploadId || !parts || !Array.isArray(parts)) {
            return c.json({
                success: false,
                error: 'Missing required parameters: key, uploadId, parts'
            }, 400)
        }

        const result = await r2Service.completeMultipartUpload(key, uploadId, parts)

        return c.json(result)
    } catch (error) {
        console.error('Error completing multipart upload:', error)
        return c.json({
            success: false,
            error: 'Failed to complete multipart upload'
        }, 500)
    }
})

// Abort multipart upload
app.post('/api/files/multipart/abort', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)

        // Get request body
        const { key, uploadId } = await c.req.json<{ key: string, uploadId: string }>()

        if (!key || !uploadId) {
            return c.json({
                success: false,
                error: 'Missing required parameters: key, uploadId'
            }, 400)
        }

        const result = await r2Service.abortMultipartUpload(key, uploadId)

        return c.json(result)
    } catch (error) {
        console.error('Error aborting multipart upload:', error)
        return c.json({
            success: false,
            error: 'Failed to abort multipart upload'
        }, 500)
    }
})

app.get('/api/files/:key*', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)
        const key = c.req.param('key') + (c.req.param('0') || '')
        const range = c.req.header('Range')

        // Get the file with range support if specified
        const object = range
            ? await r2Service.getFileWithRange(key, range)
            : await r2Service.getFile(key)

        if (!object) {
            return c.json({
                success: false,
                error: 'File not found'
            }, 404)
        }



        const headers = {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Length': object.size.toString(),
            'ETag': object.etag,
            'Last-Modified': object.uploaded.toUTCString(),
            'Accept-Ranges': 'bytes'
        }

        // Add Content-Range header if this is a range request
        if (range && object.range) {
            const { offset, length } = object.range
            const end = length ? offset + length - 1 : object.size - 1
            headers['Content-Range'] = `bytes ${offset}-${end}/${object.size}`
            headers['Content-Length'] = (length || (object.size - offset)).toString()
            return new Response(object.body, { status: 206, headers })
        }

        return new Response(object.body, { headers })
    } catch (error) {
        console.error('Error downloading file:', error)

        return c.json({
            success: false,
            error: 'Failed to download file'
        }, 500)
    }
})

app.delete('/api/files/:key*', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)
        const key = c.req.param('key') + (c.req.param('0') || '')

        // Check if this is a folder (ends with /)
        if (key.endsWith('/')) {
            const result = await r2Service.deleteFolder(key)
            return c.json(result)
        } else {
            const result = await r2Service.deleteFile(key)
            return c.json(result)
        }
    } catch (error) {
        console.error('Error deleting file/folder:', error)

        return c.json({
            success: false,
            error: 'Failed to delete file/folder'
        }, 500)
    }
})

// Create folder
app.post('/api/files/folder', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)

        // Get request body
        const { path } = await c.req.json<{ path: string }>()

        if (!path) {
            return c.json({
                success: false,
                error: 'Missing required parameter: path'
            }, 400)
        }

        const result = await r2Service.createFolder(path)

        return c.json(result)
    } catch (error) {
        console.error('Error creating folder:', error)

        return c.json({
            success: false,
            error: 'Failed to create folder'
        }, 500)
    }
})

// Rename file or folder
app.put('/api/files/rename', authMiddleware, async (c) => {
    try {
        const r2Service = getR2Service(c)

        // Get request body
        const { oldKey, newKey } = await c.req.json<{ oldKey: string, newKey: string }>()

        if (!oldKey || !newKey) {
            return c.json({
                success: false,
                error: 'Missing required parameters: oldKey, newKey'
            }, 400)
        }

        const result = await r2Service.renameObject(oldKey, newKey)

        return c.json(result)
    } catch (error) {
        console.error('Error renaming file/folder:', error)

        return c.json({
            success: false,
            error: 'Failed to rename file/folder'
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

// Helper function to infer content type from filename
function inferContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
        'zip': 'application/zip',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    }

    return extension && extension in mimeTypes
        ? mimeTypes[extension]
        : 'application/octet-stream'
}

export default app
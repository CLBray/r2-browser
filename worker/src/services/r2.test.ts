import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { R2Service } from './r2'

// Mock R2Bucket
const mockBucket = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  createMultipartUpload: vi.fn(),
  uploadPart: vi.fn(),
  completeMultipartUpload: vi.fn(),
  abortMultipartUpload: vi.fn()
} as unknown as R2Bucket

describe('R2Service', () => {
  let r2Service: R2Service

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()
    r2Service = new R2Service(mockBucket)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listDirectory', () => {
    it('should list files and folders in root directory', async () => {
      // Mock the list response
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: 'file1.txt', size: 100, uploaded: new Date(), etag: 'etag1' },
          { key: 'file2.jpg', size: 200, uploaded: new Date(), etag: 'etag2' },
          { key: 'folder1/', size: 0, uploaded: new Date(), etag: 'etag3' }
        ],
        delimitedPrefixes: ['folder1/', 'folder2/'],
        truncated: false
      })

      const result = await r2Service.listDirectory()

      expect(mockBucket.list).toHaveBeenCalledWith({
        prefix: '',
        delimiter: '/',
        limit: 1000,
        cursor: undefined
      })

      expect(result.objects).toHaveLength(2) // Should not include folder marker objects
      expect(result.folders).toHaveLength(2)
      expect(result.hasMore).toBe(false)
      expect(result.cursor).toBeUndefined()
    })

    it('should list files and folders in a subdirectory', async () => {
      // Mock the list response
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: 'folder1/file1.txt', size: 100, uploaded: new Date(), etag: 'etag1' },
          { key: 'folder1/file2.jpg', size: 200, uploaded: new Date(), etag: 'etag2' }
        ],
        delimitedPrefixes: ['folder1/subfolder1/'],
        truncated: false
      })

      const result = await r2Service.listDirectory('folder1')

      expect(mockBucket.list).toHaveBeenCalledWith({
        prefix: 'folder1/',
        delimiter: '/',
        limit: 1000,
        cursor: undefined
      })

      expect(result.objects).toHaveLength(2)
      expect(result.folders).toHaveLength(1)
      expect(result.currentPath).toBe('folder1/')
    })

    it('should handle pagination with cursor', async () => {
      // Mock the list response with truncation
      mockBucket.list.mockResolvedValue({
        objects: [{ key: 'file1.txt', size: 100, uploaded: new Date(), etag: 'etag1' }],
        delimitedPrefixes: [],
        truncated: true,
        cursor: 'next-page-cursor'
      })

      const result = await r2Service.listDirectory('', 'some-cursor')

      expect(mockBucket.list).toHaveBeenCalledWith({
        prefix: '',
        delimiter: '/',
        limit: 1000,
        cursor: 'some-cursor'
      })

      expect(result.hasMore).toBe(true)
      expect(result.cursor).toBe('next-page-cursor')
    })
  })

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      mockBucket.put.mockResolvedValue({
        key: 'file.txt',
        version: 'version1',
        etag: 'etag1',
        size: 100
      })

      const result = await r2Service.uploadFile('file.txt', 'file content', 'text/plain')

      expect(mockBucket.put).toHaveBeenCalledWith('file.txt', 'file content', {
        httpMetadata: { contentType: 'text/plain' }
      })
      expect(result.success).toBe(true)
      expect(result.message).toBe('File uploaded successfully')
    })

    it('should handle upload errors', async () => {
      mockBucket.put.mockRejectedValue(new Error('Upload failed'))

      const result = await r2Service.uploadFile('file.txt', 'file content')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to upload file')
    })
  })

  describe('multipart uploads', () => {
    it('should create a multipart upload', async () => {
      mockBucket.createMultipartUpload.mockResolvedValue({
        uploadId: 'upload-id-123',
        key: 'large-file.zip'
      })

      const uploadId = await r2Service.createMultipartUpload('large-file.zip', 'application/zip')

      expect(mockBucket.createMultipartUpload).toHaveBeenCalledWith('large-file.zip', {
        httpMetadata: { contentType: 'application/zip' }
      })
      expect(uploadId).toBe('upload-id-123')
    })

    it('should upload a part', async () => {
      mockBucket.uploadPart.mockResolvedValue({
        etag: 'part-etag-1'
      })

      const part = await r2Service.uploadPart('large-file.zip', 'upload-id-123', 1, 'part content')

      expect(mockBucket.uploadPart).toHaveBeenCalledWith('large-file.zip', 'upload-id-123', 1, 'part content')
      expect(part).toEqual({
        partNumber: 1,
        etag: 'part-etag-1'
      })
    })

    it('should complete a multipart upload', async () => {
      mockBucket.completeMultipartUpload.mockResolvedValue({
        key: 'large-file.zip',
        version: 'version1',
        etag: 'final-etag',
        size: 1000
      })

      const parts = [
        { partNumber: 1, etag: 'part-etag-1' },
        { partNumber: 2, etag: 'part-etag-2' }
      ]

      const result = await r2Service.completeMultipartUpload('large-file.zip', 'upload-id-123', parts)

      expect(mockBucket.completeMultipartUpload).toHaveBeenCalledWith('large-file.zip', 'upload-id-123', [
        { partNumber: 1, etag: 'part-etag-1' },
        { partNumber: 2, etag: 'part-etag-2' }
      ])
      expect(result.success).toBe(true)
    })

    it('should abort a multipart upload', async () => {
      mockBucket.abortMultipartUpload.mockResolvedValue(undefined)

      const result = await r2Service.abortMultipartUpload('large-file.zip', 'upload-id-123')

      expect(mockBucket.abortMultipartUpload).toHaveBeenCalledWith('large-file.zip', 'upload-id-123')
      expect(result.success).toBe(true)
    })

    it('should handle errors when completing multipart uploads', async () => {
      mockBucket.completeMultipartUpload.mockRejectedValue(new Error('Complete failed'))
      mockBucket.abortMultipartUpload.mockResolvedValue(undefined)

      const parts = [
        { partNumber: 1, etag: 'part-etag-1' }
      ]

      const result = await r2Service.completeMultipartUpload('large-file.zip', 'upload-id-123', parts)

      expect(result.success).toBe(false)
      expect(mockBucket.abortMultipartUpload).toHaveBeenCalled()
    })
  })

  describe('getFile', () => {
    it('should get a file successfully', async () => {
      const mockObject = {
        key: 'file.txt',
        size: 100,
        etag: 'etag1',
        httpMetadata: { contentType: 'text/plain' },
        body: 'file content',
        uploaded: new Date()
      }

      mockBucket.get.mockResolvedValue(mockObject)

      const result = await r2Service.getFile('file.txt')

      expect(mockBucket.get).toHaveBeenCalledWith('file.txt')
      expect(result).toEqual(mockObject)
    })

    it('should return null for non-existent files', async () => {
      mockBucket.get.mockResolvedValue(null)

      const result = await r2Service.getFile('non-existent.txt')

      expect(result).toBeNull()
    })
  })

  describe('getFileWithRange', () => {
    it('should get a file with range', async () => {
      const mockObject = {
        key: 'file.txt',
        size: 100,
        etag: 'etag1',
        httpMetadata: { contentType: 'text/plain' },
        body: 'partial content',
        uploaded: new Date()
      }

      mockBucket.get.mockResolvedValue(mockObject)

      const result = await r2Service.getFileWithRange('file.txt', 'bytes=10-20')

      expect(mockBucket.get).toHaveBeenCalledWith('file.txt', {
        range: { offset: 10, length: 11 }
      })
      expect(result).toEqual(mockObject)
    })

    it('should handle open-ended ranges', async () => {
      mockBucket.get.mockResolvedValue({
        key: 'file.txt',
        size: 100,
        etag: 'etag1',
        body: 'partial content',
        uploaded: new Date()
      })

      await r2Service.getFileWithRange('file.txt', 'bytes=10-')

      expect(mockBucket.get).toHaveBeenCalledWith('file.txt', {
        range: { offset: 10, length: undefined }
      })
    })
  })

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      mockBucket.delete.mockResolvedValue({})

      const result = await r2Service.deleteFile('file.txt')

      expect(mockBucket.delete).toHaveBeenCalledWith('file.txt')
      expect(result.success).toBe(true)
    })

    it('should handle delete errors', async () => {
      mockBucket.delete.mockRejectedValue(new Error('Delete failed'))

      const result = await r2Service.deleteFile('file.txt')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete file')
    })
  })

  describe('deleteFolder', () => {
    it('should delete a folder and its contents', async () => {
      // First list call returns objects
      mockBucket.list.mockResolvedValueOnce({
        objects: [
          { key: 'folder1/file1.txt', size: 100, uploaded: new Date(), etag: 'etag1' },
          { key: 'folder1/file2.jpg', size: 200, uploaded: new Date(), etag: 'etag2' }
        ],
        truncated: false
      })

      // Mock successful deletes
      mockBucket.delete.mockResolvedValue({})

      const result = await r2Service.deleteFolder('folder1')

      // Should have listed the folder contents
      expect(mockBucket.list).toHaveBeenCalledWith({
        prefix: 'folder1/',
        limit: 1000
      })

      // Should have deleted each file
      expect(mockBucket.delete).toHaveBeenCalledWith('folder1/file1.txt')
      expect(mockBucket.delete).toHaveBeenCalledWith('folder1/file2.jpg')
      
      // Should have deleted the folder marker
      expect(mockBucket.delete).toHaveBeenCalledWith('folder1/')

      expect(result.success).toBe(true)
    })

    it('should handle pagination when deleting many files', async () => {
      // First list call returns truncated results
      mockBucket.list.mockResolvedValueOnce({
        objects: [{ key: 'folder1/file1.txt', size: 100, uploaded: new Date(), etag: 'etag1' }],
        truncated: true,
        cursor: 'next-page'
      })

      // Second list call returns final results
      mockBucket.list.mockResolvedValueOnce({
        objects: [{ key: 'folder1/file2.jpg', size: 200, uploaded: new Date(), etag: 'etag2' }],
        truncated: false
      })

      // Mock successful deletes
      mockBucket.delete.mockResolvedValue({})

      const result = await r2Service.deleteFolder('folder1')

      // Should have listed the folder contents twice
      expect(mockBucket.list).toHaveBeenCalledTimes(2)
      
      // Should have deleted each file and the folder marker
      expect(mockBucket.delete).toHaveBeenCalledWith('folder1/file1.txt')
      expect(mockBucket.delete).toHaveBeenCalledWith('folder1/file2.jpg')
      expect(mockBucket.delete).toHaveBeenCalledWith('folder1/')

      expect(result.success).toBe(true)
    })
  })

  describe('createFolder', () => {
    it('should create a folder successfully', async () => {
      mockBucket.put.mockResolvedValue({
        key: 'new-folder/',
        version: 'version1',
        etag: 'etag1',
        size: 0
      })

      const result = await r2Service.createFolder('new-folder')

      expect(mockBucket.put).toHaveBeenCalledWith('new-folder/', '', {
        httpMetadata: { contentType: 'application/x-directory' }
      })
      expect(result.success).toBe(true)
    })

    it('should handle folder creation errors', async () => {
      mockBucket.put.mockRejectedValue(new Error('Creation failed'))

      const result = await r2Service.createFolder('new-folder')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create folder')
    })
  })

  describe('renameObject', () => {
    it('should rename a file successfully', async () => {
      // Mock getting the original file
      mockBucket.get.mockResolvedValue({
        key: 'old-file.txt',
        size: 100,
        etag: 'etag1',
        httpMetadata: { contentType: 'text/plain' },
        body: 'file content',
        uploaded: new Date()
      })

      // Mock successful put and delete
      mockBucket.put.mockResolvedValue({})
      mockBucket.delete.mockResolvedValue({})

      const result = await r2Service.renameObject('old-file.txt', 'new-file.txt')

      // Should have gotten the original file
      expect(mockBucket.get).toHaveBeenCalledWith('old-file.txt')
      
      // Should have put the file with the new key
      expect(mockBucket.put).toHaveBeenCalledWith('new-file.txt', 'file content', {
        httpMetadata: { contentType: 'text/plain' }
      })
      
      // Should have deleted the original file
      expect(mockBucket.delete).toHaveBeenCalledWith('old-file.txt')

      expect(result.success).toBe(true)
    })

    it('should handle file not found when renaming', async () => {
      mockBucket.get.mockResolvedValue(null)

      const result = await r2Service.renameObject('non-existent.txt', 'new-file.txt')

      expect(result.success).toBe(false)
      expect(result.error).toBe('File not found')
    })

    it('should rename a folder and its contents', async () => {
      // Mock listing the folder contents
      mockBucket.list.mockResolvedValue({
        objects: [
          { key: 'old-folder/file1.txt', size: 100, uploaded: new Date(), etag: 'etag1' },
          { key: 'old-folder/file2.jpg', size: 200, uploaded: new Date(), etag: 'etag2' },
          { key: 'old-folder/', size: 0, uploaded: new Date(), etag: 'etag3' }
        ],
        truncated: false
      })

      // Mock getting the files
      mockBucket.get.mockImplementation(async (key) => {
        if (key === 'old-folder/file1.txt') {
          return {
            key: 'old-folder/file1.txt',
            size: 100,
            etag: 'etag1',
            httpMetadata: { contentType: 'text/plain' },
            body: 'file1 content',
            uploaded: new Date()
          }
        } else if (key === 'old-folder/file2.jpg') {
          return {
            key: 'old-folder/file2.jpg',
            size: 200,
            etag: 'etag2',
            httpMetadata: { contentType: 'image/jpeg' },
            body: 'file2 content',
            uploaded: new Date()
          }
        } else if (key === 'old-folder/') {
          return {
            key: 'old-folder/',
            size: 0,
            etag: 'etag3',
            httpMetadata: { contentType: 'application/x-directory' },
            body: '',
            uploaded: new Date()
          }
        }
        return null
      })

      // Mock successful puts and deletes
      mockBucket.put.mockResolvedValue({})
      mockBucket.delete.mockResolvedValue({})

      // Mock the deleteFolder method
      const deleteFolder = vi.spyOn(r2Service, 'deleteFolder')
      deleteFolder.mockResolvedValue({
        success: true,
        message: 'Folder deleted successfully'
      })

      const result = await r2Service.renameObject('old-folder/', 'new-folder/')

      // Should have listed the folder contents
      expect(mockBucket.list).toHaveBeenCalledWith({
        prefix: 'old-folder/',
        limit: 1000
      })

      // Should have gotten each file
      expect(mockBucket.get).toHaveBeenCalledWith('old-folder/file1.txt')
      expect(mockBucket.get).toHaveBeenCalledWith('old-folder/file2.jpg')
      
      // Should have put each file with the new key
      expect(mockBucket.put).toHaveBeenCalledWith('new-folder/file1.txt', 'file1 content', {
        httpMetadata: { contentType: 'text/plain' }
      })
      expect(mockBucket.put).toHaveBeenCalledWith('new-folder/file2.jpg', 'file2 content', {
        httpMetadata: { contentType: 'image/jpeg' }
      })
      
      // Should have deleted the old folder
      expect(deleteFolder).toHaveBeenCalledWith('old-folder/')

      expect(result.success).toBe(true)
    })
  })
})
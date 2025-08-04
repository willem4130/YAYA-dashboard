import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock NextRequest constructor
const createMockRequest = (
  method: string,
  url: string,
  body?: any
): NextRequest => {
  const request = {
    method,
    url,
    json: vi.fn().mockResolvedValue(body),
    headers: new Map(),
  } as unknown as NextRequest

  return request
}

describe('/api/webhook-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('GET', () => {
    it('should return empty logs initially', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-logs'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })

    it('should filter logs by workflowId', async () => {
      // First add some logs
      const log1 = {
        workflowId: 'workflow-1',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'Test message 1' },
        response: { result: 'Success 1' },
      }

      const log2 = {
        workflowId: 'workflow-2',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'Test message 2' },
        response: { result: 'Success 2' },
      }

      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          log1
        )
      )
      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          log2
        )
      )

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-logs?workflowId=workflow-1'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].workflowId).toBe('workflow-1')
    })

    it('should filter logs by status', async () => {
      const successLog = {
        workflowId: 'test-workflow',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'Success message' },
        response: { result: 'Success' },
      }

      const errorLog = {
        workflowId: 'test-workflow',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'error',
        data: { message: 'Error message' },
        error: 'Something went wrong',
      }

      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          successLog
        )
      )
      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          errorLog
        )
      )

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-logs?status=error'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].status).toBe('error')
    })

    it('should limit number of returned logs', async () => {
      // Add multiple logs
      const logs = Array.from({ length: 15 }, (_, i) => ({
        workflowId: 'test-workflow',
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        type: 'request',
        status: 'success',
        data: { message: `Message ${i}` },
        response: { result: `Success ${i}` },
      }))

      for (const log of logs) {
        await POST(
          createMockRequest(
            'POST',
            'http://localhost:3000/api/webhook-logs',
            log
          )
        )
      }

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-logs?limit=10'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(10)
    })

    it('should handle date range filtering', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const oldLog = {
        workflowId: 'test-workflow',
        timestamp: yesterday.toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'Old message' },
        response: { result: 'Old success' },
      }

      const newLog = {
        workflowId: 'test-workflow',
        timestamp: now.toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'New message' },
        response: { result: 'New success' },
      }

      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          oldLog
        )
      )
      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          newLog
        )
      )

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/webhook-logs?from=${yesterday.toISOString()}&to=${tomorrow.toISOString()}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
    })

    it('should handle errors gracefully', async () => {
      // Mock URL constructor to throw an error
      const originalURL = global.URL
      global.URL = vi.fn(() => {
        throw new Error('URL parsing error')
      }) as any

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-logs'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve logs')

      // Restore original URL
      global.URL = originalURL
    })
  })

  describe('POST', () => {
    it('should create new log entry successfully', async () => {
      const logEntry = {
        workflowId: 'test-workflow',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'Test message' },
        response: { result: 'Success' },
        duration: 150,
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-logs',
        logEntry
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.workflowId).toBe('test-workflow')
      expect(data.status).toBe('success')
      expect(data.id).toBeDefined()
    })

    it('should create error log entry', async () => {
      const errorLog = {
        workflowId: 'test-workflow',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'error',
        data: { message: 'Test message' },
        error: 'Webhook endpoint returned 500',
        duration: 5000,
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-logs',
        errorLog
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.status).toBe('error')
      expect(data.error).toBe('Webhook endpoint returned 500')
    })

    it('should auto-generate timestamp if not provided', async () => {
      const logEntry = {
        workflowId: 'test-workflow',
        type: 'request',
        status: 'success',
        data: { message: 'Test message' },
        response: { result: 'Success' },
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-logs',
        logEntry
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })

    it('should auto-generate ID if not provided', async () => {
      const logEntry = {
        workflowId: 'test-workflow',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'Test message' },
        response: { result: 'Success' },
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-logs',
        logEntry
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(typeof data.id).toBe('string')
    })

    it('should reject log without required fields', async () => {
      const invalidLog = {
        // Missing workflowId
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-logs',
        invalidLog
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should handle invalid status values', async () => {
      const invalidLog = {
        workflowId: 'test-workflow',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'invalid-status',
        data: { message: 'Test message' },
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-logs',
        invalidLog
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid status value')
    })

    it('should handle JSON parsing errors', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost:3000/api/webhook-logs',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map(),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to save log')
    })

    it('should handle large data payloads', async () => {
      const largeData = {
        message: 'x'.repeat(10000), // 10KB string
        largeArray: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      }

      const logEntry = {
        workflowId: 'test-workflow',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: largeData,
        response: { result: 'Success with large data' },
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-logs',
        logEntry
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.message).toHaveLength(10000)
      expect(data.data.largeArray).toHaveLength(1000)
    })
  })

  describe('Integration tests', () => {
    it('should maintain logs across requests', async () => {
      const log1 = {
        workflowId: 'workflow-1',
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: { message: 'First log' },
        response: { result: 'Success 1' },
      }

      const log2 = {
        workflowId: 'workflow-1',
        timestamp: new Date().toISOString(),
        type: 'response',
        status: 'error',
        data: { message: 'Second log' },
        error: 'Failed processing',
      }

      // Add first log
      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          log1
        )
      )

      // Add second log
      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-logs',
          log2
        )
      )

      // Retrieve all logs
      const getRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-logs'
      )
      const getResponse = await GET(getRequest)
      const data = await getResponse.json()

      expect(getResponse.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data.some((log: any) => log.status === 'success')).toBe(true)
      expect(data.some((log: any) => log.status === 'error')).toBe(true)
    })

    it('should handle concurrent log creation', async () => {
      const logs = Array.from({ length: 5 }, (_, i) => ({
        workflowId: `workflow-${i}`,
        timestamp: new Date().toISOString(),
        type: 'request',
        status: 'success',
        data: { message: `Concurrent message ${i}` },
        response: { result: `Success ${i}` },
      }))

      // Create all logs concurrently
      const promises = logs.map(log =>
        POST(
          createMockRequest(
            'POST',
            'http://localhost:3000/api/webhook-logs',
            log
          )
        )
      )

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
      })

      // Verify all logs are stored
      const getRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-logs'
      )
      const getResponse = await GET(getRequest)
      const data = await getResponse.json()

      expect(data).toHaveLength(5)
    })
  })
})

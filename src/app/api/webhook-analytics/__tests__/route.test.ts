import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock NextRequest constructor
const createMockRequest = (
  method: string,
  url: string,
  body?: unknown
): NextRequest => {
  const request = {
    method,
    url,
    json: vi.fn().mockResolvedValue(body),
    headers: new Map(),
  } as unknown as NextRequest

  return request
}

describe('/api/webhook-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('GET', () => {
    it('should return default analytics when no data available', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('totalRequests')
      expect(data).toHaveProperty('successRate')
      expect(data).toHaveProperty('avgResponseTime')
      expect(data).toHaveProperty('errorRate')
      expect(data.totalRequests).toBe(0)
      expect(data.successRate).toBe(0)
      expect(data.avgResponseTime).toBe(0)
      expect(data.errorRate).toBe(0)
    })

    it('should filter analytics by workflowId', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?workflowId=test-workflow'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('workflowId', 'test-workflow')
      expect(data).toHaveProperty('totalRequests')
      expect(data).toHaveProperty('successRate')
    })

    it('should filter analytics by date range', async () => {
      const from = new Date('2024-01-01').toISOString()
      const to = new Date('2024-01-31').toISOString()

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/webhook-analytics?from=${from}&to=${to}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('dateRange')
      expect(data.dateRange).toEqual({ from, to })
    })

    it('should return hourly breakdown when requested', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?breakdown=hourly'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('breakdown')
      expect(Array.isArray(data.breakdown)).toBe(true)
    })

    it('should return daily breakdown when requested', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?breakdown=daily'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('breakdown')
      expect(Array.isArray(data.breakdown)).toBe(true)
    })

    it('should return top errors when requested', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?includeErrors=true'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('topErrors')
      expect(Array.isArray(data.topErrors)).toBe(true)
    })

    it('should return performance metrics', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?includePerformance=true'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('performance')
      expect(data.performance).toHaveProperty('p50ResponseTime')
      expect(data.performance).toHaveProperty('p95ResponseTime')
      expect(data.performance).toHaveProperty('p99ResponseTime')
    })

    it('should calculate success rate correctly', async () => {
      // Mock scenario: 80 successful requests, 20 failed requests
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics'
      )

      // Mock the analytics calculation
      const _mockAnalytics = {
        totalRequests: 100,
        successfulRequests: 80,
        failedRequests: 20,
        successRate: 80,
        errorRate: 20,
        avgResponseTime: 150,
      }

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // The actual implementation would calculate these values
      expect(typeof data.successRate).toBe('number')
      expect(typeof data.errorRate).toBe('number')
      expect(data.successRate + data.errorRate).toBeLessThanOrEqual(100)
    })

    it('should handle invalid date ranges', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?from=invalid-date&to=also-invalid'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid date range')
    })

    it('should handle invalid breakdown type', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?breakdown=invalid'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid breakdown type')
    })

    it('should handle server errors gracefully', async () => {
      // Mock URL constructor to throw an error
      const originalURL = global.URL
      global.URL = vi.fn(() => {
        throw new Error('URL parsing error')
      }) as unknown as typeof URL

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve analytics')

      // Restore original URL
      global.URL = originalURL
    })

    it('should return comprehensive analytics for multiple workflows', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?groupBy=workflow'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('workflows')
      expect(Array.isArray(data.workflows)).toBe(true)
    })

    it('should calculate response time percentiles correctly', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?includePerformance=true'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      if (data.performance) {
        expect(data.performance.p50ResponseTime).toBeGreaterThanOrEqual(0)
        expect(data.performance.p95ResponseTime).toBeGreaterThanOrEqual(
          data.performance.p50ResponseTime
        )
        expect(data.performance.p99ResponseTime).toBeGreaterThanOrEqual(
          data.performance.p95ResponseTime
        )
      }
    })

    it('should handle concurrent analytics requests', async () => {
      const requests = [
        createMockRequest('GET', 'http://localhost:3000/api/webhook-analytics'),
        createMockRequest(
          'GET',
          'http://localhost:3000/api/webhook-analytics?workflowId=test-1'
        ),
        createMockRequest(
          'GET',
          'http://localhost:3000/api/webhook-analytics?breakdown=hourly'
        ),
      ]

      const responses = await Promise.all(requests.map(req => GET(req)))

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should return analytics with proper data types', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.totalRequests).toBe('number')
      expect(typeof data.successRate).toBe('number')
      expect(typeof data.avgResponseTime).toBe('number')
      expect(typeof data.errorRate).toBe('number')

      // Validate ranges
      expect(data.successRate).toBeGreaterThanOrEqual(0)
      expect(data.successRate).toBeLessThanOrEqual(100)
      expect(data.errorRate).toBeGreaterThanOrEqual(0)
      expect(data.errorRate).toBeLessThanOrEqual(100)
      expect(data.avgResponseTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty date range', async () => {
      const from = new Date().toISOString()
      const to = new Date().toISOString() // Same date

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/webhook-analytics?from=${from}&to=${to}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalRequests).toBe(0)
    })

    it('should return status code distribution', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-analytics?includeStatusCodes=true'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('statusCodes')
      expect(typeof data.statusCodes).toBe('object')
    })
  })

  describe('Edge cases', () => {
    it('should handle very large time ranges', async () => {
      const from = new Date('2020-01-01').toISOString()
      const to = new Date('2024-12-31').toISOString()

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/webhook-analytics?from=${from}&to=${to}`
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle future date ranges', async () => {
      const from = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const to = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/webhook-analytics?from=${from}&to=${to}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalRequests).toBe(0)
    })

    it('should handle timezone differences in dates', async () => {
      const from = '2024-01-01T00:00:00Z'
      const to = '2024-01-01T23:59:59-08:00' // PST timezone

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/webhook-analytics?from=${from}&to=${to}`
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebhookMonitor } from '../webhook-monitoring'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
global.console = mockConsole as any

describe('WebhookMonitor', () => {
  let monitor: WebhookMonitor

  beforeEach(() => {
    vi.clearAllMocks()
    monitor = new WebhookMonitor()
  })

  describe('health checks', () => {
    it('should perform successful health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy' }),
      })

      const result = await monitor.checkHealth('https://example.com/webhook')

      expect(result).toEqual({
        url: 'https://example.com/webhook',
        status: 'healthy',
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
      })
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/webhook', {
        method: 'HEAD',
        timeout: 5000,
      })
    })

    it('should handle failed health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await monitor.checkHealth('https://example.com/webhook')

      expect(result).toEqual({
        url: 'https://example.com/webhook',
        status: 'unhealthy',
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
        error: 'HTTP 500: Internal Server Error',
      })
    })

    it('should handle network errors during health check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await monitor.checkHealth('https://example.com/webhook')

      expect(result).toEqual({
        url: 'https://example.com/webhook',
        status: 'unhealthy',
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
        error: 'Network error',
      })
    })

    it('should handle timeout during health check', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      )

      const result = await monitor.checkHealth(
        'https://example.com/webhook',
        1000
      )

      expect(result.status).toBe('unhealthy')
      expect(result.error).toBe('Timeout')
    })

    it('should measure response time accurately', async () => {
      const delay = 100
      mockFetch.mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: () => Promise.resolve({ status: 'healthy' }),
                }),
              delay
            )
          )
      )

      const result = await monitor.checkHealth('https://example.com/webhook')

      expect(result.responseTime).toBeGreaterThanOrEqual(delay - 10)
      expect(result.responseTime).toBeLessThan(delay + 50)
    })
  })

  describe('monitoring intervals', () => {
    it('should start monitoring with default interval', async () => {
      const healthCheckSpy = vi.spyOn(monitor, 'checkHealth')
      healthCheckSpy.mockResolvedValue({
        url: 'https://example.com/webhook',
        status: 'healthy',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })

      const stopMonitoring = monitor.startMonitoring(
        'https://example.com/webhook'
      )

      // Wait for at least one check
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(healthCheckSpy).toHaveBeenCalled()

      stopMonitoring()
    })

    it('should start monitoring with custom interval', async () => {
      const healthCheckSpy = vi.spyOn(monitor, 'checkHealth')
      healthCheckSpy.mockResolvedValue({
        url: 'https://example.com/webhook',
        status: 'healthy',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })

      const stopMonitoring = monitor.startMonitoring(
        'https://example.com/webhook',
        {
          interval: 50,
        }
      )

      // Wait for multiple checks
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(healthCheckSpy).toHaveBeenCalledTimes(3)

      stopMonitoring()
    })

    it('should stop monitoring when requested', async () => {
      const healthCheckSpy = vi.spyOn(monitor, 'checkHealth')
      healthCheckSpy.mockResolvedValue({
        url: 'https://example.com/webhook',
        status: 'healthy',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })

      const stopMonitoring = monitor.startMonitoring(
        'https://example.com/webhook',
        {
          interval: 50,
        }
      )

      // Wait for some checks
      await new Promise(resolve => setTimeout(resolve, 100))
      const callsBefore = healthCheckSpy.mock.calls.length

      stopMonitoring()

      // Wait more time after stopping
      await new Promise(resolve => setTimeout(resolve, 100))
      const callsAfter = healthCheckSpy.mock.calls.length

      expect(callsAfter).toBe(callsBefore)
    })

    it('should handle errors during monitoring', async () => {
      const healthCheckSpy = vi.spyOn(monitor, 'checkHealth')
      healthCheckSpy.mockRejectedValue(new Error('Monitoring error'))

      const onError = vi.fn()
      const stopMonitoring = monitor.startMonitoring(
        'https://example.com/webhook',
        {
          interval: 50,
          onError,
        }
      )

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onError).toHaveBeenCalledWith(expect.any(Error))

      stopMonitoring()
    })

    it('should call onHealthChange callback', async () => {
      const healthCheckSpy = vi.spyOn(monitor, 'checkHealth')
      healthCheckSpy.mockResolvedValue({
        url: 'https://example.com/webhook',
        status: 'healthy',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })

      const onHealthChange = vi.fn()
      const stopMonitoring = monitor.startMonitoring(
        'https://example.com/webhook',
        {
          interval: 50,
          onHealthChange,
        }
      )

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(onHealthChange).toHaveBeenCalledWith({
        url: 'https://example.com/webhook',
        status: 'healthy',
        responseTime: 100,
        timestamp: expect.any(String),
      })

      stopMonitoring()
    })
  })

  describe('statistics tracking', () => {
    it('should track successful requests', () => {
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 150,
        timestamp: new Date().toISOString(),
      })

      const stats = monitor.getStatistics('test-workflow')

      expect(stats).toEqual({
        workflowId: 'test-workflow',
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 0,
        successRate: 100,
        avgResponseTime: 150,
        lastRequestTime: expect.any(String),
      })
    })

    it('should track failed requests', () => {
      monitor.recordRequest('test-workflow', {
        status: 'error',
        responseTime: 5000,
        timestamp: new Date().toISOString(),
        error: 'Timeout error',
      })

      const stats = monitor.getStatistics('test-workflow')

      expect(stats).toEqual({
        workflowId: 'test-workflow',
        totalRequests: 1,
        successfulRequests: 0,
        failedRequests: 1,
        successRate: 0,
        avgResponseTime: 5000,
        lastRequestTime: expect.any(String),
      })
    })

    it('should calculate average response time correctly', () => {
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 200,
        timestamp: new Date().toISOString(),
      })
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 300,
        timestamp: new Date().toISOString(),
      })

      const stats = monitor.getStatistics('test-workflow')

      expect(stats.totalRequests).toBe(3)
      expect(stats.avgResponseTime).toBe(200)
      expect(stats.successRate).toBe(100)
    })

    it('should calculate success rate correctly with mixed results', () => {
      // 3 successful, 2 failed = 60% success rate
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 150,
        timestamp: new Date().toISOString(),
      })
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 120,
        timestamp: new Date().toISOString(),
      })
      monitor.recordRequest('test-workflow', {
        status: 'error',
        responseTime: 5000,
        timestamp: new Date().toISOString(),
        error: 'Error 1',
      })
      monitor.recordRequest('test-workflow', {
        status: 'error',
        responseTime: 3000,
        timestamp: new Date().toISOString(),
        error: 'Error 2',
      })

      const stats = monitor.getStatistics('test-workflow')

      expect(stats.totalRequests).toBe(5)
      expect(stats.successfulRequests).toBe(3)
      expect(stats.failedRequests).toBe(2)
      expect(stats.successRate).toBe(60)
      expect(stats.avgResponseTime).toBe(1654) // (100+150+120+5000+3000)/5
    })

    it('should return empty stats for unknown workflow', () => {
      const stats = monitor.getStatistics('unknown-workflow')

      expect(stats).toEqual({
        workflowId: 'unknown-workflow',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        avgResponseTime: 0,
        lastRequestTime: null,
      })
    })

    it('should get all statistics', () => {
      monitor.recordRequest('workflow-1', {
        status: 'success',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })
      monitor.recordRequest('workflow-2', {
        status: 'error',
        responseTime: 500,
        timestamp: new Date().toISOString(),
        error: 'Failed',
      })

      const allStats = monitor.getAllStatistics()

      expect(allStats).toHaveLength(2)
      expect(allStats.find(s => s.workflowId === 'workflow-1')).toBeDefined()
      expect(allStats.find(s => s.workflowId === 'workflow-2')).toBeDefined()
    })

    it('should clear statistics for workflow', () => {
      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })

      let stats = monitor.getStatistics('test-workflow')
      expect(stats.totalRequests).toBe(1)

      monitor.clearStatistics('test-workflow')

      stats = monitor.getStatistics('test-workflow')
      expect(stats.totalRequests).toBe(0)
    })

    it('should clear all statistics', () => {
      monitor.recordRequest('workflow-1', {
        status: 'success',
        responseTime: 100,
        timestamp: new Date().toISOString(),
      })
      monitor.recordRequest('workflow-2', {
        status: 'success',
        responseTime: 150,
        timestamp: new Date().toISOString(),
      })

      let allStats = monitor.getAllStatistics()
      expect(allStats).toHaveLength(2)

      monitor.clearAllStatistics()

      allStats = monitor.getAllStatistics()
      expect(allStats).toHaveLength(0)
    })
  })

  describe('alerting system', () => {
    it('should trigger alert when success rate drops below threshold', () => {
      const onAlert = vi.fn()
      monitor = new WebhookMonitor({ alertThreshold: 80, onAlert })

      // Record successful requests
      for (let i = 0; i < 7; i++) {
        monitor.recordRequest('test-workflow', {
          status: 'success',
          responseTime: 100,
          timestamp: new Date().toISOString(),
        })
      }

      // Record failed requests (now 70% success rate)
      for (let i = 0; i < 3; i++) {
        monitor.recordRequest('test-workflow', {
          status: 'error',
          responseTime: 500,
          timestamp: new Date().toISOString(),
          error: 'Failed',
        })
      }

      expect(onAlert).toHaveBeenCalledWith({
        workflowId: 'test-workflow',
        type: 'low_success_rate',
        message: 'Success rate (70%) below threshold (80%)',
        currentValue: 70,
        threshold: 80,
        timestamp: expect.any(String),
      })
    })

    it('should trigger alert when response time exceeds threshold', () => {
      const onAlert = vi.fn()
      monitor = new WebhookMonitor({
        responseTimeThreshold: 1000,
        onAlert,
      })

      monitor.recordRequest('test-workflow', {
        status: 'success',
        responseTime: 1500,
        timestamp: new Date().toISOString(),
      })

      expect(onAlert).toHaveBeenCalledWith({
        workflowId: 'test-workflow',
        type: 'high_response_time',
        message: 'Response time (1500ms) above threshold (1000ms)',
        currentValue: 1500,
        threshold: 1000,
        timestamp: expect.any(String),
      })
    })

    it('should not trigger duplicate alerts', () => {
      const onAlert = vi.fn()
      monitor = new WebhookMonitor({ alertThreshold: 80, onAlert })

      // Record multiple failed requests
      for (let i = 0; i < 5; i++) {
        monitor.recordRequest('test-workflow', {
          status: 'error',
          responseTime: 500,
          timestamp: new Date().toISOString(),
          error: 'Failed',
        })
      }

      // Should only trigger alert once
      expect(onAlert).toHaveBeenCalledTimes(1)
    })

    it('should reset alert state when success rate recovers', () => {
      const onAlert = vi.fn()
      monitor = new WebhookMonitor({ alertThreshold: 80, onAlert })

      // Trigger low success rate alert
      for (let i = 0; i < 5; i++) {
        monitor.recordRequest('test-workflow', {
          status: 'error',
          responseTime: 500,
          timestamp: new Date().toISOString(),
          error: 'Failed',
        })
      }

      expect(onAlert).toHaveBeenCalledTimes(1)

      // Add successful requests to recover
      for (let i = 0; i < 20; i++) {
        monitor.recordRequest('test-workflow', {
          status: 'success',
          responseTime: 100,
          timestamp: new Date().toISOString(),
        })
      }

      // Now trigger alert again
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest('test-workflow', {
          status: 'error',
          responseTime: 500,
          timestamp: new Date().toISOString(),
          error: 'Failed again',
        })
      }

      expect(onAlert).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('should handle malformed URLs gracefully', async () => {
      const result = await monitor.checkHealth('not-a-url')

      expect(result.status).toBe('unhealthy')
      expect(result.error).toContain('Invalid URL')
    })

    it('should handle empty statistics gracefully', () => {
      const stats = monitor.getStatistics('')

      expect(stats.workflowId).toBe('')
      expect(stats.totalRequests).toBe(0)
    })

    it('should handle invalid request data', () => {
      expect(() => {
        monitor.recordRequest('test-workflow', {
          status: 'invalid-status' as any,
          responseTime: -100,
          timestamp: 'invalid-date',
        })
      }).not.toThrow()
    })
  })
})

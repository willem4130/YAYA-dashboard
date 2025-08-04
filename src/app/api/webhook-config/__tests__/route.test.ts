import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '../route'
import type { WebhookConfiguration } from '@/lib/webhook-configuration'

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

// Mock valid webhook configuration
const mockValidConfig: WebhookConfiguration = {
  workflowId: 'test-workflow',
  name: 'Test Configuration',
  description: 'A test webhook configuration',
  inputMappings: [
    {
      sourceField: 'message',
      targetField: 'user_message',
      required: true,
    },
  ],
  outputMappings: [
    {
      sourceField: 'response',
      targetField: 'assistantReply',
    },
  ],
  responseHandling: {
    successPath: 'success',
    errorPath: 'error.message',
    dataPath: 'data',
  },
  n8nSettings: {
    webhookUrl: 'https://example.com/webhook',
    method: 'POST',
  },
  metadata: {
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: '1.0.0',
    createdBy: 'test-user',
    tags: ['test'],
  },
}

describe('/api/webhook-config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the in-memory storage by requiring the module fresh
    vi.resetModules()
  })

  describe('GET', () => {
    it('should return all configurations when no workflowId specified', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config'
      )

      // First, add a configuration via POST
      const postRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        mockValidConfig
      )
      await POST(postRequest)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].workflowId).toBe('test-workflow')
    })

    it('should return specific configuration by workflowId', async () => {
      // First, add a configuration
      const postRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        mockValidConfig
      )
      await POST(postRequest)

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config?workflowId=test-workflow'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.workflowId).toBe('test-workflow')
      expect(data.name).toBe('Test Configuration')
    })

    it('should return 404 when configuration not found', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config?workflowId=non-existent'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Configuration not found')
    })

    it('should handle errors gracefully', async () => {
      // Mock URL constructor to throw an error
      const originalURL = global.URL
      global.URL = vi.fn(() => {
        throw new Error('URL parsing error')
      }) as NextRequest

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve configurations')

      // Restore original URL
      global.URL = originalURL
    })
  })

  describe('POST', () => {
    it('should create new configuration successfully', async () => {
      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        mockValidConfig
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.workflowId).toBe('test-workflow')
      expect(data.name).toBe('Test Configuration')
      expect(data.metadata.createdAt).toBeDefined()
      expect(data.metadata.updatedAt).toBeDefined()
    })

    it('should update existing configuration', async () => {
      // First create a configuration
      const createRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        mockValidConfig
      )
      await POST(createRequest)

      // Then update it
      const updatedConfig = {
        ...mockValidConfig,
        name: 'Updated Configuration',
      }
      const updateRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        updatedConfig
      )

      const response = await POST(updateRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Updated Configuration')
      expect(data.metadata.updatedAt).not.toBe(
        mockValidConfig.metadata.updatedAt
      )
    })

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        ...mockValidConfig,
        workflowId: '', // Invalid: empty string
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        invalidConfig
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid configuration')
      expect(data.details).toBeDefined()
    })

    it('should reject configuration with invalid method', async () => {
      const invalidConfig = {
        ...mockValidConfig,
        n8nSettings: {
          ...mockValidConfig.n8nSettings,
          method: 'INVALID_METHOD' as never,
        },
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        invalidConfig
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid configuration')
    })

    it('should reject configuration with invalid transform', async () => {
      const invalidConfig = {
        ...mockValidConfig,
        inputMappings: [
          {
            sourceField: 'test',
            targetField: 'test',
            transform: 'invalid-transform' as never,
          },
        ],
      }

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        invalidConfig
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid configuration')
    })

    it('should handle JSON parsing errors', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost:3000/api/webhook-config',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map(),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to save configuration')
    })
  })

  describe('PUT', () => {
    it('should update existing configuration successfully', async () => {
      // First create a configuration
      const createRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        mockValidConfig
      )
      await POST(createRequest)

      // Then update it
      const updatedConfig = {
        ...mockValidConfig,
        name: 'Updated via PUT',
        description: 'Updated description',
      }
      const updateRequest = createMockRequest(
        'PUT',
        'http://localhost:3000/api/webhook-config',
        updatedConfig
      )

      const response = await PUT(updateRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated via PUT')
      expect(data.description).toBe('Updated description')
      expect(data.metadata.updatedAt).not.toBe(
        mockValidConfig.metadata.updatedAt
      )
    })

    it('should return 404 when updating non-existent configuration', async () => {
      const nonExistentConfig = {
        ...mockValidConfig,
        workflowId: 'non-existent-workflow',
      }

      const request = createMockRequest(
        'PUT',
        'http://localhost:3000/api/webhook-config',
        nonExistentConfig
      )

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Configuration not found')
    })

    it('should reject invalid configuration on update', async () => {
      const invalidConfig = {
        ...mockValidConfig,
        workflowId: '', // Invalid
      }

      const request = createMockRequest(
        'PUT',
        'http://localhost:3000/api/webhook-config',
        invalidConfig
      )

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid configuration')
    })

    it('should handle JSON parsing errors', async () => {
      const request = {
        method: 'PUT',
        url: 'http://localhost:3000/api/webhook-config',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map(),
      } as unknown as NextRequest

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update configuration')
    })
  })

  describe('DELETE', () => {
    it('should delete existing configuration successfully', async () => {
      // First create a configuration
      const createRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        mockValidConfig
      )
      await POST(createRequest)

      // Then delete it
      const deleteRequest = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/webhook-config?workflowId=test-workflow'
      )

      const response = await DELETE(deleteRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify it's actually deleted
      const getRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config?workflowId=test-workflow'
      )
      const getResponse = await GET(getRequest)
      expect(getResponse.status).toBe(404)
    })

    it('should return 400 when workflowId is missing', async () => {
      const request = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/webhook-config'
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('workflowId is required')
    })

    it('should return 404 when deleting non-existent configuration', async () => {
      const request = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/webhook-config?workflowId=non-existent'
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Configuration not found')
    })

    it('should handle URL parsing errors', async () => {
      // Mock URL constructor to throw an error
      const originalURL = global.URL
      global.URL = vi.fn(() => {
        throw new Error('URL parsing error')
      }) as NextRequest

      const request = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/webhook-config?workflowId=test'
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete configuration')

      // Restore original URL
      global.URL = originalURL
    })
  })

  describe('Integration tests', () => {
    it('should handle complete CRUD workflow', async () => {
      // CREATE
      const createRequest = createMockRequest(
        'POST',
        'http://localhost:3000/api/webhook-config',
        mockValidConfig
      )
      const createResponse = await POST(createRequest)
      expect(createResponse.status).toBe(201)

      // READ
      const readRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config?workflowId=test-workflow'
      )
      const readResponse = await GET(readRequest)
      expect(readResponse.status).toBe(200)

      // UPDATE
      const updatedConfig = {
        ...mockValidConfig,
        name: 'Updated Configuration',
      }
      const updateRequest = createMockRequest(
        'PUT',
        'http://localhost:3000/api/webhook-config',
        updatedConfig
      )
      const updateResponse = await PUT(updateRequest)
      expect(updateResponse.status).toBe(200)

      // VERIFY UPDATE
      const verifyRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config?workflowId=test-workflow'
      )
      const verifyResponse = await GET(verifyRequest)
      const verifyData = await verifyResponse.json()
      expect(verifyData.name).toBe('Updated Configuration')

      // DELETE
      const deleteRequest = createMockRequest(
        'DELETE',
        'http://localhost:3000/api/webhook-config?workflowId=test-workflow'
      )
      const deleteResponse = await DELETE(deleteRequest)
      expect(deleteResponse.status).toBe(200)

      // VERIFY DELETION
      const finalRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config?workflowId=test-workflow'
      )
      const finalResponse = await GET(finalRequest)
      expect(finalResponse.status).toBe(404)
    })

    it('should handle multiple configurations', async () => {
      const config1 = { ...mockValidConfig, workflowId: 'workflow-1' }
      const config2 = { ...mockValidConfig, workflowId: 'workflow-2' }

      // Create two configurations
      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-config',
          config1
        )
      )
      await POST(
        createMockRequest(
          'POST',
          'http://localhost:3000/api/webhook-config',
          config2
        )
      )

      // Get all configurations
      const getAllRequest = createMockRequest(
        'GET',
        'http://localhost:3000/api/webhook-config'
      )
      const getAllResponse = await GET(getAllRequest)
      const allConfigs = await getAllResponse.json()

      expect(getAllResponse.status).toBe(200)
      expect(allConfigs).toHaveLength(2)
      expect(
        allConfigs.map((c: WebhookConfiguration) => c.workflowId)
      ).toContain('workflow-1')
      expect(
        allConfigs.map((c: WebhookConfiguration) => c.workflowId)
      ).toContain('workflow-2')
    })
  })
})

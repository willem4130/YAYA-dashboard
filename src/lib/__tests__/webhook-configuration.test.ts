import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  WebhookConfigurationService,
  FieldTransforms,
  WebhookConfigurationSchema,
  type WebhookConfiguration,
  type WebhookFieldMapping,
  DEFAULT_WEBHOOK_CONFIGURATIONS,
} from '../webhook-configuration'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
})

describe('FieldTransforms', () => {
  describe('lowercase', () => {
    it('should convert string to lowercase', () => {
      expect(FieldTransforms.lowercase('HELLO WORLD')).toBe('hello world')
      expect(FieldTransforms.lowercase('MixedCase')).toBe('mixedcase')
    })
  })

  describe('uppercase', () => {
    it('should convert string to uppercase', () => {
      expect(FieldTransforms.uppercase('hello world')).toBe('HELLO WORLD')
      expect(FieldTransforms.uppercase('MixedCase')).toBe('MIXEDCASE')
    })
  })

  describe('camelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(FieldTransforms.camelCase('hello_world')).toBe('helloWorld')
      expect(FieldTransforms.camelCase('user_id')).toBe('userId')
      expect(FieldTransforms.camelCase('already_camel_case')).toBe(
        'alreadyCamelCase'
      )
    })

    it('should handle strings without underscores', () => {
      expect(FieldTransforms.camelCase('hello')).toBe('hello')
    })
  })

  describe('snake_case', () => {
    it('should convert camelCase to snake_case', () => {
      expect(FieldTransforms.snake_case('helloWorld')).toBe('hello_world')
      expect(FieldTransforms.snake_case('userId')).toBe('user_id')
      expect(FieldTransforms.snake_case('alreadyCamelCase')).toBe(
        'already_camel_case'
      )
    })

    it('should handle strings without capitals', () => {
      expect(FieldTransforms.snake_case('hello')).toBe('hello')
    })
  })

  describe('kebab-case', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(FieldTransforms['kebab-case']('helloWorld')).toBe('hello-world')
      expect(FieldTransforms['kebab-case']('userId')).toBe('user-id')
      expect(FieldTransforms['kebab-case']('alreadyCamelCase')).toBe(
        'already-camel-case'
      )
    })

    it('should handle strings without capitals', () => {
      expect(FieldTransforms['kebab-case']('hello')).toBe('hello')
    })
  })
})

describe('WebhookConfigurationSchema', () => {
  const validConfig: WebhookConfiguration = {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      createdBy: 'test-user',
      tags: ['test'],
    },
  }

  it('should validate a correct configuration', () => {
    const result = WebhookConfigurationSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  it('should reject configuration with missing required fields', () => {
    const invalidConfig = { ...validConfig }
    delete (invalidConfig as any).workflowId

    const result = WebhookConfigurationSchema.safeParse(invalidConfig)
    expect(result.success).toBe(false)
  })

  it('should reject configuration with invalid method', () => {
    const invalidConfig = {
      ...validConfig,
      n8nSettings: {
        ...validConfig.n8nSettings,
        method: 'INVALID' as any,
      },
    }

    const result = WebhookConfigurationSchema.safeParse(invalidConfig)
    expect(result.success).toBe(false)
  })

  it('should reject configuration with invalid transform', () => {
    const invalidConfig = {
      ...validConfig,
      inputMappings: [
        {
          sourceField: 'test',
          targetField: 'test',
          transform: 'invalid-transform' as any,
        },
      ],
    }

    const result = WebhookConfigurationSchema.safeParse(invalidConfig)
    expect(result.success).toBe(false)
  })
})

describe('WebhookConfigurationService', () => {
  let service: WebhookConfigurationService
  const mockConfig: WebhookConfiguration = {
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

  beforeEach(() => {
    service = new WebhookConfigurationService()
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockFetch.mockClear()
  })

  describe('saveConfiguration', () => {
    it('should save configuration via API and fallback to localStorage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      })

      await service.saveConfiguration(mockConfig)

      expect(mockFetch).toHaveBeenCalledWith('/api/webhook-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockConfig),
      })
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })

    it('should fallback to localStorage when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))
      mockLocalStorage.getItem.mockReturnValue('[]')

      await service.saveConfiguration(mockConfig)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'yaya-webhook-configurations',
        JSON.stringify([mockConfig])
      )
    })

    it('should fallback to localStorage when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      mockLocalStorage.getItem.mockReturnValue('[]')

      await service.saveConfiguration(mockConfig)

      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })

    it('should reject invalid configuration', async () => {
      const invalidConfig = { ...mockConfig }
      delete (invalidConfig as any).workflowId

      await expect(service.saveConfiguration(invalidConfig)).rejects.toThrow(
        'Invalid webhook configuration'
      )
    })

    it('should update existing configuration', async () => {
      const existingConfigs = [mockConfig]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingConfigs))
      mockFetch.mockRejectedValue(new Error('API Error'))

      const updatedConfig = { ...mockConfig, name: 'Updated Configuration' }
      await service.saveConfiguration(updatedConfig)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'yaya-webhook-configurations',
        expect.stringContaining('Updated Configuration')
      )
    })
  })

  describe('getConfiguration', () => {
    it('should return configuration by workflowId', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockConfig]))

      const result = service.getConfiguration('test-workflow')

      expect(result).toEqual(mockConfig)
    })

    it('should return null for non-existent workflowId', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockConfig]))

      const result = service.getConfiguration('non-existent')

      expect(result).toBeNull()
    })

    it('should handle empty localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = service.getConfiguration('test-workflow')

      expect(result).toBeNull()
    })
  })

  describe('getAllConfigurations', () => {
    it('should return all configurations', () => {
      const configs = [mockConfig]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(configs))

      const result = service.getAllConfigurations()

      expect(result).toEqual(configs)
    })

    it('should return empty array when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = service.getAllConfigurations()

      expect(result).toEqual([])
    })

    it('should handle JSON parse errors', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')

      const result = service.getAllConfigurations()

      expect(result).toEqual([])
    })
  })

  describe('deleteConfiguration', () => {
    it('should delete existing configuration', () => {
      const configs = [
        mockConfig,
        { ...mockConfig, workflowId: 'other-workflow' },
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(configs))

      const result = service.deleteConfiguration('test-workflow')

      expect(result).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'yaya-webhook-configurations',
        JSON.stringify([{ ...mockConfig, workflowId: 'other-workflow' }])
      )
    })

    it('should return false for non-existent configuration', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([mockConfig]))

      const result = service.deleteConfiguration('non-existent')

      expect(result).toBe(false)
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('applyInputMappings', () => {
    const testData = {
      message: 'Hello World',
      context: 'Some context',
      userId: 123,
      nested: {
        value: 'nested data',
      },
    }

    it('should apply basic field mappings', () => {
      const config = {
        ...mockConfig,
        inputMappings: [
          { sourceField: 'message', targetField: 'user_message' },
          { sourceField: 'userId', targetField: 'user_id' },
        ],
      }

      const result = service.applyInputMappings(testData, config)

      expect(result).toEqual({
        user_message: 'Hello World',
        user_id: 123,
      })
    })

    it('should apply field transformations', () => {
      const config = {
        ...mockConfig,
        inputMappings: [
          {
            sourceField: 'message',
            targetField: 'user_message',
            transform: 'uppercase' as const,
          },
        ],
      }

      const result = service.applyInputMappings(testData, config)

      expect(result).toEqual({
        user_message: 'HELLO WORLD',
      })
    })

    it('should handle nested field mappings', () => {
      const config = {
        ...mockConfig,
        inputMappings: [
          { sourceField: 'nested.value', targetField: 'extracted_value' },
        ],
      }

      const result = service.applyInputMappings(testData, config)

      expect(result).toEqual({
        extracted_value: 'nested data',
      })
    })

    it('should use default values for missing fields', () => {
      const config = {
        ...mockConfig,
        inputMappings: [
          {
            sourceField: 'missing',
            targetField: 'default_field',
            defaultValue: 'default',
          },
        ],
      }

      const result = service.applyInputMappings(testData, config)

      expect(result).toEqual({
        default_field: 'default',
      })
    })

    it('should throw error for missing required fields', () => {
      const config = {
        ...mockConfig,
        inputMappings: [
          {
            sourceField: 'missing',
            targetField: 'required_field',
            required: true,
          },
        ],
      }

      expect(() => service.applyInputMappings(testData, config)).toThrow(
        'Required field missing is missing'
      )
    })

    it('should wrap input when enabled', () => {
      const config = {
        ...mockConfig,
        inputMappings: [
          { sourceField: 'message', targetField: 'user_message' },
        ],
        wrapInput: {
          enabled: true,
          rootKey: 'payload',
          metadata: { version: '1.0' },
        },
      }

      const result = service.applyInputMappings(testData, config)

      expect(result).toMatchObject({
        payload: {
          user_message: 'Hello World',
        },
        version: '1.0',
        _yaYaMetadata: {
          source: 'yaya-atelier',
          workflowId: 'test-workflow',
          configVersion: '1.0.0',
        },
      })
    })

    it('should use default root key when wrapping', () => {
      const config = {
        ...mockConfig,
        inputMappings: [
          { sourceField: 'message', targetField: 'user_message' },
        ],
        wrapInput: {
          enabled: true,
        },
      }

      const result = service.applyInputMappings(testData, config)

      expect(result).toMatchObject({
        data: {
          user_message: 'Hello World',
        },
      })
    })
  })

  describe('applyOutputMappings', () => {
    const responseData = {
      success: true,
      data: {
        response: 'AI Response',
        conversationId: 'conv-123',
      },
      error: null,
    }

    it('should apply basic output mappings', () => {
      const config = {
        ...mockConfig,
        outputMappings: [
          { sourceField: 'data.response', targetField: 'assistantReply' },
          { sourceField: 'data.conversationId', targetField: 'sessionId' },
        ],
      }

      const result = service.applyOutputMappings(responseData, config)

      expect(result).toEqual({
        assistantReply: 'AI Response',
        sessionId: 'conv-123',
      })
    })

    it('should unwrap output when enabled', () => {
      const config = {
        ...mockConfig,
        outputMappings: [
          { sourceField: 'response', targetField: 'assistantReply' },
        ],
        unwrapOutput: {
          enabled: true,
          dataPath: 'data',
        },
      }

      const result = service.applyOutputMappings(responseData, config)

      expect(result).toEqual({
        assistantReply: 'AI Response',
      })
    })

    it('should apply transformations to output', () => {
      const config = {
        ...mockConfig,
        outputMappings: [
          {
            sourceField: 'data.response',
            targetField: 'reply',
            transform: 'lowercase' as const,
          },
        ],
      }

      const result = service.applyOutputMappings(responseData, config)

      expect(result).toEqual({
        reply: 'ai response',
      })
    })
  })

  describe('checkResponseStatus', () => {
    it('should detect successful response', () => {
      const responseData = { success: true, data: 'some data' }
      const config = {
        ...mockConfig,
        responseHandling: {
          successPath: 'success',
        },
      }

      const result = service.checkResponseStatus(responseData, config)

      expect(result).toEqual({
        success: true,
        resultData: responseData,
      })
    })

    it('should detect error response', () => {
      const responseData = {
        success: false,
        error: { message: 'Error occurred' },
      }
      const config = {
        ...mockConfig,
        responseHandling: {
          successPath: 'success',
          errorPath: 'error.message',
        },
      }

      const result = service.checkResponseStatus(responseData, config)

      expect(result).toEqual({
        success: false,
        error: 'Error occurred',
        resultData: responseData,
      })
    })

    it('should extract result data from specified path', () => {
      const responseData = { success: true, result: { data: 'extracted data' } }
      const config = {
        ...mockConfig,
        responseHandling: {
          successPath: 'success',
          dataPath: 'result.data',
        },
      }

      const result = service.checkResponseStatus(responseData, config)

      expect(result).toEqual({
        success: true,
        resultData: 'extracted data',
      })
    })

    it('should default to success when no success path specified', () => {
      const responseData = { data: 'some data' }
      const config = {
        ...mockConfig,
        responseHandling: {},
      }

      const result = service.checkResponseStatus(responseData, config)

      expect(result).toEqual({
        success: true,
        resultData: responseData,
      })
    })
  })
})

describe('DEFAULT_WEBHOOK_CONFIGURATIONS', () => {
  it('should contain yaya-creative-assistant configuration', () => {
    const config = DEFAULT_WEBHOOK_CONFIGURATIONS['yaya-creative-assistant']

    expect(config).toBeDefined()
    expect(config.inputMappings).toBeDefined()
    expect(config.outputMappings).toBeDefined()
    expect(config.wrapInput?.enabled).toBe(true)
    expect(config.unwrapOutput?.enabled).toBe(true)
  })
})

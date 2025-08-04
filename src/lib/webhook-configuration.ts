import { z } from 'zod'

// Webhook Configuration Types
export interface WebhookFieldMapping {
  sourceField: string
  targetField: string
  transform?:
    | 'lowercase'
    | 'uppercase'
    | 'camelCase'
    | 'snake_case'
    | 'kebab-case'
  defaultValue?: any
  required?: boolean
}

export interface WebhookConfiguration {
  workflowId: string
  name: string
  description: string

  // Input field mappings (YAYA → n8n)
  inputMappings: WebhookFieldMapping[]

  // Output field mappings (n8n → YAYA)
  outputMappings: WebhookFieldMapping[]

  // JSON Structure Control
  wrapInput?: {
    enabled: boolean
    rootKey?: string
    metadata?: Record<string, any>
  }

  unwrapOutput?: {
    enabled: boolean
    dataPath?: string // e.g., "data.result" to extract nested data
  }

  // Response handling
  responseHandling: {
    successPath?: string // Path to extract success indicator
    errorPath?: string // Path to extract error message
    dataPath?: string // Path to extract main response data
  }

  // n8n specific settings
  n8nSettings: {
    webhookUrl: string
    method: 'POST' | 'GET' | 'PUT' | 'PATCH'
    headers?: Record<string, string>
    authentication?: {
      type: 'none' | 'bearer' | 'basic' | 'custom'
      token?: string
      username?: string
      password?: string
      customHeaders?: Record<string, string>
    }
  }

  // YAYA metadata
  metadata: {
    createdAt: string
    updatedAt: string
    version: string
    createdBy: string
    tags: string[]
  }
}

// Validation Schema
export const WebhookConfigurationSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  inputMappings: z.array(
    z.object({
      sourceField: z.string().min(1),
      targetField: z.string().min(1),
      transform: z
        .enum([
          'lowercase',
          'uppercase',
          'camelCase',
          'snake_case',
          'kebab-case',
        ])
        .optional(),
      defaultValue: z.any().optional(),
      required: z.boolean().optional(),
    })
  ),
  outputMappings: z.array(
    z.object({
      sourceField: z.string().min(1),
      targetField: z.string().min(1),
      transform: z
        .enum([
          'lowercase',
          'uppercase',
          'camelCase',
          'snake_case',
          'kebab-case',
        ])
        .optional(),
      defaultValue: z.any().optional(),
      required: z.boolean().optional(),
    })
  ),
  wrapInput: z
    .object({
      enabled: z.boolean(),
      rootKey: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .optional(),
  unwrapOutput: z
    .object({
      enabled: z.boolean(),
      dataPath: z.string().optional(),
    })
    .optional(),
  responseHandling: z.object({
    successPath: z.string().optional(),
    errorPath: z.string().optional(),
    dataPath: z.string().optional(),
  }),
  n8nSettings: z.object({
    webhookUrl: z.string().min(1),
    method: z.enum(['POST', 'GET', 'PUT', 'PATCH']),
    headers: z.record(z.string()).optional(),
    authentication: z
      .object({
        type: z.enum(['none', 'bearer', 'basic', 'custom']),
        token: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        customHeaders: z.record(z.string()).optional(),
      })
      .optional(),
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    version: z.string(),
    createdBy: z.string(),
    tags: z.array(z.string()),
  }),
})

// Transform functions for field mapping
export const FieldTransforms = {
  lowercase: (value: string) => value.toLowerCase(),
  uppercase: (value: string) => value.toUpperCase(),
  camelCase: (value: string) =>
    value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
  snake_case: (value: string) => value.replace(/([A-Z])/g, '_$1').toLowerCase(),
  'kebab-case': (value: string) =>
    value.replace(/([A-Z])/g, '-$1').toLowerCase(),
}

// Webhook Configuration Service
export class WebhookConfigurationService {
  private readonly storageKey = 'yaya-webhook-configurations'

  // Save configuration (with API fallback)
  async saveConfiguration(config: WebhookConfiguration): Promise<void> {
    const validation = WebhookConfigurationSchema.safeParse(config)
    if (!validation.success) {
      throw new Error(
        `Invalid webhook configuration: ${validation.error.message}`
      )
    }

    try {
      // Try to save to API first
      const response = await fetch('/api/webhook-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        // Also save to localStorage as backup
        this.saveToLocalStorage(config)
        return
      }
    } catch (error) {
      console.warn('API save failed, falling back to localStorage:', error)
    }

    // Fallback to localStorage
    this.saveToLocalStorage(config)
  }

  // Save to localStorage (internal method)
  private saveToLocalStorage(config: WebhookConfiguration): void {
    const configurations = this.getAllConfigurations()
    const existingIndex = configurations.findIndex(
      c => c.workflowId === config.workflowId
    )

    if (existingIndex >= 0) {
      configurations[existingIndex] = {
        ...config,
        metadata: { ...config.metadata, updatedAt: new Date().toISOString() },
      }
    } else {
      configurations.push(config)
    }

    localStorage.setItem(this.storageKey, JSON.stringify(configurations))
  }

  // Get configuration by workflow ID
  getConfiguration(workflowId: string): WebhookConfiguration | null {
    const configurations = this.getAllConfigurations()
    return configurations.find(c => c.workflowId === workflowId) || null
  }

  // Get all configurations
  getAllConfigurations(): WebhookConfiguration[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load webhook configurations:', error)
      return []
    }
  }

  // Delete configuration
  deleteConfiguration(workflowId: string): boolean {
    const configurations = this.getAllConfigurations()
    const filteredConfigs = configurations.filter(
      c => c.workflowId !== workflowId
    )

    if (filteredConfigs.length !== configurations.length) {
      localStorage.setItem(this.storageKey, JSON.stringify(filteredConfigs))
      return true
    }
    return false
  }

  // Apply input mappings to transform YAYA data for n8n
  applyInputMappings(
    data: Record<string, any>,
    config: WebhookConfiguration
  ): Record<string, any> {
    let transformed: Record<string, any> = {}

    // Apply field mappings
    for (const mapping of config.inputMappings) {
      const sourceValue = this.getNestedValue(data, mapping.sourceField)

      if (sourceValue !== undefined) {
        let transformedValue = sourceValue

        // Apply transformation if specified
        if (mapping.transform && typeof sourceValue === 'string') {
          transformedValue = FieldTransforms[mapping.transform](sourceValue)
        }

        this.setNestedValue(transformed, mapping.targetField, transformedValue)
      } else if (mapping.defaultValue !== undefined) {
        this.setNestedValue(
          transformed,
          mapping.targetField,
          mapping.defaultValue
        )
      } else if (mapping.required) {
        throw new Error(`Required field ${mapping.sourceField} is missing`)
      }
    }

    // Apply input wrapping if enabled
    if (config.wrapInput?.enabled) {
      const wrapped: Record<string, any> = {}

      if (config.wrapInput.rootKey) {
        wrapped[config.wrapInput.rootKey] = transformed
      } else {
        wrapped.data = transformed
      }

      // Add metadata if specified
      if (config.wrapInput.metadata) {
        Object.assign(wrapped, config.wrapInput.metadata)
      }

      // Add YAYA metadata
      wrapped._yaYaMetadata = {
        source: 'yaya-atelier',
        timestamp: new Date().toISOString(),
        workflowId: config.workflowId,
        configVersion: config.metadata.version,
      }

      return wrapped
    }

    return transformed
  }

  // Apply output mappings to transform n8n response for YAYA
  applyOutputMappings(
    data: Record<string, any>,
    config: WebhookConfiguration
  ): Record<string, any> {
    // First, unwrap if enabled
    let sourceData = data
    if (config.unwrapOutput?.enabled && config.unwrapOutput.dataPath) {
      sourceData =
        this.getNestedValue(data, config.unwrapOutput.dataPath) || data
    }

    let transformed: Record<string, any> = {}

    // Apply field mappings
    for (const mapping of config.outputMappings) {
      const sourceValue = this.getNestedValue(sourceData, mapping.sourceField)

      if (sourceValue !== undefined) {
        let transformedValue = sourceValue

        // Apply transformation if specified
        if (mapping.transform && typeof sourceValue === 'string') {
          transformedValue = FieldTransforms[mapping.transform](sourceValue)
        }

        this.setNestedValue(transformed, mapping.targetField, transformedValue)
      } else if (mapping.defaultValue !== undefined) {
        this.setNestedValue(
          transformed,
          mapping.targetField,
          mapping.defaultValue
        )
      }
    }

    return transformed
  }

  // Check if response indicates success/error
  checkResponseStatus(
    data: Record<string, any>,
    config: WebhookConfiguration
  ): {
    success: boolean
    error?: string
    resultData?: any
  } {
    const { responseHandling } = config

    let success = true
    let error: string | undefined
    let resultData = data

    // Check for success indicator
    if (responseHandling.successPath) {
      const successValue = this.getNestedValue(
        data,
        responseHandling.successPath
      )
      success = Boolean(successValue)
    }

    // Extract error message if present
    if (responseHandling.errorPath) {
      const errorValue = this.getNestedValue(data, responseHandling.errorPath)
      if (errorValue) {
        error = String(errorValue)
        success = false
      }
    }

    // Extract main data if path specified
    if (responseHandling.dataPath) {
      resultData = this.getNestedValue(data, responseHandling.dataPath) || data
    }

    return { success, error, resultData }
  }

  // Helper: Get nested object value by path (e.g., "data.result.value")
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Helper: Set nested object value by path
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()
    if (!lastKey) return

    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {}
      return current[key]
    }, obj)
    target[lastKey] = value
  }
}

// Default configurations for YAYA workflows
export const DEFAULT_WEBHOOK_CONFIGURATIONS: Record<
  string,
  Partial<WebhookConfiguration>
> = {
  'yaya-creative-assistant': {
    inputMappings: [
      { sourceField: 'message', targetField: 'user_message', required: true },
      { sourceField: 'context', targetField: 'conversation_context' },
      { sourceField: 'conversationId', targetField: 'session_id' },
    ],
    outputMappings: [
      { sourceField: 'response', targetField: 'assistantReply' },
      { sourceField: 'conversationId', targetField: 'sessionId' },
      { sourceField: 'suggestions', targetField: 'followUpSuggestions' },
    ],
    wrapInput: {
      enabled: true,
      rootKey: 'yaya_input',
      metadata: {
        assistant_type: 'creative',
        brand: 'yaya',
      },
    },
    unwrapOutput: {
      enabled: true,
      dataPath: 'result',
    },
    responseHandling: {
      successPath: 'success',
      errorPath: 'error.message',
      dataPath: 'data',
    },
  },
}

// Singleton service instance
export const webhookConfigService = new WebhookConfigurationService()

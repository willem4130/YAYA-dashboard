import {
  FieldMapping,
  WebhookFieldConfiguration,
} from '@/components/ui/webhook-field-mapper'
import { AdvancedTransforms } from './advanced-webhook-transforms'

export interface WebhookExecutionResult {
  success: boolean
  originalData: any
  transformedData: any
  mappingsApplied: number
  errors: string[]
  duration: number
}

// Service for managing webhook field configurations
export class WebhookFieldService {
  private static readonly STORAGE_KEY = 'yaya-webhook-field-configs'

  // Get all saved configurations
  static getAllConfigurations(): WebhookFieldConfiguration[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load webhook configurations:', error)
      return []
    }
  }

  // Get configuration by ID
  static getConfiguration(id: string): WebhookFieldConfiguration | null {
    const configs = this.getAllConfigurations()
    return configs.find(config => config.id === id) || null
  }

  // Save configuration
  static saveConfiguration(config: WebhookFieldConfiguration): void {
    const configs = this.getAllConfigurations()
    const existingIndex = configs.findIndex(c => c.id === config.id)

    if (existingIndex >= 0) {
      configs[existingIndex] = config
    } else {
      configs.push(config)
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs))
    } catch (error) {
      console.error('Failed to save webhook configuration:', error)
      throw new Error('Failed to save configuration')
    }
  }

  // Delete configuration
  static deleteConfiguration(id: string): void {
    const configs = this.getAllConfigurations()
    const filtered = configs.filter(config => config.id !== id)

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to delete webhook configuration:', error)
      throw new Error('Failed to delete configuration')
    }
  }

  // Apply input field mappings to transform YAYA data for webhook
  static applyInputMappings(
    data: Record<string, any>,
    mappings: FieldMapping[]
  ): WebhookExecutionResult {
    const startTime = Date.now()
    const errors: string[] = []
    const transformedData: Record<string, any> = {}
    let mappingsApplied = 0

    for (const mapping of mappings) {
      const result = this.processMapping(data, mapping, 'input')
      if (result.error) {
        errors.push(result.error)
      } else if (result.value !== undefined) {
        this.setNestedValue(transformedData, mapping.targetField, result.value)
        mappingsApplied++
      }
    }

    return {
      success: errors.length === 0,
      originalData: data,
      transformedData,
      mappingsApplied,
      errors,
      duration: Date.now() - startTime,
    }
  }

  // Apply output field mappings to transform webhook response for YAYA
  static applyOutputMappings(
    responseData: Record<string, any>,
    mappings: FieldMapping[]
  ): WebhookExecutionResult {
    const startTime = Date.now()
    const errors: string[] = []
    const transformedData: Record<string, any> = {}
    let mappingsApplied = 0

    for (const mapping of mappings) {
      const result = this.processMapping(responseData, mapping, 'output')
      if (result.error) {
        errors.push(result.error)
      } else if (result.value !== undefined) {
        this.setNestedValue(transformedData, mapping.targetField, result.value)
        mappingsApplied++
      }
    }

    return {
      success: errors.length === 0,
      originalData: responseData,
      transformedData,
      mappingsApplied,
      errors,
      duration: Date.now() - startTime,
    }
  }

  // Helper: Process individual field mapping
  private static processMapping(
    data: Record<string, any>,
    mapping: FieldMapping,
    type: 'input' | 'output'
  ): { value?: any; error?: string } {
    try {
      const sourceValue = this.getNestedValue(data, mapping.sourceField)

      // Check required field
      if (mapping.required && this.isEmptyValue(sourceValue)) {
        const fieldType = type === 'input' ? 'field' : 'response field'
        return {
          error: `Required ${fieldType} '${mapping.sourceField}' is missing`,
        }
      }

      // Get value to transform
      const valueToTransform = this.getValueToTransform(
        sourceValue,
        mapping.defaultValue
      )

      // Skip if no value and not required
      if (this.isEmptyValue(valueToTransform)) {
        return {}
      }

      // Apply transformations
      const typedValue = this.convertDataType(
        valueToTransform,
        mapping.dataType
      )
      const transformedValue = mapping.transform
        ? this.applyTransform(typedValue, mapping.transform)
        : typedValue

      return { value: transformedValue }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      const prefix = type === 'input' ? 'Mapping' : 'Output mapping'
      return {
        error: `${prefix} '${mapping.sourceField}' → '${mapping.targetField}': ${errorMessage}`,
      }
    }
  }

  // Helper: Check if value is empty
  private static isEmptyValue(value: any): boolean {
    return value === undefined || value === null
  }

  // Helper: Get value to transform with default fallback
  private static getValueToTransform(
    sourceValue: any,
    defaultValue?: string
  ): any {
    if (this.isEmptyValue(sourceValue) || sourceValue === '') {
      return defaultValue
    }
    return sourceValue
  }

  // Execute webhook with field mappings
  static async executeWebhook(
    config: WebhookFieldConfiguration,
    inputData: Record<string, any>
  ): Promise<{
    success: boolean
    inputMapping: WebhookExecutionResult
    response?: any
    outputMapping?: WebhookExecutionResult
    error?: string
  }> {
    try {
      // Apply input mappings
      const inputMapping = this.applyInputMappings(
        inputData,
        config.inputMappings
      )

      if (!inputMapping.success) {
        return {
          success: false,
          inputMapping,
          error: `Input mapping failed: ${inputMapping.errors.join(', ')}`,
        }
      }

      // Make webhook request
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputMapping.transformedData),
      })

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          inputMapping,
          response: responseData,
          error: `Webhook request failed: ${response.status} ${response.statusText}`,
        }
      }

      // Apply output mappings if configured
      let outputMapping: WebhookExecutionResult | undefined
      if (config.outputMappings.length > 0) {
        outputMapping = this.applyOutputMappings(
          responseData,
          config.outputMappings
        )
      }

      return {
        success: true,
        inputMapping,
        response: responseData,
        outputMapping,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        inputMapping: {
          success: false,
          originalData: inputData,
          transformedData: {},
          mappingsApplied: 0,
          errors: [errorMessage],
          duration: 0,
        },
        error: `Webhook execution failed: ${errorMessage}`,
      }
    }
  }

  // Test webhook configuration with sample data
  static async testWebhookConfiguration(
    config: WebhookFieldConfiguration
  ): Promise<any> {
    let testData: Record<string, any>

    try {
      testData = config.testPayload ? JSON.parse(config.testPayload) : {}
    } catch (error) {
      throw new Error('Invalid test payload JSON')
    }

    return this.executeWebhook(config, testData)
  }

  // Helper: Get nested object value by path
  private static getNestedValue(obj: any, path: string): any {
    if (!path) return obj
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  // Helper: Set nested object value by path
  private static setNestedValue(obj: any, path: string, value: any): void {
    if (!path) return

    const keys = path.split('.')
    const lastKey = keys.pop()
    if (!lastKey) return

    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      return current[key]
    }, obj)

    target[lastKey] = value
  }

  // Helper: Convert value to specified data type
  private static convertDataType(value: any, dataType: string): any {
    const converters = {
      string: () => String(value),
      number: () => this.convertToNumber(value),
      boolean: () => this.convertToBoolean(value),
      array: () => this.convertToArray(value),
      object: () => this.convertToObject(value),
      date: () => this.convertToDate(value),
    }

    const converter = converters[dataType as keyof typeof converters]
    return converter ? converter() : value
  }

  // Helper: Convert to number
  private static convertToNumber(value: any): number {
    const num = Number(value)
    if (isNaN(num)) {
      throw new Error(`Cannot convert '${value}' to number`)
    }
    return num
  }

  // Helper: Convert to boolean
  private static convertToBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (['true', '1', 'yes', 'on'].includes(lower)) return true
      if (['false', '0', 'no', 'off'].includes(lower)) return false
    }
    return Boolean(value)
  }

  // Helper: Convert to array
  private static convertToArray(value: any): any[] {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : [value]
      } catch {
        return value.split(',').map(item => item.trim())
      }
    }
    return [value]
  }

  // Helper: Convert to object
  private static convertToObject(value: any): any {
    if (typeof value === 'object' && value !== null) return value
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        throw new Error(`Cannot parse '${value}' as JSON object`)
      }
    }
    return value
  }

  // Helper: Convert to date
  private static convertToDate(value: any): Date {
    if (value instanceof Date) return value
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      throw new Error(`Cannot convert '${value}' to date`)
    }
    return date
  }

  // Helper: Apply transform function
  private static applyTransform(value: any, transform: string): any {
    // Check for advanced transforms first
    if (transform in AdvancedTransforms) {
      const transformFunc =
        AdvancedTransforms[transform as keyof typeof AdvancedTransforms]
      return transformFunc(value)
    }

    // Check for parameterized transforms (e.g., "truncate:50")
    const [transformName, param] = transform.split(':')
    if (transformName in AdvancedTransforms) {
      const transformFunc =
        AdvancedTransforms[transformName as keyof typeof AdvancedTransforms]
      return transformFunc(value, param)
    }

    // Basic transforms
    const basicTransforms: Record<string, (v: any) => any> = {
      lowercase: (v: any) => String(v).toLowerCase(),
      uppercase: (v: any) => String(v).toUpperCase(),
      camelCase: (v: string) =>
        v.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      snake_case: (v: string) => v.replace(/([A-Z])/g, '_$1').toLowerCase(),
      'kebab-case': (v: string) => v.replace(/([A-Z])/g, '-$1').toLowerCase(),
      trim: (v: any) => String(v).trim(),
    }

    if (transform in basicTransforms) {
      return basicTransforms[transform](value)
    }

    return value
  }

  // Validate field mapping configuration
  static validateConfiguration(config: WebhookFieldConfiguration): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Basic validation
    if (!config.name?.trim()) {
      errors.push('Configuration name is required')
    }

    if (!config.webhookUrl?.trim()) {
      errors.push('Webhook URL is required')
    } else {
      try {
        new URL(config.webhookUrl)
      } catch {
        errors.push('Invalid webhook URL format')
      }
    }

    // Validate input mappings
    config.inputMappings.forEach((mapping, index) => {
      if (!mapping.sourceField?.trim()) {
        errors.push(`Input mapping ${index + 1}: Source field is required`)
      }
      if (!mapping.targetField?.trim()) {
        errors.push(`Input mapping ${index + 1}: Target field is required`)
      }
    })

    // Validate output mappings
    config.outputMappings.forEach((mapping, index) => {
      if (!mapping.sourceField?.trim()) {
        errors.push(`Output mapping ${index + 1}: Source field is required`)
      }
      if (!mapping.targetField?.trim()) {
        errors.push(`Output mapping ${index + 1}: Target field is required`)
      }
    })

    // Validate test payload if provided
    if (config.testPayload?.trim()) {
      try {
        JSON.parse(config.testPayload)
      } catch {
        errors.push('Test payload must be valid JSON')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// Export types
export type { WebhookFieldConfiguration, FieldMapping, WebhookExecutionResult }

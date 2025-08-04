import { WebhookFieldMapping } from './webhook-configuration'

// Advanced transformation functions
export const AdvancedTransforms = {
  // Date and time transformations
  toISOString: (value: any) => new Date(value).toISOString(),
  toUnixTimestamp: (value: any) => Math.floor(new Date(value).getTime() / 1000),
  formatDate: (value: any, format = 'YYYY-MM-DD') => {
    const date = new Date(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
  },

  // String transformations
  slugify: (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-/, '')
      .replace(/-$/, ''),
  truncate: (value: string, length = 100) =>
    value.length > length ? value.substring(0, length) + '...' : value,
  removeHtml: (value: string) => value.replace(/<[^>]*>/g, ''),
  base64Encode: (value: string) => Buffer.from(value).toString('base64'),
  base64Decode: (value: string) => Buffer.from(value, 'base64').toString(),

  // Number transformations
  round: (value: number, decimals = 0) =>
    Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals),
  percentage: (value: number, total = 100) => Math.round((value / total) * 100),
  currency: (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value),

  // Array transformations
  arrayJoin: (value: any[], separator = ', ') =>
    Array.isArray(value) ? value.join(separator) : value,
  arrayFirst: (value: any[]) => (Array.isArray(value) ? value[0] : value),
  arrayLast: (value: any[]) =>
    Array.isArray(value) ? value[value.length - 1] : value,
  arrayLength: (value: any[]) => (Array.isArray(value) ? value.length : 0),

  // Object transformations
  jsonStringify: (value: any) => JSON.stringify(value),
  jsonParse: (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  },

  // Conditional transformations
  defaultIfEmpty: (value: any, defaultValue = '') => value || defaultValue,
  nullIfEmpty: (value: any) => value || null,
  booleanFromString: (value: string) =>
    ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase()),
}

// Conditional field mapping rules
export interface ConditionalMapping extends WebhookFieldMapping {
  condition?: {
    field: string // Field to check for condition
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'starts_with'
      | 'ends_with'
      | 'exists'
      | 'not_exists'
      | 'greater_than'
      | 'less_than'
    value?: any // Value to compare against
  }
  alternativeMapping?: {
    targetField: string
    transform?: string
    defaultValue?: any
  }
}

// Advanced field mapping processor
export class AdvancedFieldMapper {
  // Apply conditional field mapping
  static applyConditionalMapping(
    data: Record<string, any>,
    mapping: ConditionalMapping
  ): { targetField: string; value: any } | null {
    // Check condition if present
    if (mapping.condition) {
      const conditionMet = this.evaluateCondition(data, mapping.condition)

      if (!conditionMet && mapping.alternativeMapping) {
        // Use alternative mapping
        const sourceValue = this.getNestedValue(data, mapping.sourceField)
        const transformedValue = this.applyTransform(
          sourceValue,
          mapping.alternativeMapping.transform
        )
        return {
          targetField: mapping.alternativeMapping.targetField,
          value:
            transformedValue !== undefined
              ? transformedValue
              : mapping.alternativeMapping.defaultValue,
        }
      } else if (!conditionMet) {
        // Skip this mapping
        return null
      }
    }

    // Apply normal mapping
    const sourceValue = this.getNestedValue(data, mapping.sourceField)
    if (sourceValue !== undefined) {
      const transformedValue = this.applyTransform(
        sourceValue,
        mapping.transform
      )
      return {
        targetField: mapping.targetField,
        value: transformedValue,
      }
    } else if (mapping.defaultValue !== undefined) {
      return {
        targetField: mapping.targetField,
        value: mapping.defaultValue,
      }
    }

    return null
  }

  // Evaluate condition
  private static evaluateCondition(
    data: Record<string, any>,
    condition: ConditionalMapping['condition']
  ): boolean {
    if (!condition) return true

    const fieldValue = this.getNestedValue(data, condition.field)

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'not_equals':
        return fieldValue !== condition.value
      case 'contains':
        return String(fieldValue).includes(String(condition.value))
      case 'starts_with':
        return String(fieldValue).startsWith(String(condition.value))
      case 'ends_with':
        return String(fieldValue).endsWith(String(condition.value))
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value)
      case 'less_than':
        return Number(fieldValue) < Number(condition.value)
      default:
        return true
    }
  }

  // Apply transformation with advanced functions
  private static applyTransform(value: any, transform?: string): any {
    if (!transform) return value

    // Check for advanced transforms
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

    // Fall back to basic transforms
    const basicTransforms = {
      lowercase: (v: string) => v.toLowerCase(),
      uppercase: (v: string) => v.toUpperCase(),
      camelCase: (v: string) =>
        v.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      snake_case: (v: string) => v.replace(/([A-Z])/g, '_$1').toLowerCase(),
      'kebab-case': (v: string) => v.replace(/([A-Z])/g, '-$1').toLowerCase(),
    }

    if (transform in basicTransforms) {
      return basicTransforms[transform as keyof typeof basicTransforms](value)
    }

    return value
  }

  // Helper: Get nested object value by path
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}

// Validation rules for field mappings
export interface ValidationRule {
  field: string
  rules: {
    required?: boolean
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    min?: number
    max?: number
    allowedValues?: any[]
  }
  errorMessage?: string
}

// Field validation processor
export class FieldValidator {
  static validateMappedData(
    data: Record<string, any>,
    rules: ValidationRule[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field)
      const fieldErrors = this.validateField(value, rule)
      errors.push(...fieldErrors)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private static validateField(value: any, rule: ValidationRule): string[] {
    const errors: string[] = []
    const fieldName = rule.field

    // Check if field is required and missing
    if (this.isRequiredFieldMissing(value, rule)) {
      errors.push(rule.errorMessage || `${fieldName} is required`)
      return errors
    }

    // Skip validations for empty optional fields
    if (this.isEmptyOptionalField(value)) {
      return errors
    }

    // Validate field type
    this.validateFieldType(value, rule, errors)

    // Validate string-specific rules
    this.validateStringRules(value, rule, errors)

    // Validate number-specific rules
    this.validateNumberRules(value, rule, errors)

    // Validate allowed values
    this.validateAllowedValues(value, rule, errors)

    return errors
  }

  private static isRequiredFieldMissing(
    value: any,
    rule: ValidationRule
  ): boolean {
    return (
      rule.rules.required &&
      (value === undefined || value === null || value === '')
    )
  }

  private static isEmptyOptionalField(value: any): boolean {
    return value === undefined || value === null || value === ''
  }

  private static validateFieldType(
    value: any,
    rule: ValidationRule,
    errors: string[]
  ): void {
    if (!rule.rules.type) return

    const actualType = Array.isArray(value) ? 'array' : typeof value
    if (actualType !== rule.rules.type) {
      errors.push(
        rule.errorMessage || `${rule.field} must be of type ${rule.rules.type}`
      )
    }
  }

  private static validateStringRules(
    value: any,
    rule: ValidationRule,
    errors: string[]
  ): void {
    if (typeof value !== 'string') return

    if (rule.rules.minLength && value.length < rule.rules.minLength) {
      errors.push(
        rule.errorMessage ||
          `${rule.field} must be at least ${rule.rules.minLength} characters`
      )
    }
    if (rule.rules.maxLength && value.length > rule.rules.maxLength) {
      errors.push(
        rule.errorMessage ||
          `${rule.field} must not exceed ${rule.rules.maxLength} characters`
      )
    }
    if (rule.rules.pattern && !rule.rules.pattern.test(value)) {
      errors.push(rule.errorMessage || `${rule.field} format is invalid`)
    }
  }

  private static validateNumberRules(
    value: any,
    rule: ValidationRule,
    errors: string[]
  ): void {
    if (typeof value !== 'number') return

    if (rule.rules.min !== undefined && value < rule.rules.min) {
      errors.push(
        rule.errorMessage || `${rule.field} must be at least ${rule.rules.min}`
      )
    }
    if (rule.rules.max !== undefined && value > rule.rules.max) {
      errors.push(
        rule.errorMessage || `${rule.field} must not exceed ${rule.rules.max}`
      )
    }
  }

  private static validateAllowedValues(
    value: any,
    rule: ValidationRule,
    errors: string[]
  ): void {
    if (!rule.rules.allowedValues || rule.rules.allowedValues.includes(value))
      return

    errors.push(
      rule.errorMessage ||
        `${rule.field} must be one of: ${rule.rules.allowedValues.join(', ')}`
    )
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}

// All classes and functions are already exported above

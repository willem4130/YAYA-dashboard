import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  AdvancedTransforms,
  AdvancedFieldMapper,
  FieldValidator,
  type ConditionalMapping,
  type ValidationRule,
} from '../advanced-webhook-transforms'

describe('AdvancedTransforms', () => {
  describe('Date and time transformations', () => {
    const testDate = new Date('2024-01-15T10:30:00.000Z')

    it('should convert to ISO string', () => {
      expect(AdvancedTransforms.toISOString(testDate)).toBe(
        '2024-01-15T10:30:00.000Z'
      )
      expect(AdvancedTransforms.toISOString('2024-01-15')).toBe(
        '2024-01-15T00:00:00.000Z'
      )
    })

    it('should convert to Unix timestamp', () => {
      const result = AdvancedTransforms.toUnixTimestamp(testDate)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(1705000000) // Just check it's in the right ballpark
    })

    it('should format date with default format', () => {
      expect(AdvancedTransforms.formatDate(testDate)).toBe('2024-01-15')
    })

    it('should format date with custom format', () => {
      expect(AdvancedTransforms.formatDate(testDate, 'DD/MM/YYYY')).toBe(
        '15/01/2024'
      )
      expect(AdvancedTransforms.formatDate(testDate, 'MM-DD-YYYY')).toBe(
        '01-15-2024'
      )
    })
  })

  describe('String transformations', () => {
    it('should slugify strings', () => {
      expect(AdvancedTransforms.slugify('Hello World!')).toBe('hello-world')
      expect(AdvancedTransforms.slugify('Test@#$%^&*()String')).toBe(
        'test-string'
      )
      expect(AdvancedTransforms.slugify('  Multiple   Spaces  ')).toBe(
        'multiple-spaces'
      )
    })

    it('should truncate strings', () => {
      const longString = 'This is a very long string that needs to be truncated'
      expect(AdvancedTransforms.truncate(longString, 20)).toBe(
        'This is a very long ...'
      )
      expect(AdvancedTransforms.truncate('Short', 20)).toBe('Short')
      const truncated = AdvancedTransforms.truncate(longString)
      expect(truncated.length).toBeLessThanOrEqual(103)
      if (truncated !== longString) {
        expect(truncated).toMatch(/\.\.\.$/) // Should end with '...' if truncated
      }
    })

    it('should remove HTML tags', () => {
      expect(
        AdvancedTransforms.removeHtml('<p>Hello <strong>World</strong></p>')
      ).toBe('Hello World')
      expect(AdvancedTransforms.removeHtml('No HTML here')).toBe('No HTML here')
      expect(
        AdvancedTransforms.removeHtml('<div><span>Nested</span></div>')
      ).toBe('Nested')
    })

    it('should encode and decode base64', () => {
      const originalString = 'Hello World'
      const encoded = AdvancedTransforms.base64Encode(originalString)
      expect(encoded).toBe('SGVsbG8gV29ybGQ=')
      expect(AdvancedTransforms.base64Decode(encoded)).toBe(originalString)
    })
  })

  describe('Number transformations', () => {
    it('should round numbers', () => {
      expect(AdvancedTransforms.round(3.14159)).toBe(3)
      expect(AdvancedTransforms.round(3.14159, 2)).toBe(3.14)
      expect(AdvancedTransforms.round(3.14159, 4)).toBe(3.1416)
    })

    it('should calculate percentages', () => {
      expect(AdvancedTransforms.percentage(25, 100)).toBe(25)
      expect(AdvancedTransforms.percentage(75, 200)).toBe(38)
      expect(AdvancedTransforms.percentage(50)).toBe(50) // default total of 100
    })

    it('should format currency', () => {
      expect(AdvancedTransforms.currency(1234.56)).toBe('$1,234.56')
      expect(AdvancedTransforms.currency(1234.56, 'EUR')).toBe('€1,234.56')
    })
  })

  describe('Array transformations', () => {
    it('should join arrays', () => {
      expect(AdvancedTransforms.arrayJoin(['a', 'b', 'c'])).toBe('a, b, c')
      expect(AdvancedTransforms.arrayJoin(['a', 'b', 'c'], ' | ')).toBe(
        'a | b | c'
      )
      expect(AdvancedTransforms.arrayJoin('not-an-array' as any)).toBe(
        'not-an-array'
      )
    })

    it('should get first array element', () => {
      expect(AdvancedTransforms.arrayFirst(['a', 'b', 'c'])).toBe('a')
      expect(AdvancedTransforms.arrayFirst([])).toBeUndefined()
      expect(AdvancedTransforms.arrayFirst('not-an-array' as any)).toBe(
        'not-an-array'
      )
    })

    it('should get last array element', () => {
      expect(AdvancedTransforms.arrayLast(['a', 'b', 'c'])).toBe('c')
      expect(AdvancedTransforms.arrayLast([])).toBeUndefined()
      expect(AdvancedTransforms.arrayLast('not-an-array' as any)).toBe(
        'not-an-array'
      )
    })

    it('should get array length', () => {
      expect(AdvancedTransforms.arrayLength(['a', 'b', 'c'])).toBe(3)
      expect(AdvancedTransforms.arrayLength([])).toBe(0)
      expect(AdvancedTransforms.arrayLength('not-an-array' as any)).toBe(0)
    })
  })

  describe('Object transformations', () => {
    it('should stringify JSON', () => {
      const obj = { name: 'test', value: 123 }
      expect(AdvancedTransforms.jsonStringify(obj)).toBe(
        '{"name":"test","value":123}'
      )
    })

    it('should parse JSON', () => {
      const jsonString = '{"name":"test","value":123}'
      expect(AdvancedTransforms.jsonParse(jsonString)).toEqual({
        name: 'test',
        value: 123,
      })
    })

    it('should handle invalid JSON gracefully', () => {
      expect(AdvancedTransforms.jsonParse('invalid-json')).toBe('invalid-json')
    })
  })

  describe('Conditional transformations', () => {
    it('should provide default for empty values', () => {
      expect(AdvancedTransforms.defaultIfEmpty('', 'default')).toBe('default')
      expect(AdvancedTransforms.defaultIfEmpty(null, 'default')).toBe('default')
      expect(AdvancedTransforms.defaultIfEmpty(undefined, 'default')).toBe(
        'default'
      )
      expect(AdvancedTransforms.defaultIfEmpty('value', 'default')).toBe(
        'value'
      )
      expect(AdvancedTransforms.defaultIfEmpty('', undefined)).toBe('') // default defaultValue
    })

    it('should convert to null if empty', () => {
      expect(AdvancedTransforms.nullIfEmpty('')).toBeNull()
      expect(AdvancedTransforms.nullIfEmpty(null)).toBeNull()
      expect(AdvancedTransforms.nullIfEmpty('value')).toBe('value')
    })

    it('should convert strings to boolean', () => {
      expect(AdvancedTransforms.booleanFromString('true')).toBe(true)
      expect(AdvancedTransforms.booleanFromString('1')).toBe(true)
      expect(AdvancedTransforms.booleanFromString('yes')).toBe(true)
      expect(AdvancedTransforms.booleanFromString('on')).toBe(true)
      expect(AdvancedTransforms.booleanFromString('TRUE')).toBe(true)
      expect(AdvancedTransforms.booleanFromString('false')).toBe(false)
      expect(AdvancedTransforms.booleanFromString('0')).toBe(false)
      expect(AdvancedTransforms.booleanFromString('no')).toBe(false)
    })
  })
})

describe('AdvancedFieldMapper', () => {
  const testData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    status: 'active',
    nested: {
      value: 'nested data',
    },
  }

  describe('applyConditionalMapping', () => {
    it('should apply mapping when condition is met', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: {
          field: 'status',
          operator: 'equals',
          value: 'active',
        },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result).toEqual({
        targetField: 'user_name',
        value: 'John Doe',
      })
    })

    it('should skip mapping when condition is not met', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: {
          field: 'status',
          operator: 'equals',
          value: 'inactive',
        },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result).toBeNull()
    })

    it('should use alternative mapping when condition is not met', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: {
          field: 'status',
          operator: 'equals',
          value: 'inactive',
        },
        alternativeMapping: {
          targetField: 'guest_name',
          transform: 'uppercase',
        },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result).toEqual({
        targetField: 'guest_name',
        value: 'JOHN DOE',
      })
    })

    it('should use default value when source field is missing', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'missing_field',
        targetField: 'default_field',
        defaultValue: 'default_value',
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result).toEqual({
        targetField: 'default_field',
        value: 'default_value',
      })
    })

    it('should apply transformations', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        transform: 'slugify',
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result).toEqual({
        targetField: 'user_name',
        value: 'john-doe',
      })
    })
  })

  describe('condition evaluation', () => {
    it('should evaluate equals condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'age', operator: 'equals', value: 30 },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate not_equals condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'age', operator: 'not_equals', value: 25 },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate contains condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'email', operator: 'contains', value: '@example' },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate starts_with condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'email', operator: 'starts_with', value: 'john' },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate ends_with condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'email', operator: 'ends_with', value: '.com' },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate exists condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'email', operator: 'exists' },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate not_exists condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'missing_field', operator: 'not_exists' },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate greater_than condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'age', operator: 'greater_than', value: 25 },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })

    it('should evaluate less_than condition', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'user_name',
        condition: { field: 'age', operator: 'less_than', value: 35 },
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )
      expect(result?.value).toBe('John Doe')
    })
  })

  describe('transform application', () => {
    it('should apply parameterized transforms', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'truncated_name',
        transform: 'truncate:5',
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result?.value).toBe('John ...')
    })

    it('should fall back to basic transforms', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'lowercase_name',
        transform: 'lowercase',
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result?.value).toBe('john doe')
    })

    it('should return original value for unknown transforms', () => {
      const mapping: ConditionalMapping = {
        sourceField: 'name',
        targetField: 'unchanged_name',
        transform: 'unknown_transform' as any,
      }

      const result = AdvancedFieldMapper.applyConditionalMapping(
        testData,
        mapping
      )

      expect(result?.value).toBe('John Doe')
    })
  })
})

describe('FieldValidator', () => {
  const testData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    tags: ['user', 'active'],
    profile: {
      bio: 'Software developer',
    },
  }

  describe('validateMappedData', () => {
    it('should validate all fields successfully', () => {
      const rules: ValidationRule[] = [
        {
          field: 'name',
          rules: { required: true, type: 'string', minLength: 2 },
        },
        {
          field: 'email',
          rules: {
            required: true,
            type: 'string',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          },
        },
        {
          field: 'age',
          rules: { type: 'number', min: 18, max: 120 },
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const rules: ValidationRule[] = [
        {
          field: 'missing_field',
          rules: { required: true },
          errorMessage: 'Custom error message',
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Custom error message')
    })

    it('should validate field types', () => {
      const rules: ValidationRule[] = [
        {
          field: 'age',
          rules: { type: 'string' }, // age is actually a number
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('age must be of type string')
    })

    it('should validate string length constraints', () => {
      const rules: ValidationRule[] = [
        {
          field: 'name',
          rules: { minLength: 20 }, // name is shorter
        },
        {
          field: 'email',
          rules: { maxLength: 5 }, // email is longer
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('name must be at least 20 characters')
      expect(result.errors).toContain('email must not exceed 5 characters')
    })

    it('should validate string patterns', () => {
      const rules: ValidationRule[] = [
        {
          field: 'email',
          rules: { pattern: /^invalid-pattern$/ },
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('email format is invalid')
    })

    it('should validate number ranges', () => {
      const rules: ValidationRule[] = [
        {
          field: 'age',
          rules: { min: 40 }, // age is 30
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('age must be at least 40')

      const maxRule: ValidationRule[] = [
        {
          field: 'age',
          rules: { max: 25 }, // age is 30
        },
      ]

      const maxResult = FieldValidator.validateMappedData(testData, maxRule)

      expect(maxResult.isValid).toBe(false)
      expect(maxResult.errors).toContain('age must not exceed 25')
    })

    it('should validate allowed values', () => {
      const rules: ValidationRule[] = [
        {
          field: 'name',
          rules: { allowedValues: ['Jane Doe', 'Bob Smith'] },
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'name must be one of: Jane Doe, Bob Smith'
      )
    })

    it('should validate array types', () => {
      const rules: ValidationRule[] = [
        {
          field: 'tags',
          rules: { type: 'array' },
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(true)
    })

    it('should validate object types', () => {
      const rules: ValidationRule[] = [
        {
          field: 'profile',
          rules: { type: 'object' },
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(true)
    })

    it('should skip validation for empty optional fields', () => {
      const dataWithEmpty = { ...testData, optional_field: '' }
      const rules: ValidationRule[] = [
        {
          field: 'optional_field',
          rules: { type: 'string', minLength: 10 }, // Would fail if validated
        },
      ]

      const result = FieldValidator.validateMappedData(dataWithEmpty, rules)

      expect(result.isValid).toBe(true) // Empty optional field should be skipped
    })

    it('should validate nested field paths', () => {
      const rules: ValidationRule[] = [
        {
          field: 'profile.bio',
          rules: { required: true, type: 'string' },
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(true)
    })

    it('should handle missing nested fields', () => {
      const rules: ValidationRule[] = [
        {
          field: 'profile.missing',
          rules: { required: true },
        },
      ]

      const result = FieldValidator.validateMappedData(testData, rules)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('profile.missing is required')
    })
  })
})

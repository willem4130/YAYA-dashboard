'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Copy,
  Trash2,
  Settings,
  Zap,
  MapPin,
} from 'lucide-react'

// Field mapping types
export interface FieldMapping {
  id: string
  sourceField: string
  targetField: string
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'
  transform?: string
  defaultValue?: string
  required: boolean
  description?: string
}

export interface WebhookFieldConfiguration {
  id: string
  name: string
  description: string
  webhookUrl: string
  inputMappings: FieldMapping[]
  outputMappings: FieldMapping[]
  testPayload?: string
}

interface WebhookFieldMapperProps {
  config?: WebhookFieldConfiguration
  onSave: (config: WebhookFieldConfiguration) => void
  onTest?: (config: WebhookFieldConfiguration) => Promise<any>
}

const TRANSFORM_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'camelCase', label: 'camelCase' },
  { value: 'snake_case', label: 'snake_case' },
  { value: 'kebab-case', label: 'kebab-case' },
  { value: 'trim', label: 'trim whitespace' },
  { value: 'toISOString', label: 'to ISO date' },
  { value: 'toUnixTimestamp', label: 'to Unix timestamp' },
  { value: 'jsonStringify', label: 'to JSON string' },
  { value: 'jsonParse', label: 'parse JSON' },
  { value: 'arrayJoin', label: 'join array' },
  { value: 'slugify', label: 'create slug' },
]

const DATA_TYPES = [
  { value: 'string', label: 'Text', color: 'bg-blue-100 text-blue-800' },
  { value: 'number', label: 'Number', color: 'bg-green-100 text-green-800' },
  {
    value: 'boolean',
    label: 'True/False',
    color: 'bg-purple-100 text-purple-800',
  },
  { value: 'array', label: 'List', color: 'bg-orange-100 text-orange-800' },
  { value: 'object', label: 'Object', color: 'bg-red-100 text-red-800' },
  { value: 'date', label: 'Date', color: 'bg-yellow-100 text-yellow-800' },
]

export function WebhookFieldMapper({
  config,
  onSave,
  onTest,
}: WebhookFieldMapperProps) {
  const [localConfig, setLocalConfig] = useState<WebhookFieldConfiguration>(
    config || {
      id: `webhook-${Date.now()}`,
      name: '',
      description: '',
      webhookUrl: '',
      inputMappings: [],
      outputMappings: [],
      testPayload:
        '{\n  "message": "test",\n  "timestamp": "2024-08-04T12:00:00Z"\n}',
    }
  )

  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input')
  const [isLoading, setIsLoading] = useState(false)

  // Generate unique mapping ID
  const generateMappingId = () =>
    `mapping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add new field mapping
  const addMapping = (type: 'input' | 'output') => {
    const newMapping: FieldMapping = {
      id: generateMappingId(),
      sourceField: '',
      targetField: '',
      dataType: 'string',
      required: false,
      description: '',
    }

    setLocalConfig(prev => ({
      ...prev,
      [type === 'input' ? 'inputMappings' : 'outputMappings']: [
        ...prev[type === 'input' ? 'inputMappings' : 'outputMappings'],
        newMapping,
      ],
    }))
  }

  // Remove field mapping
  const removeMapping = (type: 'input' | 'output', id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      [type === 'input' ? 'inputMappings' : 'outputMappings']: prev[
        type === 'input' ? 'inputMappings' : 'outputMappings'
      ].filter(mapping => mapping.id !== id),
    }))
  }

  // Update field mapping
  const updateMapping = (
    type: 'input' | 'output',
    id: string,
    updates: Partial<FieldMapping>
  ) => {
    setLocalConfig(prev => ({
      ...prev,
      [type === 'input' ? 'inputMappings' : 'outputMappings']: prev[
        type === 'input' ? 'inputMappings' : 'outputMappings'
      ].map(mapping =>
        mapping.id === id ? { ...mapping, ...updates } : mapping
      ),
    }))
  }

  // Duplicate mapping
  const duplicateMapping = (
    type: 'input' | 'output',
    mapping: FieldMapping
  ) => {
    const newMapping: FieldMapping = {
      ...mapping,
      id: generateMappingId(),
      sourceField: `${mapping.sourceField}_copy`,
      targetField: `${mapping.targetField}_copy`,
    }

    setLocalConfig(prev => ({
      ...prev,
      [type === 'input' ? 'inputMappings' : 'outputMappings']: [
        ...prev[type === 'input' ? 'inputMappings' : 'outputMappings'],
        newMapping,
      ],
    }))
  }

  // Test webhook configuration
  const handleTest = async () => {
    if (!onTest) return

    setIsLoading(true)
    try {
      const result = await onTest(localConfig)
      console.log('Webhook test result:', result)
    } catch (error) {
      console.error('Webhook test failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Save configuration
  const handleSave = () => {
    onSave(localConfig)
  }

  // Get data type badge styling
  const getDataTypeBadge = (dataType: string) => {
    const type = DATA_TYPES.find(t => t.value === dataType)
    return type
      ? { label: type.label, className: type.color }
      : { label: dataType, className: 'bg-gray-100 text-gray-800' }
  }

  // Render field mapping row
  const renderMappingRow = (
    mapping: FieldMapping,
    type: 'input' | 'output'
  ) => {
    const badge = getDataTypeBadge(mapping.dataType)
    const isInput = type === 'input'

    return (
      <Card key={mapping.id} className="p-4 space-y-4">
        <div className="grid grid-cols-12 gap-3 items-start">
          {/* Source Field */}
          <div className="col-span-3">
            <Label className="text-xs yaya-subheading">
              {isInput ? 'YAYA Field' : 'Response Field'}
            </Label>
            <Input
              value={mapping.sourceField}
              onChange={e =>
                updateMapping(type, mapping.id, { sourceField: e.target.value })
              }
              placeholder={isInput ? 'user.name' : 'response.data.name'}
              className="text-sm"
            />
          </div>

          {/* Arrow */}
          <div className="col-span-1 flex justify-center items-center pt-6">
            {isInput ? (
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          {/* Target Field */}
          <div className="col-span-3">
            <Label className="text-xs yaya-subheading">
              {isInput ? 'Webhook Field' : 'YAYA Field'}
            </Label>
            <Input
              value={mapping.targetField}
              onChange={e =>
                updateMapping(type, mapping.id, { targetField: e.target.value })
              }
              placeholder={isInput ? 'payload.username' : 'result.displayName'}
              className="text-sm"
            />
          </div>

          {/* Data Type */}
          <div className="col-span-2">
            <Label className="text-xs yaya-subheading">Type</Label>
            <Select
              value={mapping.dataType}
              onValueChange={(value: any) =>
                updateMapping(type, mapping.id, { dataType: value })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map(dataType => (
                  <SelectItem key={dataType.value} value={dataType.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={`${dataType.color} text-xs px-1 py-0`}>
                        {dataType.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transform */}
          <div className="col-span-2">
            <Label className="text-xs yaya-subheading">Transform</Label>
            <Select
              value={mapping.transform || 'none'}
              onValueChange={value =>
                updateMapping(type, mapping.id, {
                  transform: value === 'none' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {TRANSFORM_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="col-span-1 flex gap-1 pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicateMapping(type, mapping)}
              className="p-1 h-6 w-6"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeMapping(type, mapping.id)}
              className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Additional Options Row */}
        <div className="grid grid-cols-12 gap-3 items-center pt-2 border-t">
          <div className="col-span-3">
            <Input
              value={mapping.defaultValue || ''}
              onChange={e =>
                updateMapping(type, mapping.id, {
                  defaultValue: e.target.value || undefined,
                })
              }
              placeholder="Default value"
              className="text-xs"
            />
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-5">
            <Input
              value={mapping.description || ''}
              onChange={e =>
                updateMapping(type, mapping.id, { description: e.target.value })
              }
              placeholder="Description (optional)"
              className="text-xs"
            />
          </div>
          <div className="col-span-2 flex items-center space-x-2">
            <Switch
              id={`required-${mapping.id}`}
              checked={mapping.required}
              onCheckedChange={checked =>
                updateMapping(type, mapping.id, { required: checked })
              }
            />
            <Label htmlFor={`required-${mapping.id}`} className="text-xs">
              Required
            </Label>
          </div>
          <div className="col-span-1">
            <Badge className={`${badge.className} text-xs px-1`}>
              {badge.label}
            </Badge>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Configuration */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="flex items-center gap-2 yaya-heading">
            <Zap className="w-5 h-5 text-primary" />
            Webhook Field Mapper
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="yaya-subheading">Configuration Name</Label>
              <Input
                value={localConfig.name}
                onChange={e =>
                  setLocalConfig(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="My Webhook Configuration"
              />
            </div>
            <div>
              <Label className="yaya-subheading">Webhook URL</Label>
              <Input
                value={localConfig.webhookUrl}
                onChange={e =>
                  setLocalConfig(prev => ({
                    ...prev,
                    webhookUrl: e.target.value,
                  }))
                }
                placeholder="https://api.example.com/webhook"
              />
            </div>
          </div>
          <div>
            <Label className="yaya-subheading">Description</Label>
            <Textarea
              value={localConfig.description}
              onChange={e =>
                setLocalConfig(prev => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe what this webhook does..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'input' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('input')}
          className="flex-1"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Input Mapping ({localConfig.inputMappings.length})
        </Button>
        <Button
          variant={activeTab === 'output' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('output')}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Output Mapping ({localConfig.outputMappings.length})
        </Button>
      </div>

      {/* Field Mappings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg yaya-heading">
              {activeTab === 'input'
                ? 'Input Field Mappings'
                : 'Output Field Mappings'}
            </h3>
            <p className="text-sm text-muted-foreground yaya-body">
              {activeTab === 'input'
                ? 'Map YAYA fields to webhook payload fields'
                : 'Map webhook response fields back to YAYA format'}
            </p>
          </div>
          <Button onClick={() => addMapping(activeTab)} className="yaya-button">
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'input' ? 'Input' : 'Output'} Field
          </Button>
        </div>

        <div className="space-y-3">
          {activeTab === 'input' &&
            localConfig.inputMappings.map(mapping =>
              renderMappingRow(mapping, 'input')
            )}
          {activeTab === 'output' &&
            localConfig.outputMappings.map(mapping =>
              renderMappingRow(mapping, 'output')
            )}

          {((activeTab === 'input' && localConfig.inputMappings.length === 0) ||
            (activeTab === 'output' &&
              localConfig.outputMappings.length === 0)) && (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="yaya-body">No {activeTab} mappings configured</p>
              <p className="text-sm">
                Add field mappings to transform data{' '}
                {activeTab === 'input' ? 'to' : 'from'} webhook format
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Test Payload (for input mappings) */}
      {activeTab === 'input' && (
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg yaya-heading">Test Payload</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Textarea
              value={localConfig.testPayload || ''}
              onChange={e =>
                setLocalConfig(prev => ({
                  ...prev,
                  testPayload: e.target.value,
                }))
              }
              placeholder="Enter JSON test payload..."
              rows={6}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} className="yaya-button">
          <Settings className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
        {onTest && (
          <Button onClick={handleTest} disabled={isLoading} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            {isLoading ? 'Testing...' : 'Test Webhook'}
          </Button>
        )}
      </div>
    </div>
  )
}

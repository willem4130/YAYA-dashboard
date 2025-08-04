'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Minus,
  Settings,
  ArrowRight,
  ArrowLeft,
  Zap,
  Shield,
  MapPin,
  Trash2,
  Copy,
} from 'lucide-react'
import {
  WebhookConfiguration,
  WebhookFieldMapping,
  webhookConfigService,
  DEFAULT_WEBHOOK_CONFIGURATIONS,
  FieldTransforms,
} from '@/lib/webhook-configuration'
import { YAYA_WORKFLOWS } from '@/lib/yaya-workflows'

interface WebhookConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  workflowId: string
  onSave: (config: WebhookConfiguration) => void
}

const transformOptions = [
  { value: 'lowercase', label: 'lowercase' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'camelCase', label: 'camelCase' },
  { value: 'snake_case', label: 'snake_case' },
  { value: 'kebab-case', label: 'kebab-case' },
]

export function WebhookConfigurationModal({
  isOpen,
  onClose,
  workflowId,
  onSave,
}: WebhookConfigurationModalProps) {
  const [config, setConfig] = useState<WebhookConfiguration | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('basic')
  const [isLoading, setIsLoading] = useState(false)

  const workflow = YAYA_WORKFLOWS[workflowId]

  // Load existing configuration or create default
  useEffect(() => {
    if (isOpen && workflowId) {
      const existingConfig = webhookConfigService.getConfiguration(workflowId)
      
      if (existingConfig) {
        setConfig(existingConfig)
      } else {
        // Create default configuration
        const defaultPartial = DEFAULT_WEBHOOK_CONFIGURATIONS[workflowId] || {}
        const newConfig: WebhookConfiguration = {
          workflowId,
          name: workflow?.title || 'Webhook Configuration',
          description: workflow?.description || 'Custom webhook configuration',
          inputMappings: defaultPartial.inputMappings || [],
          outputMappings: defaultPartial.outputMappings || [],
          wrapInput: defaultPartial.wrapInput || { enabled: false },
          unwrapOutput: defaultPartial.unwrapOutput || { enabled: false },
          responseHandling: defaultPartial.responseHandling || {},
          n8nSettings: {
            webhookUrl: workflow?.webhookId || '',
            method: 'POST',
            headers: {},
            authentication: { type: 'none' },
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0.0',
            createdBy: 'user',
            tags: ['webhook', 'configuration'],
          },
        }
        setConfig(newConfig)
      }
    }
  }, [isOpen, workflowId, workflow])

  const handleSave = async () => {
    if (!config) return

    setIsLoading(true)
    setErrors({})

    try {
      // Validate configuration
      webhookConfigService.saveConfiguration(config)
      onSave(config)
      onClose()
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Save failed' })
    } finally {
      setIsLoading(false)
    }
  }

  const addInputMapping = () => {
    if (!config) return
    setConfig({
      ...config,
      inputMappings: [
        ...config.inputMappings,
        { sourceField: '', targetField: '', required: false },
      ],
    })
  }

  const removeInputMapping = (index: number) => {
    if (!config) return
    setConfig({
      ...config,
      inputMappings: config.inputMappings.filter((_, i) => i !== index),
    })
  }

  const updateInputMapping = (index: number, mapping: Partial<WebhookFieldMapping>) => {
    if (!config) return
    const newMappings = [...config.inputMappings]
    newMappings[index] = { ...newMappings[index], ...mapping }
    setConfig({ ...config, inputMappings: newMappings })
  }

  const addOutputMapping = () => {
    if (!config) return
    setConfig({
      ...config,
      outputMappings: [
        ...config.outputMappings,
        { sourceField: '', targetField: '', required: false },
      ],
    })
  }

  const removeOutputMapping = (index: number) => {
    if (!config) return
    setConfig({
      ...config,
      outputMappings: config.outputMappings.filter((_, i) => i !== index),
    })
  }

  const updateOutputMapping = (index: number, mapping: Partial<WebhookFieldMapping>) => {
    if (!config) return
    const newMappings = [...config.outputMappings]
    newMappings[index] = { ...newMappings[index], ...mapping }
    setConfig({ ...config, outputMappings: newMappings })
  }

  const handleClose = () => {
    setConfig(null)
    setErrors({})
    setActiveTab('basic')
    onClose()
  }

  if (!config) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden yaya-luxury-card">
        <DialogHeader>
          <DialogTitle className="text-2xl yaya-heading flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Webhook Configuration
          </DialogTitle>
          <DialogDescription className="yaya-body">
            Configure field mappings and JSON structure for {workflow?.title}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="input" className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Input Mapping
            </TabsTrigger>
            <TabsTrigger value="output" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Output Mapping
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[60vh] overflow-y-auto">
            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="yaya-subheading">Configuration Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="Enter configuration name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url" className="yaya-subheading">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    value={config.n8nSettings.webhookUrl}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        n8nSettings: { ...config.n8nSettings, webhookUrl: e.target.value },
                      })
                    }
                    placeholder="https://your-n8n-instance.com/webhook/..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="yaya-subheading">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Describe this webhook configuration"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method" className="yaya-subheading">HTTP Method</Label>
                  <Select
                    value={config.n8nSettings.method}
                    onValueChange={(value: 'POST' | 'GET' | 'PUT' | 'PATCH') =>
                      setConfig({
                        ...config,
                        n8nSettings: { ...config.n8nSettings, method: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-type" className="yaya-subheading">Authentication</Label>
                  <Select
                    value={config.n8nSettings.authentication?.type || 'none'}
                    onValueChange={(value: 'none' | 'bearer' | 'basic' | 'custom') =>
                      setConfig({
                        ...config,
                        n8nSettings: {
                          ...config.n8nSettings,
                          authentication: { ...config.n8nSettings.authentication, type: value },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select auth type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="custom">Custom Headers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="input" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg yaya-heading">Input Field Mappings</h3>
                  <p className="text-sm text-muted-foreground yaya-body">
                    Map YAYA fields to n8n webhook fields
                  </p>
                </div>
                <Button onClick={addInputMapping} size="sm" className="yaya-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mapping
                </Button>
              </div>

              <div className="space-y-4">
                {config.inputMappings.map((mapping, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <Label className="text-xs yaya-subheading">YAYA Field</Label>
                        <Input
                          value={mapping.sourceField}
                          onChange={(e) =>
                            updateInputMapping(index, { sourceField: e.target.value })
                          }
                          placeholder="sourceField"
                          size="sm"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs yaya-subheading">n8n Field</Label>
                        <Input
                          value={mapping.targetField}
                          onChange={(e) =>
                            updateInputMapping(index, { targetField: e.target.value })
                          }
                          placeholder="targetField"
                          size="sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs yaya-subheading">Transform</Label>
                        <Select
                          value={mapping.transform || ''}
                          onValueChange={(value) =>
                            updateInputMapping(index, {
                              transform: value as any || undefined,
                            })
                          }
                        >
                          <SelectTrigger size="sm">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {transformOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`required-${index}`}
                            checked={mapping.required || false}
                            onCheckedChange={(checked) =>
                              updateInputMapping(index, { required: checked })
                            }
                          />
                          <Label htmlFor={`required-${index}`} className="text-xs">
                            Required
                          </Label>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInputMapping(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {config.inputMappings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="yaya-body">No input mappings configured</p>
                    <p className="text-sm">Add mappings to transform YAYA data for n8n</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="output" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg yaya-heading">Output Field Mappings</h3>
                  <p className="text-sm text-muted-foreground yaya-body">
                    Map n8n response fields to YAYA format
                  </p>
                </div>
                <Button onClick={addOutputMapping} size="sm" className="yaya-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mapping
                </Button>
              </div>

              <div className="space-y-4">
                {config.outputMappings.map((mapping, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <Label className="text-xs yaya-subheading">n8n Field</Label>
                        <Input
                          value={mapping.sourceField}
                          onChange={(e) =>
                            updateOutputMapping(index, { sourceField: e.target.value })
                          }
                          placeholder="response.field"
                          size="sm"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs yaya-subheading">YAYA Field</Label>
                        <Input
                          value={mapping.targetField}
                          onChange={(e) =>
                            updateOutputMapping(index, { targetField: e.target.value })
                          }
                          placeholder="outputField"
                          size="sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs yaya-subheading">Transform</Label>
                        <Select
                          value={mapping.transform || ''}
                          onValueChange={(value) =>
                            updateOutputMapping(index, {
                              transform: value as any || undefined,
                            })
                          }
                        >
                          <SelectTrigger size="sm">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {transformOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={mapping.defaultValue || ''}
                          onChange={(e) =>
                            updateOutputMapping(index, { defaultValue: e.target.value || undefined })
                          }
                          placeholder="Default value"
                          size="sm"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOutputMapping(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {config.outputMappings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="yaya-body">No output mappings configured</p>
                    <p className="text-sm">Add mappings to transform n8n responses for YAYA</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-4">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg yaya-heading">Input Wrapping</CardTitle>
                    <CardDescription className="yaya-body">
                      Control how YAYA data is wrapped before sending to n8n
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="wrap-input"
                        checked={config.wrapInput?.enabled || false}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            wrapInput: { ...config.wrapInput, enabled: checked },
                          })
                        }
                      />
                      <Label htmlFor="wrap-input">Enable input wrapping</Label>
                    </div>
                    {config.wrapInput?.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm yaya-subheading">Root Key</Label>
                        <Input
                          value={config.wrapInput.rootKey || ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              wrapInput: { ...config.wrapInput, rootKey: e.target.value },
                            })
                          }
                          placeholder="data"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="p-4">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg yaya-heading">Output Unwrapping</CardTitle>
                    <CardDescription className="yaya-body">
                      Extract data from nested n8n response structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="unwrap-output"
                        checked={config.unwrapOutput?.enabled || false}
                        onCheckedChange={(checked) =>
                          setConfig({
                            ...config,
                            unwrapOutput: { ...config.unwrapOutput, enabled: checked },
                          })
                        }
                      />
                      <Label htmlFor="unwrap-output">Enable output unwrapping</Label>
                    </div>
                    {config.unwrapOutput?.enabled && (
                      <div className="space-y-2">
                        <Label className="text-sm yaya-subheading">Data Path</Label>
                        <Input
                          value={config.unwrapOutput.dataPath || ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              unwrapOutput: { ...config.unwrapOutput, dataPath: e.target.value },
                            })
                          }
                          placeholder="response.data.result"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="p-4">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg yaya-heading">Response Handling</CardTitle>
                  <CardDescription className="yaya-body">
                    Configure how to detect success/error and extract data from responses
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm yaya-subheading">Success Path</Label>
                      <Input
                        value={config.responseHandling.successPath || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            responseHandling: {
                              ...config.responseHandling,
                              successPath: e.target.value,
                            },
                          })
                        }
                        placeholder="success"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm yaya-subheading">Error Path</Label>
                      <Input
                        value={config.responseHandling.errorPath || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            responseHandling: {
                              ...config.responseHandling,
                              errorPath: e.target.value,
                            },
                          })
                        }
                        placeholder="error.message"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm yaya-subheading">Data Path</Label>
                      <Input
                        value={config.responseHandling.dataPath || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            responseHandling: {
                              ...config.responseHandling,
                              dataPath: e.target.value,
                            },
                          })
                        }
                        placeholder="data"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {errors.general && (
          <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md">
            {errors.general}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="yaya-button">
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Label } from './label'
import { Textarea } from './textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog'
import {
  X,
  Settings,
  Zap,
  MessageCircle,
  Globe,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react'
import { YAYA_WORKFLOWS } from '@/lib/yaya-workflows'

interface WorkflowSettingsProps {
  workflowId: string
  isOpen: boolean
  onClose: () => void
  onSave: (config: WorkflowConfig) => void
  className?: string
}

interface WorkflowConfig {
  n8nWebhookUrl: string
  timeout: number
  retries: number
  enableLogging: boolean
  userContext: {
    department: string
    role: string
    permissions: string[]
  }
  chatSettings?: {
    contextMemory: boolean
    responseStyle: string
    maxTokens: number
  }
}

const defaultConfig: WorkflowConfig = {
  n8nWebhookUrl: 'https://primary-production-c041f.up.railway.app/webhook/ee7ff2e9-9c2f-4c31-81af-76cbb3f74a9e',
  timeout: 30000,
  retries: 2,
  enableLogging: true,
  userContext: {
    department: 'creative',
    role: 'stylist',
    permissions: ['chat', 'workflow-execute'],
  },
  chatSettings: {
    contextMemory: true,
    responseStyle: 'sophisticated',
    maxTokens: 1500,
  },
}

export function WorkflowSettings({
  workflowId,
  isOpen,
  onClose,
  onSave,
  className = '',
}: WorkflowSettingsProps) {
  const [config, setConfig] = useState<WorkflowConfig>(defaultConfig)
  const [connectionStatus, setConnectionStatus] = useState<
    'testing' | 'success' | 'error' | 'idle'
  >('idle')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const workflow = YAYA_WORKFLOWS[workflowId]

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem(`yaya-workflow-${workflowId}`)
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        setConfig({ ...defaultConfig, ...parsed })
      } catch (error) {
        console.error('Failed to parse saved config:', error)
      }
    }
  }, [workflowId])

  const validateConfiguration = (): boolean => {
    const errors: string[] = []

    if (!config.n8nWebhookUrl.trim()) {
      errors.push('n8n webhook URL is required')
    } else if (!config.n8nWebhookUrl.startsWith('http')) {
      errors.push('Webhook URL must start with http:// or https://')
    }

    if (config.timeout < 5000 || config.timeout > 300000) {
      errors.push('Timeout must be between 5 and 300 seconds')
    }

    if (config.retries < 0 || config.retries > 5) {
      errors.push('Retries must be between 0 and 5')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const testConnection = async (): Promise<void> => {
    if (!validateConfiguration()) return

    setConnectionStatus('testing')
    console.log(`🧪 Testing n8n webhook: ${config.n8nWebhookUrl}`)

    try {
      // Test the webhook URL with a YAYA-specific test payload
      const testPayload = {
        test: true,
        workflowId,
        timestamp: new Date().toISOString(),
        yayaTest: {
          source: 'yaya-atelier-settings',
          message: 'Connection test from YAYA Creative Assistant',
          context: 'connection-test',
        },
      }

      console.log('📤 Sending test payload:', testPayload)

      // Use proxy endpoint to bypass CORS issues
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: config.n8nWebhookUrl,
          payload: testPayload,
        }),
        signal: AbortSignal.timeout(config.timeout),
      })

      const result = await response.json()
      console.log(`📡 Proxy response:`, result)

      if (result.success) {
        setConnectionStatus('success')
        setValidationErrors([]) // Clear any previous errors
        console.log('✅ n8n webhook connection successful!', {
          url: config.n8nWebhookUrl,
          status: result.status,
          response: result.response,
        })

        // Show success details in UI
        setValidationErrors([
          `✅ Connected successfully! Status: ${result.status} ${result.statusText}`,
        ])
      } else {
        setConnectionStatus('error')
        const errorMessages = [
          result.message || 'Connection test failed',
          result.error ? `Error: ${result.error}` : '',
          result.status ? `HTTP Status: ${result.status}` : '',
        ].filter(Boolean)

        setValidationErrors(errorMessages)
        console.error('❌ n8n webhook failed:', result)
      }
    } catch (error) {
      console.error('❌ n8n webhook connection error:', error)

      setConnectionStatus('error')
      let errorMessage = `Connection test failed: ${error.message}`

      // Provide more specific error messages
      if (error.name === 'AbortError') {
        errorMessage = `Connection timeout after ${config.timeout}ms. Check your n8n instance.`
      } else if (error.message.includes('fetch')) {
        errorMessage = `Network error: Unable to reach n8n webhook. Check URL and network connection.`
      }

      setValidationErrors([errorMessage])
    }
  }

  const handleSave = (): void => {
    if (!validateConfiguration()) return

    // Save to localStorage
    localStorage.setItem(`yaya-workflow-${workflowId}`, JSON.stringify(config))

    onSave(config)
    onClose()
  }

  const updateConfig = (updates: Partial<WorkflowConfig>): void => {
    setConfig(prev => ({ ...prev, ...updates }))
    setConnectionStatus('idle')
    setValidationErrors([])
  }

  if (!isOpen || !workflow) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}
      >
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="yaya-heading text-xl">
                Configure {workflow.title}
              </DialogTitle>
              <DialogDescription className="yaya-body text-sm text-muted-foreground">
                Set up your workflow connection and preferences for optimal YAYA
                creative assistance
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workflow Info */}
          <Card className="yaya-card bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm yaya-subheading flex items-center gap-2">
                <Info className="w-4 h-4" />
                Workflow Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm yaya-body">Category:</span>
                <Badge
                  variant="secondary"
                  className="yaya-summer-bg yaya-summer"
                >
                  {workflow.category.replace('-', ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm yaya-body">Expected Output:</span>
                <span className="text-sm text-muted-foreground">
                  {workflow.outputs.types.join(', ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm yaya-body">Chat Enabled:</span>
                <Badge variant={workflow.hasChat ? 'default' : 'secondary'}>
                  {workflow.hasChat ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* n8n Connection */}
          <Card className="yaya-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm yaya-subheading flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                n8n Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl" className="yaya-body">
                  Webhook URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://your-n8n-instance.com/webhook/yaya-creative-assistant"
                  value={config.n8nWebhookUrl}
                  onChange={e =>
                    updateConfig({ n8nWebhookUrl: e.target.value })
                  }
                  className={
                    validationErrors.some(e => e.includes('webhook'))
                      ? 'border-red-500'
                      : ''
                  }
                />
                <p className="text-xs text-muted-foreground yaya-body">
                  Your n8n webhook URL for the YAYA Creative Assistant workflow
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout" className="yaya-body">
                    Timeout (ms)
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="5000"
                    max="300000"
                    step="1000"
                    value={config.timeout}
                    onChange={e =>
                      updateConfig({
                        timeout: parseInt(e.target.value) || 30000,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retries" className="yaya-body">
                    Retries
                  </Label>
                  <Input
                    id="retries"
                    type="number"
                    min="0"
                    max="5"
                    value={config.retries}
                    onChange={e =>
                      updateConfig({ retries: parseInt(e.target.value) || 2 })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="yaya-button"
                >
                  {connectionStatus === 'testing' ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                {connectionStatus === 'success' && (
                  <div className="flex items-center text-green-600 text-sm yaya-body">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Connection successful
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="flex items-center text-red-600 text-sm yaya-body">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Connection failed
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Context */}
          <Card className="yaya-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm yaya-subheading flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                User Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department" className="yaya-body">
                    Department
                  </Label>
                  <Select
                    value={config.userContext.department}
                    onValueChange={value =>
                      updateConfig({
                        userContext: {
                          ...config.userContext,
                          department: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="sustainability">
                        Sustainability
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="yaya-body">
                    Role
                  </Label>
                  <Select
                    value={config.userContext.role}
                    onValueChange={value =>
                      updateConfig({
                        userContext: { ...config.userContext, role: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stylist">Stylist</SelectItem>
                      <SelectItem value="brand-manager">
                        Brand Manager
                      </SelectItem>
                      <SelectItem value="creative-director">
                        Creative Director
                      </SelectItem>
                      <SelectItem value="marketing-coordinator">
                        Marketing Coordinator
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Settings (for chat-enabled workflows) */}
          {workflow.hasChat && (
            <Card className="yaya-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm yaya-subheading flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-purple-600" />
                  Chat Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responseStyle" className="yaya-body">
                      Response Style
                    </Label>
                    <Select
                      value={
                        config.chatSettings?.responseStyle || 'sophisticated'
                      }
                      onValueChange={value =>
                        updateConfig({
                          chatSettings: {
                            ...config.chatSettings!,
                            responseStyle: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sophisticated">
                          Sophisticated
                        </SelectItem>
                        <SelectItem value="approachable">
                          Approachable
                        </SelectItem>
                        <SelectItem value="inspiring">Inspiring</SelectItem>
                        <SelectItem value="confident">Confident</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxTokens" className="yaya-body">
                      Max Response Length
                    </Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      min="500"
                      max="3000"
                      step="100"
                      value={config.chatSettings?.maxTokens || 1500}
                      onChange={e =>
                        updateConfig({
                          chatSettings: {
                            ...config.chatSettings!,
                            maxTokens: parseInt(e.target.value) || 1500,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="contextMemory"
                    checked={config.chatSettings?.contextMemory || false}
                    onChange={e =>
                      updateConfig({
                        chatSettings: {
                          ...config.chatSettings!,
                          contextMemory: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="contextMemory" className="yaya-body text-sm">
                    Enable conversation memory
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="yaya-card border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-800 yaya-subheading">
                      Configuration Issues
                    </p>
                    <ul className="text-sm text-red-700 space-y-1 yaya-body">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="yaya-button">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={validationErrors.length > 0}
            className="yaya-button bg-primary hover:bg-primary/90"
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

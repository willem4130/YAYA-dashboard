'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Settings,
  Play,
  Trash2,
  Copy,
  Search,
  Filter,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { WebhookFieldMapper, WebhookFieldConfiguration } from './webhook-field-mapper'
import { WebhookFieldService, WebhookExecutionResult } from '@/lib/webhook-field-service'

interface WebhookTestResult {
  success: boolean
  inputMapping: WebhookExecutionResult
  response?: any
  outputMapping?: WebhookExecutionResult
  error?: string
  timestamp: string
}

export function WebhookConfigDashboard() {
  const [configurations, setConfigurations] = useState<WebhookFieldConfiguration[]>([])
  const [selectedConfig, setSelectedConfig] = useState<WebhookFieldConfiguration | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [testResults, setTestResults] = useState<Record<string, WebhookTestResult>>({})
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})

  // Load configurations on mount
  useEffect(() => {
    loadConfigurations()
  }, [])

  const loadConfigurations = () => {
    const configs = WebhookFieldService.getAllConfigurations()
    setConfigurations(configs)
  }

  const handleCreateNew = () => {
    setSelectedConfig(null)
    setIsModalOpen(true)
  }

  const handleEdit = (config: WebhookFieldConfiguration) => {
    setSelectedConfig(config)
    setIsModalOpen(true)
  }

  const handleSave = (config: WebhookFieldConfiguration) => {
    WebhookFieldService.saveConfiguration(config)
    loadConfigurations()
    setIsModalOpen(false)
    setSelectedConfig(null)
  }

  const handleDelete = (configId: string) => {
    if (confirm('Are you sure you want to delete this webhook configuration?')) {
      WebhookFieldService.deleteConfiguration(configId)
      loadConfigurations()
      // Remove test results for deleted config
      const newTestResults = { ...testResults }
      delete newTestResults[configId]
      setTestResults(newTestResults)
    }
  }

  const handleDuplicate = (config: WebhookFieldConfiguration) => {
    const duplicated: WebhookFieldConfiguration = {
      ...config,
      id: `webhook-${Date.now()}`,
      name: `${config.name} (Copy)`,
    }
    WebhookFieldService.saveConfiguration(duplicated)
    loadConfigurations()
  }

  const handleTest = async (config: WebhookFieldConfiguration) => {
    setIsLoading(prev => ({ ...prev, [config.id]: true }))
    
    try {
      const result = await WebhookFieldService.testWebhookConfiguration(config)
      setTestResults(prev => ({
        ...prev,
        [config.id]: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [config.id]: {
          success: false,
          inputMapping: {
            success: false,
            originalData: {},
            transformedData: {},
            mappingsApplied: 0,
            errors: [error instanceof Error ? error.message : 'Test failed'],
            duration: 0,
          },
          error: error instanceof Error ? error.message : 'Test failed',
          timestamp: new Date().toISOString(),
        },
      }))
    } finally {
      setIsLoading(prev => ({ ...prev, [config.id]: false }))
    }
  }

  // Filter configurations based on search
  const filteredConfigurations = configurations.filter(config =>
    config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.webhookUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get status badge for configuration
  const getStatusBadge = (configId: string) => {
    const result = testResults[configId]
    if (!result) {
      return <Badge variant="secondary">Not Tested</Badge>
    }
    
    if (result.success) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Success
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      )
    }
  }

  // Format test result summary
  const getTestSummary = (configId: string) => {
    const result = testResults[configId]
    if (!result) return null

    return (
      <div className="mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Input: {result.inputMapping.mappingsApplied} mapped</span>
          {result.outputMapping && (
            <span>Output: {result.outputMapping.mappingsApplied} mapped</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        </div>
        {result.error && (
          <div className="text-red-500 mt-1">{result.error}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold yaya-heading">Webhook Configurations</h1>
          <p className="text-muted-foreground yaya-body mt-1">
            Configure field mappings for webhook integrations
          </p>
        </div>
        <Button onClick={handleCreateNew} className="yaya-button">
          <Plus className="w-4 h-4 mr-2" />
          New Configuration
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {filteredConfigurations.length} configuration{filteredConfigurations.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Configurations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConfigurations.map((config) => (
          <Card key={config.id} className="yaya-luxury-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg yaya-heading truncate">
                    {config.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground yaya-body mt-1 line-clamp-2">
                    {config.description || 'No description provided'}
                  </p>
                </div>
                {getStatusBadge(config.id)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Configuration Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">URL:</span>
                  <span className="font-mono text-xs truncate max-w-32" title={config.webhookUrl}>
                    {config.webhookUrl || 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Input Mappings:</span>
                  <Badge variant="outline" className="text-xs">
                    {config.inputMappings.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Output Mappings:</span>
                  <Badge variant="outline" className="text-xs">
                    {config.outputMappings.length}
                  </Badge>
                </div>
              </div>

              {/* Test Results Summary */}
              {getTestSummary(config.id)}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => handleTest(config)}
                  disabled={isLoading[config.id] || !config.webhookUrl}
                  className="flex-1"
                >
                  {isLoading[config.id] ? (
                    <>
                      <div className="w-3 h-3 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-2" />
                      Test
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(config)}
                >
                  <Settings className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(config)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(config.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredConfigurations.length === 0 && (
        <div className="text-center py-12">
          {searchQuery ? (
            <div>
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium yaya-heading mb-2">No configurations found</h3>
              <p className="text-muted-foreground yaya-body">
                Try adjusting your search terms or create a new configuration.
              </p>
            </div>
          ) : (
            <div>
              <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium yaya-heading mb-2">No webhook configurations</h3>
              <p className="text-muted-foreground yaya-body mb-4">
                Create your first webhook configuration to get started with field mapping.
              </p>
              <Button onClick={handleCreateNew} className="yaya-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Configuration
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Configuration Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="yaya-heading">
              {selectedConfig ? 'Edit Configuration' : 'New Webhook Configuration'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <WebhookFieldMapper
              config={selectedConfig || undefined}
              onSave={handleSave}
              onTest={async (config) => {
                const result = await WebhookFieldService.testWebhookConfiguration(config)
                console.log('Test result:', result)
                return result
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
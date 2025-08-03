import { z } from 'zod'
import {
  createMockN8nService,
  shouldUseMockService,
  MockN8nService,
} from './mock-n8n-service'

// n8n API Response Types
export interface N8nExecution {
  id: string
  finished: boolean
  mode: 'manual' | 'trigger' | 'webhook'
  retryOf?: string
  retrySuccessId?: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  waitTill?: string
  data?: {
    resultData?: {
      runData?: Record<string, any>
      lastNodeExecuted?: string
      error?: any
    }
  }
}

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: Record<string, any>
  settings?: Record<string, any>
  staticData?: Record<string, any>
}

export interface N8nNode {
  id: string
  name: string
  type: string
  position: [number, number]
  parameters?: Record<string, any>
  credentials?: Record<string, any>
}

// Validation Schemas
export const N8nConfigSchema = z.object({
  baseUrl: z.string().min(1),
  apiKey: z.string().min(1),
  webhookBaseUrl: z.string().min(1),
})

export const WorkflowExecutionSchema = z.object({
  workflowId: z.string(),
  inputs: z.record(z.any()).optional(),
  parameters: z.record(z.any()).optional(),
  waitForCompletion: z.boolean().default(false),
  timeout: z.number().min(1000).max(600000).default(300000), // 5 minutes default
})

export class N8nService {
  private readonly config: z.infer<typeof N8nConfigSchema>

  constructor(config: z.infer<typeof N8nConfigSchema>) {
    this.config = N8nConfigSchema.parse(config)
  }

  // Execute workflow via webhook
  async executeWorkflowWebhook(
    webhookId: string,
    payload: Record<string, any>,
    options: { timeout?: number; waitForCompletion?: boolean } = {}
  ): Promise<{ executionId: string; data?: any }> {
    // Use full webhook URL directly for YAYA Creative Assistant
    const url = webhookId.startsWith('http')
      ? webhookId
      : `${this.config.webhookBaseUrl}/${webhookId}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          ...payload,
          _yaYaMetadata: {
            source: 'yaya-atelier',
            timestamp: new Date().toISOString(),
            timeout: options.timeout || 300000,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(
          `n8n webhook failed: ${response.status} ${response.statusText}`
        )
      }

      const result = await response.json()

      // Extract execution ID from response (format may vary)
      const executionId =
        result.executionId || result.id || this.generateExecutionId()

      return {
        executionId,
        data: options.waitForCompletion ? result : undefined,
      }
    } catch (error) {
      console.error('n8n webhook execution failed:', error)
      throw new Error(`Failed to execute n8n workflow: ${error.message}`)
    }
  }

  // Get execution status
  async getExecutionStatus(executionId: string): Promise<N8nExecution> {
    const url = `${this.config.baseUrl}/api/v1/executions/${executionId}`

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get execution status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get execution status:', error)
      throw error
    }
  }

  // Get workflow definition
  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    const url = `${this.config.baseUrl}/api/v1/workflows/${workflowId}`

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get workflow: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get workflow:', error)
      throw error
    }
  }

  // List active executions
  async getActiveExecutions(filter?: {
    workflowId?: string
  }): Promise<N8nExecution[]> {
    const url = new URL(`${this.config.baseUrl}/api/v1/executions`)

    if (filter?.workflowId) {
      url.searchParams.set('workflowId', filter.workflowId)
    }
    url.searchParams.set('status', 'running')

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get active executions: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Failed to get active executions:', error)
      throw error
    }
  }

  // Test connection to n8n instance
  async testConnection(): Promise<{
    success: boolean
    version?: string
    error?: string
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      // Try to get version info
      const versionResponse = await fetch(
        `${this.config.baseUrl}/api/v1/version`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      let version = 'unknown'
      if (versionResponse.ok) {
        const versionData = await versionResponse.json()
        version = versionData.version || versionData.n8nVersion || 'unknown'
      }

      return {
        success: true,
        version,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get workflow execution history
  async getExecutionHistory(
    workflowId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ executions: N8nExecution[]; total: number }> {
    const url = new URL(`${this.config.baseUrl}/api/v1/executions`)
    url.searchParams.set('workflowId', workflowId)
    url.searchParams.set('limit', (options.limit || 50).toString())
    url.searchParams.set('offset', (options.offset || 0).toString())

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get execution history: ${response.status}`)
      }

      const result = await response.json()
      return {
        executions: result.data || [],
        total: result.count || 0,
      }
    } catch (error) {
      console.error('Failed to get execution history:', error)
      throw error
    }
  }

  // Stop a running execution
  async stopExecution(executionId: string): Promise<void> {
    const url = `${this.config.baseUrl}/api/v1/executions/${executionId}/stop`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to stop execution: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to stop execution:', error)
      throw error
    }
  }

  // Helper method to generate execution ID when not provided
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  // Validate webhook connectivity
  async validateWebhook(webhookId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.webhookBaseUrl}/${webhookId}`,
        {
          method: 'HEAD',
        }
      )

      return response.ok
    } catch (error) {
      console.error('Webhook validation failed:', error)
      return false
    }
  }
}

// Factory function to create n8n service instance with mock fallback
export function createN8nService(): N8nService | MockN8nService {
  // Use mock service when no API key is available or in development
  if (shouldUseMockService()) {
    console.log('🎭 Using Mock n8n Service for YAYA testing')
    return createMockN8nService()
  }

  const config = {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
    webhookBaseUrl:
      process.env.N8N_WEBHOOK_BASE_URL ||
      process.env.N8N_BASE_URL ||
      'http://localhost:5678',
  }

  if (!config.apiKey) {
    throw new Error('N8N_API_KEY environment variable is required')
  }

  return new N8nService(config)
}

// Singleton instance for easy access
let n8nServiceInstance: N8nService | MockN8nService | null = null

export function getN8nService(): N8nService | MockN8nService {
  if (!n8nServiceInstance) {
    n8nServiceInstance = createN8nService()
  }
  return n8nServiceInstance
}

import { NextRequest, NextResponse } from 'next/server'
import { getN8nService } from '@/lib/n8n-service'
import { YAYA_WORKFLOWS, validateWorkflowInput } from '@/lib/yaya-workflows'

interface ExecuteWorkflowRequest {
  inputs?: Record<string, any>
  parameters?: Record<string, any>
  files?: string[]
  userContext?: {
    userId?: string
    department?: string
    role?: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const workflowId = resolvedParams.id
    const body: ExecuteWorkflowRequest = await request.json()

    // Get YAYA workflow configuration
    const workflowConfig = YAYA_WORKFLOWS[workflowId]
    if (!workflowConfig) {
      return NextResponse.json(
        {
          error: 'YAYA workflow not found',
          availableWorkflows: Object.keys(YAYA_WORKFLOWS),
        },
        { status: 404 }
      )
    }

    // Validate inputs based on YAYA workflow schema
    const validationResult = validateWorkflowInput(
      workflowId,
      body.inputs || {}
    )
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid workflow inputs',
          details: validationResult.errors,
          requiredFields: workflowConfig.inputSchema.required,
          optionalFields: workflowConfig.inputSchema.optional,
        },
        { status: 400 }
      )
    }

    // Check user permissions (if userContext provided)
    if (
      body.userContext?.role &&
      workflowConfig.yayaMetadata.userRoles.length > 0
    ) {
      if (
        !workflowConfig.yayaMetadata.userRoles.includes(body.userContext.role)
      ) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions for this workflow',
            requiredRoles: workflowConfig.yayaMetadata.userRoles,
          },
          { status: 403 }
        )
      }
    }

    // Initialize n8n service
    const n8nService = getN8nService()

    // Test n8n connection before execution
    const connectionTest = await n8nService.testConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          error: 'n8n service unavailable',
          details: connectionTest.error,
          suggestion: 'Please check n8n configuration and try again',
        },
        { status: 503 }
      )
    }

    // Prepare YAYA-specific webhook payload
    const webhookPayload = {
      // YAYA workflow metadata
      yayaWorkflow: {
        id: workflowId,
        title: workflowConfig.title,
        category: workflowConfig.category,
        version: workflowConfig.yayaMetadata.version,
        brandAlignment: workflowConfig.yayaMetadata.brandAlignment,
      },

      // Validated inputs
      inputs: validationResult.sanitizedInputs,
      parameters: body.parameters || {},
      files: body.files || [],

      // Execution context
      context: {
        userId:
          body.userContext?.userId ||
          request.headers.get('user-id') ||
          'anonymous',
        department: body.userContext?.department || 'unknown',
        role: body.userContext?.role || 'user',
        timestamp: new Date().toISOString(),
        source: 'yaya-atelier',
        season: process.env.YAYA_CURRENT_SEASON || 'spring-2024',
        atelierVersion: process.env.YAYA_ATELIER_VERSION || '1.0.0',
      },

      // Execution settings
      settings: {
        timeout: workflowConfig.settings.timeout,
        retries: workflowConfig.settings.retries,
        requiresApproval: workflowConfig.settings.requiresApproval,
      },
    }

    // Execute workflow via n8n webhook
    const executionResult = await n8nService.executeWorkflowWebhook(
      workflowConfig.webhookId,
      webhookPayload,
      {
        timeout: workflowConfig.settings.timeout,
        waitForCompletion: false,
      }
    )

    // Store execution record in local database
    await storeYayaExecutionRecord({
      workflowId,
      executionId: executionResult.executionId,
      n8nWorkflowId: workflowConfig.n8nWorkflowId,
      status: 'running',
      inputs: validationResult.sanitizedInputs,
      userContext: body.userContext,
      timestamp: new Date(),
      expectedOutputs: workflowConfig.outputs.types,
    })

    return NextResponse.json({
      success: true,
      executionId: executionResult.executionId,
      status: 'running',
      message: `YAYA workflow "${workflowConfig.title}" execution started`,
      workflow: {
        id: workflowId,
        title: workflowConfig.title,
        category: workflowConfig.category,
        estimatedDuration: `${Math.round(workflowConfig.settings.timeout / 60000)} minutes`,
        expectedOutputs: workflowConfig.outputs.description,
      },
      n8n: {
        workflowId: workflowConfig.n8nWorkflowId,
        version: connectionTest.version,
      },
    })
  } catch (error) {
    console.error('YAYA workflow execution error:', error)

    // Enhanced error reporting
    // eslint-disable-next-line radarlint-js:typescript:S4123
    const resolvedParams = await params
    const errorResponse = {
      error: 'Failed to execute YAYA workflow',
      details: error.message,
      timestamp: new Date().toISOString(),
      workflowId: resolvedParams.id,
    }

    // Different status codes based on error type
    if (error.message.includes('n8n')) {
      return NextResponse.json(
        { ...errorResponse, type: 'n8n_error' },
        { status: 502 }
      )
    } else if (error.message.includes('validation')) {
      return NextResponse.json(
        { ...errorResponse, type: 'validation_error' },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { ...errorResponse, type: 'internal_error' },
        { status: 500 }
      )
    }
  }
}

// YAYA-specific helper functions
async function storeYayaExecutionRecord(record: {
  workflowId: string
  executionId: string
  n8nWorkflowId: string
  status: string
  inputs: Record<string, any>
  userContext?: any
  timestamp: Date
  expectedOutputs: string[]
}) {
  // In a real implementation, this would store in your YAYA database
  // For now, we'll use console logging with structured data
  console.log('📝 YAYA Execution Record:', {
    timestamp: record.timestamp.toISOString(),
    workflowId: record.workflowId,
    executionId: record.executionId,
    n8nWorkflowId: record.n8nWorkflowId,
    status: record.status,
    user: record.userContext?.userId || 'anonymous',
    department: record.userContext?.department || 'unknown',
    expectedOutputTypes: record.expectedOutputs,
    inputFields: Object.keys(record.inputs),
  })

  // Store in local memory/cache for this session
  // In production, this would be a proper database insert
  const executionRecord = {
    id: record.executionId,
    yayaWorkflowId: record.workflowId,
    n8nWorkflowId: record.n8nWorkflowId,
    status: record.status,
    inputs: record.inputs,
    userContext: record.userContext,
    createdAt: record.timestamp,
    expectedOutputs: record.expectedOutputs,
    outputs: [],
    lastUpdated: record.timestamp,
  }

  // Mock database storage - replace with real DB in production
  if (typeof global !== 'undefined') {
    if (!global.yayaExecutions) {
      global.yayaExecutions = new Map()
    }
    global.yayaExecutions.set(record.executionId, executionRecord)
  }

  return executionRecord
}

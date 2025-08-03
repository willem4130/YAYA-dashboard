import { NextRequest, NextResponse } from 'next/server'

interface ExecuteWorkflowRequest {
  inputs?: Record<string, any>
  parameters?: Record<string, any>
  files?: string[]
}

interface N8nWebhookResponse {
  executionId: string
  status: 'running' | 'success' | 'error'
  data?: any
  error?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const body: ExecuteWorkflowRequest = await request.json()

    // Get workflow configuration
    const workflowConfig = await getWorkflowConfig(workflowId)
    if (!workflowConfig) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Validate inputs based on workflow schema
    const validationResult = validateWorkflowInputs(body, workflowConfig.schema)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid inputs', details: validationResult.errors },
        { status: 400 }
      )
    }

    // Prepare n8n webhook payload
    const webhookPayload = {
      workflowId,
      inputs: body.inputs || {},
      parameters: body.parameters || {},
      files: body.files || [],
      metadata: {
        userId: request.headers.get('user-id'),
        timestamp: new Date().toISOString(),
        source: 'yaya-dashboard'
      }
    }

    // Trigger n8n workflow
    const n8nResponse = await fetch(`${process.env.N8N_BASE_URL}/webhook/${workflowConfig.webhookId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!n8nResponse.ok) {
      throw new Error(`n8n webhook failed: ${n8nResponse.statusText}`)
    }

    const result: N8nWebhookResponse = await n8nResponse.json()

    // Store execution record
    await storeExecutionRecord({
      workflowId,
      executionId: result.executionId,
      status: result.status,
      inputs: body.inputs,
      timestamp: new Date()
    })

    return NextResponse.json({
      success: true,
      executionId: result.executionId,
      status: result.status,
      message: 'Workflow execution started'
    })

  } catch (error) {
    console.error('Workflow execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow', details: error.message },
      { status: 500 }
    )
  }
}

// Helper functions
async function getWorkflowConfig(workflowId: string) {
  // In a real implementation, this would fetch from your database
  const workflows = {
    'social-content-gen': {
      webhookId: 'social-content-webhook-id',
      schema: {
        inputs: {
          brandTheme: { type: 'string', required: true },
          contentType: { type: 'string', enum: ['post', 'story', 'reel'], required: true },
          targetAudience: { type: 'string', required: false }
        },
        parameters: {
          imageCount: { type: 'number', min: 1, max: 5, default: 3 },
          includeCaption: { type: 'boolean', default: true }
        }
      }
    },
    'product-photography': {
      webhookId: 'product-photo-webhook-id',
      schema: {
        inputs: {
          productImages: { type: 'array', required: true },
          backgroundStyle: { type: 'string', required: false }
        },
        parameters: {
          outputFormat: { type: 'string', enum: ['jpg', 'png'], default: 'jpg' },
          resolution: { type: 'string', enum: ['1080x1080', '1920x1080'], default: '1080x1080' }
        }
      }
    }
  }

  return workflows[workflowId] || null
}

function validateWorkflowInputs(data: ExecuteWorkflowRequest, schema: any) {
  const errors: string[] = []
  
  // Validate required inputs
  if (schema.inputs) {
    for (const [key, config] of Object.entries(schema.inputs)) {
      if (config.required && !data.inputs?.[key]) {
        errors.push(`Required input '${key}' is missing`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

async function storeExecutionRecord(record: any) {
  // In a real implementation, this would store in your database
  console.log('Storing execution record:', record)
}
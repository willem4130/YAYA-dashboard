import { NextRequest, NextResponse } from 'next/server'

interface FeedbackRequest {
  outputId: string
  feedbackType: 'improve' | 'regenerate' | 'approve' | 'reject'
  feedback: string
  parameters?: Record<string, any>
  userPreferences?: {
    style?: string
    tone?: string
    format?: string
    [key: string]: any
  }
}

interface ImprovementRequest {
  originalOutputId: string
  feedback: string
  improvementType: 'content' | 'style' | 'format' | 'quality'
  parameters: Record<string, any>
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const body: FeedbackRequest = await request.json()

    // Validate feedback request
    if (!body.outputId || !body.feedbackType || !body.feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: outputId, feedbackType, feedback' },
        { status: 400 }
      )
    }

    // Get original output details
    const originalOutput = await getOutputById(body.outputId)
    if (!originalOutput) {
      return NextResponse.json(
        { error: 'Original output not found' },
        { status: 404 }
      )
    }

    // Store feedback record
    const feedbackRecord = await storeFeedback({
      workflowId,
      outputId: body.outputId,
      feedbackType: body.feedbackType,
      feedback: body.feedback,
      userPreferences: body.userPreferences,
      timestamp: new Date()
    })

    let result: any = { feedbackId: feedbackRecord.id, status: 'recorded' }

    // Handle improvement requests
    if (body.feedbackType === 'improve' || body.feedbackType === 'regenerate') {
      const improvementRequest: ImprovementRequest = {
        originalOutputId: body.outputId,
        feedback: body.feedback,
        improvementType: determineImprovementType(body.feedback),
        parameters: {
          ...body.parameters,
          userPreferences: body.userPreferences,
          originalWorkflowId: workflowId
        }
      }

      // Trigger improvement workflow
      const improvementResult = await triggerImprovementWorkflow(workflowId, improvementRequest)
      result = { ...result, ...improvementResult }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Feedback processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const { searchParams } = new URL(request.url)
    const outputId = searchParams.get('outputId')

    if (outputId) {
      // Get feedback for specific output
      const feedback = await getFeedbackForOutput(outputId)
      return NextResponse.json({ feedback })
    } else {
      // Get all feedback for workflow
      const feedback = await getFeedbackForWorkflow(workflowId)
      return NextResponse.json({ feedback })
    }

  } catch (error) {
    console.error('Feedback retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve feedback', details: error.message },
      { status: 500 }
    )
  }
}

async function triggerImprovementWorkflow(
  originalWorkflowId: string, 
  improvementRequest: ImprovementRequest
) {
  const improvementWorkflows = {
    'social-content-gen': 'social-content-improvement',
    'product-photography': 'product-photo-enhancement',
    'customer-insights': 'analytics-refinement'
  }

  const improvementWorkflowId = improvementWorkflows[originalWorkflowId]
  if (!improvementWorkflowId) {
    throw new Error(`No improvement workflow defined for ${originalWorkflowId}`)
  }

  // Get the improvement workflow configuration
  const workflowConfig = await getWorkflowConfig(improvementWorkflowId)
  if (!workflowConfig) {
    throw new Error(`Improvement workflow configuration not found: ${improvementWorkflowId}`)
  }

  // Prepare improvement payload
  const improvementPayload = {
    originalOutputId: improvementRequest.originalOutputId,
    feedback: improvementRequest.feedback,
    improvementType: improvementRequest.improvementType,
    parameters: improvementRequest.parameters,
    metadata: {
      originalWorkflowId,
      timestamp: new Date().toISOString(),
      source: 'feedback-system'
    }
  }

  // Trigger n8n improvement workflow
  const n8nResponse = await fetch(
    `${process.env.N8N_BASE_URL}/webhook/${workflowConfig.webhookId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`
      },
      body: JSON.stringify(improvementPayload)
    }
  )

  if (!n8nResponse.ok) {
    throw new Error(`Improvement workflow failed: ${n8nResponse.statusText}`)
  }

  const result = await n8nResponse.json()

  // Store improvement execution record
  await storeImprovementRecord({
    originalOutputId: improvementRequest.originalOutputId,
    improvementWorkflowId,
    executionId: result.executionId,
    feedback: improvementRequest.feedback,
    status: 'running',
    timestamp: new Date()
  })

  return {
    improvementExecutionId: result.executionId,
    improvementStatus: 'started',
    message: 'Improvement process initiated'
  }
}

function determineImprovementType(feedback: string): 'content' | 'style' | 'format' | 'quality' {
  const feedbackLower = feedback.toLowerCase()
  
  if (feedbackLower.includes('style') || feedbackLower.includes('aesthetic') || feedbackLower.includes('look')) {
    return 'style'
  } else if (feedbackLower.includes('format') || feedbackLower.includes('size') || feedbackLower.includes('resolution')) {
    return 'format'
  } else if (feedbackLower.includes('quality') || feedbackLower.includes('better') || feedbackLower.includes('clearer')) {
    return 'quality'
  } else {
    return 'content'
  }
}

async function getWorkflowConfig(workflowId: string) {
  // Extended workflow configurations including improvement workflows
  const configs = {
    'social-content-improvement': {
      webhookId: 'social-content-improvement-webhook',
      description: 'Improves social media content based on user feedback'
    },
    'product-photo-enhancement': {
      webhookId: 'product-photo-enhancement-webhook',
      description: 'Enhances product photos based on feedback'
    },
    'analytics-refinement': {
      webhookId: 'analytics-refinement-webhook',
      description: 'Refines analytics reports based on user requirements'
    }
  }

  return configs[workflowId] || null
}

async function getOutputById(outputId: string) {
  // In a real implementation, this would query your database
  return {
    id: outputId,
    type: 'image',
    filename: 'example-output.jpg',
    url: '/mock-url',
    timestamp: new Date()
  }
}

async function storeFeedback(feedback: any) {
  // In a real implementation, this would store in your database
  const id = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  console.log('Storing feedback:', { id, ...feedback })
  return { id, ...feedback }
}

async function storeImprovementRecord(record: any) {
  // In a real implementation, this would store in your database
  console.log('Storing improvement record:', record)
}

async function getFeedbackForOutput(outputId: string) {
  // In a real implementation, this would query your database
  return [
    {
      id: 'feedback-1',
      outputId,
      feedbackType: 'improve',
      feedback: 'Make the colors more vibrant and add the YAYA logo',
      timestamp: new Date('2024-01-15T10:30:00Z')
    }
  ]
}

async function getFeedbackForWorkflow(workflowId: string) {
  // In a real implementation, this would query your database
  return [
    {
      id: 'feedback-1',
      workflowId,
      outputId: 'output-1',
      feedbackType: 'approve',
      feedback: 'Perfect for our spring campaign!',
      timestamp: new Date('2024-01-15T09:15:00Z')
    },
    {
      id: 'feedback-2',
      workflowId,
      outputId: 'output-2',
      feedbackType: 'improve',
      feedback: 'The text needs to be more aligned with YAYA brand voice',
      timestamp: new Date('2024-01-15T10:30:00Z')
    }
  ]
}
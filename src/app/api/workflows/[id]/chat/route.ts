import { NextRequest, NextResponse } from 'next/server'

interface ChatRequest {
  message: string
  workflowId: string
  attachments?: File[]
  context?: {
    executionId?: string
    outputId?: string
    conversationHistory?: ChatMessage[]
  }
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  workflowId: string
}

interface WorkflowContext {
  id: string
  title: string
  description: string
  category: string
  currentStatus?: 'idle' | 'running' | 'completed' | 'error'
  lastExecution?: {
    id: string
    status: string
    outputs: any[]
    timestamp: Date
  }
  capabilities: {
    canModifyInputs: boolean
    canTriggerExecution: boolean
    canProvideGuidance: boolean
    supportedCommands: string[]
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const formData = await request.formData()
    
    const message = formData.get('message') as string
    const attachments: File[] = []
    
    // Extract attachments
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('attachment-') && value instanceof File) {
        attachments.push(value)
      }
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get workflow context
    const workflowContext = await getWorkflowContext(workflowId)
    if (!workflowContext) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Store user message
    const userMessage = await storeChatMessage({
      type: 'user',
      content: message,
      workflowId,
      attachments: attachments.map(f => ({ name: f.name, size: f.size, type: f.type }))
    })

    // Process message and determine response
    const messageAnalysis = await analyzeMessage(message, workflowContext)
    const response = await generateResponse(messageAnalysis, workflowContext, attachments)

    // Store assistant message
    const assistantMessage = await storeChatMessage({
      type: 'assistant',
      content: response.content,
      workflowId
    })

    // Handle workflow actions if triggered
    let executionTriggered = false
    if (response.action?.type === 'execute_workflow') {
      try {
        await triggerWorkflowFromChat(workflowId, response.action.parameters, userMessage.id)
        executionTriggered = true
      } catch (error) {
        console.error('Failed to trigger workflow from chat:', error)
        // Add error message to chat
        await storeChatMessage({
          type: 'system',
          content: `Failed to execute workflow: ${error.message}`,
          workflowId
        })
      }
    }

    return NextResponse.json({
      response: response.content,
      messageId: assistantMessage.id,
      executionTriggered,
      suggestedActions: response.suggestedActions || []
    })

  } catch (error) {
    console.error('Chat processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error.message },
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // For pagination

    const messages = await getChatHistory(workflowId, limit, before)
    
    return NextResponse.json({
      messages,
      hasMore: messages.length === limit
    })

  } catch (error) {
    console.error('Chat history retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve chat history', details: error.message },
      { status: 500 }
    )
  }
}

async function analyzeMessage(message: string, context: WorkflowContext) {
  const messageLower = message.toLowerCase()
  
  // Detect intent patterns
  const intents = {
    execute: /(?:run|start|execute|trigger|launch|begin)/i.test(message),
    modify: /(?:change|modify|update|adjust|alter)/i.test(message),
    question: /(?:\?|what|how|why|when|where|can you|could you)/i.test(message),
    feedback: /(?:improve|better|fix|wrong|not good|change this)/i.test(message),
    status: /(?:status|progress|done|finished|running)/i.test(message)
  }

  // Extract parameters mentioned in message
  const parameters = extractParameters(message, context)
  
  // Determine confidence level
  const confidence = calculateConfidence(message, intents, context)

  return {
    intent: Object.entries(intents).find(([_, matches]) => matches)?.[0] || 'general',
    parameters,
    confidence,
    originalMessage: message
  }
}

async function generateResponse(analysis: any, context: WorkflowContext, attachments: File[]) {
  const { intent, parameters, confidence } = analysis

  switch (intent) {
    case 'execute':
      if (context.capabilities.canTriggerExecution) {
        return {
          content: `I'll run the ${context.title} workflow for you. ${parameters.length > 0 ? `Using parameters: ${parameters.join(', ')}` : 'Using default settings.'}`,
          action: {
            type: 'execute_workflow',
            parameters: convertToWorkflowParams(parameters, context)
          },
          suggestedActions: ['View execution status', 'Modify parameters']
        }
      } else {
        return {
          content: `I understand you want to run the ${context.title} workflow, but I don't have permission to trigger executions. You can use the "Run" button on the workflow card instead.`,
          suggestedActions: ['Use Run button', 'Contact administrator']
        }
      }

    case 'status':
      const statusInfo = await getWorkflowStatus(context.id)
      return {
        content: `The ${context.title} workflow is currently ${statusInfo.status}. ${statusInfo.details}`,
        suggestedActions: statusInfo.status === 'idle' ? ['Run workflow'] : ['View outputs', 'Check logs']
      }

    case 'question':
      return await generateInformationalResponse(analysis.originalMessage, context)

    case 'feedback':
      return {
        content: `I understand you want to provide feedback. Could you be more specific about what you'd like to improve? You can also use the "Improve" button on specific outputs for targeted feedback.`,
        suggestedActions: ['Use Improve button', 'Provide specific feedback', 'Request regeneration']
      }

    case 'modify':
      return {
        content: `I can help you modify the workflow parameters. What specifically would you like to change? Available options include: ${context.capabilities.supportedCommands.join(', ')}.`,
        suggestedActions: ['Configure workflow', 'Update parameters', 'Save as preset']
      }

    default:
      return await generateGeneralResponse(analysis.originalMessage, context, attachments)
  }
}

async function generateInformationalResponse(message: string, context: WorkflowContext) {
  // Generate contextual help based on the workflow
  const workflowGuides = {
    'social-content-gen': {
      purpose: 'Generate social media content that aligns with YAYA brand aesthetics',
      inputs: 'Brand theme, content type (post/story/reel), target audience',
      outputs: 'High-quality images and engaging captions',
      tips: 'For best results, specify seasonal themes and target audience preferences'
    },
    'product-photography': {
      purpose: 'Enhance product photos with AI-powered editing',
      inputs: 'Product images, background style, product category',
      outputs: 'Professional product photos ready for catalog',
      tips: 'Upload high-resolution images for optimal enhancement results'
    }
  }

  const guide = workflowGuides[context.id] || {
    purpose: context.description,
    inputs: 'Various inputs depending on workflow configuration',
    outputs: 'Generated content based on your specifications',
    tips: 'Check the workflow documentation for specific guidance'
  }

  return {
    content: `**About ${context.title}:**\n\n**Purpose:** ${guide.purpose}\n\n**Inputs:** ${guide.inputs}\n\n**Outputs:** ${guide.outputs}\n\n**💡 Tip:** ${guide.tips}\n\nWhat specific aspect would you like to know more about?`,
    suggestedActions: ['Run workflow', 'View examples', 'Configure settings']
  }
}

async function generateGeneralResponse(message: string, context: WorkflowContext, attachments: File[]) {
  let response = `I'm here to help with the ${context.title} workflow. `

  if (attachments.length > 0) {
    response += `I see you've attached ${attachments.length} file(s). `
    if (context.capabilities.canModifyInputs) {
      response += `I can use these as inputs for the workflow. `
    }
  }

  response += `Here's what I can help you with:\n\n• Run the workflow with custom parameters\n• Explain how the workflow works\n• Help you interpret outputs\n• Provide feedback on results\n• Suggest optimizations\n\nWhat would you like to do?`

  return {
    content: response,
    suggestedActions: [
      'Run workflow',
      'Explain workflow',
      'View recent outputs',
      'Configure settings'
    ]
  }
}

function extractParameters(message: string, context: WorkflowContext): string[] {
  const parameters: string[] = []
  
  // Extract common parameter patterns
  const patterns = {
    'brand theme': /(?:theme|brand|style):\s*([a-zA-Z-\s]+)/gi,
    'content type': /(?:type|format):\s*([a-zA-Z-\s]+)/gi,
    'audience': /(?:audience|target):\s*([a-zA-Z-\s]+)/gi,
    'count': /(?:count|number|quantity):\s*(\d+)/gi
  }

  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = message.matchAll(pattern)
    for (const match of matches) {
      parameters.push(`${key}: ${match[1].trim()}`)
    }
  }

  return parameters
}

function calculateConfidence(message: string, intents: any, context: WorkflowContext): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence for clear intent keywords
  const intentMatches = Object.values(intents).filter(Boolean).length
  confidence += intentMatches * 0.1
  
  // Increase confidence for workflow-specific terms
  const workflowTerms = [context.title.toLowerCase(), context.category.toLowerCase()]
  const hasWorkflowTerms = workflowTerms.some(term => 
    message.toLowerCase().includes(term.replace('-', ' '))
  )
  if (hasWorkflowTerms) confidence += 0.2
  
  return Math.min(confidence, 1.0)
}

function convertToWorkflowParams(parameters: string[], context: WorkflowContext): Record<string, any> {
  const params: Record<string, any> = {}
  
  for (const param of parameters) {
    const [key, value] = param.split(': ')
    if (key && value) {
      params[key.replace(/\s+/g, '_').toLowerCase()] = value
    }
  }
  
  return params
}

async function getWorkflowContext(workflowId: string): Promise<WorkflowContext | null> {
  // In a real implementation, this would fetch from your database
  const mockContexts = {
    'social-content-gen': {
      id: 'social-content-gen',
      title: 'Social Media Content Generator',
      description: 'Generate Instagram posts, stories, and captions',
      category: 'social-media',
      currentStatus: 'idle' as const,
      capabilities: {
        canModifyInputs: true,
        canTriggerExecution: true,
        canProvideGuidance: true,
        supportedCommands: ['brand theme', 'content type', 'audience', 'image count']
      }
    }
  }
  
  return mockContexts[workflowId] || null
}

async function getWorkflowStatus(workflowId: string) {
  // Mock status - in real implementation, fetch from execution tracker
  return {
    status: 'idle',
    details: 'Ready to run with your specifications.'
  }
}

async function storeChatMessage(message: Partial<ChatMessage>): Promise<ChatMessage> {
  const fullMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: message.type || 'user',
    content: message.content || '',
    timestamp: new Date(),
    workflowId: message.workflowId || '',
    ...message
  }
  
  // In a real implementation, store in database
  console.log('Storing chat message:', fullMessage)
  return fullMessage
}

async function getChatHistory(workflowId: string, limit: number, before?: string): Promise<ChatMessage[]> {
  // In a real implementation, fetch from database
  return []
}

async function triggerWorkflowFromChat(workflowId: string, parameters: Record<string, any>, messageId: string) {
  // Trigger the workflow execution
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: parameters,
      metadata: {
        source: 'chat',
        messageId
      }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to execute workflow from chat')
  }

  return response.json()
}
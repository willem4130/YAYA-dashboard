import { NextRequest, NextResponse } from 'next/server'
import { WebhookConfiguration, DEFAULT_WEBHOOK_CONFIGURATIONS } from '@/lib/webhook-configuration'
import { YAYA_WORKFLOWS } from '@/lib/yaya-workflows'

// Predefined webhook configuration templates
const WEBHOOK_TEMPLATES: Record<string, Partial<WebhookConfiguration>> = {
  ...DEFAULT_WEBHOOK_CONFIGURATIONS,
  
  'simple-api-call': {
    name: 'Simple API Call',
    description: 'Basic configuration for simple API calls with direct field mapping',
    inputMappings: [
      { sourceField: 'message', targetField: 'input', required: true },
      { sourceField: 'userId', targetField: 'user_id' }
    ],
    outputMappings: [
      { sourceField: 'result', targetField: 'response' }
    ],
    wrapInput: { enabled: false },
    unwrapOutput: { enabled: false },
    responseHandling: {
      successPath: 'success',
      errorPath: 'error',
      dataPath: 'data'
    }
  },

  'complex-transformation': {
    name: 'Complex Data Transformation',
    description: 'Advanced configuration with nested field mapping and transformations',
    inputMappings: [
      { sourceField: 'userMessage', targetField: 'request.message', required: true, transform: 'camelCase' },
      { sourceField: 'sessionId', targetField: 'request.session.id', transform: 'snake_case' },
      { sourceField: 'metadata.department', targetField: 'context.dept', transform: 'uppercase' }
    ],
    outputMappings: [
      { sourceField: 'response.content', targetField: 'reply' },
      { sourceField: 'response.session_id', targetField: 'sessionId', transform: 'camelCase' },
      { sourceField: 'response.next_actions', targetField: 'suggestions', transform: 'camelCase' }
    ],
    wrapInput: {
      enabled: true,
      rootKey: 'payload',
      metadata: {
        source: 'yaya-dashboard',
        version: '1.0'
      }
    },
    unwrapOutput: {
      enabled: true,
      dataPath: 'result.data'
    },
    responseHandling: {
      successPath: 'status.success',
      errorPath: 'status.error.message',
      dataPath: 'result'
    }
  },

  'chatbot-integration': {
    name: 'Chatbot Integration',
    description: 'Optimized for conversational AI integrations with session management',
    inputMappings: [
      { sourceField: 'message', targetField: 'user_input', required: true },
      { sourceField: 'conversationId', targetField: 'session_id', required: true },
      { sourceField: 'context', targetField: 'conversation_context' },
      { sourceField: 'userId', targetField: 'user_identifier' }
    ],
    outputMappings: [
      { sourceField: 'bot_response', targetField: 'reply' },
      { sourceField: 'session_id', targetField: 'conversationId' },
      { sourceField: 'suggested_actions', targetField: 'suggestions' },
      { sourceField: 'confidence_score', targetField: 'confidence' }
    ],
    wrapInput: {
      enabled: true,
      rootKey: 'chat_request',
      metadata: {
        timestamp: '{{timestamp}}',
        channel: 'web'
      }
    },
    unwrapOutput: {
      enabled: true,
      dataPath: 'chat_response'
    },
    responseHandling: {
      successPath: 'success',
      errorPath: 'error.message',
      dataPath: 'data'
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    if (templateId) {
      const template = WEBHOOK_TEMPLATES[templateId]
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      return NextResponse.json(template)
    }

    // Return all templates with metadata
    const templates = Object.entries(WEBHOOK_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name || id,
      description: template.description || 'No description available',
      complexity: template.inputMappings?.length || 0 + template.outputMappings?.length || 0,
      features: {
        hasInputMapping: (template.inputMappings?.length || 0) > 0,
        hasOutputMapping: (template.outputMappings?.length || 0) > 0,
        hasWrapping: template.wrapInput?.enabled || template.unwrapOutput?.enabled,
        hasTransformations: [
          ...(template.inputMappings || []),
          ...(template.outputMappings || [])
        ].some(mapping => mapping.transform)
      }
    }))

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Failed to get webhook templates:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, workflowId, customizations } = body

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    }

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
    }

    const template = WEBHOOK_TEMPLATES[templateId]
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const workflow = YAYA_WORKFLOWS[workflowId]
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Create complete configuration from template
    const config: WebhookConfiguration = {
      workflowId,
      name: customizations?.name || `${template.name} - ${workflow.title}`,
      description: customizations?.description || template.description || `Generated from ${templateId} template`,
      inputMappings: template.inputMappings || [],
      outputMappings: template.outputMappings || [],
      wrapInput: template.wrapInput || { enabled: false },
      unwrapOutput: template.unwrapOutput || { enabled: false },
      responseHandling: template.responseHandling || {},
      n8nSettings: {
        webhookUrl: customizations?.webhookUrl || workflow.webhookId || '',
        method: 'POST',
        headers: customizations?.headers || {},
        authentication: customizations?.authentication || { type: 'none' }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        createdBy: 'template-generator',
        tags: ['template', templateId, workflowId]
      }
    }

    // Apply any additional customizations
    if (customizations) {
      Object.assign(config, customizations)
    }

    return NextResponse.json(config, { status: 201 })
  } catch (error) {
    console.error('Failed to generate configuration from template:', error)
    return NextResponse.json(
      { error: 'Failed to generate configuration' },
      { status: 500 }
    )
  }
}
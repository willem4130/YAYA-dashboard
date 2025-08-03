import { NextRequest, NextResponse } from 'next/server'

interface WorkflowDefinition {
  id: string
  title: string
  description: string
  category: 'social-media' | 'content-creation' | 'analytics' | 'automation'
  hasChat: boolean
  expectsFiles: boolean
  webhookId: string
  schema: {
    inputs: Record<string, {
      type: string
      required: boolean
      description?: string
      enum?: string[]
      min?: number
      max?: number
      default?: any
    }>
    parameters: Record<string, {
      type: string
      description?: string
      enum?: string[]
      min?: number
      max?: number
      default?: any
    }>
  }
  configuration: {
    timeout?: number
    retries?: number
    concurrency?: number
    scheduling?: {
      enabled: boolean
      cron?: string
    }
  }
  metadata: {
    createdAt: Date
    updatedAt: Date
    version: string
    author: string
    tags: string[]
  }
}

interface CreateWorkflowRequest {
  title: string
  description: string
  category: string
  hasChat: boolean
  expectsFiles: boolean
  webhookId: string
  schema: any
  configuration?: any
  tags?: string[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',')

    // Get all workflow definitions
    let workflows = await getAllWorkflowDefinitions()

    // Apply filters
    if (category && category !== 'all') {
      workflows = workflows.filter(w => w.category === category)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      workflows = workflows.filter(w => 
        w.title.toLowerCase().includes(searchLower) ||
        w.description.toLowerCase().includes(searchLower) ||
        w.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    if (tags && tags.length > 0) {
      workflows = workflows.filter(w => 
        tags.some(tag => w.metadata.tags.includes(tag))
      )
    }

    // Get execution statistics for each workflow
    const workflowsWithStats = await Promise.all(
      workflows.map(async (workflow) => {
        const stats = await getWorkflowExecutionStats(workflow.id)
        return {
          ...workflow,
          stats
        }
      })
    )

    return NextResponse.json({
      workflows: workflowsWithStats,
      total: workflowsWithStats.length
    })

  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkflowRequest = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'webhookId', 'schema']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate webhook connectivity
    const webhookValid = await validateWebhook(body.webhookId)
    if (!webhookValid) {
      return NextResponse.json(
        { error: 'Invalid or unreachable webhook ID' },
        { status: 400 }
      )
    }

    // Create workflow definition
    const workflowId = generateWorkflowId(body.title)
    const workflow: WorkflowDefinition = {
      id: workflowId,
      title: body.title,
      description: body.description,
      category: body.category as any,
      hasChat: body.hasChat || false,
      expectsFiles: body.expectsFiles || false,
      webhookId: body.webhookId,
      schema: body.schema,
      configuration: {
        timeout: 300000, // 5 minutes default
        retries: 3,
        concurrency: 1,
        ...body.configuration
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        author: request.headers.get('user-id') || 'system',
        tags: body.tags || []
      }
    }

    // Store workflow definition
    await storeWorkflowDefinition(workflow)

    return NextResponse.json({
      success: true,
      workflowId,
      message: 'Workflow created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating workflow:', error)
    return NextResponse.json(
      { error: 'Failed to create workflow', details: error.message },
      { status: 500 }
    )
  }
}

async function getAllWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  // In a real implementation, this would fetch from your database
  // For now, return the predefined YAYA workflows
  return [
    {
      id: 'social-content-gen',
      title: 'Social Media Content Generator',
      description: 'Generate Instagram posts, stories, and captions that align with YAYA brand aesthetic and seasonal campaigns',
      category: 'social-media',
      hasChat: true,
      expectsFiles: true,
      webhookId: 'social-content-webhook-id',
      schema: {
        inputs: {
          brandTheme: { 
            type: 'string', 
            required: true, 
            description: 'Theme for the content (e.g., spring-collection, casual-friday)',
            enum: ['spring-collection', 'autumn-vibes', 'casual-friday', 'weekend-comfort']
          },
          contentType: { 
            type: 'string', 
            enum: ['post', 'story', 'reel'], 
            required: true,
            description: 'Type of social media content to generate'
          },
          targetAudience: { 
            type: 'string', 
            required: false,
            description: 'Target audience for the content',
            enum: ['young-professionals', 'fashion-enthusiasts', 'lifestyle-conscious']
          }
        },
        parameters: {
          imageCount: { 
            type: 'number', 
            min: 1, 
            max: 5, 
            default: 3,
            description: 'Number of images to generate'
          },
          includeCaption: { 
            type: 'boolean', 
            default: true,
            description: 'Whether to generate captions'
          },
          brandVoice: {
            type: 'string',
            enum: ['friendly', 'sophisticated', 'casual', 'inspiring'],
            default: 'friendly',
            description: 'Brand voice for the content'
          }
        }
      },
      configuration: {
        timeout: 600000, // 10 minutes for content generation
        retries: 2,
        concurrency: 1
      },
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        version: '2.1.0',
        author: 'yaya-team',
        tags: ['social-media', 'branding', 'content-creation', 'instagram']
      }
    },
    {
      id: 'product-photography',
      title: 'Product Photography Enhancement',
      description: 'AI-powered background removal, color correction, and lifestyle integration for YAYA product catalog',
      category: 'content-creation',
      hasChat: false,
      expectsFiles: true,
      webhookId: 'product-photo-webhook-id',
      schema: {
        inputs: {
          productImages: { 
            type: 'array', 
            required: true,
            description: 'Product images to enhance'
          },
          backgroundStyle: { 
            type: 'string', 
            required: false,
            enum: ['minimal-white', 'lifestyle', 'studio', 'natural'],
            default: 'minimal-white',
            description: 'Background style for product photos'
          },
          productCategory: {
            type: 'string',
            enum: ['tops', 'bottoms', 'dresses', 'accessories', 'outerwear'],
            required: true,
            description: 'Product category for optimal processing'
          }
        },
        parameters: {
          outputFormat: { 
            type: 'string', 
            enum: ['jpg', 'png'], 
            default: 'jpg',
            description: 'Output image format'
          },
          resolution: { 
            type: 'string', 
            enum: ['1080x1080', '1920x1080', '2048x2048'], 
            default: '1080x1080',
            description: 'Output image resolution'
          },
          qualityLevel: {
            type: 'string',
            enum: ['standard', 'high', 'premium'],
            default: 'high',
            description: 'Processing quality level'
          }
        }
      },
      configuration: {
        timeout: 900000, // 15 minutes for image processing
        retries: 1,
        concurrency: 2
      },
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'),
        version: '1.5.0',
        author: 'yaya-team',
        tags: ['photography', 'product-catalog', 'image-processing', 'e-commerce']
      }
    }
  ]
}

async function getWorkflowExecutionStats(workflowId: string) {
  // In a real implementation, this would query execution history from your database
  const mockStats = {
    totalExecutions: Math.floor(Math.random() * 100) + 10,
    successfulExecutions: Math.floor(Math.random() * 80) + 8,
    averageExecutionTime: Math.floor(Math.random() * 300) + 30, // seconds
    lastExecution: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
    currentlyRunning: Math.floor(Math.random() * 3)
  }

  return {
    ...mockStats,
    successRate: (mockStats.successfulExecutions / mockStats.totalExecutions * 100).toFixed(1)
  }
}

async function validateWebhook(webhookId: string): Promise<boolean> {
  try {
    // Test webhook connectivity
    const response = await fetch(`${process.env.N8N_BASE_URL}/webhook/${webhookId}`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`
      }
    })
    return response.ok
  } catch (error) {
    console.error('Webhook validation error:', error)
    return false
  }
}

function generateWorkflowId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

async function storeWorkflowDefinition(workflow: WorkflowDefinition) {
  // In a real implementation, this would store in your database
  console.log('Storing workflow definition:', workflow.id)
}
import { NextRequest, NextResponse } from 'next/server'
import {
  WebhookConfiguration,
  WebhookConfigurationSchema,
} from '@/lib/webhook-configuration'

// In-memory storage for demo (replace with database in production)
const webhookConfigurations: Record<string, WebhookConfiguration> = {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')

    if (workflowId) {
      const config = webhookConfigurations[workflowId]
      if (!config) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(config)
    }

    // Return all configurations
    return NextResponse.json(Object.values(webhookConfigurations))
  } catch (error) {
    console.error('Failed to get webhook configurations:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve configurations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate configuration
    const validation = WebhookConfigurationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid configuration',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const config = validation.data as WebhookConfiguration

    // Update timestamps
    const now = new Date().toISOString()
    if (webhookConfigurations[config.workflowId]) {
      config.metadata.updatedAt = now
    } else {
      config.metadata.createdAt = now
      config.metadata.updatedAt = now
    }

    // Save configuration
    webhookConfigurations[config.workflowId] = config

    return NextResponse.json(config, { status: 201 })
  } catch (error) {
    console.error('Failed to save webhook configuration:', error)
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate configuration
    const validation = WebhookConfigurationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid configuration',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const config = validation.data as WebhookConfiguration

    // Check if configuration exists
    if (!webhookConfigurations[config.workflowId]) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    // Update configuration
    config.metadata.updatedAt = new Date().toISOString()
    webhookConfigurations[config.workflowId] = config

    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to update webhook configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      )
    }

    if (!webhookConfigurations[workflowId]) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    delete webhookConfigurations[workflowId]

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete webhook configuration:', error)
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    )
  }
}

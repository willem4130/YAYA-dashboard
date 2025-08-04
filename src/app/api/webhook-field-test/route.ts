import { NextRequest, NextResponse } from 'next/server'
import { WebhookFieldService } from '@/lib/webhook-field-service'

// POST - Test webhook field configuration
export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Validate the configuration
    const validation = WebhookFieldService.validateConfiguration(config)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Configuration validation failed',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    // Test the webhook configuration
    const result = await WebhookFieldService.testWebhookConfiguration(config)
    
    return NextResponse.json({
      success: result.success,
      inputMapping: result.inputMapping,
      response: result.response,
      outputMapping: result.outputMapping,
      error: result.error,
      validation: {
        isValid: true,
        configName: config.name,
        inputMappings: config.inputMappings.length,
        outputMappings: config.outputMappings.length,
      }
    })

  } catch (error) {
    console.error('Webhook field test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        details: 'Internal server error during webhook test'
      },
      { status: 500 }
    )
  }
}

// GET - Get webhook field configuration validation info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('configId')
    
    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      )
    }

    const config = WebhookFieldService.getConfiguration(configId)
    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    const validation = WebhookFieldService.validateConfiguration(config)
    
    return NextResponse.json({
      configId,
      name: config.name,
      isValid: validation.isValid,
      errors: validation.errors,
      stats: {
        inputMappings: config.inputMappings.length,
        outputMappings: config.outputMappings.length,
        requiredInputs: config.inputMappings.filter(m => m.required).length,
        requiredOutputs: config.outputMappings.filter(m => m.required).length,
        transforms: config.inputMappings.concat(config.outputMappings).filter(m => m.transform).length,
      }
    })

  } catch (error) {
    console.error('Webhook field validation failed:', error)
    return NextResponse.json(
      { error: 'Failed to validate configuration' },
      { status: 500 }
    )
  }
}
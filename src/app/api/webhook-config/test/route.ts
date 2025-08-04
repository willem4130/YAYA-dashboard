import { NextRequest, NextResponse } from 'next/server'
import { webhookConfigService } from '@/lib/webhook-configuration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, testData } = body

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
    }

    if (!testData) {
      return NextResponse.json({ error: 'testData is required' }, { status: 400 })
    }

    // Get webhook configuration
    const config = webhookConfigService.getConfiguration(workflowId)
    if (!config) {
      return NextResponse.json({ error: 'Webhook configuration not found' }, { status: 404 })
    }

    // Test input mapping
    let transformedInput
    try {
      transformedInput = webhookConfigService.applyInputMappings(testData, config)
    } catch (error) {
      return NextResponse.json({
        error: 'Input mapping failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }

    // Test webhook URL connectivity
    let connectivityTest = { success: false, error: 'Not tested' }
    try {
      const response = await fetch(config.n8nSettings.webhookUrl, {
        method: 'HEAD',
        headers: config.n8nSettings.headers || {},
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      connectivityTest = {
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      connectivityTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }

    // Simulate webhook response for output mapping test
    const mockResponse = {
      success: true,
      data: {
        response: 'Test response from n8n',
        conversationId: 'test-123',
        suggestions: ['Follow up 1', 'Follow up 2']
      },
      timestamp: new Date().toISOString()
    }

    // Test output mapping
    let transformedOutput
    try {
      // First check response status
      const statusCheck = webhookConfigService.checkResponseStatus(mockResponse, config)
      if (!statusCheck.success && statusCheck.error) {
        throw new Error(`Response validation failed: ${statusCheck.error}`)
      }
      
      // Apply output mappings
      transformedOutput = webhookConfigService.applyOutputMappings(
        statusCheck.resultData || mockResponse, 
        config
      )
    } catch (error) {
      return NextResponse.json({
        error: 'Output mapping failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      results: {
        connectivity: connectivityTest,
        inputMapping: {
          original: testData,
          transformed: transformedInput,
          mappingsApplied: config.inputMappings.length
        },
        outputMapping: {
          mockResponse: mockResponse,
          transformed: transformedOutput,
          mappingsApplied: config.outputMappings.length
        },
        configuration: {
          name: config.name,
          version: config.metadata.version,
          lastUpdated: config.metadata.updatedAt
        }
      }
    })

  } catch (error) {
    console.error('Webhook test failed:', error)
    return NextResponse.json(
      { 
        error: 'Test execution failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
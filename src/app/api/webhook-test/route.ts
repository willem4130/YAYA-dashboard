import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, method, testPayload } = await request.json()

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL is required' },
        { status: 400 }
      )
    }

    // Make the webhook request from the server side to avoid CORS
    const response = await fetch(webhookUrl, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'YAYA-Dashboard-Webhook-Test/1.0',
      },
      body: JSON.stringify(testPayload || { test: true, timestamp: new Date().toISOString() }),
    })

    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
    })

  } catch (error) {
    console.error('Webhook test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}
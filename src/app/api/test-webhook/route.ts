import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, payload } = await request.json()

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      )
    }

    console.log(`🧪 Proxying webhook test to: ${webhookUrl}`)
    console.log('📤 Test payload:', payload)

    // Make the actual request to n8n from server-side (bypasses CORS)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Add timeout
      signal: AbortSignal.timeout(30000),
    })

    const responseText = await response.text()
    console.log(`📡 n8n response: ${response.status} ${response.statusText}`)
    console.log('📥 n8n response body:', responseText)

    // Parse response if it's JSON
    let parsedResponse = responseText
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      // Keep as text if not valid JSON
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: parsedResponse,
      headers: Object.fromEntries(response.headers.entries()),
      message: response.ok
        ? 'Webhook connection successful!'
        : `Webhook failed: ${response.status} ${response.statusText}`,
      debug: {
        url: webhookUrl,
        method: 'POST',
        timestamp: new Date().toISOString(),
        responseSize: responseText.length,
      },
    })
  } catch (error) {
    console.error('❌ Webhook proxy error:', error)

    let errorMessage = error.message
    if (error.name === 'AbortError') {
      errorMessage = 'Webhook request timed out after 30 seconds'
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: `Connection failed: ${errorMessage}`,
      },
      { status: 500 }
    )
  }
}

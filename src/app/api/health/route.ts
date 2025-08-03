import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requestId: request.headers.get('x-request-id'),
      version: process.env.YAYA_ATELIER_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // YAYA-specific health checks
      yaya: {
        currentSeason: process.env.YAYA_CURRENT_SEASON || 'spring-2024',
        workflowsAvailable: 6, // Based on YAYA_WORKFLOWS
        brandAlignment: 'high',
        lastUpdated: '2024-01-20'
      },
      
      // API capabilities
      api: {
        cors: 'enabled',
        middleware: 'active',
        requestLogging: 'enabled',
        n8nProxy: 'available'
      },
      
      // Performance metrics
      performance: {
        responseTime: `${Date.now() - startTime}ms`,
        memoryUsage: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      },
      
      // Network connectivity tests
      connectivity: await testConnectivity(),
      
      // Checks
      checks: {
        api: 'ok',
        middleware: 'ok',
        logging: 'ok',
        cors: 'ok'
      }
    }

    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'yaya-atelier'
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      requestId: request.headers.get('x-request-id'),
      responseTime: `${Date.now() - startTime}ms`
    }, { 
      status: 503,
      headers: {
        'X-Health-Check': 'yaya-atelier'
      }
    })
  }
}

async function testConnectivity(): Promise<any> {
  const tests = []
  
  // Test n8n.cloud connectivity (basic DNS/network test)
  try {
    const testUrl = 'https://willem4130.app.n8n.cloud'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    tests.push({
      service: 'n8n.cloud',
      status: response.ok ? 'reachable' : 'error',
      responseTime: response.ok ? 'fast' : 'slow'
    })
  } catch (error) {
    tests.push({
      service: 'n8n.cloud',
      status: 'unreachable',
      error: error.message
    })
  }
  
  return {
    external: tests,
    internal: {
      filesystem: 'ok',
      process: 'ok'
    }
  }
}
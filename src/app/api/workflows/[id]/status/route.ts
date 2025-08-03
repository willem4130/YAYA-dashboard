import { NextRequest, NextResponse } from 'next/server'
import { getN8nService } from '@/lib/n8n-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = request.nextUrl.searchParams.get('executionId')
    
    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId parameter is required' },
        { status: 400 }
      )
    }

    const n8nService = getN8nService()
    
    // Get execution status and results
    const execution = await n8nService.getExecutionStatus(executionId)
    
    // Extract the workflow result/output
    const result = {
      id: execution.id,
      status: execution.finished ? 'completed' : 'running',
      finished: execution.finished,
      startedAt: execution.startedAt,
      stoppedAt: execution.stoppedAt,
      workflowId: execution.workflowId,
      // Extract the actual result data
      data: execution.data?.resultData?.runData ? 
        extractWorkflowOutput(execution.data.resultData.runData) : null,
      error: execution.data?.resultData?.error || null
    }

    return NextResponse.json({
      success: true,
      execution: result
    })

  } catch (error) {
    console.error('Failed to get workflow status:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get workflow status', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper function to extract meaningful output from n8n execution data
function extractWorkflowOutput(runData: Record<string, any>): any {
  // n8n stores execution data in a complex structure
  // This function extracts the final output/result
  
  const nodes = Object.keys(runData)
  if (nodes.length === 0) return null
  
  // Try to find the last successful node execution
  let lastNodeData = null
  let lastNodeName = null
  
  for (const nodeName of nodes) {
    const nodeData = runData[nodeName]
    if (nodeData && nodeData[0] && nodeData[0].data) {
      lastNodeData = nodeData[0].data
      lastNodeName = nodeName
    }
  }
  
  if (!lastNodeData) return null
  
  // Return the main output data
  return {
    nodeName: lastNodeName,
    output: lastNodeData.main?.[0]?.[0] || lastNodeData,
    // If the output is a string (as mentioned in your case)
    text: typeof lastNodeData === 'string' ? lastNodeData : 
          lastNodeData.main?.[0]?.[0]?.text || 
          lastNodeData.main?.[0]?.[0]?.data ||
          JSON.stringify(lastNodeData.main?.[0]?.[0] || lastNodeData)
  }
}
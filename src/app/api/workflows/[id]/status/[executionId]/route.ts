import { NextRequest, NextResponse } from 'next/server'

interface N8nExecutionStatus {
  id: string
  status: 'running' | 'success' | 'error' | 'waiting'
  startedAt: string
  finishedAt?: string
  data?: {
    resultData?: {
      runData?: Record<string, any>
    }
  }
  error?: {
    message: string
    stack?: string
  }
}

interface WorkflowOutput {
  id: string
  type: 'image' | 'video' | 'text' | 'file'
  url?: string
  content?: string
  filename?: string
  timestamp: Date
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; executionId: string } }
) {
  try {
    const workflowId = params.id
    const executionId = params.executionId

    // Fetch execution status from n8n
    const n8nResponse = await fetch(
      `${process.env.N8N_BASE_URL}/api/v1/executions/${executionId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!n8nResponse.ok) {
      throw new Error(`Failed to fetch execution status: ${n8nResponse.statusText}`)
    }

    const executionData: N8nExecutionStatus = await n8nResponse.json()

    // Process outputs based on workflow type
    const outputs = await processWorkflowOutputs(workflowId, executionData)

    // Update local execution record
    await updateExecutionRecord(executionId, {
      status: executionData.status,
      finishedAt: executionData.finishedAt,
      outputs
    })

    return NextResponse.json({
      executionId,
      status: executionData.status,
      startedAt: executionData.startedAt,
      finishedAt: executionData.finishedAt,
      outputs,
      error: executionData.error?.message
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check workflow status', details: error.message },
      { status: 500 }
    )
  }
}

async function processWorkflowOutputs(
  workflowId: string, 
  executionData: N8nExecutionStatus
): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  if (executionData.status !== 'success' || !executionData.data?.resultData?.runData) {
    return outputs
  }

  const runData = executionData.data.resultData.runData

  // Process outputs based on workflow type
  switch (workflowId) {
    case 'social-content-gen':
      outputs.push(...await processSocialMediaOutputs(runData))
      break
    
    case 'product-photography':
      outputs.push(...await processProductPhotoOutputs(runData))
      break
    
    case 'customer-insights':
      outputs.push(...await processAnalyticsOutputs(runData))
      break
    
    default:
      outputs.push(...await processGenericOutputs(runData))
  }

  return outputs
}

async function processSocialMediaOutputs(runData: Record<string, any>): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for image generation node outputs
  if (runData.imageGeneration?.data?.main) {
    const imageData = runData.imageGeneration.data.main[0]
    if (imageData?.binary) {
      for (const [key, binaryData] of Object.entries(imageData.binary)) {
        outputs.push({
          id: `img-${Date.now()}-${key}`,
          type: 'image',
          filename: binaryData.fileName || `generated-${key}.jpg`,
          url: await uploadToStorage(binaryData.data, binaryData.mimeType),
          timestamp: new Date()
        })
      }
    }
  }

  // Look for caption generation node outputs
  if (runData.captionGeneration?.data?.main) {
    const captionData = runData.captionGeneration.data.main[0]
    if (captionData?.json?.caption) {
      outputs.push({
        id: `text-${Date.now()}`,
        type: 'text',
        content: captionData.json.caption,
        timestamp: new Date()
      })
    }
  }

  return outputs
}

async function processProductPhotoOutputs(runData: Record<string, any>): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for processed image outputs
  if (runData.imageProcessor?.data?.main) {
    const processedData = runData.imageProcessor.data.main[0]
    if (processedData?.binary) {
      for (const [key, binaryData] of Object.entries(processedData.binary)) {
        outputs.push({
          id: `processed-${Date.now()}-${key}`,
          type: 'image',
          filename: binaryData.fileName || `processed-${key}.jpg`,
          url: await uploadToStorage(binaryData.data, binaryData.mimeType),
          timestamp: new Date()
        })
      }
    }
  }

  return outputs
}

async function processAnalyticsOutputs(runData: Record<string, any>): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for report generation outputs
  if (runData.reportGenerator?.data?.main) {
    const reportData = runData.reportGenerator.data.main[0]
    if (reportData?.binary?.report) {
      const binaryData = reportData.binary.report
      outputs.push({
        id: `report-${Date.now()}`,
        type: 'file',
        filename: binaryData.fileName || 'analytics-report.pdf',
        url: await uploadToStorage(binaryData.data, binaryData.mimeType),
        timestamp: new Date()
      })
    }
  }

  return outputs
}

async function processGenericOutputs(runData: Record<string, any>): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Generic processing for any workflow outputs
  for (const [nodeName, nodeData] of Object.entries(runData)) {
    if (nodeData?.data?.main) {
      const mainData = nodeData.data.main[0]
      
      // Handle binary outputs
      if (mainData?.binary) {
        for (const [key, binaryData] of Object.entries(mainData.binary)) {
          const mimeType = binaryData.mimeType || 'application/octet-stream'
          let type: 'image' | 'video' | 'file' = 'file'
          
          if (mimeType.startsWith('image/')) type = 'image'
          else if (mimeType.startsWith('video/')) type = 'video'
          
          outputs.push({
            id: `${nodeName}-${Date.now()}-${key}`,
            type,
            filename: binaryData.fileName || `output-${key}`,
            url: await uploadToStorage(binaryData.data, mimeType),
            timestamp: new Date()
          })
        }
      }
      
      // Handle JSON text outputs
      if (mainData?.json && typeof mainData.json === 'object') {
        const jsonString = JSON.stringify(mainData.json, null, 2)
        if (jsonString.length > 0) {
          outputs.push({
            id: `${nodeName}-${Date.now()}-json`,
            type: 'text',
            content: jsonString,
            timestamp: new Date()
          })
        }
      }
    }
  }

  return outputs
}

async function uploadToStorage(base64Data: string, mimeType: string): Promise<string> {
  // In a real implementation, this would upload to your storage service (S3, CloudFlare R2, etc.)
  // For now, return a mock URL
  const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return `/api/files/${fileId}`
}

async function updateExecutionRecord(executionId: string, updates: any) {
  // In a real implementation, this would update your database
  console.log('Updating execution record:', executionId, updates)
}
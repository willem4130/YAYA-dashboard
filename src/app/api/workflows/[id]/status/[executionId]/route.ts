import { NextRequest, NextResponse } from 'next/server'
import { getN8nService } from '@/lib/n8n-service'
import { YAYA_WORKFLOWS } from '@/lib/yaya-workflows'

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

    // Get YAYA workflow configuration
    const workflowConfig = YAYA_WORKFLOWS[workflowId]
    if (!workflowConfig) {
      return NextResponse.json(
        { error: 'YAYA workflow not found', availableWorkflows: Object.keys(YAYA_WORKFLOWS) },
        { status: 404 }
      )
    }

    // Initialize n8n service
    const n8nService = getN8nService()

    // Fetch execution status from n8n using our service
    const n8nExecution = await n8nService.getExecutionStatus(executionId)

    // Map n8n status to YAYA workflow status
    const yayaStatus = mapN8nStatusToYaya(n8nExecution)

    // Process outputs based on YAYA workflow type and expected outputs
    const outputs = await processYayaWorkflowOutputs(workflowConfig, n8nExecution)

    // Get local execution record for additional context
    const localRecord = await getYayaExecutionRecord(executionId)

    // Update local execution record with latest status
    await updateYayaExecutionRecord(executionId, {
      status: yayaStatus.status,
      finishedAt: n8nExecution.stoppedAt,
      outputs,
      progress: yayaStatus.progress,
      lastUpdated: new Date()
    })

    return NextResponse.json({
      // Execution details
      executionId,
      status: yayaStatus.status,
      progress: yayaStatus.progress,
      startedAt: n8nExecution.startedAt,
      finishedAt: n8nExecution.stoppedAt,
      
      // YAYA workflow context
      workflow: {
        id: workflowId,
        title: workflowConfig.title,
        category: workflowConfig.category,
        expectedOutputs: workflowConfig.outputs.description
      },
      
      // Outputs processed according to YAYA standards
      outputs,
      
      // Error information if applicable
      error: n8nExecution.data?.resultData?.error?.message || yayaStatus.error,
      
      // Additional YAYA metadata
      yayaMetadata: {
        brandAlignment: workflowConfig.yayaMetadata.brandAlignment,
        seasonalRelevance: workflowConfig.yayaMetadata.seasonalRelevance,
        userContext: localRecord?.userContext,
        estimatedDuration: `${Math.round(workflowConfig.settings.timeout / 60000)} minutes`,
        version: workflowConfig.yayaMetadata.version
      },
      
      // n8n technical details
      n8n: {
        workflowId: workflowConfig.n8nWorkflowId,
        executionMode: n8nExecution.mode,
        waitTill: n8nExecution.waitTill
      }
    })

  } catch (error) {
    console.error('YAYA workflow status check error:', error)
    
    // Enhanced error reporting with YAYA context
    const errorResponse = {
      error: 'Failed to check YAYA workflow status',
      details: error.message,
      timestamp: new Date().toISOString(),
      workflowId: params.id,
      executionId: params.executionId
    }

    // Different status codes based on error type
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { ...errorResponse, type: 'execution_not_found' },
        { status: 404 }
      )
    } else if (error.message.includes('n8n')) {
      return NextResponse.json(
        { ...errorResponse, type: 'n8n_service_error' },
        { status: 502 }
      )
    } else {
      return NextResponse.json(
        { ...errorResponse, type: 'internal_error' },
        { status: 500 }
      )
    }
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

// YAYA-specific helper functions for status polling integration

function mapN8nStatusToYaya(n8nExecution: any): {
  status: 'running' | 'completed' | 'failed' | 'waiting' | 'stopped'
  progress: number
  error?: string
} {
  // Map n8n execution status to YAYA terminology
  if (!n8nExecution.finished) {
    return {
      status: 'running',
      progress: n8nExecution.waitTill ? 40 : 70, // Estimate progress
    }
  }

  // Check for errors in execution data
  const hasError = n8nExecution.data?.resultData?.error
  if (hasError) {
    return {
      status: 'failed',
      progress: 100,
      error: hasError.message || 'Workflow execution failed'
    }
  }

  // Check if manually stopped
  if (n8nExecution.stoppedAt && !n8nExecution.data?.resultData?.lastNodeExecuted) {
    return {
      status: 'stopped',
      progress: 50
    }
  }

  // Waiting state (has waitTill date)
  if (n8nExecution.waitTill) {
    const waitUntil = new Date(n8nExecution.waitTill)
    if (waitUntil > new Date()) {
      return {
        status: 'waiting',
        progress: 30
      }
    }
  }

  // Successfully completed
  return {
    status: 'completed',
    progress: 100
  }
}

async function processYayaWorkflowOutputs(
  workflowConfig: any,
  n8nExecution: any
): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Only process if execution finished successfully
  if (!n8nExecution.finished || !n8nExecution.data?.resultData?.runData) {
    return outputs
  }

  const runData = n8nExecution.data.resultData.runData

  // Process based on YAYA workflow category and expected output types
  switch (workflowConfig.category) {
    case 'collections':
      outputs.push(...await processCollectionOutputs(runData, workflowConfig))
      break
    
    case 'brand-content':
      outputs.push(...await processBrandContentOutputs(runData, workflowConfig))
      break
    
    case 'client-insights':
      outputs.push(...await processClientInsightsOutputs(runData, workflowConfig))
      break
    
    case 'sustainability':
      outputs.push(...await processSustainabilityOutputs(runData, workflowConfig))
      break
    
    case 'retail-operations':
      outputs.push(...await processRetailOperationsOutputs(runData, workflowConfig))
      break
    
    default:
      outputs.push(...await processGenericYayaOutputs(runData, workflowConfig))
  }

  return outputs
}

async function processCollectionOutputs(runData: Record<string, any>, config: any): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for storytelling and narrative content
  if (runData.storyGeneration?.data?.main) {
    const storyData = runData.storyGeneration.data.main[0]
    if (storyData?.json?.narrative) {
      outputs.push({
        id: `story-${Date.now()}`,
        type: 'text',
        content: storyData.json.narrative,
        timestamp: new Date()
      })
    }
  }

  // Look for visual concept outputs
  if (runData.visualConcepts?.data?.main) {
    const visualData = runData.visualConcepts.data.main[0]
    if (visualData?.binary) {
      for (const [key, binaryData] of Object.entries(visualData.binary)) {
        const binary = binaryData as any
        outputs.push({
          id: `visual-${Date.now()}-${key}`,
          type: 'image',
          filename: binary.fileName || `collection-visual-${key}.jpg`,
          url: await uploadToStorage(binary.data, binary.mimeType),
          timestamp: new Date()
        })
      }
    }
  }

  return outputs
}

async function processBrandContentOutputs(runData: Record<string, any>, config: any): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for campaign materials
  if (runData.campaignGeneration?.data?.main) {
    const campaignData = runData.campaignGeneration.data.main[0]
    if (campaignData?.json?.campaign) {
      outputs.push({
        id: `campaign-${Date.now()}`,
        type: 'text',
        content: JSON.stringify(campaignData.json.campaign, null, 2),
        timestamp: new Date()
      })
    }
  }

  // Look for creative assets
  if (runData.creativeAssets?.data?.main) {
    const assetsData = runData.creativeAssets.data.main[0]
    if (assetsData?.binary) {
      for (const [key, binaryData] of Object.entries(assetsData.binary)) {
        const binary = binaryData as any
        outputs.push({
          id: `asset-${Date.now()}-${key}`,
          type: 'image',
          filename: binary.fileName || `brand-asset-${key}.jpg`,
          url: await uploadToStorage(binary.data, binary.mimeType),
          timestamp: new Date()
        })
      }
    }
  }

  return outputs
}

async function processClientInsightsOutputs(runData: Record<string, any>, config: any): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for analytics reports
  if (runData.analyticsReport?.data?.main) {
    const reportData = runData.analyticsReport.data.main[0]
    if (reportData?.binary?.report) {
      const binaryData = reportData.binary.report as any
      outputs.push({
        id: `insights-report-${Date.now()}`,
        type: 'file',
        filename: binaryData.fileName || 'client-insights-report.pdf',
        url: await uploadToStorage(binaryData.data, binaryData.mimeType),
        timestamp: new Date()
      })
    }
  }

  // Look for customer recommendations
  if (runData.recommendations?.data?.main) {
    const recData = runData.recommendations.data.main[0]
    if (recData?.json?.recommendations) {
      outputs.push({
        id: `recommendations-${Date.now()}`,
        type: 'text',
        content: JSON.stringify(recData.json.recommendations, null, 2),
        timestamp: new Date()
      })
    }
  }

  return outputs
}

async function processSustainabilityOutputs(runData: Record<string, any>, config: any): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for sustainability reports
  if (runData.sustainabilityReport?.data?.main) {
    const reportData = runData.sustainabilityReport.data.main[0]
    if (reportData?.binary?.sustainabilityReport) {
      const binaryData = reportData.binary.sustainabilityReport as any
      outputs.push({
        id: `sustainability-report-${Date.now()}`,
        type: 'file',
        filename: binaryData.fileName || 'sustainability-report.pdf',
        url: await uploadToStorage(binaryData.data, binaryData.mimeType),
        timestamp: new Date()
      })
    }
  }

  // Look for compliance documents
  if (runData.complianceCheck?.data?.main) {
    const complianceData = runData.complianceCheck.data.main[0]
    if (complianceData?.json?.complianceStatus) {
      outputs.push({
        id: `compliance-${Date.now()}`,
        type: 'text',
        content: JSON.stringify(complianceData.json.complianceStatus, null, 2),
        timestamp: new Date()
      })
    }
  }

  return outputs
}

async function processRetailOperationsOutputs(runData: Record<string, any>, config: any): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Look for visual merchandising concepts
  if (runData.merchandisingConcepts?.data?.main) {
    const conceptData = runData.merchandisingConcepts.data.main[0]
    if (conceptData?.binary) {
      for (const [key, binaryData] of Object.entries(conceptData.binary)) {
        const binary = binaryData as any
        outputs.push({
          id: `merchandising-${Date.now()}-${key}`,
          type: 'image',
          filename: binary.fileName || `merchandising-concept-${key}.jpg`,
          url: await uploadToStorage(binary.data, binary.mimeType),
          timestamp: new Date()
        })
      }
    }
  }

  // Look for setup instructions
  if (runData.setupInstructions?.data?.main) {
    const instructionsData = runData.setupInstructions.data.main[0]
    if (instructionsData?.json?.instructions) {
      outputs.push({
        id: `instructions-${Date.now()}`,
        type: 'text',
        content: instructionsData.json.instructions,
        timestamp: new Date()
      })
    }
  }

  return outputs
}

async function processGenericYayaOutputs(runData: Record<string, any>, config: any): Promise<WorkflowOutput[]> {
  const outputs: WorkflowOutput[] = []

  // Process any workflow outputs generically but with YAYA context
  for (const [nodeName, nodeData] of Object.entries(runData)) {
    if (nodeData?.data?.main) {
      const mainData = nodeData.data.main[0]
      
      // Handle binary outputs with YAYA naming
      if (mainData?.binary) {
        for (const [key, binaryData] of Object.entries(mainData.binary)) {
          const binary = binaryData as any
          const mimeType = binary.mimeType || 'application/octet-stream'
          let type: 'image' | 'video' | 'file' = 'file'
          
          if (mimeType.startsWith('image/')) type = 'image'
          else if (mimeType.startsWith('video/')) type = 'video'
          
          outputs.push({
            id: `yaya-${nodeName}-${Date.now()}-${key}`,
            type,
            filename: binary.fileName || `yaya-output-${key}`,
            url: await uploadToStorage(binary.data, mimeType),
            timestamp: new Date()
          })
        }
      }
      
      // Handle JSON outputs with YAYA formatting
      if (mainData?.json && typeof mainData.json === 'object') {
        const jsonString = JSON.stringify(mainData.json, null, 2)
        if (jsonString.length > 0) {
          outputs.push({
            id: `yaya-${nodeName}-${Date.now()}-data`,
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

async function getYayaExecutionRecord(executionId: string): Promise<any | null> {
  // Get execution record from global storage (mock database)
  if (typeof global !== 'undefined' && (global as any).yayaExecutions) {
    return (global as any).yayaExecutions.get(executionId) || null
  }
  return null
}

async function updateYayaExecutionRecord(executionId: string, updates: Record<string, any>): Promise<void> {
  // Update execution record in global storage (mock database)
  if (typeof global !== 'undefined') {
    if (!(global as any).yayaExecutions) {
      (global as any).yayaExecutions = new Map()
    }
    
    const existingRecord = (global as any).yayaExecutions.get(executionId) || {}
    const updatedRecord = {
      ...existingRecord,
      ...updates,
      lastUpdated: new Date()
    }
    
    (global as any).yayaExecutions.set(executionId, updatedRecord)
    
    // Log YAYA execution update
    console.log('🔄 YAYA Execution Updated:', {
      executionId,
      status: updates.status,
      outputs: updates.outputs?.length || 0,
      timestamp: new Date().toISOString()
    })
  }
}
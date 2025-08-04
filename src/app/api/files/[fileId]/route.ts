import { NextRequest, NextResponse } from 'next/server'

interface FileMetadata {
  id: string
  filename: string
  mimeType: string
  size: number
  uploadedAt: Date
  workflowId?: string
  executionId?: string
  outputId?: string
  tags?: string[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId

    // Get file metadata
    const metadata = await getFileMetadata(fileId)
    if (!metadata) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if request is for download vs preview
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'
    const thumbnail = searchParams.get('thumbnail') === 'true'

    if (thumbnail && metadata.mimeType.startsWith('image/')) {
      // Return thumbnail for images
      const thumbnailData = await generateThumbnail(fileId, metadata)
      return new NextResponse(thumbnailData.buffer, {
        headers: {
          'Content-Type': metadata.mimeType,
          'Content-Length': thumbnailData.size.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // Get file data from storage
    const fileData = await getFileFromStorage(fileId)
    if (!fileData) {
      return NextResponse.json(
        { error: 'File data not found' },
        { status: 404 }
      )
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': metadata.mimeType,
      'Content-Length': metadata.size.toString(),
    }

    if (download) {
      responseHeaders['Content-Disposition'] =
        `attachment; filename="${metadata.filename}"`
    } else {
      responseHeaders['Content-Disposition'] =
        `inline; filename="${metadata.filename}"`
      responseHeaders['Cache-Control'] = 'public, max-age=3600' // 1 hour cache for preview
    }

    return new NextResponse(fileData, {
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('File retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve file', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId

    // Check if file exists
    const metadata = await getFileMetadata(fileId)
    if (!metadata) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from storage
    await deleteFileFromStorage(fileId)

    // Delete metadata
    await deleteFileMetadata(fileId)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file', details: error.message },
      { status: 500 }
    )
  }
}

// POST endpoint for file uploads
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const workflowId = formData.get('workflowId') as string
    const executionId = formData.get('executionId') as string
    const tagsValue = formData.get('tags')
    const tags =
      tagsValue && typeof tagsValue === 'string' ? tagsValue.split(',') : []

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size
    const validation = validateFile(file)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Generate unique file ID
    const fileId = generateFileId(file.name)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Store file in storage
    await storeFileInStorage(fileId, buffer, file.type)

    // Store metadata
    const metadata: FileMetadata = {
      id: fileId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedAt: new Date(),
      workflowId,
      executionId,
      tags,
    }
    await storeFileMetadata(metadata)

    return NextResponse.json(
      {
        success: true,
        fileId,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        url: `/api/files/${fileId}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    )
  }
}

function validateFile(file: File): { isValid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
  ]

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 50MB limit' }
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type ${file.type} not allowed` }
  }

  return { isValid: true }
}

function generateFileId(filename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const extension = filename.split('.').pop()
  return `${timestamp}-${random}.${extension}`
}

async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  // In a real implementation, this would query your database
  // For now, return mock data
  return {
    id: fileId,
    filename: 'example-file.jpg',
    mimeType: 'image/jpeg',
    size: 1024000,
    uploadedAt: new Date(),
    workflowId: 'social-content-gen',
    tags: ['generated', 'social-media'],
  }
}

async function getFileFromStorage(_fileId: string): Promise<Buffer | null> {
  // In a real implementation, this would fetch from your storage service
  // For now, return a small mock image buffer
  return Buffer.from('mock-file-data')
}

async function generateThumbnail(
  _fileId: string,
  _metadata: FileMetadata
): Promise<{ buffer: Buffer; size: number }> {
  // In a real implementation, this would generate thumbnails using Sharp or similar
  // For now, return mock thumbnail
  const mockThumbnail = Buffer.from('mock-thumbnail-data')
  return {
    buffer: mockThumbnail,
    size: mockThumbnail.length,
  }
}

async function storeFileInStorage(
  fileId: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  // In a real implementation, this would upload to your storage service (S3, R2, etc.)
  console.log(`Storing file ${fileId} (${buffer.length} bytes, ${mimeType})`)
}

async function storeFileMetadata(metadata: FileMetadata): Promise<void> {
  // In a real implementation, this would store in your database
  console.log('Storing file metadata:', metadata)
}

async function deleteFileFromStorage(fileId: string): Promise<void> {
  // In a real implementation, this would delete from your storage service
  console.log(`Deleting file from storage: ${fileId}`)
}

async function deleteFileMetadata(fileId: string): Promise<void> {
  // In a real implementation, this would delete from your database
  console.log(`Deleting file metadata: ${fileId}`)
}

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
  }

  const accessToken = authHeader.replace('Bearer ', '')

  try {
    // Query for PDF files that are not in the trash
    // We only see files created by this app because of the drive.file scope
    const query = "mimeType = 'application/pdf' and trashed = false"
    const fields = 'files(id, name, createdTime)'
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('[v0] Drive list error:', error)
      return NextResponse.json({ error: 'Failed to list files' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ files: data.files || [] })
  } catch (error) {
    console.error('[v0] List files error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

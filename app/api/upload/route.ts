import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const accessToken = formData.get('accessToken') as string

    if (!file || !accessToken) {
      return NextResponse.json(
        { error: 'Missing file or access token' },
        { status: 400 }
      )
    }

    console.log('[v0] Uploading file:', file.name, 'Size:', file.size)

    const metadata = {
      name: file.name,
      mimeType: file.type,
    }

    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelim = `\r\n--${boundary}--`

    const fileBuffer = await file.arrayBuffer()

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${file.type}\r\n\r\n` +
      Buffer.from(fileBuffer).toString('binary') +
      closeDelim

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    )

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('[v0] Google Drive error:', errorText)
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: uploadResponse.status }
      )
    }

    const uploadData = await uploadResponse.json()
    const fileId = uploadData.id

    console.log('[v0] File uploaded, ID:', fileId)

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    })

    const shareableLink = `https://drive.google.com/file/d/${fileId}/view`

    return NextResponse.json({
      success: true,
      shareableLink,
      fileId,
    })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

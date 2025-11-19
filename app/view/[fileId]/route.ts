import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  // Redirect to the Google Drive viewer
  return NextResponse.redirect(`https://drive.google.com/file/d/${fileId}/view`)
}

import { NextRequest, NextResponse } from 'next/server'
import { parseUploadedFile, extractTextFromFile } from '@/lib/text-utils'
import { authenticateRequest } from '@/lib/api-auth'

// ─── POST /api/upload ────────────────────────────────────────────────
// Upload a text file (.txt, .md, .json, .csv, .log) and extract its content.
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth) return auth
  try {
    const formData = await req.formData()
    const result = await parseUploadedFile(formData)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No file provided or invalid file' },
        { status: 400 },
      )
    }

    const { buffer, filename } = result
    const extracted = extractTextFromFile(buffer, filename)

    return NextResponse.json({
      success: true,
      text: extracted.text,
      filename: extracted.filename,
      charCount: extracted.charCount,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    const status = message.includes('Unsupported') || message.includes('too large')
      ? 400
      : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
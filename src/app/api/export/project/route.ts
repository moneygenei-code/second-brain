import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { execSync } from 'child_process'
import { existsSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'

// ─── GET /api/export/project ────────────────────────────────────────
// Returns a .zip of just the source code — no DB, no logs, no node_modules.
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (auth) return auth

  try {
    const projectRoot = process.cwd()
    const zipPath = join(projectRoot, 'second-brain-source.zip')

    // Remove any previous zip
    if (existsSync(zipPath)) unlinkSync(zipPath)

    // zip excludes: db/, tool-results/, node_modules/, .next/, upload/,
    // worklog.md, custom.db, and the zip itself
    execSync(
      `cd "${projectRoot}" && zip -r second-brain-source.zip ` +
      `src/ prisma/ public/ mini-services/ examples/ ` +
      `package.json package-lock.json tsconfig.json next.config.ts tailwind.config.ts ` +
      `postcss.config.mjs eslint.config.mjs components.json Caddyfile ` +
      `-x "db/*" "tool-results/*" "node_modules/*" ".next/*" "upload/*" ` +
      `"*.db" "worklog.md" "second-brain-source.zip"`,
      { stdio: 'pipe' }
    )

    const zipBuffer = readFileSync(zipPath)

    // Clean up
    if (existsSync(zipPath)) unlinkSync(zipPath)

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="second-brain-source-${new Date().toISOString().split('T')[0]}.zip"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
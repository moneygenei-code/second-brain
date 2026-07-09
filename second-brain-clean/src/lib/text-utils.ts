// ─── Second Brain — Text Extraction Utilities ───────────────────────

export interface ExtractedText {
  text: string
  filename: string
  charCount: number
}

/**
 * Parse a single CSV row into fields, respecting double-quote escaping.
 * Handles: "field with, comma", "field with ""escaped"" quotes", plain fields.
 */
function parseCsvRow(row: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++ // skip next quote
        } else {
          // End of quoted field
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

/**
 * Extract text content from uploaded files.
 * Supports: .txt, .md, .json, .csv, .log
 */
export function extractTextFromFile(buffer: ArrayBuffer, filename: string): ExtractedText {
  const decoder = new TextDecoder('utf-8')
  const raw = decoder.decode(buffer)
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  let text = raw

  switch (ext) {
    case 'json': {
      try {
        const parsed = JSON.parse(raw)
        // If it's an array of objects, stringify each entry
        if (Array.isArray(parsed)) {
          text = parsed
            .map((item) => {
              if (typeof item === 'string') return item
              return Object.entries(item)
                .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                .join('\n')
            })
            .join('\n\n')
        } else if (typeof parsed === 'object') {
          text = Object.entries(parsed)
            .map(([k, v]) => {
              if (Array.isArray(v)) return `${k}:\n${v.map((i) => `  - ${typeof i === 'object' ? JSON.stringify(i) : String(i)}`).join('\n')}`
              return `${k}: ${typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}`
            })
            .join('\n')
        }
      } catch {
        // Not valid JSON, return raw text
      }
      break
    }
    case 'csv': {
      // Parse CSV into readable text (quote-aware)
      const rows = raw.split('\n').filter((r) => r.trim())
      if (rows.length > 1) {
        const headers = parseCsvRow(rows[0]).map((h) => h.trim())
        text = rows
          .slice(1)
          .map((row, idx) => {
            const values = parseCsvRow(row).map((v) => v.trim())
            return `[${idx + 1}] ${headers.map((h, i) => `${h}: ${values[i] || ''}`).join(' | ')}`
          })
          .join('\n')
      }
      break
    }
    default:
      // .txt, .md, .log — use as-is
      break
  }

  return {
    text: text.trim(),
    filename,
    charCount: text.length,
  }
}

/**
 * Parse uploaded file from a FormData request.
 */
export async function parseUploadedFile(formData: FormData): Promise<{ buffer: ArrayBuffer; filename: string } | null> {
  const file = formData.get('file') as File | null
  if (!file) return null

  // Validate file type
  const allowedExts = ['txt', 'md', 'json', 'csv', 'log']
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!allowedExts.includes(ext)) {
    throw new Error(`Unsupported file type: .${ext}. Supported: .${allowedExts.join(', ')}`)
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum size: 5MB')
  }

  return {
    buffer: await file.arrayBuffer(),
    filename: file.name,
  }
}
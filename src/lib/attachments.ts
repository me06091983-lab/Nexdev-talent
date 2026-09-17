import mammoth from 'mammoth'
import ExcelJS from 'exceljs'

export type AttachmentBlock =
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string }; title: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'text'; text: string }

const IMAGE_MEDIA_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

export async function buildAttachmentBlock(
  bytes: ArrayBuffer,
  fileName: string
): Promise<{ block: AttachmentBlock } | { error: string }> {
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    return { error: 'Fișierul e prea mare (limită 25MB).' }
  }

  const ext = fileName.toLowerCase().split('.').pop() ?? ''

  if (ext === 'pdf') {
    const base64 = Buffer.from(bytes).toString('base64')
    return { block: { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 }, title: fileName } }
  }

  if (IMAGE_MEDIA_TYPES[ext]) {
    const base64 = Buffer.from(bytes).toString('base64')
    return { block: { type: 'image', source: { type: 'base64', media_type: IMAGE_MEDIA_TYPES[ext], data: base64 } } }
  }

  if (ext === 'docx' || ext === 'doc') {
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
      if (!result.value.trim()) return { error: 'Fișierul Word pare gol sau are conținut protejat.' }
      return { block: { type: 'text', text: `[Conținut extras din ${fileName}]\n\n${result.value}` } }
    } catch {
      return { error: 'Nu am putut citi acest fișier Word.' }
    }
  }

  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer)
      const parts: string[] = []
      workbook.eachSheet(sheet => {
        const rows: string[] = []
        sheet.eachRow(row => {
          const cells = (row.values as unknown[]).slice(1).map(v => (v == null ? '' : String(v)))
          rows.push(cells.join(','))
        })
        parts.push(`--- Sheet: ${sheet.name} ---\n${rows.join('\n')}`)
      })
      if (parts.length === 0) return { error: 'Fișierul Excel pare gol.' }
      return { block: { type: 'text', text: `[Conținut extras din ${fileName}]\n\n${parts.join('\n\n')}` } }
    } catch {
      return { error: 'Nu am putut citi acest fișier Excel.' }
    }
  }

  if (ext === 'csv' || ext === 'txt' || ext === 'md' || ext === 'json') {
    const text = Buffer.from(bytes).toString('utf-8')
    return { block: { type: 'text', text: `[Conținut din ${fileName}]\n\n${text}` } }
  }

  return { error: `Tip de fișier neacceptat (.${ext}). Încearcă PDF, Word, Excel, imagine (PNG/JPG) sau text.` }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('cv') as File
  if (!file) return NextResponse.json({ error: 'Niciun fișier primit.' }, { status: 400 })

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isDocx = file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')
  if (!isPdf && !isDocx) {
    return NextResponse.json({ error: 'Tip fișier neacceptat. Folosește PDF sau DOCX.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const bytes = await file.arrayBuffer()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Upload eșuat: ${uploadError.message}` }, { status: 500 })
  }

  return NextResponse.json({ path, name: file.name })
}

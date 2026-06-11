import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('cv_file_path')
    .eq('id', id)
    .single()

  if (!candidate?.cv_file_path) {
    return NextResponse.json({ error: 'CV nu a fost încărcat pentru acest candidat.' }, { status: 404 })
  }

  const { data: signed } = await admin.storage
    .from('cvs')
    .createSignedUrl(candidate.cv_file_path, 3600)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Nu s-a putut genera URL-ul CV-ului.' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl, path: candidate.cv_file_path })
}

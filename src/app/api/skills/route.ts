import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, category')
    .order('category')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { name, category } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('skills')
    .select()
    .ilike('name', name.trim())
    .maybeSingle()
  if (existing) return NextResponse.json(existing)

  const { data, error } = await supabase
    .from('skills')
    .insert({ name: name.trim(), category: category || 'General' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

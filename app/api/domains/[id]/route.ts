import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: domain } = await supabase.from('dem_domains').select('*').eq('id', id).single()
  const { data: snapshots } = await supabase
    .from('dem_snapshots')
    .select('*')
    .eq('domain_id', id)
    .order('version', { ascending: false })

  return Response.json({ domain, snapshots: snapshots ?? [] })
}

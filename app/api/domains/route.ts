import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: domains } = await supabase
    .from('dem_domains')
    .select('*')
    .order('updated_at', { ascending: false })

  if (!domains?.length) return Response.json([])

  const { data: snapshots } = await supabase
    .from('dem_snapshots')
    .select('*')
    .in('domain_id', domains.map(d => d.id))
    .order('version', { ascending: false })

  type Snap = { domain_id: string; [k: string]: unknown }
  const latestByDomain = new Map<string, Snap>()
  for (const s of (snapshots ?? []) as Snap[]) {
    if (!latestByDomain.has(s.domain_id)) latestByDomain.set(s.domain_id, s)
  }

  return Response.json(domains.map(d => ({
    ...d,
    latest_snapshot: latestByDomain.get(d.id) ?? null,
  })))
}

export async function POST(req: Request) {
  const { name } = await req.json()
  const { data } = await supabase.from('dem_domains').insert({ name }).select().single()
  return Response.json(data)
}

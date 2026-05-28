import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a domain entity modeller grounded in David Deutsch's epistemology from "The Fabric of Reality" and "The Beginning of Infinity".

Your core principle: An entity earns its place in a domain model only if it appears with autonomous complexity in the best explanation of the domain. Removing it must leave a gap that cannot be papered over by other entities.

The Deutsch test for each proposed entity:
1. Does it have its own lifecycle and state transitions independent of other entities?
2. Does it receive events that change its state? (write model) Or is it computed on demand? (read model)
3. If you remove it from the explanation, does the explanation break — or can it absorb the removal cheaply?
4. Is it a folk concept (feels real because we intuit it, but dissolves into computations over other entities)?

Your job for each domain:
1. Deeply understand the domain from the user's input and your own knowledge
2. Produce a BEST EXPLANATION — testable (state what would falsify it), hard-to-vary (every clause does load-bearing work), abstract (captures essential structure not implementation)
3. Derive entities strictly from the explanation — entities are consequences, not design decisions
4. For each entity: pass or reject the Deutsch test explicitly
5. Include REJECTED entities (read_model, folk_concept) in the output — they are instructive

Return ONLY valid JSON with this exact structure, no markdown fences:
{
  "domain_name": "Inferred name for this domain",
  "explanation": "The best explanation paragraph",
  "entities": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "verdict": "first_class | read_model | folk_concept | borderline",
      "clause_traced": "The exact clause in the explanation that requires this entity to exist",
      "lifecycle": ["state_one", "state_two"],
      "why_real": "Why this passes or fails the Deutsch test",
      "removed_breaks": "What specifically breaks in the explanation if this entity is removed"
    }
  ],
  "relationships": [
    {
      "from": "entity_id",
      "to": "entity_id",
      "label": "verb phrase"
    }
  ]
}

Only include first_class and borderline entities in relationships.
Be rigorous. Reject folk concepts and read models explicitly. The best domain models have fewer, sharper entities.`

async function fetchUrl(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const text = await r.text()
    // Strip HTML tags roughly
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000)
  } catch {
    return `[Could not fetch ${url}]`
  }
}

export async function POST(req: Request) {
  try {
  const { user_input, urls = [], domain_id, previous_snapshot, pushback } = await req.json()

  // Fetch URL content if provided
  const urlContents: string[] = []
  for (const url of urls) {
    if (url.trim()) urlContents.push(`--- Content from ${url} ---\n${await fetchUrl(url)}`)
  }

  const userMessage = pushback
    ? `Previous explanation:\n${previous_snapshot.explanation}\n\nPrevious entities:\n${JSON.stringify(previous_snapshot.entities, null, 2)}\n\nUser pushback: ${pushback}\n\nRevise the domain model based on this feedback. Return the full updated JSON.`
    : `Domain input:\n${user_input}${urlContents.length ? '\n\n' + urlContents.join('\n\n') : ''}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = (response.content[0] as { text: string }).text.trim()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : null
    if (!parsed) return Response.json({ error: 'Failed to parse model output' }, { status: 500 })
  }

  // Determine next version number
  let version = 1
  if (domain_id) {
    const { data: existing } = await supabase
      .from('dem_snapshots')
      .select('version')
      .eq('domain_id', domain_id)
      .order('version', { ascending: false })
      .limit(1)
    version = existing?.[0] ? existing[0].version + 1 : 1
  }

  // Upsert domain
  let finalDomainId = domain_id
  if (!finalDomainId) {
    const { data: domain } = await supabase
      .from('dem_domains')
      .insert({ name: parsed.domain_name })
      .select()
      .single()
    finalDomainId = domain?.id
  } else {
    await supabase.from('dem_domains').update({
      name: parsed.domain_name,
      updated_at: new Date().toISOString(),
    }).eq('id', finalDomainId)
  }

  // Save snapshot
  const { data: snapshot } = await supabase
    .from('dem_snapshots')
    .insert({
      domain_id: finalDomainId,
      user_input: pushback ?? user_input,
      explanation: parsed.explanation,
      domain_name: parsed.domain_name,
      entities: parsed.entities,
      relationships: parsed.relationships,
      version,
    })
    .select()
    .single()

  return Response.json({ domain_id: finalDomainId, snapshot })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[analyze]', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}

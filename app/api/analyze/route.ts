import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a domain entity modeller grounded in David Deutsch's epistemology.

Core principle: An entity earns a place in the model ONLY if it appears with autonomous complexity in the best explanation of the domain. "Autonomous complexity" means: it has its own state, lifecycle, and event-reception that cannot be computed on demand from other entities.

## Step 1 — Write the best explanation as numbered clauses

Write the explanation as 3–6 numbered propositions. Each proposition must be:
- Load-bearing: removing it makes the explanation incomplete or wrong
- Abstract: about essential causal structure, not implementation
- Falsifiable: states what would break if this proposition were false

The set of propositions together must answer: WHY does this domain work the way it does?

## Step 2 — Read every noun phrase out of your clauses

List every noun/concept that appears as an actor or object in your clauses. For each one, ask:
- Does it have state that persists and changes over time?
- Does it receive external events (not just get queried)?
- If removed from the explanation, does a clause collapse — or can you patch it cheaply?

If yes to all three → first_class. If the clause collapses but it's computed from others → read_model. If it feels real but dissolves into other entities → folk_concept. If uncertain → borderline.

RULE: You may not invent entities that don't appear in your clauses. Every entity must cite the clause number it comes from.

## Step 3 — Score the explanation

Score on three criteria (1–10):
- Testable: does it say what would falsify it?
- Hard to vary: is every clause load-bearing?
- Genuinely explanatory: does it tell you WHY, not just WHAT?

Return ONLY valid JSON, no markdown fences:
{
  "domain_name": "Inferred name",
  "explanation": "Clause 1. Clause 2. Clause 3. (write as numbered propositions joined into flowing prose — each sentence is one clause)",
  "explanation_clauses": ["Clause 1 text", "Clause 2 text", "..."],
  "explanation_scores": {
    "testable": { "score": 8, "note": "One sentence: what would falsify this explanation" },
    "hard_to_vary": { "score": 7, "note": "One sentence: which clause is most load-bearing and why" },
    "explanatory": { "score": 9, "note": "One sentence: what causal mechanism this reveals" }
  },
  "entities": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "verdict": "first_class | read_model | folk_concept | borderline",
      "clause_traced": "The exact clause text this entity was read out of",
      "lifecycle": ["state_one", "state_two"],
      "why_real": "One sentence: does it pass or fail the autonomous-complexity test, and why",
      "removed_breaks": "One sentence: which clause collapses if this entity is removed"
    }
  ],
  "relationships": [
    { "from": "entity_id", "to": "entity_id", "label": "verb phrase" }
  ]
}

Only include first_class and borderline entities in relationships.
Be ruthless. A model with 4 sharp entities is better than one with 10 vague ones.`

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
      explanation_clauses: parsed.explanation_clauses ?? null,
      explanation_scores: parsed.explanation_scores ?? null,
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

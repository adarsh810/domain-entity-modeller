export type EntityVerdict = 'first_class' | 'read_model' | 'folk_concept' | 'borderline'

export interface DomainEntity {
  id: string
  name: string
  verdict: EntityVerdict
  clause_traced: string
  lifecycle: string[]
  why_real: string
  removed_breaks: string
}

export interface EntityRelationship {
  from: string
  to: string
  label: string
}

export interface DomainSnapshot {
  id: string
  domain_id: string
  user_input: string
  explanation: string
  domain_name: string
  entities: DomainEntity[]
  relationships: EntityRelationship[]
  version: number
  created_at: string
}

export interface Domain {
  id: string
  name: string
  created_at: string
  updated_at: string
  latest_snapshot?: DomainSnapshot
}

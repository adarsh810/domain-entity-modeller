'use client'

import { DomainEntity, EntityVerdict } from '@/types'

const VERDICT_CONFIG: Record<EntityVerdict, { label: string; color: string }> = {
  first_class: { label: 'First Class Entity', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  borderline:  { label: 'Borderline Entity',  color: 'text-amber-700 bg-amber-50 border-amber-200' },
  read_model:  { label: 'Read Model (rejected)', color: 'text-gray-500 bg-gray-50 border-gray-200' },
  folk_concept:{ label: 'Folk Concept (rejected)', color: 'text-red-600 bg-red-50 border-red-200' },
}

interface Props {
  entity: DomainEntity | null
  onClose: () => void
}

export default function EntityDrawer({ entity, onClose }: Props) {
  if (!entity) return null
  const cfg = VERDICT_CONFIG[entity.verdict]

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">{entity.name}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        <Section title="Traces to clause">
          <p className="text-sm text-gray-600 italic">"{entity.clause_traced}"</p>
        </Section>

        <Section title="Why it passes (or fails) the Deutsch test">
          <p className="text-sm text-gray-600">{entity.why_real}</p>
        </Section>

        <Section title="If removed, this breaks">
          <p className="text-sm text-gray-600">{entity.removed_breaks}</p>
        </Section>

        {entity.lifecycle?.length > 0 && (
          <Section title="Lifecycle states">
            <div className="flex flex-wrap gap-1.5">
              {entity.lifecycle.map((s, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{title}</p>
      {children}
    </div>
  )
}

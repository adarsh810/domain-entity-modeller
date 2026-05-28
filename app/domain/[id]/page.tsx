'use client'

import { useEffect, useState, useCallback, use } from 'react'
import dynamic from 'next/dynamic'
import EntityDrawer from '@/components/EntityDrawer'
import { DomainEntity, DomainSnapshot } from '@/types'

const EntityGraph = dynamic(() => import('@/components/EntityGraph'), { ssr: false })

export default function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [snapshots, setSnapshots] = useState<DomainSnapshot[]>([])
  const [activeSnapshot, setActiveSnapshot] = useState<DomainSnapshot | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<DomainEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushback, setPushback] = useState('')
  const [refining, setRefining] = useState(false)
  const [tab, setTab] = useState<'graph' | 'explanation'>('graph')

  useEffect(() => {
    fetch(`/api/domains/${id}`)
      .then(r => r.json())
      .then(d => {
        setSnapshots(d.snapshots ?? [])
        setActiveSnapshot(d.snapshots?.[0] ?? null)
        setLoading(false)
      })
  }, [id])

  const handleSelect = useCallback((entity: DomainEntity) => {
    setSelectedEntity(entity)
  }, [])

  const handlePushback = async () => {
    if (!pushback.trim() || !activeSnapshot) return
    setRefining(true)
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_input: activeSnapshot.user_input,
        domain_id: id,
        previous_snapshot: activeSnapshot,
        pushback: pushback.trim(),
      }),
    })
    const data = await r.json()
    if (data.snapshot) {
      setSnapshots(prev => [data.snapshot, ...prev])
      setActiveSnapshot(data.snapshot)
      setPushback('')
      setSelectedEntity(null)
    }
    setRefining(false)
  }

  const firstClass = activeSnapshot?.entities.filter(e => e.verdict === 'first_class') ?? []
  const borderline  = activeSnapshot?.entities.filter(e => e.verdict === 'borderline') ?? []
  const rejected    = activeSnapshot?.entities.filter(e => e.verdict === 'read_model' || e.verdict === 'folk_concept') ?? []

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading…</div>
  if (!activeSnapshot) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">No data found.</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Domains</a>
          <h1 className="font-bold text-gray-900">{activeSnapshot.domain_name}</h1>
          {snapshots.length > 1 && (
            <select
              value={activeSnapshot.id}
              onChange={e => setActiveSnapshot(snapshots.find(s => s.id === e.target.value) ?? null)}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
            >
              {snapshots.map(s => (
                <option key={s.id} value={s.id}>v{s.version} — {new Date(s.created_at).toLocaleString()}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="text-indigo-600 font-medium">{firstClass.length} first class</span>
          <span className="text-amber-600">{borderline.length} borderline</span>
          <span className="text-gray-400">{rejected.length} rejected</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-6 flex gap-4 shrink-0">
        {(['graph', 'explanation'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm py-2.5 border-b-2 transition-colors capitalize ${
              tab === t ? 'border-indigo-500 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'graph' ? 'Entity Graph' : 'Best Explanation'}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {tab === 'graph' ? (
          <div className="flex-1 relative">
            <EntityGraph
              entities={activeSnapshot.entities}
              relationships={activeSnapshot.relationships}
              onSelect={handleSelect}
            />
            <EntityDrawer entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
            <div className="bg-white rounded-2xl border border-gray-200 p-7 mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Best Explanation</p>
              <p className="text-gray-800 leading-relaxed">{activeSnapshot.explanation}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Derived Entities</p>
              {activeSnapshot.entities.map(e => (
                <button
                  key={e.id}
                  onClick={() => { setTab('graph'); setSelectedEntity(e) }}
                  className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 text-sm">{e.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      e.verdict === 'first_class' ? 'bg-indigo-100 text-indigo-700' :
                      e.verdict === 'borderline'  ? 'bg-amber-100 text-amber-700' :
                      e.verdict === 'read_model'  ? 'bg-gray-100 text-gray-500' :
                                                    'bg-red-100 text-red-500'
                    }`}>{e.verdict.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{e.why_real}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pushback chat */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 shrink-0">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={pushback}
            onChange={e => setPushback(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePushback()}
            placeholder='Push back or refine… e.g. "Is Wealth really not an entity?" or "Add the concept of a Mandate"'
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handlePushback}
            disabled={!pushback.trim() || refining}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40 whitespace-nowrap"
          >
            {refining ? 'Refining…' : 'Refine ↵'}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1.5">Each refinement creates a new versioned snapshot you can compare.</p>
      </div>
    </div>
  )
}

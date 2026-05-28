'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Domain } from '@/types'

export default function Home() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/domains')
      .then(r => r.json())
      .then(d => { setDomains(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-16">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Domain Entity Modeller</h1>
            <p className="text-gray-500 mt-2 text-sm max-w-md">
              Describe any domain. Claude derives a hard-to-vary explanation and surfaces the entities that earn their place in it — grounded in Deutsch's criterion of reality.
            </p>
          </div>
          <Link
            href="/domain/new"
            className="shrink-0 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + New Domain
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-16">Loading…</p>
        ) : domains.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">⬡</p>
            <p className="text-gray-500 text-sm mb-6">No domains yet. Model your first one.</p>
            <Link href="/domain/new" className="text-indigo-600 text-sm hover:underline">
              Analyse a domain →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map(d => {
              const snap = d.latest_snapshot
              const firstClass = snap?.entities.filter(e => e.verdict === 'first_class').length ?? 0
              const borderline  = snap?.entities.filter(e => e.verdict === 'borderline').length ?? 0
              const rejected    = snap?.entities.filter(e => e.verdict === 'read_model' || e.verdict === 'folk_concept').length ?? 0
              return (
                <Link
                  key={d.id}
                  href={`/domain/${d.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900">{d.name}</h2>
                      {snap?.explanation && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2 max-w-xl">{snap.explanation}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-4">{new Date(d.updated_at).toLocaleDateString()}</span>
                  </div>
                  {snap && (
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <span className="text-indigo-600 font-medium">{firstClass} first class</span>
                      {borderline > 0 && <span className="text-amber-600">{borderline} borderline</span>}
                      <span className="text-gray-400">{rejected} rejected</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

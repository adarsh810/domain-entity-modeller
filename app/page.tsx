'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Domain } from '@/types'

const PAGE_SIZE = 5

export default function Home() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetch('/api/domains')
      .then(r => r.json())
      .then(d => { setDomains(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return domains
    const q = query.toLowerCase()
    return domains.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.latest_snapshot?.explanation?.toLowerCase().includes(q)
    )
  }, [domains, query])

  // Reset to page 0 when search changes
  useEffect(() => { setPage(0) }, [query])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Domain Entity Modeller</h1>
            <p className="text-gray-500 mt-2 text-sm max-w-md">
              Describe any domain. Claude derives a hard-to-vary explanation and surfaces the entities that earn their place in it.
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
          <>
            {/* Search */}
            <div className="relative mb-5">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search domains…"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
              )}
            </div>

            {/* Results count */}
            {query && (
              <p className="text-xs text-gray-400 mb-3">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{query}"</p>
            )}

            {/* List */}
            {paginated.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No domains match "{query}"</p>
            ) : (
              <div className="space-y-3">
                {paginated.map(d => {
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="text-xs text-gray-400">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

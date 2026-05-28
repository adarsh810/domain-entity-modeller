'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewDomain() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [urls, setUrls] = useState(['', ''])
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const addUrl = () => setUrls(prev => [...prev, ''])
  const updateUrl = (i: number, v: string) => setUrls(prev => prev.map((u, idx) => idx === i ? v : u))
  const removeUrl = (i: number) => setUrls(prev => prev.filter((_, idx) => idx !== i))

  const handleAnalyze = async () => {
    if (!input.trim()) return
    setAnalyzing(true)
    setError('')
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: input, urls: urls.filter(u => u.trim()) }),
      })
      const data = await r.json()
      if (data.domain_id) router.push(`/domain/${data.domain_id}`)
      else throw new Error(data.error ?? 'Unknown error')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 pt-16 pb-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <a href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Domains</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Model a Domain</h1>
          <p className="text-gray-500 text-sm mt-1">
            Describe any domain — a product, company, system, or concept. Claude will derive its entity model using Deutsch's criterion of reality.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Describe the domain
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. FundsIndia is a fintech platform for Indian retail investors. They do mutual fund distribution with AI-powered advisory. The thesis is that they compound intelligence about Indian investing behaviour over time…"
              rows={6}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">Be as vague or specific as you like. Claude will research further and produce a hard-to-vary explanation.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Reference URLs <span className="text-gray-400 font-normal normal-case">(optional — public pages, docs, articles)</span>
            </label>
            <div className="space-y-2">
              {urls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={e => updateUrl(i, e.target.value)}
                    placeholder="https://…"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {urls.length > 1 && (
                    <button onClick={() => removeUrl(i)} className="text-gray-300 hover:text-red-400 px-2 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
              <button onClick={addUrl} className="text-xs text-gray-400 hover:text-gray-600">+ add URL</button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleAnalyze}
            disabled={!input.trim() || analyzing}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin text-base">⟳</span>
                Claude is modelling the domain…
              </span>
            ) : 'Analyse Domain →'}
          </button>
          {analyzing && (
            <p className="text-xs text-gray-400 text-center -mt-2">
              Building best explanation + deriving entities. Takes ~20 seconds.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

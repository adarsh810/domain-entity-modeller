import { createClient } from '@supabase/supabase-js'

// Use SUPABASE_URL/KEY (server-only, not baked at build time) with NEXT_PUBLIC_ as fallback
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(
  url?.startsWith('https://') ? url : 'https://placeholder.supabase.co',
  key?.startsWith('eyJ') ? key : 'placeholder'
)

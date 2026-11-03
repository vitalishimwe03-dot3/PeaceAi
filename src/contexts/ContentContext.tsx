import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { listContentBlocks } from '@/lib/repository'
import type { ContentBlock } from '@/types/domain'

interface ContentContextValue {
  blocks: ContentBlock[]
  loading: boolean
  get: (key: string, fallback: string) => string
  refresh: () => Promise<void>
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setBlocks(await listContentBlocks())
    } catch {
      setBlocks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<ContentContextValue>(() => {
    const map = new Map(blocks.map((block) => [block.key, block.value]))
    return {
      blocks,
      loading,
      get: (key, fallback) => {
        const stored = map.get(key)
        return stored && stored.trim() ? stored : fallback
      },
      refresh,
    }
  }, [blocks, loading, refresh])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const context = useContext(ContentContext)
  if (!context) throw new Error('useContent must be used within ContentProvider.')
  return context
}

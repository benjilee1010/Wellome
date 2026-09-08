import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { lightColors, darkColors, type Colors } from '../lib/theme'

type Mode = 'light' | 'dark'

interface ThemeContextType {
  mode: Mode
  c: Colors
  setMode: (m: Mode) => void
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  c: lightColors,
  setMode: () => {},
})

function loadMode(): Mode {
  try {
    const saved = localStorage.getItem('wellome_theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(loadMode)
  const c = mode === 'dark' ? darkColors : lightColors

  useEffect(() => {
    try { localStorage.setItem('wellome_theme', mode) } catch { /* ignore */ }
    document.body.style.background = c.bg
    document.body.style.color = c.text
    const root = document.documentElement.style
    root.setProperty('--bg', c.bg)
    root.setProperty('--surface', c.surface)
    root.setProperty('--text', c.text)
  }, [mode, c])

  return (
    <ThemeContext.Provider value={{ mode, c, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

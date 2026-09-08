export const lightColors = {
  bg: '#f5f5fa',
  surface: '#ffffff',
  surfaceHover: '#f0f0f8',
  border: '#ddddf0',
  borderStrong: '#b8b8e8',
  text: '#1a1a2e',
  textMuted: '#5a5a8a',
  textDim: '#9898c0',
  accent: '#6366f1',
  accentHover: '#4f52d4',
  accentText: '#4f52d4',
  accentBg: '#ededfc',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  success: '#16a34a',
  successBg: '#f0fdf4',
}

export const darkColors = {
  bg: '#0e0e16',
  surface: '#13131f',
  surfaceHover: '#1c1c2c',
  border: '#242438',
  borderStrong: '#35354f',
  text: '#e2e2ee',
  textMuted: '#9a9ab8',
  textDim: '#6b6b8a',
  accent: '#6366f1',
  accentHover: '#7c7ff2',
  accentText: '#a5a8ff',
  accentBg: '#23234a',
  danger: '#f87171',
  dangerBg: '#3a1a1a',
  dangerBorder: '#5c2626',
  success: '#4ade80',
  successBg: '#12301c',
}

export type Colors = typeof lightColors

export function cardStyle(c: Colors) {
  return {
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: '14px',
    padding: '20px',
  }
}

export function inputStyleFor(c: Colors) {
  return {
    width: '100%',
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: '8px',
    padding: '9px 13px',
    color: c.text,
    fontSize: '14px',
    outline: 'none',
  }
}

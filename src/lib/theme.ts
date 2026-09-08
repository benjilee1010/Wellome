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
  bg: '#19191c',
  surface: '#212124',
  surfaceHover: '#29292d',
  border: '#35353a',
  borderStrong: '#46464c',
  text: '#e8e8ea',
  textMuted: '#a3a3ab',
  textDim: '#77777f',
  accent: '#6d6ff0',
  accentHover: '#7f81f2',
  accentText: '#a3a5f5',
  accentBg: '#26263a',
  danger: '#e8746f',
  dangerBg: '#332525',
  dangerBorder: '#4d3232',
  success: '#4cbf7d',
  successBg: '#1e2b23',
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

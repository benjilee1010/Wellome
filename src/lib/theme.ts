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
  bg: '#2c2c30',
  surface: '#35353a',
  surfaceHover: '#3e3e44',
  border: '#4a4a51',
  borderStrong: '#5c5c64',
  text: '#e6e6e8',
  textMuted: '#b3b3ba',
  textDim: '#8c8c94',
  accent: '#7b7df0',
  accentHover: '#8d8ff2',
  accentText: '#b0b2f5',
  accentBg: '#3f3f56',
  danger: '#e8827d',
  dangerBg: '#463534',
  dangerBorder: '#5e4443',
  success: '#5bc98d',
  successBg: '#2c3d33',
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

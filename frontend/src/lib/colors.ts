// Color scheme types and defaults for the prompt builder

export interface ColorScheme {
    primary: string
    secondary: string
    accent: string
    background: string
    foreground: string
}

// Default color schemes by theme
export const DEFAULT_COLORS: Record<string, ColorScheme> = {
    light: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        background: '#ffffff',
        foreground: '#0a0a0a',
    },
    dark: {
        primary: '#60a5fa',
        secondary: '#a78bfa',
        accent: '#f472b6',
        background: '#0a0a0a',
        foreground: '#ffffff',
    },
    auto: {
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#f59e0b',
        background: '#ffffff',
        foreground: '#1f2937',
    },
}

// Color presets by brand feel
export const BRAND_COLOR_PRESETS: Record<string, Partial<ColorScheme>> = {
    modern: { primary: '#3b82f6', secondary: '#8b5cf6', accent: '#ec4899' },
    minimal: { primary: '#1f2937', secondary: '#6b7280', accent: '#3b82f6' },
    professional: { primary: '#1e40af', secondary: '#0369a1', accent: '#0891b2' },
    corporate: { primary: '#1e3a5f', secondary: '#3d5a80', accent: '#ee6c4d' },
    colorful: { primary: '#f43f5e', secondary: '#8b5cf6', accent: '#06b6d4' },
    monochrome: { primary: '#18181b', secondary: '#52525b', accent: '#a1a1aa' },
    playful: { primary: '#f97316', secondary: '#eab308', accent: '#22c55e' },
    elegant: { primary: '#78350f', secondary: '#92400e', accent: '#d97706' },
}

import { useSyncExternalStore } from "react"

export type Theme = "light" | "dark" | "system"

const key = "ytiq-theme"
const systemDark = window.matchMedia("(prefers-color-scheme: dark)")
const listeners = new Set<() => void>()

function currentTheme(): Theme {
  try {
    return (localStorage.getItem(key) as Theme | null) || "system"
  } catch {
    return "system"
  }
}

function applyTheme() {
  const theme = currentTheme()
  document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && systemDark.matches))
  listeners.forEach((notify) => notify())
}

systemDark.addEventListener("change", applyTheme)
applyTheme()

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(key, theme)
  } catch {}
  applyTheme()
}

export function useTheme() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    currentTheme,
  )
}

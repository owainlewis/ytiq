import { useSyncExternalStore } from "react"

export type Theme = "light" | "dark" | "system"

const KEY = "ytiq-theme"
const media = window.matchMedia("(prefers-color-scheme: dark)")
const listeners = new Set<() => void>()

function stored(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme) || "system"
  } catch {
    return "system"
  }
}

function apply() {
  const t = stored()
  const dark = t === "dark" || (t === "system" && media.matches)
  document.documentElement.classList.toggle("dark", dark)
  listeners.forEach((l) => l())
}

media.addEventListener("change", apply)
apply()

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* storage blocked */
  }
  apply()
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    stored,
  )
}

export const isDark = () => document.documentElement.classList.contains("dark")

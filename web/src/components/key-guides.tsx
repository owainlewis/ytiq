import type { ReactNode } from "react"
import { ExternalLink } from "lucide-react"

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline underline-offset-2">
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted-foreground marker:text-muted-foreground/70">{children}</ol>
}

export function YouTubeKeyGuide() {
  return (
    <Steps>
      <li>
        <Link href="https://console.cloud.google.com/projectcreate">Create a Google Cloud project</Link>. Any name works, like
        "ytiq". Sign in with your Google account if asked.
      </li>
      <li>
        Open <Link href="https://console.cloud.google.com/apis/library/youtube.googleapis.com">YouTube Data API v3</Link>, check
        your new project is selected at the top, and press <b>Enable</b>.
      </li>
      <li>
        Go to <Link href="https://console.cloud.google.com/apis/credentials">Credentials</Link>, press <b>Create credentials</b>{" "}
        &gt; <b>API key</b>, and copy the key.
      </li>
    </Steps>
  )
}

export function SupadataKeyGuide() {
  return (
    <p className="text-sm text-muted-foreground">
      Fetches the video's transcript. <Link href="https://dash.supadata.ai">Sign up at Supadata</Link> and copy the key from
      the dashboard. The free plan covers 100 videos a month.
    </p>
  )
}

export function ClaudeKeyGuide() {
  return (
    <p className="text-sm text-muted-foreground">
      Studies the video and writes the breakdown. <Link href="https://console.anthropic.com/settings/keys">Create a key</Link>{" "}
      in the Claude Console and add some credit. You pay per video you analyze.
    </p>
  )
}

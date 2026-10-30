import { useState, type ReactNode } from "react"
import { ArrowRight, Check, KeyRound, Sparkles, Users } from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AddChannelForm } from "@/components/add-channel-form"
import { KeyField } from "@/components/key-field"
import { ClaudeKeyGuide, SupadataKeyGuide, YouTubeKeyGuide } from "@/components/key-guides"
import { ChannelAvatar } from "@/components/video-card"
import { useChannels, useSettings } from "@/lib/api"
import { compact } from "@/lib/format"
import { cn } from "@/lib/utils"

const STEPS = ["Connect YouTube", "Turn on Analyze", "Add channels"]

/** First-run setup. Three steps, each one screen, then straight into the feed. */
export function SetupPage() {
  const { data: settings } = useSettings()
  const [step, setStep] = useState(0)

  return (
    <div className="flex min-h-svh flex-col items-center bg-muted/30 px-4 py-10 md:py-16">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </div>
        <span className="text-lg font-semibold tracking-tight">ytiq</span>
      </div>

      <ol className="mb-6 flex items-center gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-6 bg-border" />}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                i === step ? "bg-background font-medium shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[10px]",
                  i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-foreground text-background" : "bg-muted",
                )}
              >
                {i < step ? <Check className="size-2.5" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 md:p-8">
        {step === 0 && (
          <Step
            icon={<KeyRound className="size-5" />}
            title="Connect YouTube"
            description="ytiq reads public video stats with your own free YouTube API key. It takes about two minutes, and the key stays on this computer."
          >
            <YouTubeKeyGuide />
            <div className="flex flex-col gap-2">
              <Label>Your YouTube API key</Label>
              <KeyField name="youtube_api_key" state={settings?.youtube_api_key} placeholder="AIza…" onSaved={() => setStep(1)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Free: 10,000 units a day. Refreshing a channel costs about 3, so you can track hundreds.
            </p>
            {settings?.youtube_api_key.set && (
              <Button className="self-end" onClick={() => setStep(1)}>
                Continue <ArrowRight />
              </Button>
            )}
          </Step>
        )}

        {step === 1 && (
          <Step
            icon={<Sparkles className="size-5" />}
            title="Turn on Analyze"
            optional
            description="Analyze breaks down why a video works: the topic, the angle and the hook. It needs two more keys. You can skip this and add them later in Settings."
          >
            <div className="flex flex-col gap-2">
              <Label>Supadata key</Label>
              <SupadataKeyGuide />
              <KeyField name="supadata_api_key" state={settings?.supadata_api_key} placeholder="sd_…" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Claude API key</Label>
              <ClaudeKeyGuide />
              <KeyField name="anthropic_api_key" state={settings?.anthropic_api_key} placeholder="sk-ant-…" />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)}>
                {settings?.supadata_api_key.set && settings?.anthropic_api_key.set ? "Continue" : "Skip for now"} <ArrowRight />
              </Button>
            </div>
          </Step>
        )}

        {step === 2 && <ChannelsStep onBack={() => setStep(1)} />}
      </div>
    </div>
  )
}

function ChannelsStep({ onBack }: { onBack: () => void }) {
  const { data: channels = [] } = useChannels()
  const navigate = useNavigate()

  return (
    <Step
      icon={<Users className="size-5" />}
      title="Add the creators in your niche"
      description="Paste an @handle, a channel link, or any video link. Start with 3 to 5. ytiq pulls their last 50 videos and finds the outliers."
    >
      <AddChannelForm autoFocus />
      {channels.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border">
          {channels.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <ChannelAvatar channelId={c.id} name={c.title} className="size-7" />
              <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{compact(c.subscriber_count)} subs</span>
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => navigate("/", { replace: true })} disabled={channels.length === 0}>
          Open my feed <ArrowRight />
        </Button>
      </div>
    </Step>
  )
}

function Step({
  icon,
  title,
  description,
  optional,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">{icon}</div>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-tight">
          {title}
          {optional && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">Optional</span>}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

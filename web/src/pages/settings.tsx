import { Label } from "@/components/ui/label"
import { KeyField } from "@/components/key-field"
import { ClaudeKeyGuide, SupadataKeyGuide, YouTubeKeyGuide } from "@/components/key-guides"
import { PageBody, PageHeader, SectionLabel } from "@/components/page"
import { useSettings } from "@/lib/api"

export function SettingsPage() {
  const { data: settings } = useSettings()

  return (
    <>
      <PageHeader title="Settings" description="Your API keys. They're stored on this computer only." />
      <PageBody className="flex max-w-xl flex-col gap-10">
        <section className="flex flex-col gap-3">
          <SectionLabel>YouTube</SectionLabel>
          <Label>YouTube API key</Label>
          <KeyField name="youtube_api_key" state={settings?.youtube_api_key} placeholder="AIza…" />
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">How to get one</summary>
            <div className="mt-3">
              <YouTubeKeyGuide />
            </div>
          </details>
        </section>

        <section className="flex flex-col gap-5">
          <SectionLabel>Analyze</SectionLabel>
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
        </section>
      </PageBody>
    </>
  )
}

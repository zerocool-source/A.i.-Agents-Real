import IconChainLink3Outlined from '@material-symbols/svg-400/outlined/link.svg?react'
import IconFolder1Outlined from '@material-symbols/svg-400/outlined/folder.svg?react'
import IconGenerateBFilled from '@material-symbols/svg-400/outlined/wand_stars.svg?react'
import IconMagicBookOutlined from '@material-symbols/svg-400/outlined/auto_stories.svg?react'
import IconMagnifyingGlassOutlined from '@material-symbols/svg-400/outlined/search.svg?react'
import IconNewspaper2Outlined from '@material-symbols/svg-400/outlined/newspaper.svg?react'
import IconPencilOutlined from '@material-symbols/svg-400/outlined/edit.svg?react'
import IconPlusLargeOutlined from '@material-symbols/svg-400/outlined/add.svg?react'
import { Button } from '@higgsfield/quanta/button'
import { Card, card } from '@higgsfield/quanta/card'
import { Composer } from '@/components/composer'
import { Grid } from '@higgsfield/quanta/grid'
import { Icon } from '@higgsfield/quanta/icon'
import { Input } from '@higgsfield/quanta/input'
import { MediaCard } from '@/components/media-card'
import { Select } from '@higgsfield/quanta/select'
import { SettingTrigger } from '@/components/setting-trigger'
import { Tabs } from '@higgsfield/quanta/tabs'
import { Typography } from '@higgsfield/quanta/typography'
import { AssetLibraryModal } from '@/components/asset-library'
import { HistoryGrid } from '@/components/history-grid'

/**
 * Preset app screen template (modeled on the Higgsfield SC App Builder /
 * Main, node 2950:66563). A builder shell: the input panel on the left (cover
 * picker, prompt composer, voice / aspect-ratio / duration setting rows,
 * marketing Generate CTA) and the preset gallery on the right (segmented
 * tabs, search, 3-col media grid). Quanta components + tokens only.
 */

const PRESETS = [
  { title: 'How product works', src: '/presets/how-product-works.png' },
  { title: 'Explain', src: '/presets/explain.png' },
  { title: 'History', src: '/presets/hyper-motion.png' },
  ...Array.from({ length: 9 }, () => ({ title: 'Hyper motion', src: '/presets/hyper-motion.png' })),
]

const VOICES = ['Cillian', 'Nova', 'Atlas', 'Vera']

const DURATIONS = [
  { value: '20s', title: '20 seconds' },
  { value: '30s', title: '30 seconds' },
  { value: '1m', title: '1 minute' },
  { value: '3m', title: '3 minutes' },
  { value: '5m', title: '5 minutes' },
  { value: '10m', title: '10 minutes' },
  { value: 'manual', title: 'Manual', subtitle: 'Choose duration manually' },
]

const RATIOS = [
  { value: '16:9', title: '16:9', subtitle: 'Horizontal' },
  { value: '9:16', title: '9:16', subtitle: 'Vertical' },
]

/** Shared popup placement for the rail pickers — opens into the canvas. */
const PICKER_POPUP = {
  size: 'picker',
  surface: 'solid',
  side: 'right',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 16,
} satisfies Partial<Parameters<typeof Select.Content>[0]>

/** Voice picker — single-line options behind the Voice setting row. */
function VoiceSelect() {
  return (
    <Select.Root>
      <Select.Trigger bare render={<SettingTrigger label="Voice" />}>
        <Select.Value placeholder="Select voice" />
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {VOICES.map(voice => (
          <Select.Item key={voice} value={voice}>
            <Select.ItemText>{voice}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Aspect-ratio picker — two-line options (16:9 Horizontal / 9:16 Vertical). */
function AspectRatioSelect() {
  return (
    <Select.Root defaultValue="16:9">
      <Select.Trigger bare render={<SettingTrigger label="Aspect Ratio" />}>
        <Select.Value placeholder="Select ratio" />
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {RATIOS.map(ratio => (
          <Select.Item key={ratio.value} value={ratio.value}>
            <Select.ItemContent>
              <Select.ItemText>{ratio.title}</Select.ItemText>
              <Select.ItemDescription>{ratio.subtitle}</Select.ItemDescription>
            </Select.ItemContent>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Duration picker — the trigger echoes the short value ("1m"), rows the full title. */
function DurationSelect() {
  return (
    <Select.Root defaultValue="1m">
      <Select.Trigger bare render={<SettingTrigger label="Duration" />}>
        <Select.Value placeholder="Select duration">
          {(value: string) => (value === 'manual' ? 'Manual' : value)}
        </Select.Value>
      </Select.Trigger>
      <Select.Content {...PICKER_POPUP}>
        {DURATIONS.map(duration => (
          <Select.Item key={duration.value} value={duration.value}>
            {duration.subtitle != null
              ? (
                  <Select.ItemContent>
                    <Select.ItemText>{duration.title}</Select.ItemText>
                    <Select.ItemDescription>{duration.subtitle}</Select.ItemDescription>
                  </Select.ItemContent>
                )
              : <Select.ItemText>{duration.title}</Select.ItemText>}
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

/** Left rail — cover picker, prompt composer, setting rows, Generate CTA. */
function InputPanel() {
  return (
    <aside
      className={card(
        { surface: 'solid', elevation: 'raised' },
        // Figma input rail: 342px = spacing scale × 85.5
        'w-85.5 shrink-0 gap-3 self-start border-q-thin border-q-border-subtle p-3',
      )}
    >
      <div className="flex items-center px-2 py-0.5">
        <Typography as="h1" variant="accent-sm-bold" color="brand" className="uppercase">
          Preset Studio
        </Typography>
      </div>

      <MediaCard
        ratio="auto"
        frame="thin"
        scrim={false}
        titleVariant="accent"
        className="h-40 shrink-0"
        src="/presets/cover.png"
        alt="Selected preset cover"
        title="How product works"
        action={
          <MediaCard.Action>
            Change
            <Icon size="sm" as={IconPencilOutlined} />
          </MediaCard.Action>
        }
      />

      <Composer
        label="What should the video explain?"
        placeholder="Type a topic, or attach files below"
        actions={
          <>
            <AssetLibraryModal
              trigger={
                <Composer.Action start={<Icon size="sm" as={IconPlusLargeOutlined} />}>
                  Attach files
                </Composer.Action>
              }
            />
            <Composer.Action start={<Icon size="sm" as={IconChainLink3Outlined} />}>
              Link
            </Composer.Action>
          </>
        }
      />

      <VoiceSelect />
      <div className="flex w-full gap-2">
        <AspectRatioSelect />
        <DurationSelect />
      </div>

      <div className="py-2">
        <Button
          variant="marketingPrimary"
          size="lg"
          className="w-full"
          end={
            <>
              <IconGenerateBFilled />
              <span className="px-1 text-q-body-md-semi-bold">22</span>
            </>
          }
        >
          Generate
        </Button>
      </div>
    </aside>
  )
}

/** The preset media grid — shared by the Presets and How-it-works tabs. */
function PresetGrid() {
  return (
    <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-4">
      <Grid cols={3} gap={4}>
        {PRESETS.map((preset, index) => (
          <MediaCard
            key={`${preset.title}-${index}`}
            render={<button type="button" />}
            src={preset.src}
            alt={preset.title}
            title={preset.title}
          />
        ))}
      </Grid>
    </Card>
  )
}

/** Right column — segmented tabs + search over the preset gallery. */
function PresetGallery() {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Tabs.Root variant="segmented" defaultValue="presets" className="flex min-h-0 flex-1 flex-col gap-3">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <Tabs.List
            items={[
              { value: 'presets', label: 'Presets', start: <Icon size="sm" as={IconMagicBookOutlined} /> },
              { value: 'history', label: 'History', start: <Icon size="sm" as={IconFolder1Outlined} /> },
              { value: 'how-it-works', label: 'How it works', start: <Icon size="sm" as={IconNewspaper2Outlined} /> },
            ]}
          />
          <Input
            placeholder="Search"
            aria-label="Search presets"
            className="w-50"
            start={<Icon size="sm" as={IconMagnifyingGlassOutlined} />}
          />
        </header>

        <Tabs.Panel value="presets" className="flex min-h-0 flex-1 flex-col pt-0">
          <PresetGrid />
        </Tabs.Panel>
        <Tabs.Panel value="history" className="flex min-h-0 flex-1 flex-col pt-0">
          <Card surface="solid" className="min-h-0 flex-1 overflow-y-auto p-4">
            <HistoryGrid />
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="how-it-works" className="flex min-h-0 flex-1 flex-col pt-0">
          <PresetGrid />
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  )
}

export function PresetTemplate() {
  return (
    <div className="flex h-dvh gap-5 overflow-hidden bg-q-background-primary px-4 py-3">
      <InputPanel />
      <PresetGallery />
    </div>
  )
}

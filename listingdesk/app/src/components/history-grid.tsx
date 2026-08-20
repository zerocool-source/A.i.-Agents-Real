import type { ReactNode } from 'react'
import { GenerationCard } from '@/components/generation-card'
import { Typography } from '@higgsfield/quanta/typography'
import { GenerationDetailModal } from './generation-detail.tsx'

/**
 * "History" generations feed — Figma Supercomputer-2 "Feed/Card" grid
 * (2001:84301). A vertical stack of generation batches: each batch is a tight
 * (6px) flex row of equal-width `GenerationCard`s that share an aspect ratio, so
 * card heights line up per row while rows vary. One tile is left in the
 * `generating` state (Cinema-Studio-V4 20037:25838) to show the pulsing top
 * glow. Composed from Quanta components + tokens, reusing the local demo covers.
 *
 * Each READY tile is the trigger of a `GenerationDetailModal` — clicking it opens
 * the full-viewport generation lightbox seeded with that tile's data. The
 * generating tile is inert (nothing to open yet). Rendered inside the Explainer
 * PresetGallery's History tab.
 */

type ReadyItem = {
  kind: 'ready'
  src: string
  alt: string
  ratio: number
  prompt: string
}
type GeneratingItem = { kind: 'generating', ratio: number }
type FeedItem = ReadyItem | GeneratingItem
type FeedGroup = { label: string, rows: FeedItem[][] }

const PICKLE = {
  src: '/presets/cover.png',
  alt: 'Renaissance portrait holding a jar of dill pickles',
  prompt: 'A renaissance oil-painting portrait of a woman cradling a glowing jar of Picklehaus dill pickles, candlelit chiaroscuro, rich golden fabrics.',
} as const
const PRODUCT = {
  src: '/presets/how-product-works.png',
  alt: 'Product explainer cover',
  prompt: 'Cinematic product hero shot explaining how the pickling process works, warm studio light, shallow depth of field.',
} as const
const EXPLAIN = {
  src: '/presets/explain.png',
  alt: 'Candlelit concept explainer',
  prompt: 'Moody candlelit scene explaining a concept, editorial photography, deep shadows and warm highlights.',
} as const
const MOTION = {
  src: '/presets/hyper-motion.png',
  alt: 'Caramel popcorn splash in motion',
  prompt: 'Hyper-motion macro of caramel popcorn bursting mid-air with sugar crystals, high-speed capture, glossy amber tones.',
} as const

function ready(base: { src: string, alt: string, prompt: string }, ratio: number): ReadyItem {
  return { kind: 'ready', ratio, ...base }
}

const FEED: FeedGroup[] = [
  {
    label: 'Today',
    rows: [
      [ready(PRODUCT, 16 / 9)],
      [ready(PICKLE, 3 / 4), { kind: 'generating', ratio: 3 / 4 }, ready(EXPLAIN, 3 / 4)],
      [ready(MOTION, 4 / 3), ready(PICKLE, 4 / 3)],
    ],
  },
  {
    label: 'Yesterday',
    rows: [
      [ready(EXPLAIN, 3 / 4), ready(MOTION, 3 / 4), ready(PRODUCT, 3 / 4), ready(PICKLE, 3 / 4)],
      [ready(PRODUCT, 16 / 9)],
    ],
  },
]

/** A tight generation batch — equal-width cards, 6px gaps, shared row ratio. */
function Row({ children }: { children: ReactNode }) {
  return <div className="flex gap-1.5">{children}</div>
}

/**
 * A dated batch group (e.g. "Today") — a caption header sitting above its rows.
 * The header→rows gap (12px) and group→group gap (24px, on the feed root) give
 * the feed vertical rhythm, while rows stay tight (6px) inside the rows column.
 */
function Group({ label, children }: { label: string, children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Typography as="h3" variant="caption-sm-medium" color="tertiary" className="px-0.5">
        {label}
      </Typography>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

/** One result tile — a lightbox trigger when ready, inert while generating. */
function Tile({ item }: { item: FeedItem }) {
  if (item.kind === 'generating') {
    return <GenerationCard state="generating" ratio={item.ratio} className="min-w-0 flex-1" />
  }
  return (
    <GenerationDetailModal
      generation={{
        src: item.src,
        mediaType: 'image',
        aspectRatio: item.ratio,
        prompt: item.prompt,
      }}
      trigger={(
        <GenerationCard
          render={<button type="button" />}
          className="min-w-0 flex-1"
          ratio={item.ratio}
          src={item.src}
          alt={item.alt}
        />
      )}
    />
  )
}

export function HistoryGrid() {
  return (
    <div className="flex flex-col gap-6 pt-1">
      {FEED.map(group => (
        <Group key={group.label} label={group.label}>
          {group.rows.map((row, rowIndex) => (
            <Row key={rowIndex}>
              {row.map((item, itemIndex) => (
                <Tile key={itemIndex} item={item} />
              ))}
            </Row>
          ))}
        </Group>
      ))}
    </div>
  )
}

# App layouts — start from a shipped code layout

A `type: "app"` product must look and feel like a Higgsfield product. The
template ships three ready-made layout screens as REAL CODE — **prefer one of
them**, copy it into your route and adapt it freely. Only build a custom shell
if the user asks for something none covers. For anything Quanta lacks, build
a small component from Quanta primitives in `app/src/components/` — never a
third-party UI library, never modify the vendored `@higgsfield/quanta`.

## The three layouts

| Layout | File | When to use |
| --- | --- | --- |
| **Studio** | `src/layouts/studio.tsx` (`StudioTemplate`) | Full creative workspace: projects-first left `Sidebar` + hero + a floating prompt dock (`@/components/prompt-box` — mode toggle, inline setting pills, lime GENERATE) over an edge-to-edge generations feed. The richest shell — for multi-project generation tools. |
| **Preset** | `src/layouts/preset.tsx` (`PresetTemplate`) | Pick-a-style-then-generate: a persistent left creation rail (cover/source, `@/components/composer`, `@/components/setting-trigger` rows, costed Generate) beside a browsable grid of preset tiles with Presets/History/How-it-works tabs + search. |
| **App detail** | `src/layouts/app-detail.tsx` (`AppDetailTemplate`) | A single app's public landing page: a centered `max-w-7xl` scroll page with a content breadcrumb, a two-column generator hero (`@/components/dropzone` inputs on the left, a large `Media` preview on the right, costed Generate), and a "how it works in 3 steps" explainer row. Use it for a marketing/detail page around one tool, not a full workspace. |

Pick Studio for a full workspace, Preset for a gallery-driven pick-then-generate
tool, App detail for a single tool's landing page; map any request to the
closest. Reusable building blocks live in `app/src/components/` — `prompt-box`,
`composer`, `setting-trigger`, `generation-card`, `history-grid`, `media-card`,
`asset-library`, `generation-detail`, `template-picker`, `template-modal`,
`dropzone`. Compose from these rather than hand-rolling feeds / composers /
pickers / upload areas.

## Rules

- Compose from Quanta components and `cn`. For anything Quanta lacks (date
  picker, calendar, table, …), build a small custom component from Quanta
  primitives + `q-` tokens in `app/src/components/` — never add a third-party
  UI library, never modify the vendored `@higgsfield/quanta`.
- Real copy in every state (empty, busy, error) — no placeholder tokens.
- Apps render inside Higgsfield: NEVER add an app header/top bar (no brand/logo
  row, no top nav) and never credits/balance or sign-out controls — the host
  chrome provides all of that. In-app navigation goes in a Quanta `Sidebar` or
  inline controls (tabs, step indicators); page titles are headings inside the
  content area.
- Permanently DARK: `data-theme="default-dark"` is pinned on `<html>` in
  `src/routes/__root.tsx`. Never add a theme toggle, a light mode, quanta's
  bootstrapScript/ThemeController, or `dark:`-conditional styling.
- Container width: `mx-auto w-full max-w-7xl` on the shell — except the studio
  layout, a full-bleed workspace (sidebar + edge-to-edge feed).
- Generation CTAs are Quanta Button `variant="marketingPrimary"` (a Loader
  `size="xs" color="neutral"` while busy) and ALWAYS show the credit cost
  inside the button as `{label} {sparkles icon} {credits}` — the sparkle is the
  branded soft-sparkles asset
  (`import Sparkles from "@/assets/icon-sparkles-soft.svg?react"`, 14px) and the
  credits number inherits the button label's font. Variant reality check (names
  do NOT match the colors): `primary` = flat LIME, `secondary` = solid WHITE,
  `tertiary` = dark white/10 glass, `ghost` = transparent. Ordinary actions and
  navigation use the dark `tertiary`/`ghost`; `secondary` (white) only where the
  real product uses a white button; flat lime `primary` is almost never right.
- Icons are Google Material Symbols (outlined, weight 400), imported per icon:
  `import Star from "@material-symbols/svg-400/outlined/star_shine.svg?react"`
  — one icon family everywhere; `-fill` variants only for very small glyphs.
- Generation feeds: result cards composed from quanta `Media`/`Card` inside a
  Quanta `Grid` with `cols="auto-fit"` — resize `minColWidth` rather than adding
  breakpoint class ladders (studio-style feeds can use CSS-columns masonry).
  Helpers in `src/lib/higgsfield-generation-results.ts` map a Generation to its
  preview media. Prompt composer / mode switcher: use `@/components/prompt-box`
  (or `@/components/composer`) — see `src/layouts/studio.tsx` and
  `references/app-layouts.md` in the skill for the anatomy.

## Wiring the data (fnf-react)

From `app/packages/fnf-react/ai/AGENTS.md`:

- Submit prompts/runs with `useGenerationRun(jobClient, { scopeKey })`; map its
  status to a `busy`/`generating` prop.
- Read feeds with `jobsFeedQueryOptions` + `flattenFeedPages`; poll one job with
  `generationQueryOptions`; read credit prices with `costQueryOptions`.
- After a run resolves, call `prependGenerations` so fresh work appears at the
  top of the grid; upload files with `useAttachments` and pass refs to
  `run.start`.

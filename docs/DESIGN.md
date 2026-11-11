# MakanLens design guide (iOS, always dark)

Goal: MakanLens should look and feel like an app Apple made, in the family of Health, Fitness and Settings. It is always dark, with an **indigo** tint (systemIndigo `#5E5CE6`). **No orange anywhere.** Don't use raw Tailwind palette colours (`orange-*`, `neutral-*`, `emerald-*` …) or `dark:` variants. Use the tokens below.

## Tokens (Tailwind names, defined in `app/globals.css`)
| Use | Class |
|---|---|
| Page background (true black) | `bg-bg` |
| Card / list section | `surface` utility (bg `#1C1C1E`, 12 px corners), or `bg-surface` |
| Input, nested card, pressed row | `bg-surface-2` (`#2C2C2E`), `bg-surface-3` |
| Text | `text-label` (white), `text-label-2` (secondary 60%), `text-label-3` (tertiary 30%) |
| Hairlines | `border-separator` |
| Tracks, chips, segmented background | `bg-fill` |
| Tint (buttons, links, selected) | `bg-accent`, `text-accent-text` (readable indigo text), `bg-accent-tint` |
| System colours | `ios-red`, `ios-green`, `ios-blue`, `ios-cyan`, `ios-teal`, `ios-mint`, `ios-yellow`, `ios-pink`, `ios-purple`, `ios-gray` |
| Macros | `macro-carbs` (cyan), `macro-protein` (pink), `macro-fat` (yellow); in JS use `MACRO_COLOURS` from `components/dashboard/colours.ts` |
| Calories / energy ring | `ios-green` for "eaten within goal", `ios-red` for "over" |

## Type (SF Pro via the system font, so use these utilities, not `text-xl` etc.)
`type-large-title` (34 bold) · `type-title1` (28) · `type-title2` (22) · `type-title3` (20 semibold) · `type-headline` (17 semibold) · `type-body` (17) · `type-callout` (16) · `type-subhead` (15) · `type-footnote` (13) · `type-caption` (12) · `type-caption2` (11).
Big numbers: add `num` (SF Pro Rounded and tabular figures), e.g. `num text-[44px] font-bold`.

## Building blocks (import, don't re-create)
- `components/ui/NavBar.tsx`: `<NavBar title="Trends" subtitle=… back={{href,label}} trailing={<NavButton…/>} />`. **Every page starts with it** (large title, then a compact title in a translucent bar on scroll). Page container: `<main className="mx-auto max-w-xl px-4">`, with NavBar as the first child.
- `components/ui/List.tsx`: `<Section header footer>` + `<Row title subtitle value icon iconBg href|onClick accessory destructive action chevron />`. Use these for any list of settings, foods or meals (inset grouped, Settings-style). Row icons: a 17–18 px Lucide icon, white, on an `iconBg` system colour.
- `components/ui/Controls.tsx`: `Button` (variants `filled` = the ONE primary action per screen, `tinted`, `gray`, `plain`, `destructive`; sizes `large` (50 px, full width) and `medium`), `Toggle` (iOS switch), `Segmented` (segmented control), `Chip` (non-interactive capsule), `FIELD` (class string for text inputs).
- `components/ui/Sheet.tsx`: iOS sheet with grabber, `title`, `leading`/`trailing` (`<SheetButton>Cancel</SheetButton>`, `<SheetButton bold>Done</SheetButton>`), `detent="large"|"medium"`. Use it for every modal (edit, review results, new food, confirmations with content).
- `components/log/logBus.ts`: `openLogSheet()` opens the ＋ Log sheet. `useLogInput(handler)` (Today only) receives `{file}` / `{text}` submitted from the sheet.

## Navigation (tab bar is done, in `components/TabBar.tsx`)
Today `/` · Trends `/history` · ＋ Log (sheet: Camera, Photo Library, Describe, Search, Barcode, Label) · Foods `/foods` · Profile `/settings` (with drill-down pages under `/settings/*`; "About our data" is `/uncovered`). The goal planner lives at **`/settings/goal`**.

## Interaction rules
- **Fewer buttons.** Prefer tappable rows (with chevron) that open a sheet or a pushed page, over rows of buttons. One filled button per screen at most. Secondary actions go in a sheet, a `NavButton` in the nav bar, or a row.
- Destructive actions: red text row or `destructive` button, inside a sheet or at the bottom of a detail page, always with a confirmation (sheet or `window.confirm`).
- Tap targets ≥ 44 px. Feedback on press: `pressable` utility (dims) or `active:bg-surface-2` on rows.
- Spacing: 16 px page gutters (`px-4`), 24 px between sections (`mt-6`), 12 px inside cards (`p-3`/`p-4`).
- Charts and rings are hand-written SVG with system colours, rounded line caps and a soft track (`var(--fill)`). Animate gently, and respect `prefers-reduced-motion`.
- Empty states: an SF-style icon in `text-label-3`, a `type-title3` line and one `type-subhead` line in `text-label-2`, then at most one tinted button.
- Copy: British spelling, sentence case for body text, title case for nav titles and tab names (Apple style: "Log Food", "Food Library").
- Accessibility: every icon-only button needs `aria-label`. Range inputs need `aria-label` or a `<label>`. Keep headings in order, and keep focus visible.
- The disclaimer footer is rendered by the layout. Don't duplicate it.

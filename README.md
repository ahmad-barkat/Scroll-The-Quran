# Scroll the Quran

A full-screen, verse-by-verse Quran reader built in the spirit of a social feed: one ayah at a time, with Arabic, translation, recitation, bookmarks, search, and daily discovery. Installable as a PWA and readable offline.

## Features

- **One ayah per screen** with the Uthmani Arabic text and Saheeh International translation.
- **Scroll, swipe, or use the keyboard** to move through all 6,236 ayahs in order.
- **Recitation** from three reciters (Mishary Rashid Alafasy, Abdul Basit Abdus Samad, Mahmoud Khalil Al-Husary) with seeking, repeat, auto-advance, and optional auto-scroll.
- **Surah and juz navigation**, progress within the surah and across the whole Quran, and resume-from-last-read.
- **Search** in English or Arabic, including direct references such as `2:255`.
- **Bookmarks, reading streaks, and visited-ayah progress**, persisted locally.
- **16 curated collections** (mercy, patience, gratitude, hope, forgiveness, knowledge, light, provision, justice, prayer, protection, hardship, paradise, guidance, trust, unity).
- **Share cards** rendered locally to PNG, plus copy-with-reference.
- **Four themes** — Night, Emerald, Parchment, Dawn — with adjustable Arabic size.
- **Full keyboard control** with a built-in shortcut reference (press `?`).
- **Offline support** for the app shell, fonts, and Quran text after the first visit. Recitation audio is cached as it is played.

## Keyboard

The reader answers these keys. Press `?` (or `Ctrl`/`⌘` + `/`) in the reader to open the same list as a panel.

| Action | Keys |
|---|---|
| Next ayah | `↓`, `PgDn`, `J`, `Space` |
| Previous ayah | `↑`, `PgUp`, `K` |
| Play or pause recitation | `P` |
| Save or unsave this ayah | `B` |
| Share as an image card | `S` |
| Copy the ayah with its reference | `C` |
| Show or hide the translation | `T` |
| Shortcut list (this panel) | `?`, `Ctrl`/`⌘` + `/` |
| Close a sheet or the drawer | `Esc` |

- **`Ctrl`, `Cmd` and `Alt` combinations are left to the browser.** `Ctrl+S`, `Ctrl+C` and `Ctrl+T` do their normal browser jobs here, not the reader's.
- **While a recitation is playing, the keys above stay with the audio.** Only `P` (pause) and `?` respond, and the app says so once per playback rather than failing silently. Scrolling, swiping and the on-screen arrows are never locked, and pausing restores every key.
- A pointer tap releases focus from the button it hit, so `Space` keeps navigating after you use the rail. Keyboard activation keeps focus, as it should.

## Verified text

The Quran text is not generated, paraphrased, or edited.

| | Source |
|---|---|
| Arabic | Quran.com API v4, `text_uthmani` — Uthmani script, Hafs ʿan ʿĀṣim |
| Translation | Saheeh International — Quran.com API v4, translation resource 20 |
| Independent cross-check | Tanzil / Al Quran Cloud Uthmani text and `en.sahih` |
| Recitation | EveryAyah.com |

Verification lives in [`scripts/verify-quran.mjs`](scripts/verify-quran.mjs) and the machine-readable audit in [`public/verification-report.json`](public/verification-report.json). Run:

```bash
npm run data:verify    # 1,668 integrity checks + checksum drift check
npm run verify:quran   # integrity checks only
```

`data:verify` also runs [`scripts/check-checksum.mjs`](scripts/check-checksum.mjs), which compares the recomputed SHA-256 against the value pinned in [`scripts/expected-checksum.json`](scripts/expected-checksum.json) and exits non-zero on drift. Both scripts share one checksum definition ([`scripts/lib/dataset-checksum.mjs`](scripts/lib/dataset-checksum.mjs)), so the verifier and the CI guard cannot diverge.

The script performs **1,668 checks**, including:

- exactly 114 surahs and 6,236 ayahs, in order, with no empty text;
- a SHA-256 checksum recomputed over every `surah:ayah`, Arabic, and translation record;
- Basmala placement: 1:1 is the Basmala, surah 9 has none, and no other first ayah duplicates it;
- 30 contiguous juz boundaries with no gaps or overlaps;
- no HTML, entities, control characters, BOMs, double spaces, or Latin letters inside Arabic;
- translation punctuation artifacts and the five documented normalizations;
- every collection and daily-verse reference;
- the actual runtime search and normalization functions, including reference lookup;
- PWA icon dimensions and the audio URL pattern.

Current dataset checksum — the same value CI checks against:

```
e970f81557e178e61560ad0c3b6f427c7767ab3f47bef86b858cbe0fb97fa3df
```

Rebuilding the dataset from the sources is a separate, deliberate step:

```bash
npm run data:build
```

It re-fetches Quran.com and Tanzil, re-runs the cross-check, and only publishes to `public/` when every Arabic difference is one of the documented variants; anything unexpected leaves `public/` untouched and exits non-zero.

### Known cross-source variants

Five Arabic verses differ in word joining or hamza-carrier convention between the Quran.com Uthmani edition and the Tanzil distribution. The Quran.com Uthmani text is preserved as served; nothing was rewritten to force agreement.

`2:181`, `8:6`, `12:39`, `12:41`, `13:37`

### Translation punctuation normalization

Five terminal punctuation artifacts in Quran.com resource 20 were corrected against the independent Tanzil `en.sahih` distribution. Wording is unchanged: three closing quotation marks were moved after the terminal punctuation, and two doubled full stops were reduced to one.

`18:4`, `37:92`, `54:47`, `79:25`, `114:6`

The About page (`/#/about`) surfaces these references and links each one to its verse.

## Tech stack

- React 19 + TypeScript + Vite
- React Router (hash routing)
- Framer Motion
- Lucide icons
- Vite PWA / Workbox
- Self-hosted Amiri Quran, Amiri, Inter, and Cormorant Garamond fonts

No backend, accounts, analytics, or tracking.

## Getting started

Requires Node 22.18+ (Node 24 recommended) because the verification script imports the app's TypeScript helpers directly.

```bash
npm install
npm run dev
```

Production build and local preview:

```bash
npm run build
npm run preview
```

Verification:

```bash
npm run data:verify
```

End-to-end smoke tests (Playwright starts the dev server itself on port 4173; first run needs `npx playwright install chromium`):

```bash
npm run test:e2e
```

## Tests and CI

[`tests/reader.spec.ts`](tests/reader.spec.ts) covers the paths that would otherwise be checked by hand:

| Test | What it proves |
|---|---|
| Keyboard navigation | `↓`, `j`, `k` and the prev-ayah control each move one ayah and update the title. |
| Bookmark persistence | `aria-pressed` flips, survives a reload, and lands on the Saved page. |
| Search reference lookup | `2:255` resolves to exactly one result and opens that ayah. |
| Share card | The lazily-loaded canvas engine renders a 1080 px card and Escape closes the sheet. |
| Dialog focus | A keyboard-opened sheet traps Tab and returns focus to its trigger. |

[`playwright.config.ts`](playwright.config.ts) runs them in Chromium against the dev server. [`ci.yml`](.github/workflows/ci.yml) has three jobs: `data` (`npm run data:verify`, so checksum drift fails the build), `build` (typecheck + Vite build), and `e2e` (smoke tests, with the HTML report uploaded on failure).

## Project layout

```
public/quran.json                 Runtime dataset (114 surahs, 6,236 ayahs)
public/verification-report.json   Audit report produced with the dataset
scripts/verify-quran.mjs          Independent dataset and runtime checks
scripts/check-checksum.mjs        Fails on dataset drift against the pinned hash
scripts/lib/dataset-checksum.mjs  Shared checksum definition
tests/reader.spec.ts              Playwright smoke tests for the reader
src/pages/                        Read, Discover, Collection, Search, Saved, About
src/components/                   Reader chrome, navigation, sheets, ornaments
src/lib/quran.ts                  Indexing, search, normalization, audio URLs
src/lib/useDialog.ts              Focus trap, Escape, and focus restore for dialogs
src/lib/shareImage.ts             Canvas share card engine (lazy chunk)
src/data/collections.ts           Curated verse collections and daily rotation
.research/                        Dataset build pipeline and source snapshots
```

Every route except the reader is a `React.lazy` chunk, and the canvas share engine loads only when a card is requested, so the first paint stays a single bundle.

## Privacy and offline use

Settings, bookmarks, reading progress, and streaks are stored in `localStorage` on the device. Nothing is sent to a server. The app shell, Quran text, and fonts are precached; recitation audio is fetched from EveryAyah on demand and cached by the service worker. On iOS, installations that have never played a given recitation need a network connection for that ayah.

## Credits

- Quran text and Saheeh International translation via [Quran.com](https://quran.com).
- Uthmani text verification against [Tanzil](https://tanzil.net) via the Al Quran Cloud distribution.
- Recitation audio from [EveryAyah](https://everyayah.com).
- Amiri and Amiri Quran fonts by Khaled Hosny; Inter by Rasmus Andersson; Cormorant Garamond by Christian Thalmann.
- Interface inspired by the one-verse-at-a-time reading model popularized by Scroll Bible. This project is independent and is not affiliated with Scroll Bible, Quran.com, or EveryAyah.

The Quran is the word of Allah. If you find any discrepancy in the text, please treat it as a defect in this app and verify against a printed mushaf or the sources above.

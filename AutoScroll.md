# Mobile Auto-Scroll Investigation

## Goal

On mobile, when the user taps the word-guess input, the keyboard opens and takes up ~50% of the screen. We want the header to scroll off the top of the screen so the card, tabs, and input all fit in the visible area above the keyboard.

When the user is done with the input (keyboard closes), ideally the header stays hidden — or at minimum, doesn't snap back jarringly.

---

## Device / Environment

- iPhone 14, Safari
- The keyboard + Safari chrome (URL bar + toolbar + home indicator) takes approximately **50% of `lvh`** (large viewport height)
- `lvh` = static viewport height (does not change when keyboard opens) — this is what we use for sizing
- `dvh` = dynamic viewport height (shrinks when keyboard opens) — avoided because it causes the card to resize on the fly

---

## Card Size Calculation

The word card uses `aspect-square`, so constraining its **max-width** also constrains its height.

**Current formula (kept):**
```
max-md:max-w-[calc(52lvh-83px)]
```

The `83px` offset accounts for all fixed heights above the card when the header is scrolled off-screen:
| Element | Height |
|---|---|
| `main` top padding (`py-3`) | 12px |
| Tab bar (`h-10` - 1px overlap) | 39px |
| Panel top padding (`p-2.5`) | 10px |
| Panel bottom padding (`p-2.5`) | 10px |
| Panel bottom margin (`mb-3`) | 12px |
| **Total** | **83px** |

The `52lvh` approximates the visible space above the keyboard (~50% of the large viewport).

If the header is **included** in the visible area (not scrolled off), add its height (64px) making the offset `147px`:
```
max-md:max-w-[calc(52lvh-147px)]
```

---

## Approaches Tried

### 1. `window.scrollTo({ top: 64 })` on input focus
**Idea:** On `onPointerDown`, scroll the page 64px down to push the non-sticky header above the viewport.

**Result:** Works on iPhone 14 in some cases — the header does scroll off. But unreliable:
- `window.scrollTo` is a **no-op when `document.body.scrollHeight <= window.innerHeight`**. If page content is shorter than the layout viewport, the page simply can't scroll.
- Whether this works depends on how much content is on the page and the device viewport size.

**Commit:** `d927300`

---

### 2. Scroll back to 0 on blur
**Idea:** On input `onBlur`, if no other input is focused, scroll back to `top: 0` so the header reappears.

**Result:** Worked for restoring the header, but caused two problems:
1. After a word is guessed/revealed, the input unmounts → `onBlur` fires → header snaps back and covers the tabs.
2. When switching tabs while input is focused, `onBlur` fired and scrolled back before the new input could take focus.

Various fixes attempted (ref guards, `isGuessed` checks, `flushSync` for tab focus) — none fully resolved both issues.

---

### 3. CSS `max-height` collapse on header
**Idea:** Replace scroll with a CSS `transition-[max-height]` on a wrapper div around `<Header>`. Add `onInputFocus`/`onInputBlur` callbacks to `WordInput`; collapse the header on focus, expand on blur.

**Result:** Cleaner in theory but same logical problems as approach 2:
- After correct guess, input unmounts → `onBlur` fires but `isGuessed` guard prevented `onInputBlur` → header stayed collapsed forever.
- Tab switching: new tab's input didn't get focused on iOS (iOS restricts programmatic `.focus()` outside synchronous user gesture handlers), so header state got out of sync.
- User decided they didn't want the header fully hidden anyway.

**Commits:** `4aa6932`, `02bf8d3`

---

### 4. `min-h-[calc(100lvh+64px)]` to prevent iOS scroll reset
**Idea:** When the keyboard closes, iOS grows the viewport and resets `scrollY` to 0 if the page is too short to maintain the scroll. By making the page at least `100lvh + 64px` tall, there's always 64px of scrollable room, so iOS shouldn't reset the position.

**Result:** Not fully validated — removed before thorough testing when the user decided to drop the scroll approach entirely.

**Commit:** `55b7d7f`

---

## Root Problems Identified

1. **`window.scrollTo` unreliability:** Only works if `scrollHeight > innerHeight`. When the keyboard is closed, the page may be shorter than the viewport, making any scroll a no-op. Conversely, when the keyboard is open, the viewport is shorter so the page becomes scrollable — but iOS may reset the scroll when the keyboard closes.

2. **iOS keyboard dismiss resets scroll:** When the virtual keyboard closes, iOS Safari adjusts the viewport height and may snap `scrollY` back to 0 if the page content no longer exceeds the viewport height.

3. **iOS `.focus()` restrictions:** Programmatic `inputEl.focus()` only triggers the keyboard on iOS if called synchronously within a user gesture handler (e.g., inside `onClick` or `onPointerDown`). Async calls (`setTimeout`, `useEffect`, `requestAnimationFrame`) do not open the keyboard.

4. **`flushSync` + focus for tab switching:** `flushSync(() => setState(...))` forces a synchronous React render, allowing a `.focus()` call immediately after within the same user gesture. This was partially working but had edge cases on iOS.

5. **Input `onBlur` timing:** On iOS, `onBlur` fires when the user taps away from the input, often before a new element receives focus. The 150ms `setTimeout` + `document.activeElement` check was an attempt to detect "did focus move to another input?" — unreliable across browsers.

---

## Current State (as of this session)

- Header is **non-sticky** (local change in `Header.tsx`, not yet committed — remove `sticky` from the `<header>` className)
- Card max-width: `calc(52lvh-83px)` on mobile — sized to fit above keyboard when header is scrolled off
- **No auto-scroll logic** — the scroll approach was removed entirely
- `flushSync` tab-switching focus attempt is still in `GamePage.tsx` (low risk, no scroll side-effects)

---

## Ideas for Future Attempts

- **`visualViewport` API:** Use `window.visualViewport.addEventListener('resize', ...)` to detect when the keyboard opens/closes and re-apply scroll position. More reliable than `onBlur` for detecting keyboard state changes.
- **`visualViewport.offsetTop`:** When the keyboard is open, `visualViewport.offsetTop > 0` on some browsers — can be used to detect keyboard presence.
- **Fixed/absolute header with JS toggle:** Instead of relying on scroll, use `position: fixed` on the header and toggle a class to move it off-screen (`transform: translateY(-100%)`) when the input is focused.
- **Ensure page is always scrollable:** Permanently add enough bottom padding/min-height so `scrollHeight` always exceeds `innerHeight` by at least 64px, making `scrollTo(64)` always valid regardless of keyboard state.

---

## Chrome on iOS — Card Sizing Problem

**Problem:** The `52lvh - 83px ≈ 330px` card fits above the keyboard on Safari but overflows in Chrome. Chrome keeps its address bar visible at the top (~56px) and shows an autofill/keyboard-accessory toolbar (~44px) above the keyboard. This adds ~100px of persistent chrome that Safari doesn't have.

**Why pure CSS can't distinguish browsers:** `lvh` and `svh` are defined almost identically in both browsers (both ≈ 794px and 738–745px respectively on iPhone 14), so no CSS formula naturally produces a smaller value in Chrome.

**Key measurements (iPhone 14):**

| | Safari | Chrome |
|---|---|---|
| `window.innerHeight` | ~734px | ~738px |
| `100lvh` | ~794px | ~794px |
| `100svh` | ~745px | ~738px |
| Keyboard height | ~336px | ~336px |
| Autofill toolbar | — | ~44px |
| Available above keyboard | ~438px | ~358px |
| Max card (overhead = 72px) | ~366px | **~286px** |
| Current card (`52lvh−83`) | 330px ✓ | 330px ✗ |

Overhead breakdown: `main py-3` top (12px) + tabs `h-10` (40px) + panel `p-2.5` top+bottom (20px) = **72px**.

**`window.innerHeight` is stable** — it does NOT change when the keyboard opens (only `visualViewport.height` changes). This makes it suitable for a one-time static calculation.

---

## Chrome Card Sizing — Options Analyzed

### Option A: Conservative CSS cap
Change `max-md:max-w-[calc(52lvh-83px)]` to `max-md:max-w-[275px]` (or equivalently `min(52lvh-83px, 275px)`).
- Simple, no JS
- Card is ~55px smaller on Safari than today (275px vs 330px) — noticeable

### Option B: `window.innerHeight × 0.485 − 72` computed once at mount *(implemented in `7c64cb8`, then reverted)*
- `0.485` = fraction of `innerHeight` above Chrome's keyboard + autofill bar (keyboard+autofill ≈ 51.5%)
- `72` = non-card overhead (see above)
- Computed once in `useState()` initializer — never updates, card size is completely stable
- Device-adaptive: larger phones get proportionally larger images

**Per-device results (formula: `innerHeight × 0.485 − 72`):**

| Device | Browser | `innerHeight` | Card size | Available above kbd | Fits? |
|---|---|---|---|---|---|
| iPhone SE (375pt) | Safari | ~574px | 206px | 242px (574−332) | ✓ |
| iPhone SE (375pt) | Chrome | ~567px | 203px | 191px (567−332−44) | ✗ +12px |
| iPhone 14 (390pt) | Safari | ~734px | 284px | 366px (734−296) | ✓ |
| iPhone 14 (390pt) | Chrome | ~738px | 286px | 358px (738−296−44) | ✓ (exact) |
| iPhone 15 (393pt) | Safari | ~739px | 286px | 371px | ✓ |
| iPhone 15 (393pt) | Chrome | ~744px | 289px | 364px | ✓ |
| iPhone 14 Plus (430pt) | Safari | ~812px | 322px | 420px | ✓ |
| iPhone 14 Plus (430pt) | Chrome | ~826px | 329px | 437px | ✓ |
| iPhone 15 Pro Max (430pt) | Safari | ~812px | 322px | 420px | ✓ |
| iPhone 15 Pro Max (430pt) | Chrome | ~826px | 329px | 437px | ✓ |

*Note: iPhone SE Chrome misses by ~12px. SE users on Chrome are uncommon; the SE keyboard is ~260px which is a smaller fraction of `innerHeight` than on larger phones, making the formula slightly off for it.*

**Implementation was:**
- `GamePage.tsx`: `const [mobileMaxCardPx] = useState<number | null>(() => window.innerWidth >= 768 ? null : Math.max(Math.round(window.innerHeight * 0.485 - 72), 80))`
- `WordInput.tsx`: Added `mobileMaxWidth?: number | null` prop, applied as inline `style={{ maxWidth }}` overriding the Tailwind class
- `GamePage.tsx`: Passed `mobileMaxCardPx` to the mobile `WordInput` instance only

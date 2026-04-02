# Map Page Scroll & Zoom — Investigation Notes

## The Three Problems

1. **Native pinch-to-zoom** resizes the header, map content, and floating button on mobile.
2. **Initial center scroll** — map opens at top-left instead of centered on the content.
3. **Reveal scroll** — after picking the correct landmark in the modal, the map doesn't scroll to put the landmark on screen before the overlay animation flies to it.

---

## What We Know About Each Problem

### 1. Pinch-to-Zoom

**Root cause (confirmed):** iOS Safari ignores runtime changes to the `<meta name="viewport">` `content` attribute. The viewport is parsed once at page load; updating it via JavaScript does nothing.

**Fix attempted:** Swapped viewport meta on mount → had zero effect on iOS.

**Fix attempted:** Added `touchstart`/`touchmove` event listeners with `e.preventDefault()` when `touches.length > 1`, plus `wheel` + `ctrlKey` for trackpad pinch.
- Result: works *most* of the time, but can still be beaten.

**Fix attempted:** Added `gesturestart`/`gesturechange` listeners (Safari-specific pinch events). These fire before `touchmove` and are the dedicated Safari pinch interception point.
- Result: still not fully reliable.

**Status:** Partially working. Zoom is prevented most of the time.

**Things still to try:**
- Confirm whether `gesturestart` actually fires in the current WKWebView context (some iOS versions require a specific flag).
- Try attaching listeners to the scroll container element specifically rather than `document`.
- Try `touchAction: 'pan-x pan-y'` CSS on the scroll container (prevents pinch but allows panning; widely supported and doesn't require JS event interception).
- CSS-only approach: `touch-action: pan-x pan-y` on the scroll container div is the most robust cross-browser way to disable pinch on a specific element without JS. This should be tried first in the next session.

---

### 2. Initial Center Scroll (map opens at top-left)

**What should happen:** After images load, the map scroll container should have `scrollLeft` and `scrollTop` set to center the map content before it becomes visible.

**The container class lifecycle:**
- While loading (data + images): `flex-1 overflow-auto invisible absolute`
  - `absolute` removes the container from flex flow so the spinner gets the full height
  - `invisible` hides it visually
- After loading, before scroll is set: `flex-1 overflow-auto opacity-0`
  - In normal flex flow (removed `absolute`), just transparent
- After scroll is set: `flex-1 overflow-auto` (fully visible at correct position)

**Root cause A (confirmed):** iOS Safari resets `scrollLeft`/`scrollTop` when `visibility` changes (e.g., removing `visibility: hidden`). We were using Tailwind's `invisible` class. **Fix:** Changed to `opacity-0`. `opacity` transitions do NOT reset scroll on iOS.

**Root cause B (suspected):** The scroll dimensions read during setup may be stale from the `absolute`-positioned layout. When the container transitions from `invisible absolute` to `opacity-0` (in the flex flow), the browser needs to reflow with the new layout. If `scrollWidth`/`clientWidth` are read before this reflow, we get the wrong dimensions (`scrollWidth === clientWidth` → `scrollLeft = 0`).

**Fixes attempted:**
- Single `requestAnimationFrame` in `useEffect` — not reliable, can fire before layout reflow is complete.
- Double `requestAnimationFrame` — better, but still occasionally fires before iOS reflows the flex layout.
- `useLayoutEffect` to set scroll (fires synchronously before browser paint; reading `scrollWidth` forces a synchronous reflow) + `useEffect` + single RAF to flip `opacity-0 → visible`.

**Current state:** Still not working. Despite `useLayoutEffect` + `opacity-0`, the map still opens at the wrong position.

**Unknowns / things still to try:**

- **`touch-action: pan-x pan-y`** on the container may interact with scroll initialization in unexpected ways — investigate.
- **Verify scroll dimensions at scroll time.** Add a temporary `console.log(el.scrollWidth, el.clientWidth, el.scrollLeft)` right after setting scroll to confirm the values being set. If `scrollWidth === clientWidth`, that explains zero scroll.
- **Try setting scroll after `setMapVisible(true)` instead of before.** The concern with this is a visual flash, but we could pair it with a CSS `transition: opacity 0.1s` on the container to cover the brief unscrolled state.
- **Try `scrollTo` with `behavior: 'instant'`** instead of direct assignment — equivalent in practice but may behave differently in some browser implementations.
- **Try setting scroll on a `resize` observer callback** instead of a layout effect, in case the container size isn't finalized at `useLayoutEffect` time.
- **Try removing the `absolute` loading-phase class entirely.** If the scroll container is always in the flex flow (never `absolute`), the layout is stable and scroll dimensions are always correct. The spinner could be rendered as `position: fixed` instead, so both can coexist without the absolute hack. This would simplify the whole scroll init sequence.
  - Spinner becomes: `<div className="fixed inset-0 flex items-center justify-center z-40">...</div>`
  - Scroll container becomes: always `flex-1 overflow-auto`, with map content `opacity-0` during loading
  - Scroll init can happen in a simple single RAF or even synchronously

---

### 3. Reveal Scroll (map doesn't scroll to landmark during modal)

**What should happen:** After the user picks the correct card in the landmark modal, the map scrolls so the target landmark is ~20% from its nearest edge, then the overlay image animates from the card to the landmark.

**Root cause A (confirmed):** `getBoundingClientRect()` on an off-screen element can return incorrect values on mobile Safari (may clamp to 0 or return viewport-edge values instead of true off-screen coordinates). **Fix:** Replaced with `offsetLeft`/`offsetTop` (always relative to the positioned ancestor = the map content div = scroll coordinates directly).

**Root cause B (confirmed):** iOS Safari does not apply programmatic `scrollLeft`/`scrollTop` changes to a scroll container that is visually covered by a `position: fixed` element. The modal is `position: fixed`. We were scrolling the map while the modal was open — iOS silently accepted the value but never applied it. **Fix:** Moved scroll call to between the `growing` and `shrinking` overlay phases (after `onClose()` fires), at which point the fixed modal is gone.

**Current state:** Not tested again after this fix since center scroll is still broken.

**Things still to try (if still broken after center scroll is fixed):**
- Verify the overlay `growing` phase completes before the shrinking phase tries to use `getBoundingClientRect()` on the landmark. If the scroll is instant but the layout hasn't repainted, the shrinking phase might still compute wrong coordinates.
- Add a `requestAnimationFrame` between the scroll assignment and `setRevealOverlay({ phase: 'shrinking' })` to give the browser one frame to repaint at the new scroll position before we measure the landmark's on-screen position.

---

## Current Code State (as of last commit)

**File:** `src/components/game/MapPage.tsx`

- `useLayoutEffect`: `clearBackground()` only
- `useEffect (zoom)`: prevents `touchstart`/`touchmove` (multi-touch), `wheel`+`ctrlKey`, `gesturestart`/`gesturechange`
- `useLayoutEffect (scroll)`: fires when `showSpinner=false && mapVisible=false`; reads `scrollWidth`/`scrollHeight` (forces reflow); sets `scrollLeft`/`scrollTop`
- `useEffect (reveal)`: fires when `showSpinner=false && mapVisible=false`; single RAF → `setMapVisible(true)`
- Container class: `invisible absolute` during loading, `opacity-0` while setting scroll, empty when visible
- `handleRevealStart`: sleeps 500ms (for card swap animation), no scroll
- `scrollToLandmark`: extracts the scroll logic; uses `offsetLeft`/`offsetTop`
- `scrollToLandmark` is called in overlay `growing` phase `finish` handler (after modal closed)

---

## Recommended Next Steps (Priority Order)

1. **Try `touch-action: pan-x pan-y`** on the scroll container div for zoom prevention. This is a CSS-only solution that's more reliable than JS event interception.

2. **Restructure the loading phase** so the scroll container is always in the flex flow:
   - Render the spinner as `position: fixed` instead of `flex-1`
   - Remove `invisible absolute` from the scroll container entirely
   - Use `opacity-0` on the MAP CONTENT DIV (not the scroll container) while images load
   - Scroll container is always `flex-1 overflow-auto` with stable, correct dimensions
   - Initialize scroll in a simple `useEffect` + single RAF (layout is already correct)

3. **Add temporary debug logging** (`console.log`) to `useLayoutEffect` to confirm `scrollWidth`/`clientWidth` values on the actual device. Knowing whether the values are correct at set-time vs. being reset afterward will narrow down the root cause significantly.

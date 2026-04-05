# Landmark Liftoff Animation — Debugging Notes

## The Bug

After guessing a landmark correctly, the overlay image "scales down to 0 then grows" instead of seamlessly continuing at card size and smoothly growing.

## What Was Fixed (Issue 2 — Blur)

The blur fix works: when the map landmark is larger than the modal choice card, the overlay is now physically sized to the landmark's rendered dimensions and scaled down via `initialScale = 1/scale` so it appears card-sized. WAAPI grows it back to native resolution instead of upscaling a small texture.

## What Is Still Broken (Issue 1 — Scale-0 Flash)

The overlay appears to start at or near scale 0 and then grow, rather than appearing seamlessly at card size.

---

## Attempts So Far

### Attempt 1: Inline CSS `transform: scale(initialScale)`
Added `transform: \`scale(${revealOverlay.initialScale})\`` to the overlay `<img>` style. Intent: guarantee the correct visual size from the very first browser paint before WAAPI kicks in.

**Result**: Did not fix Issue 1.

### Attempt 2: `useEffect` → `useLayoutEffect`
Changed the animation effect from `useEffect` to `useLayoutEffect`. Intent: `useLayoutEffect` fires synchronously before the browser paints, so WAAPI starts before the overlay is ever shown.

**Result**: Did not fix Issue 1.

### Attempt 3: RAF-deferred `onClose()` in MapLandmarkModal
Changed `onClose()` to `requestAnimationFrame(() => onClose())` so the modal stays open for one extra frame while the overlay mounts and starts animating.

**Result**: Did not fix Issue 1.

### Attempt 4: Promise-based overlay-ready signal
Changed `handleLiftOff` to return `Promise<void>`. The promise is stored in `overlayReadyRef`. Inside `useLayoutEffect` (growing phase), the promise is resolved immediately before WAAPI starts. `triggerCorrect` in MapLandmarkModal `await`s `onLiftOff(...)` and only calls `onClose()` after the promise resolves — guaranteeing the modal closes only after the overlay is mounted and WAAPI is running.

**Result**: Did not fix Issue 1.

### Attempt 5: `flushSync` in `handleLiftOff`
Changed `handleLiftOff` to wrap `setRevealOverlay(...)` in `flushSync(...)`. This forces React to process the state update synchronously — including DOM mutation, ref attachment, and `useLayoutEffect` execution (WAAPI start) — before `handleLiftOff` returns. `triggerCorrect` then calls `onClose()` directly (no async, no RAF). When `onClose()` is called, the overlay is guaranteed to be in the DOM with WAAPI running.

**Result**: Did not fix Issue 1.

---

## Code Architecture (as read)

### Rendering order
```
MapPage z-25   ← overlay <img> (fixed, position from overlayRect)
Modal   z-60   ← MapLandmarkModal backdrop + motion.div
```

The overlay sits **behind** the modal while the modal is open. When `onClose()` fires, the modal unmounts instantly (no Framer Motion exit animation — `motion.div` has `initial`/`animate` only, no `exit`, no `AnimatePresence`). At that moment the overlay becomes visible.

### Modal close sequence (`triggerCorrect` in MapLandmarkModal)
1. `shrinkOut()` on all distractors → scale(0.8), fill:forwards
2. `slideTo(dx)` to center correct card if needed
3. `await onReveal(element.id)` → `handleRevealStart` in MapPage → `sleep(500)`
4. `fromRect = handle.getImageRect()` — captures `imgRef.current.getBoundingClientRect()`
5. `onLiftOff(element.url, fromRect)` → `setRevealOverlay(...)` in MapPage
6. `requestAnimationFrame(() => onClose())` — modal will close next frame

### `handleLiftOff` (MapPage)
- If landmark > card: sizes `overlayRect` to landmark dimensions, sets `initialScale = 1/scale`
- If landmark ≤ card: `overlayRect = fromRect`, `initialScale = 1`
- Calls `setRevealOverlay({ src, overlayRect, initialScale, phase: 'growing', id })`

### Growing animation (`useLayoutEffect`, dep `[revealOverlay?.phase]`)
```
scale(initialScale) → scale(1.5 * initialScale), 300ms ease-out fill:forwards
onfinish: scrollToLandmark(700ms) → setRevealOverlay phase='shrinking'
```

### Shrinking animation
```
scale(peakScale) → translate(tx,ty) scale(targetScale), 600ms ease-in-out fill:forwards
targetScale = landmark.width / overlayRect.width  (≈ 1 when landmark > card)
onfinish: setRevealedIds, setRevealOverlay(null)
```

---

## Hypotheses Explored and Eliminated

### H1: `useEffect` fires after paint, exposing one frame with no WAAPI
→ Addressed by switching to `useLayoutEffect`. Didn't fix it.

### H2: Inline CSS not applied before WAAPI
→ Addressed by adding `transform: scale(initialScale)` inline. Didn't fix it.

### H3: RAF fires before `useLayoutEffect`, modal closes before overlay animation starts
→ With `useLayoutEffect` (fires before paint), WAAPI is running before the first paint regardless of RAF timing.

### H4: Modal has a scale-out close animation causing perceived "shrink to 0"
→ Checked Modal.tsx. Uses Framer Motion `motion.div` with `initial`/`animate` only, no `exit`, no `AnimatePresence`. Modal disappears **instantly** with no close animation.

### H5: `overlayRef.current` is null when `useLayoutEffect` fires
→ React attaches refs synchronously during the commit phase, before `useLayoutEffect`. Should always be non-null.

### H6: React StrictMode double-invoke restarts animation from scale 0
→ The cleanup calls `anim.cancel()` (reverting to inline CSS `scale(initialScale)`), then the effect re-runs starting WAAPI from `scale(initialScale)`. Stays at initialScale throughout. No visible jump.

### H7: The `fromRect` captures wrong dimensions (zero-size or incorrect)
→ `getImageRect()` returns `imgRef.current.getBoundingClientRect()`. The img is `w-28 h-28` with `p-1`. Should return ~112×112px.

### H8: `overlayRect.left` goes negative (off-screen) and the browser clips it
→ `position: fixed` is not clipped by ancestor `overflow: hidden`. The visual part after `scale(initialScale)` is within viewport bounds.

### H9: Two WAAPI animations competing (growing still held via fill:forwards when shrinking starts)
→ WAAPI cascade gives priority to newer animation. Shrinking overrides growing. No visual conflict.

### H10: `targetScale` is near 0 for small landmarks, animation looks like "shrinks to nothing"
→ When `initialScale < 1` (landmark > card), `overlayRect` is landmark-sized and `targetScale ≈ 1`. When `initialScale = 1` (landmark ≤ card), `targetScale = landmark.width / card.width`, which could be small. The overlay would shrink to match a small landmark. But this would be the **end** of the animation (shrinking phase), not the beginning — the user sees this after the growing phase.

---

## Current State of the Code (after Attempt 5)

- `flushSync` wraps `setRevealOverlay` in `handleLiftOff`
- `onLiftOff` is `(src, fromRect) => void` (synchronous)
- `triggerCorrect` calls `onLiftOff(...)` then `onClose()` back-to-back
- Overlay `<img>` has inline `transform: scale(initialScale)` + `willChange: 'transform'`
- Animation effect is `useLayoutEffect` with dep `[revealOverlay?.phase]`
- Growing: `scale(initialScale) → scale(peakScale)`, 300ms
- Shrinking: `scale(peakScale) → translate(tx,ty) scale(targetScale)`, 600ms

Issue 2 (blur) remains fixed. Issue 1 (scale-0 flash) persists on mobile.

---

## Remaining Unexplored Causes

### Most likely: the overlay is rendered, then React re-renders and the element is briefly unmounted/remounted

If `setRevealOverlay` is batched with another state update that causes a conflicting re-render, the `<img>` element might unmount and remount. On remount, WAAPI is gone and the element is at `transform: none` (default) for one frame.

The `{revealOverlay && <img ... />}` pattern means the element's identity depends on `revealOverlay` being truthy. If React ever processes a render where `revealOverlay` is temporarily `null` in between (e.g., due to state batching or the cleanup calling `setRevealOverlay(null)` by mistake), the element would unmount (appearing at scale 0) then remount and start over.

Worth adding a stable `key` to the overlay `<img>` to confirm identity, or checking whether any other code path calls `setRevealOverlay(null)` before the animation completes.

### Possibly: the overlay is behind the modal for the entire growing phase, then revealed already-shrunk

With `requestAnimationFrame(() => onClose())`, the modal stays open for ~16ms. The growing animation is 300ms. For ~284ms after the modal closes, the overlay is growing (visible). Then it scrolls the map (700ms). Then shrinks to the landmark (600ms).

The user's "scales to 0 then grows" might be describing something else entirely — perhaps it's perceived as the **landmark's brightness reveal** (brightness: 0% → 120%) that looks like "growing from nothing" and the "scales to 0" is the overlay shrinking to land on it.

### Possibly: `fromRect` captures the card BEFORE `slideTo` WAAPI settles

`getBoundingClientRect()` reflects WAAPI transforms. But `slideTo` has `fill: 'forwards'`. If the WAAPI engine reports the layout position (ignoring WAAPI transforms) in `getBoundingClientRect()`, the `fromRect` would be the card's original (unslid) position. The overlay would then appear offset from where the card visually is.

This would look like a jump/pop rather than "scale 0", but is worth investigating on the actual device.

---

## Suggested Next Steps

1. **Log `overlayRect`, `initialScale`, `fromRect`, and `landmarkRect`** at liftoff to confirm values are sane.

2. **Check if the element is unmounting/remounting** by adding a `key={revealOverlay?.id ?? 'none'}` to the overlay `<img>` and observing whether the animation restarts.

3. **Test with `onClose()` called immediately** (no RAF deferral) — if the visual is the same, the RAF isn't helping and might be removed.

4. **Record a screen capture** at 240fps if possible to identify exactly which frame the "scale 0" appears — this would disambiguate whether it's at the start of the growing phase, the transition between growing/shrinking, or the end (shrinking to a small landmark).

5. **Consider whether the "grows" the user sees is actually the landmark brightness reveal**, not the overlay growing. If so, the real issue is the overlay appearing too small when it first becomes visible (because modal hid it while it was near-card-size, and by the time the modal closes + scroll happens, it's already past the growing phase and in the scroll-hold period at `scale(peakScale)`).

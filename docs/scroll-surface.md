# Scroll composition

Import `src/renderer/scroll-surface.ts` once to register `mg-scroll`. Use it inside a constrained flex or grid cell with `min-height: 0`; the component fills its parent's height. Set `label` for an accessible region and scrollbar names. Slotted content remains normal document content. Both axes scroll natively through the internal viewport; the visible controls reserve 14 CSS pixels and present an 8 pixel thumb within that reachable track. Override `--mg-scroll-size` to enlarge the hit area.

```html
<div style="height: 320px; min-height: 0">
  <mg-scroll label="Repository activity"><div>Content</div></mg-scroll>
</div>
```

After `await element.updateComplete`, `element.viewport` exposes the actual `HTMLDivElement`: use `scrollTo`, `scrollTop`, `scrollLeft`, `clientHeight`, and `scrollHeight` for application navigation and browser QA. `element.measure()` refreshes control geometry synchronously. Resize and mutation observers follow the host, viewport, content wrapper, and assigned descendants, including overflowing content under fixed-size wrappers. Slot changes reconnect subscriptions; disconnecting the component releases observers and pointer capture. Native scrolling remains instantaneous under reduced motion. Thumb colors use Material 3 system tokens with application theme fallbacks.

Thumbs support pointer capture and dragging on each axis. Track clicks move one viewport page; focused controls support corresponding arrow keys, Page Up/Down, Home, and End. Hidden controls leave the tab order. Each scrollbar identifies its viewport and exposes orientation and current/minimum/maximum values. The viewport is also keyboard focusable for ordinary native scrolling.

## Popover boundary

Scrolling establishes an overflow clipping boundary. Ordinary absolutely positioned descendants, including the existing regex builder, cannot escape it through z-index. Place a search outside the scrolling region or move its builder into the browser top layer with `popover`/`showPopover()` and position it from the search's bounding rectangle. Material menus using the top layer can escape; inline menus cannot. The scroll component does not relocate search content or modify search query ownership.

## Remaining native scrolling

Call `installNativeScrollbarStyles(document)` once in application startup and retain its returned disposal function. It adds `nativeScrollbarCSS` to the document and reachable Material Web/custom open shadow roots, observes new rendered descendants, and checks custom hosts awaiting shadow attachment every 250 ms. It deliberately skips the custom viewport's shadow root so that native scrollbars remain hidden there. Cleanup removes the installed style elements and all observers/timers. Closed shadow roots cannot be reached externally.

The exported CSS can also be installed explicitly in a controlled shadow root. Native scrollbar painting is an application composition fallback, **not an official upstream Material Web component or styling API**. Chromium uses a 12 pixel native track with a 6 pixel painted thumb, token-based track/thumb colors, and hover/active states. Other browsers retain their platform painting with thin token-colored scrollbars. Forced-colors/platform preferences may override native appearance. The custom controls and fallback share Material 3 colors, while the browser continues to own native scrolling behavior.

Run `node tests/scroll-surface.browser.mjs` for real Chromium checks of both axes, keyboard navigation, pointer dragging, track paging, ARIA synchronization, content resizing, top-layer escape, native shadow styling, disposal, and reduced motion. The script uses system Chromium when available, otherwise the installed Playwright browser.

## Desktop integration

The command explorer, document viewport, task strip, and operation inspector use `mg-scroll`. A `horizontal` task strip constrains its content height to prevent an incidental vertical scrollbar. Application startup installs the native shadow scrollbar fallback and tears it down when the application element disconnects. Regex search builders use a manual top-layer popover, retaining their field-relative coordinates while escaping the scrolling clip.

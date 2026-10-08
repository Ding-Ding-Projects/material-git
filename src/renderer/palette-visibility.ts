/** Checks ancestors across shadow hosts, including kept-mounted inactive tabs. */
export function isPaletteHidden(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true' || current.localName === 'mg-workspace-palette') return true;
    current = current.parentElement ?? (current.getRootNode() as ShadowRoot).host ?? null;
  }
  return false;
}

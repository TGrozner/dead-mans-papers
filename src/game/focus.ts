const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function trapFocus(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== 'Tab' || root.hidden) {
    return
  }

  const focusableElements = getFocusableElements(root)

  if (focusableElements.length === 0) {
    event.preventDefault()
    root.focus()
    return
  }

  const activeElement = root.ownerDocument.activeElement
  const firstElement = focusableElements[0]
  const lastElement = focusableElements.at(-1)

  if (!root.contains(activeElement)) {
    event.preventDefault()
    firstElement.focus()
    return
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault()
    lastElement?.focus()
    return
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    return !element.hidden && element.getClientRects().length > 0
  })
}

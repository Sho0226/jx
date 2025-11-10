export function getRenderedDescriptionHtml(): string | null {
  const selectors = [
    '[data-test-id="issue.views.field.rich-text.description"] [data-testid="issue-field-renderer-content"]',
    '[data-test-id="issue.views.field.rich-text.description"] [data-testid="rendered-content"]',
    '[data-test-id="issue.views.field.rich-text.description"]'
  ]
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el && el.innerHTML.trim()) return el.innerHTML
  }
  // fallback（見出し「説明/Description」近傍）
  const headings = Array.from(document.querySelectorAll<HTMLElement>('h2, h3'))
  const h = headings.find((el) => /^(説明|Description)$/i.test(el.textContent || ''))
  const next = h?.parentElement?.querySelector<HTMLElement>('div, [data-testid]')
  return next?.innerHTML?.trim() ? next.innerHTML : null
}

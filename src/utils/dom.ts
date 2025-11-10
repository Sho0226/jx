let lastFocusedEditor: HTMLElement | null = null

// エディタのフォーカスを監視
export function watchEditorFocus() {
  addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement | null
    if (!el) return
    if (el.isContentEditable || el.tagName === 'TEXTAREA') {
      lastFocusedEditor = el
    }
  })
}

// 現在 or 最後にフォーカスしていたエディタを返す
export function getFocusedEditor(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null
  if (active && (active.isContentEditable || active.tagName === 'TEXTAREA')) return active
  return lastFocusedEditor
}

// エディタからHTMLを取得
export function getHtmlFromEditor(el: HTMLElement): string | null {
  if (el.isContentEditable) return el.innerHTML
  if (el.tagName === 'TEXTAREA') {
    const v = (el as HTMLTextAreaElement).value
    return v ? `<pre>${escapeHtml(v)}</pre>` : ''
  }
  return null
}

// 表示状態の説明HTML（フォールバック用）
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

  const headings = Array.from(document.querySelectorAll<HTMLElement>('h2, h3'))
  const h = headings.find((el) => /^(説明|Description)$/i.test(el.textContent || ''))
  const next = h?.parentElement?.querySelector<HTMLElement>('div, [data-testid]')
  return next?.innerHTML?.trim() ? next.innerHTML : null
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

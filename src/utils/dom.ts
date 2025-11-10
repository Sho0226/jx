export function getSelectedHtmlOrNull(): string | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  const container = document.createElement('div')
  container.appendChild(range.cloneContents())
  return container.innerHTML
}

export function findJiraEditors(): HTMLElement[] {
  const editors: HTMLElement[] = []

  // Atlassian Cloud（contenteditable）
  document.querySelectorAll<HTMLElement>('[contenteditable="true"]').forEach((el) => {
    if (
      el.closest('[data-test-id="jira-issue-view"]') ||
      el.closest('.ak-editor-content-area') ||
      el.closest('[data-test-id*="comment"]')
    ) {
      editors.push(el)
    }
  })

  // レガシーの textarea
  document.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((ta) => {
    const hint = ta.name || ta.id || ta.ariaLabel || ''
    if (/comment|description|編集|コメント/i.test(hint)) {
      editors.push(ta as unknown as HTMLElement)
    }
  })

  return Array.from(new Set(editors))
}

export function ensureButton(host: HTMLElement, onClick: () => void): void {
  const key = 'jira-gfm-copy-btn'
  if (host.closest(`[data-${key}]`)) return

  const mount = document.createElement('span')
  mount.setAttribute(`data-${key}`, '1')
  mount.style.marginLeft = '8px'

  const shadow = mount.attachShadow({ mode: 'open' })
  const btn = document.createElement('button')
  btn.textContent = 'GitHub用にコピー'
  btn.style.padding = '6px 10px'
  btn.style.borderRadius = '8px'
  btn.style.border = '1px solid rgba(0,0,0,.15)'
  btn.style.cursor = 'pointer'
  btn.style.fontSize = '12px'
  btn.addEventListener('click', onClick)
  shadow.appendChild(btn)

  const parent = host.closest('[data-test-id*="comment"], .ak-editor, .ak-editor-content-area')
  if (parent) (parent as HTMLElement).appendChild(mount)
  else host.parentElement?.appendChild(mount)
}

export function getHtmlFromEditor(el: HTMLElement): string | null {
  if (el.isContentEditable) return el.innerHTML
  if (el.tagName === 'TEXTAREA') {
    const v = (el as HTMLTextAreaElement).value
    return v ? `<pre>${escapeHtml(v)}</pre>` : ''
  }
  return null
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

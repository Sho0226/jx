let lastFocusedEditor: HTMLElement | null = null

// エディタのフォーカスを監視（コメント入力含む）
export function watchEditorFocus() {
  addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement | null
    if (!t) return
    if (t.isContentEditable || t.tagName === 'TEXTAREA') {
      lastFocusedEditor = t
      return
    }
    // コメント入力の内側にある要素 → 最寄りの contenteditable を覚える
    const ce = t.closest<HTMLElement>('[data-testid*="comment"], [data-test-id*="comment"] [contenteditable="true"], [contenteditable="true"]')
    if (ce && ce.isContentEditable) {
      lastFocusedEditor = ce
    }
  })
}

export function getFocusedEditor(): HTMLElement | null {
  const a = document.activeElement as HTMLElement | null
  if (a && (a.isContentEditable || a.tagName === 'TEXTAREA')) return a
  return lastFocusedEditor
}

// エディタからHTML取得（textareaは<pre>で包む）
export function getHtmlFromEditor(el: HTMLElement): string | null {
  if (el.isContentEditable) return el.innerHTML
  if (el.tagName === 'TEXTAREA') {
    const v = (el as HTMLTextAreaElement).value
    return v ? `<pre>${escapeHtml(v)}</pre>` : ''
  }
  return null
}

// --- 説明（表示状態） ---
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
  // fallback: 見出しから辿る
  const headings = Array.from(document.querySelectorAll<HTMLElement>('h2, h3'))
  const h = headings.find((el) => /^(説明|Description)$/i.test(el.textContent || ''))
  const next = h?.parentElement?.querySelector<HTMLElement>('div, [data-testid]')
  return next?.innerHTML?.trim() ? next.innerHTML : null
}

// --- コメント（表示状態） ---
// コメントアイテム候補（新旧UIを広めに）
const COMMENT_ITEM_SEL = [
  '[data-testid="issue-view-comments-list"] [data-testid="issue-view-comment"]',
  '[data-testid*="issue-activity"] [data-testid*="comment"]',
  '[data-test-id*="issue.activity"][data-test-id*="comment"]',
  '[data-test-id*="comment-item"]',
  '[data-testid*="comment-item"]',
  // 汎用フォールバック
  '[data-test-id*="comment"]',
  '[data-testid*="comment"]'
]

// コメント本文候補
const COMMENT_BODY_SEL = [
  '[data-testid="issue-field-renderer-content"]',
  '[data-testid="rendered-content"]',
  '[data-testid*="renderer"]',
  '.ak-renderer-document',
  'article',
  '.ProseMirror', // 稀にそのまま
  'div'
]

// selection/focus から一番近いコメント本文を拾う
export function getNearestCommentHtmlFrom(node: Node | null): string | null {
  if (!node) return null
  const el = node instanceof HTMLElement ? node : (node.parentElement as HTMLElement | null)
  if (!el) return null

  // 自分自身が本文のとき
  for (const s of COMMENT_BODY_SEL) {
    if (el.matches?.(s) && el.innerHTML?.trim()) return el.innerHTML
  }

  // 祖先方向にコメントアイテムを探し本文抽出
  const item = el.closest<HTMLElement>(COMMENT_ITEM_SEL.join(','))
  if (item) {
    const body = queryFirstHtml(item, COMMENT_BODY_SEL)
    if (body) return body
  }

  // 近傍：直近の兄弟や親の下を軽く探す
  const parent = el.closest<HTMLElement>('section, article, div, [data-testid], [data-test-id]')
  if (parent) {
    const near = queryFirstHtml(parent, COMMENT_BODY_SEL)
    if (near) return near
  }

  return null
}

// 最新の（空でない）コメント本文
export function getRenderedLatestCommentHtml(): string | null {
  for (const isel of COMMENT_ITEM_SEL) {
    const items = Array.from(document.querySelectorAll<HTMLElement>(isel)).reverse()
    for (const item of items) {
      const body = queryFirstHtml(item, COMMENT_BODY_SEL)
      if (body) return body
    }
  }
  return null
}

// コメントアイテム列挙（個別ボタン用で使いたい場合）
export function findCommentItems(): HTMLElement[] {
  const set = new Set<HTMLElement>()
  for (const s of COMMENT_ITEM_SEL) {
    document.querySelectorAll<HTMLElement>(s).forEach((n) => set.add(n))
  }
  return Array.from(set)
}

function queryFirstHtml(root: HTMLElement, sels: string[]): string | null {
  for (const s of sels) {
    const el = root.querySelector<HTMLElement>(s)
    if (el && el.innerHTML && el.innerHTML.trim()) return el.innerHTML
  }
  return null
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

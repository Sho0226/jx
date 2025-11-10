// ====== 自社DOM（優先） ======
// コメント行のアクションバー: issue-comment-base ui comment custom-comment 84361 comment-actions
// 数字クラス(例: 84361)は可変なので無視し、その他のクラスが全部付いた要素を狙う
const COMMENT_ACTION_BAR_STRICT =
  '.issue-comment-base.ui.comment.custom-comment.comment-actions'

// 説明のヘッダ行: issue-view-base common description heading-wrapper
const DESC_HEADING_WRAPPER_STRICT =
  '.issue-view-base.common.description.heading-wrapper'

// ====== 既存の汎用フォールバック ======
const COMMENT_ITEM_SEL = [
  '[data-testid="issue-view-comment"]',
  '[data-testid*="comment-item"]',
  '[data-test-id*="comment-item"]',
  '[data-test-id*="comment"][data-testid]'
]

const COMMENT_BODY_SEL = [
  '[data-testid="issue-field-renderer-content"]',
  '[data-testid="rendered-content"]',
  '[data-testid*="renderer"]',
  '.ak-renderer-document',
  'article'
]

// ---- 説明：ブロック・本文・バー ----
export function getRenderedDescriptionBlock(): HTMLElement | null {
  const strict = document.querySelector<HTMLElement>(DESC_HEADING_WRAPPER_STRICT)
  if (strict) return strict.closest<HTMLElement>('[data-testid],[data-test-id]') || strict

  const wrappers = [
    '[data-test-id="issue.views.field.rich-text.description"]',
    '[data-testid="issue.views.field.rich-text.description"]'
  ]
  for (const w of wrappers) {
    const el = document.querySelector<HTMLElement>(w)
    if (el) return el
  }
  const headings = Array.from(document.querySelectorAll<HTMLElement>('h2, h3'))
  const h = headings.find((n) => /^(説明|Description)$/i.test(n.textContent || ''))
  return h ? (h.closest('[data-testid],[data-test-id]') || h.parentElement || h) : null
}

export function getDescriptionContentHtml(block: HTMLElement): string | null {
  const cands = [
    '[data-testid="issue-field-renderer-content"]',
    '[data-testid="rendered-content"]',
    '.ak-renderer-document',
    'article'
  ]
  for (const s of cands) {
    const el = block.querySelector<HTMLElement>(s)
    if (el?.innerHTML?.trim()) return el.innerHTML
  }
  return null
}

export function findDescriptionActionBar(block: HTMLElement): HTMLElement | null {
  // 1) 自社DOMのヘッダ行
  const strictBar =
    block.matches(DESC_HEADING_WRAPPER_STRICT)
      ? block
      : block.querySelector<HTMLElement>(DESC_HEADING_WRAPPER_STRICT)
  if (strictBar) return strictBar

  // 2) block 内の toolbar
  const tb = block.querySelector<HTMLElement>('[role="toolbar"]')
  if (tb) return tb

  // 3) data-testid 系
  const acts = block.querySelector<HTMLElement>('[data-testid$="actions"], [data-test-id$="actions"]')
  if (acts) return acts

  // 4) 緩いフォールバック
  const loose = block.querySelector<HTMLElement>('[data-testid*="actions"], [data-test-id*="actions"], [aria-label="More actions"]')
  return loose || null
}

// ---- コメント：アイテム・本文・バー ----
export function findAllCommentItems(): HTMLElement[] {
  const set = new Set<HTMLElement>()
  // 自社DOMでは comment-actions の親がコメントカードの場合がある
  document.querySelectorAll<HTMLElement>(COMMENT_ACTION_BAR_STRICT).forEach((bar) => {
    const item = bar.closest<HTMLElement>('.issue-comment-base.ui.comment.custom-comment') || bar
    set.add(item)
  })
  for (const s of COMMENT_ITEM_SEL) {
    document.querySelectorAll<HTMLElement>(s).forEach((n) => set.add(n))
  }
  return Array.from(set)
}

export function getCommentBodyHtml(item: HTMLElement): string | null {
  for (const s of COMMENT_BODY_SEL) {
    const el = item.querySelector<HTMLElement>(s)
    if (el?.innerHTML?.trim()) return el.innerHTML
  }
  // 自社DOM: 本文が article 等直下にあるケース
  const fallback = item.querySelector<HTMLElement>('article, .ak-renderer-document, [data-testid*="content"]')
  return fallback?.innerHTML?.trim() ? fallback.innerHTML : null
}

export function findCommentActionBar(item: HTMLElement): HTMLElement | null {
  // 1) 自社DOMの comment-actions を最優先
  const strict = item.querySelector<HTMLElement>(COMMENT_ACTION_BAR_STRICT)
  if (strict) return strict

  // 2) header 内 toolbar / group
  const header = item.querySelector<HTMLElement>('header')
  if (header) {
    const tb = header.querySelector<HTMLElement>('[role="toolbar"], [role="group"]')
    if (tb) return tb
    const acts = header.querySelector<HTMLElement>('[data-testid$="actions"], [data-test-id$="actions"]')
    if (acts) return acts
  }
  // 3) item直下の toolbar / actions
  const tb2 = item.querySelector<HTMLElement>('[role="toolbar"], [role="group"]')
  if (tb2) return tb2
  const acts2 = item.querySelector<HTMLElement>('[data-testid$="actions"], [data-test-id$="actions"]')
  if (acts2) return acts2

  // 4) 緩いフォールバック
  const loose = item.querySelector<HTMLElement>('[data-testid*="actions"], [data-test-id*="actions"], [aria-label="More actions"]')
  return loose || null
}

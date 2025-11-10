// src/content-script.ts
import { htmlToGfm } from './converter'

// ==== 固定セレクタ（あなたの環境） ====
const DESC_BAR_SEL =
  '[data-testid="issue-view-base.common.description.heading-wrapper"]'

const COMMENT_ACTION_BAR_SEL =
  '[data-testid^="issue-comment-base.ui.comment.custom-comment."][data-testid$=".comment-actions"]'

// ==== 重複防止 ====
const processedBars = new WeakSet<HTMLElement>()

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

function showToast(msg: string) {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.right = '16px'
  host.style.bottom = '16px'
  host.style.zIndex = '2147483647'
  const sh = host.attachShadow({ mode: 'open' })
  const el = document.createElement('div')
  el.textContent = msg
  el.style.padding = '10px 12px'
  el.style.background = 'rgba(0,0,0,.85)'
  el.style.color = '#fff'
  el.style.borderRadius = '10px'
  el.style.fontSize = '12px'
  sh.appendChild(el)
  document.body.appendChild(host)
  setTimeout(() => host.remove(), 1200)
}

function makeIconButton(title: string, onClick: () => void) {
  const mount = document.createElement('span')
  mount.setAttribute('data-jira-gfm-copy', '1')
  mount.style.display = 'inline-flex'
  mount.style.alignItems = 'center'
  mount.style.marginLeft = '6px'

  const sh = mount.attachShadow({ mode: 'open' })
  const btn = document.createElement('button')
  btn.title = title
  btn.style.width = '24px'
  btn.style.height = '24px'
  btn.style.border = 'none'
  btn.style.background = 'transparent'
  btn.style.cursor = 'pointer'
  btn.style.borderRadius = '6px'
  btn.style.display = 'inline-flex'
  btn.style.alignItems = 'center'
  btn.style.justifyContent = 'center'
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 1H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2V7l-4-6zM8 3h8v2H8V3zm6 17H4V7h2v8h8v5zm2-4H8V7h6V2.5L20 8v6z"></path>
    </svg>`
  btn.addEventListener('click', onClick)
  sh.appendChild(btn)
  return mount
}

/* -------------------- 説明（Description） -------------------- */

// 見出しバーから renderer
function findDescriptionRendererRootFromBar(bar: HTMLElement): HTMLElement | null {
  const sib = bar.parentElement?.nextElementSibling as HTMLElement | null
  const a = sib?.querySelector<HTMLElement>('[data-testid="issue.views.field.rich-text.description"]')
  if (a) return a
  const up = bar.parentElement?.parentElement as HTMLElement | null
  const b = up?.querySelector<HTMLElement>('[data-testid="issue.views.field.rich-text.description"]')
  if (b) return b
  const region = bar.closest<HTMLElement>('[role="region"]')
  const c = region?.querySelector<HTMLElement>('[data-testid="issue.views.field.rich-text.description"]')
  if (c) return c
  return document.querySelector<HTMLElement>('[data-testid="issue.views.field.rich-text.description"]')
}

function pickRendererHtml(root: HTMLElement | null): string | null {
  if (!root) return null
  const cands = [
    '[data-testid="issue-field-renderer-content"]',
    '[data-testid="rendered-content"]',
    '.ak-renderer-document',
    'article',
    'div'
  ]
  for (const s of cands) {
    const el = root.querySelector<HTMLElement>(s)
    if (el?.innerHTML?.trim()) return el.innerHTML
  }
  return null
}

// 見出しバーから ProseMirror
function findDescriptionEditorFromBar(bar: HTMLElement): HTMLElement | null {
  const PM = '#ak-editor-textarea.ProseMirror,[role="textbox"][contenteditable="true"][id="ak-editor-textarea"],[data-editor-id][contenteditable="true"].ProseMirror,[role="textbox"][contenteditable="true"].ProseMirror'
  const sib = bar.parentElement?.nextElementSibling as HTMLElement | null
  const a = sib?.querySelector<HTMLElement>(PM)
  if (a) return a
  const up = bar.parentElement?.parentElement as HTMLElement | null
  const b = up?.querySelector<HTMLElement>(PM)
  if (b) return b
  const region = bar.closest<HTMLElement>('[role="region"]')
  const c = region?.querySelector<HTMLElement>(PM)
  if (c) return c
  return document.querySelector<HTMLElement>(PM)
}

function ensureDescriptionButton() {
  const bar = document.querySelector<HTMLElement>(DESC_BAR_SEL)
  if (!bar || processedBars.has(bar) || bar.querySelector('[data-jira-gfm-copy]')) return

  const mount = makeIconButton('説明をGFMでコピー', async () => {
    const rendererRoot = findDescriptionRendererRootFromBar(bar)
    const rendererHtml = pickRendererHtml(rendererRoot)
    const pmEl = rendererHtml ? null : findDescriptionEditorFromBar(bar)
    const html = rendererHtml ?? pmEl?.innerHTML?.trim()

    if (!html) { showToast('説明が見つかりません'); return }
    const gfm = htmlToGfm(html)
    await copyToClipboard(gfm)
    showToast('説明をGFMでコピーしました')
  })

  bar.appendChild(mount)
  processedBars.add(bar)
}

/* -------------------- コメント（Comment actions） -------------------- */
/** アクション行から“前方（兄・叔父・祖父の兄弟）”を優先して本文を探す */
function findNearestCommentBodyFromBar(bar: HTMLElement): HTMLElement | null {
  const BODY_SEL = [
    '[data-testid="issue-field-renderer-content"]',
    '[data-testid="rendered-content"]',
    '[data-testid*="renderer"]',
    '.ak-renderer-document',
    'article'
  ].join(',')

  // 1) 同じ親の「前の兄弟」たちを上から順にチェック（最大 8 個）
  let p: HTMLElement | null = bar.parentElement as HTMLElement | null
  if (p) {
    let prev: HTMLElement | null = bar.previousElementSibling as HTMLElement | null
    let hop = 0
    while (prev && hop < 8) {
      const hit = prev.querySelector<HTMLElement>(BODY_SEL)
      if (hit?.innerHTML?.trim()) return hit
      prev = prev.previousElementSibling as HTMLElement | null
      hop++
    }
  }

  // 2) 親の「前の兄弟」を遡って探す（最大 4 親 * 各 8 兄弟）
  let ancestor: HTMLElement | null = bar.parentElement as HTMLElement | null
  let depth = 0
  while (ancestor && depth < 4) {
    let sib: HTMLElement | null = ancestor.previousElementSibling as HTMLElement | null
    let hop = 0
    while (sib && hop < 8) {
      const hit = sib.querySelector<HTMLElement>(BODY_SEL)
      if (hit?.innerHTML?.trim()) return hit
      sib = sib.previousElementSibling as HTMLElement | null
      hop++
    }
    ancestor = ancestor.parentElement as HTMLElement | null
    depth++
  }

  // 3) 同一“コメントカード”らしき領域を広めに探す（data-testid の共通 prefix で囲われているケース）
  const card =
    bar.closest<HTMLElement>('[data-testid^="issue-comment-base.ui.comment.custom-comment."]') ||
    bar.closest<HTMLElement>('[data-testid*="comment"]') ||
    bar.closest<HTMLElement>('[role="group"],[role="article"],[data-component-selector]')
  if (card) {
    const hit = card.querySelector<HTMLElement>(BODY_SEL)
    if (hit?.innerHTML?.trim()) return hit
  }

  // 4) 最後のフォールバック：barの祖先の中を狭範囲検索
  const near =
    bar.closest<HTMLElement>('[data-testid],[role="group"],section,article,div') || bar.parentElement
  const hit = near?.querySelector<HTMLElement>(BODY_SEL)
  return hit?.innerHTML?.trim() ? hit : null
}

function ensureCommentButtons() {
  document.querySelectorAll<HTMLElement>(COMMENT_ACTION_BAR_SEL).forEach((bar) => {
    if (processedBars.has(bar) || bar.querySelector('[data-jira-gfm-copy]')) return

    const mount = makeIconButton('このコメントをGFMでコピー', async () => {
      // 閲覧表示（renderer）の本文を“前方探索”で拾う
      const bodyEl = findNearestCommentBodyFromBar(bar)

      // 編集中なら ProseMirror も見る（コメント編集フォーム内）
      const PM_SEL =
        '#ak-editor-textarea.ProseMirror,[role="textbox"][contenteditable="true"][id="ak-editor-textarea"],[data-editor-id][contenteditable="true"].ProseMirror,[role="textbox"][contenteditable="true"].ProseMirror'
      const formPM =
        bodyEl ? null : (bar.closest<HTMLElement>('form, [data-editor-content-component]')?.querySelector<HTMLElement>(PM_SEL) || null)

      const html = bodyEl?.innerHTML?.trim() || formPM?.innerHTML?.trim() || null
      if (!html) { showToast('コメント本文が見つかりません'); return }

      const gfm = htmlToGfm(html)
      await copyToClipboard(gfm)
      showToast('コメントをGFMでコピーしました')
    })

    bar.appendChild(mount)
    processedBars.add(bar)
  })
}

/* -------------------- 監視（1フレーム集約） -------------------- */
let scheduled = false
function schedule() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    ensureDescriptionButton()
    ensureCommentButtons()
  })
}

function bootstrap() {
  schedule()
  const mo = new MutationObserver(() => schedule())
  mo.observe(document.documentElement, { childList: true, subtree: true })
}
bootstrap()

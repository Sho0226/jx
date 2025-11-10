import {
  getFocusedEditor,
  getHtmlFromEditor,
  getRenderedDescriptionHtml,
  watchEditorFocus
} from './utils/dom'
import { htmlToGfm } from './converter'

watchEditorFocus()

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

function findActionBars(): HTMLElement[] {
  const arr: HTMLElement[] = []
  document.querySelectorAll<HTMLElement>('[data-test-id="issue-view"] header').forEach(h => {
    const tb = h.querySelector<HTMLElement>('[role="toolbar"], [data-testid*="actions"], [data-test-id*="actions"]')
    if (tb) arr.push(tb)
  })
  document.querySelectorAll<HTMLElement>('[data-test-id*="actions"]').forEach(el => arr.push(el))
  return Array.from(new Set(arr))
}

function ensureActionBarButton(bar: HTMLElement) {
  const KEY = 'data-jira-gfm-copy-action'
  if (bar.querySelector(`[${KEY}]`)) return

  const mount = document.createElement('span')
  mount.setAttribute(KEY, '1')
  mount.style.display = 'inline-flex'
  mount.style.alignItems = 'center'
  mount.style.marginLeft = '8px'

  const sh = mount.attachShadow({ mode: 'open' })
  const btn = document.createElement('button')
  btn.title = 'エディタまたは説明をGFMでコピー'
  btn.style.width = '28px'
  btn.style.height = '28px'
  btn.style.border = 'none'
  btn.style.background = 'transparent'
  btn.style.cursor = 'pointer'
  btn.style.borderRadius = '6px'
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 1H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2V7l-4-6zM8 3h8v2H8V3zm6 17H4V7h2v8h8v5zm2-4H8V7h6V2.5L20 8v6z"></path>
  </svg>`

  btn.addEventListener('click', async () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0)
      const c = document.createElement('div')
      c.appendChild(range.cloneContents())
      const gfm = htmlToGfm(c.innerHTML)
      await copyToClipboard(gfm)
      showToast('選択範囲をGFMでコピーしました')
      return
    }

    const editor = getFocusedEditor()
    if (editor) {
      const htmlOrPre = getHtmlFromEditor(editor)
      if (htmlOrPre && htmlOrPre.trim()) {
        const gfm = htmlToGfm(htmlOrPre)
        await copyToClipboard(gfm)
        showToast('エディタ内容をGFMでコピーしました')
        return
      }
    }

    const desc = getRenderedDescriptionHtml()
    if (desc && desc.trim()) {
      const gfm = htmlToGfm(desc)
      await copyToClipboard(gfm)
      showToast('説明をGFMでコピーしました')
      return
    }

    showToast('コピー対象が見つかりません')
  })

  sh.appendChild(btn)
  bar.appendChild(mount)
}

function bootstrap() {
  findActionBars().forEach(ensureActionBarButton)
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of Array.from(r.addedNodes)) {
        if (n instanceof HTMLElement) {
          if (n.matches('[data-test-id*="actions"], [role="toolbar"]')) ensureActionBarButton(n)
          n.querySelectorAll<HTMLElement>('[data-test-id*="actions"], [role="toolbar"]').forEach(ensureActionBarButton)
        }
      }
    }
  })
  mo.observe(document.documentElement, { childList: true, subtree: true })
}

bootstrap()

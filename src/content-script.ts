import { getRenderedDescriptionHtml } from './utils/dom'
import { htmlToGfm } from './converter'

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
  btn.title = '説明をGFMでコピー'
  btn.setAttribute('aria-label', '説明をGFMでコピー')
  btn.style.width = '28px'
  btn.style.height = '28px'
  btn.style.border = 'none'
  btn.style.background = 'transparent'
  btn.style.cursor = 'pointer'
  btn.style.borderRadius = '6px'
  btn.style.display = 'inline-flex'
  btn.style.alignItems = 'center'
  btn.style.justifyContent = 'center'
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 1H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2V7l-4-6zM8 3h8v2H8V3zm6 17H4V7h2v8h8v5zm2-4H8V7h6V2.5L20 8v6z"></path>
  </svg>`

  btn.addEventListener('click', async () => {
    const html = getRenderedDescriptionHtml()
    if (!html) { showToast('説明が見つかりません'); return }
    const gfm = htmlToGfm(html)
    await copyToClipboard(gfm)
    showToast('説明をGFMでコピーしました')
  })

  sh.appendChild(btn)
  bar.appendChild(mount)
}

function bootstrap() {
  findActionBars().forEach(ensureActionBarButton)

  // SPA遷移対応（アクションバーだけ監視）
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

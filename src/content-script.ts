import { getSelectedHtmlOrNull, findJiraEditors, ensureButton, getHtmlFromEditor } from './utils/dom'
import { htmlToGfm, plaintextToGfm } from './converter'


async function copyToClipboard(text: string) {
try {
await navigator.clipboard.writeText(text)
} catch (e) {
// フォールバック
const ta = document.createElement('textarea')
ta.value = text
document.body.appendChild(ta)
ta.select()
document.execCommand('copy')
ta.remove()
}
}


function setupForEditor(el: HTMLElement) {
ensureButton(el, async () => {
const selectedHtml = getSelectedHtmlOrNull()
let gfm = ''


if (selectedHtml && selectedHtml.trim()) {
gfm = htmlToGfm(selectedHtml)
} else {
const htmlOrText = getHtmlFromEditor(el)
if (!htmlOrText) return
// `<pre>` でラップされた場合は実質プレーン扱い
if (htmlOrText.startsWith('<pre>')) {
const txt = htmlOrText.replace(/^<pre>|<\/pre>$/g, '')
gfm = plaintextToGfm(txt)
} else {
gfm = htmlToGfm(htmlOrText)
}
}


await copyToClipboard(gfm)
// 軽いフィードバック
showToast('GFMをコピーしました')
})
}


function showToast(msg: string) {
const host = document.createElement('div')
host.style.position = 'fixed'
host.style.right = '16px'
host.style.bottom = '16px'
host.style.zIndex = '2147483647'
const sh = host.attachShadow({mode:'open'})
const el = document.createElement('div')
el.textContent = msg
el.style.padding = '10px 12px'
el.style.background = 'rgba(0,0,0,.85)'
el.style.color = '#fff'
el.style.borderRadius = '10px'
el.style.fontSize = '12px'
sh.appendChild(el)
document.body.appendChild(host)
setTimeout(() => host.remove(), 1500)
}


function bootstrap() {
// 初回
findJiraEditors().forEach(setupForEditor)


// シングルページ遷移やエディタ動的生成に追従
const mo = new MutationObserver(() => {
findJiraEditors().forEach(setupForEditor)
})
mo.observe(document.documentElement, { childList: true, subtree: true })
}


bootstrap()
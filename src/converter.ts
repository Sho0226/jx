import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

let td: TurndownService | null = null
let JIRA_BASE = 'https://your-company.atlassian.net'
export function setJiraBase(url: string) { JIRA_BASE = url.replace(/\/$/, '') }

function ensureTd() {
  if (td) return td
  td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**'
  })
  td.use(gfm)
  return td
}

function normalizeCheckbox(html: string) {
  return html
    .replace(/<input[^>]*type="checkbox"[^>]*checked[^>]*>\s*/g, '[x] ')
    .replace(/<input[^>]*type="checkbox"[^>]*>\s*/g, '[ ] ')
}

function linkIssueKeys(md: string) {
  return md.replace(/\b([A-Z][A-Z0-9]+-\d+)\b/g, (m) => `[${m}](${JIRA_BASE}/browse/${m})`)
}

export function htmlToGfm(html: string) {
  const pre = normalizeCheckbox(html)
  const out = ensureTd().turndown(pre)
  return linkIssueKeys(out)
}

export function htmlToJira(html: string): string {
  // デバッグ: HTMLの内容を確認
  console.log('=== HTML to JIRA conversion ===')
  console.log('Input HTML:', html.substring(0, 1000))

  const temp = document.createElement('div')
  temp.innerHTML = html

  function processNode(node: Node, inList = false): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || ''
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName.toLowerCase()

      // JIRAのレンダラー特有のクラスをスキップ
      const className = el.className || ''
      if (className.includes('ak-renderer') || className.includes('css-')) {
        // ラッパー要素はスキップして子要素を処理
        return Array.from(el.childNodes).map(n => processNode(n, inList)).join('')
      }

      const children = Array.from(el.childNodes).map(n => processNode(n, inList)).join('')

      switch (tag) {
        case 'h1': return `h1. ${children.trim()}\n\n`
        case 'h2': return `h2. ${children.trim()}\n\n`
        case 'h3': return `h3. ${children.trim()}\n\n`
        case 'h4': return `h4. ${children.trim()}\n\n`
        case 'h5': return `h5. ${children.trim()}\n\n`
        case 'h6': return `h6. ${children.trim()}\n\n`
        case 'strong':
        case 'b': return `*${children}*`
        case 'em':
        case 'i': return `_${children}_`
        case 'u': return `+${children}+`
        case 's':
        case 'strike':
        case 'del': return `-${children}-`
        case 'code': return `{{${children}}}`
        case 'pre': {
          // codeタグを含む場合はその中身を取得
          const codeEl = el.querySelector('code')
          const content = codeEl ? codeEl.textContent : el.textContent
          return `{code}\n${content}\n{code}\n\n`
        }
        case 'a': {
          const href = el.getAttribute('href') || ''
          if (!href || href === '#') return children
          return `[${children}|${href}]`
        }
        case 'ul': {
          const items = Array.from(el.querySelectorAll(':scope > li')).map(li => {
            const content = Array.from(li.childNodes).map(n => processNode(n, true)).join('').trim()
            return `* ${content}`
          }).join('\n')
          return items + '\n\n'
        }
        case 'ol': {
          const items = Array.from(el.querySelectorAll(':scope > li')).map(li => {
            const content = Array.from(li.childNodes).map(n => processNode(n, true)).join('').trim()
            return `# ${content}`
          }).join('\n')
          return items + '\n\n'
        }
        case 'li':
          // リスト内のliはulやolで処理されるためスキップ
          return inList ? children : `* ${children.trim()}\n`
        case 'blockquote': return `{quote}\n${children.trim()}\n{quote}\n\n`
        case 'p': return `${children.trim()}\n\n`
        case 'br': return '\n'
        case 'hr': return '----\n\n'
        case 'div':
          // divはそのまま子要素を返す
          return children
        case 'span':
          // spanもそのまま子要素を返す
          return children
        case 'img': {
          const src = el.getAttribute('src') || el.getAttribute('data-src') || ''
          const alt = el.getAttribute('alt') || ''
          if (!src) return ''
          return `!${src}${alt ? `|alt=${alt}` : ''}!`
        }
        case 'table': {
          const rows = Array.from(el.querySelectorAll('tr'))
          return rows.map((tr) => {
            const cells = Array.from(tr.querySelectorAll('th, td'))
            const row = cells.map(cell => {
              const content = Array.from(cell.childNodes).map(n => processNode(n, inList)).join('').trim()
              return cell.tagName.toLowerCase() === 'th' ? `||${content}||` : `|${content}|`
            }).join('')
            return row
          }).join('\n') + '\n\n'
        }
        default:
          // 不明なタグは子要素をそのまま返す
          return children
      }
    }

    return ''
  }

  const result = processNode(temp)
  // 連続する改行を整理
  const cleaned = result.replace(/\n{3,}/g, '\n\n').trim()
  console.log('Output JIRA Markdown:', cleaned.substring(0, 1000))
  return cleaned
}

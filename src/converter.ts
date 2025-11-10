import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**'
})

td.use(gfm)

// JIRA特有（人名メンションなど）の簡易変換例：必要に応じて増やす
td.addRule('jiraMentions', {
  filter: (node: Node) =>
    node.nodeType === 1 &&
    (node as HTMLElement).matches('a[href*="/people/"]'),
  replacement: (content: string, node: Node) => {
    const el = node as HTMLAnchorElement
    const name = el.textContent.trim()
    return name ? `@${name}` : content
  }
})

export function htmlToGfm(html: string): string {
  return td.turndown(html)
}

export function plaintextToGfm(text: string): string {
  // textarea系の純テキスト入力は基本そのまま（必要なら整形）
  return text
}

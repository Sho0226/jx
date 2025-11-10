import TurndownService from 'turndown'
// @ts-ignore
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

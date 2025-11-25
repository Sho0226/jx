// src/content-script.ts
import { htmlToGfm } from "./converter";

// ==== 固定セレクタ（あなたの環境） ====
const DESC_BAR_SEL =
  '[data-testid="issue-view-base.common.description.heading-wrapper"]';

const COMMENT_ACTION_BAR_SEL =
  '[data-testid^="issue-comment-base.ui.comment.custom-comment."][data-testid$=".comment-actions"]';

// ==== 重複防止 ====
const processedBars = new WeakSet<HTMLElement>();

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

function cleanHtmlForJira(html: string): string {
  // 一時的なdiv要素を作成してHTMLをパース
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // JIRAのレンダラー特有のラッパー要素を除去
  const removeWrappers = (parent: Element) => {
    const children = Array.from(parent.children);

    for (let i = children.length - 1; i >= 0; i--) {
      const node = children[i];
      const className = node.className || '';
      const nodeName = node.nodeName.toLowerCase();

      // 不要な要素を削除
      if (nodeName === 'style' || nodeName === 'script') {
        node.remove();
        continue;
      }

      // JIRAレンダラーのラッパークラスの場合、子要素を展開
      const isWrapper =
        className.includes('ak-renderer') ||
        /^css-/.test(className) ||
        /\bcss-\w+/.test(className);

      if (isWrapper && (nodeName === 'div' || nodeName === 'span')) {
        // 子要素を取得
        const childNodes = Array.from(node.childNodes);

        // 子要素を親の同じ位置に挿入
        childNodes.forEach(child => {
          parent.insertBefore(child, node);
        });

        // 元のノードを削除
        node.remove();
      } else {
        // それ以外の要素は再帰的に処理
        removeWrappers(node);
      }
    }
  };

  removeWrappers(temp);

  const cleaned = temp.innerHTML.trim();
  console.log('=== Cleaned HTML for JIRA ===');
  console.log('Original length:', html.length);
  console.log('Cleaned length:', cleaned.length);
  console.log('Cleaned HTML (first 500 chars):', cleaned.substring(0, 500));

  return cleaned;
}

async function copyAsJiraNative(html: string) {
  try {
    // HTMLをクリーンアップ
    const cleanedHtml = cleanHtmlForJira(html);

    // JIRAのネイティブコピーを再現: HTMLとプレーンテキストの両方をクリップボードに書き込む
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([cleanedHtml], { type: 'text/html' }),
      'text/plain': new Blob([cleanedHtml], { type: 'text/plain' })
    });
    await navigator.clipboard.write([clipboardItem]);
  } catch (err) {
    console.error('Failed to copy as JIRA native format:', err);
    // フォールバック: 通常のコピー
    await copyToClipboard(html);
  }
}

function showToast(msg: string) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.right = "16px";
  host.style.bottom = "16px";
  host.style.zIndex = "2147483647";
  const sh = host.attachShadow({ mode: "open" });
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.padding = "10px 12px";
  el.style.background = "rgba(0,0,0,.85)";
  el.style.color = "#fff";
  el.style.borderRadius = "10px";
  el.style.fontSize = "12px";
  sh.appendChild(el);
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1200);
}

function makeIconButton(title: string, icon: string, onClick: () => void) {
  const mount = document.createElement("span");
  mount.setAttribute("data-jira-gfm-copy", "1");
  mount.style.display = "inline-flex";
  mount.style.alignItems = "center";
  mount.style.marginLeft = "6px";

  const sh = mount.attachShadow({ mode: "open" });
  const btn = document.createElement("button");
  btn.title = title;
  btn.style.width = "28px";
  btn.style.height = "28px";
  btn.style.border = "none";
  btn.style.background = "transparent";
  btn.style.cursor = "pointer";
  btn.style.borderRadius = "6px";
  btn.style.display = "inline-flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.innerHTML = icon;
  btn.addEventListener("click", onClick);
  sh.appendChild(btn);
  return mount;
}

// アイコン定義
const COPY_ICON = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 1H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2V7l-4-6zM8 3h8v2H8V3zm6 17H4V7h2v8h8v5zm2-4H8V7h6V2.5L20 8v6z"></path>
  </svg>`;

const GITHUB_ICON = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>`;

/* -------------------- 説明（Description） -------------------- */

// 見出しバーから renderer
function findDescriptionRendererRootFromBar(
  bar: HTMLElement
): HTMLElement | null {
  const sib = bar.parentElement?.nextElementSibling as HTMLElement | null;
  const a = sib?.querySelector<HTMLElement>(
    '[data-testid="issue.views.field.rich-text.description"]'
  );
  if (a) return a;
  const up = bar.parentElement?.parentElement as HTMLElement | null;
  const b = up?.querySelector<HTMLElement>(
    '[data-testid="issue.views.field.rich-text.description"]'
  );
  if (b) return b;
  const region = bar.closest<HTMLElement>('[role="region"]');
  const c = region?.querySelector<HTMLElement>(
    '[data-testid="issue.views.field.rich-text.description"]'
  );
  if (c) return c;
  return document.querySelector<HTMLElement>(
    '[data-testid="issue.views.field.rich-text.description"]'
  );
}

function pickRendererHtml(root: HTMLElement | null): string | null {
  if (!root) return null;
  const cands = [
    ".ak-renderer-wrapper",
    ".ak-renderer-document",
    '[data-testid="rendered-content"]',
    '[data-testid*="renderer"]',
    "article",
    "div",
  ];
  for (const s of cands) {
    const el = root.querySelector<HTMLElement>(s);
    if (el?.innerHTML?.trim()) return el.innerHTML;
  }
  return null;
}

// 見出しバーから ProseMirror
function findDescriptionEditorFromBar(bar: HTMLElement): HTMLElement | null {
  const PM =
    '#ak-editor-textarea.ProseMirror,[role="textbox"][contenteditable="true"][id="ak-editor-textarea"],[data-editor-id][contenteditable="true"].ProseMirror,[role="textbox"][contenteditable="true"].ProseMirror';
  const sib = bar.parentElement?.nextElementSibling as HTMLElement | null;
  const a = sib?.querySelector<HTMLElement>(PM);
  if (a) return a;
  const up = bar.parentElement?.parentElement as HTMLElement | null;
  const b = up?.querySelector<HTMLElement>(PM);
  if (b) return b;
  const region = bar.closest<HTMLElement>('[role="region"]');
  const c = region?.querySelector<HTMLElement>(PM);
  if (c) return c;
  return document.querySelector<HTMLElement>(PM);
}

function ensureDescriptionButton() {
  const bar = document.querySelector<HTMLElement>(DESC_BAR_SEL);
  if (
    !bar ||
    processedBars.has(bar) ||
    bar.querySelector("[data-jira-gfm-copy]")
  )
    return;

  // コンテナを作成
  const container = document.createElement("div");
  container.style.display = "inline-flex";
  container.style.alignItems = "center";
  container.style.marginLeft = "auto";
  container.style.gap = "4px";

  // JIRA形式でコピーボタン
  const jiraButton = makeIconButton("JIRA形式でコピー", COPY_ICON, async () => {
    const rendererRoot = findDescriptionRendererRootFromBar(bar);
    const rendererHtml = pickRendererHtml(rendererRoot);
    const pmEl = rendererHtml ? null : findDescriptionEditorFromBar(bar);
    const html = rendererHtml ?? pmEl?.innerHTML?.trim();

    if (!html) {
      showToast("説明が見つかりません");
      return;
    }
    await copyAsJiraNative(html);
    showToast("JIRA形式でコピーしました");
  });

  // GitHub形式でコピーボタン
  const githubButton = makeIconButton("GitHub形式でコピー", GITHUB_ICON, async () => {
    const rendererRoot = findDescriptionRendererRootFromBar(bar);
    const rendererHtml = pickRendererHtml(rendererRoot);
    const pmEl = rendererHtml ? null : findDescriptionEditorFromBar(bar);
    const html = rendererHtml ?? pmEl?.innerHTML?.trim();

    if (!html) {
      showToast("説明が見つかりません");
      return;
    }
    const gfm = htmlToGfm(html);
    await copyToClipboard(gfm);
    showToast("GitHub形式でコピーしました");
  });

  container.appendChild(jiraButton);
  container.appendChild(githubButton);
  bar.appendChild(container);
  processedBars.add(bar);
}

/* -------------------- コメント（Comment actions） -------------------- */
/** アクションバーから直接的にコメント本文を取得 */
function findCommentBodyFromBar(bar: HTMLElement): HTMLElement | null {
  // アクションバーは footer 内にあるので、footer を取得
  const footer = bar.closest<HTMLElement>('[data-testid$="-footer"]');
  if (!footer) return null;

  // footer の親要素が ak-comment
  const akComment = footer.parentElement;
  if (!akComment) return null;

  // ak-comment 内の body を取得
  const body = akComment.querySelector<HTMLElement>('[data-testid$="-body"]');
  if (!body) return null;

  // body 内の renderer を取得（優先順位順）
  const renderer = body.querySelector<HTMLElement>(
    '.ak-renderer-wrapper, .ak-renderer-document, [data-testid*="renderer"]'
  );

  return renderer || body;
}

function ensureCommentButtons() {
  document
    .querySelectorAll<HTMLElement>(COMMENT_ACTION_BAR_SEL)
    .forEach((bar) => {
      if (processedBars.has(bar) || bar.querySelector("[data-jira-gfm-copy]"))
        return;

      // JIRA形式でコピーボタン
      const jiraButton = makeIconButton("JIRA形式でコピー", COPY_ICON, async () => {
        const bodyEl = findCommentBodyFromBar(bar);

        const PM_SEL =
          '#ak-editor-textarea.ProseMirror,[role="textbox"][contenteditable="true"][id="ak-editor-textarea"],[data-editor-id][contenteditable="true"].ProseMirror,[role="textbox"][contenteditable="true"].ProseMirror';
        const formPM = bodyEl
          ? null
          : bar
              .closest<HTMLElement>("form, [data-editor-content-component]")
              ?.querySelector<HTMLElement>(PM_SEL) || null;

        const html =
          bodyEl?.innerHTML?.trim() || formPM?.innerHTML?.trim() || null;
        if (!html) {
          showToast("コメント本文が見つかりません");
          return;
        }

        await copyAsJiraNative(html);
        showToast("JIRA形式でコピーしました");
      });

      // GitHub形式でコピーボタン
      const githubButton = makeIconButton("GitHub形式でコピー", GITHUB_ICON, async () => {
        const bodyEl = findCommentBodyFromBar(bar);

        const PM_SEL =
          '#ak-editor-textarea.ProseMirror,[role="textbox"][contenteditable="true"][id="ak-editor-textarea"],[data-editor-id][contenteditable="true"].ProseMirror,[role="textbox"][contenteditable="true"].ProseMirror';
        const formPM = bodyEl
          ? null
          : bar
              .closest<HTMLElement>("form, [data-editor-content-component]")
              ?.querySelector<HTMLElement>(PM_SEL) || null;

        const html =
          bodyEl?.innerHTML?.trim() || formPM?.innerHTML?.trim() || null;
        if (!html) {
          showToast("コメント本文が見つかりません");
          return;
        }

        const gfm = htmlToGfm(html);
        await copyToClipboard(gfm);
        showToast("GitHub形式でコピーしました");
      });

      bar.appendChild(jiraButton);
      bar.appendChild(githubButton);
      processedBars.add(bar);
    });
}

/* -------------------- 監視（1フレーム集約） -------------------- */
let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    ensureDescriptionButton();
    ensureCommentButtons();
  });
}

function bootstrap() {
  schedule();
  const mo = new MutationObserver(() => schedule());
  mo.observe(document.documentElement, { childList: true, subtree: true });
}
bootstrap();

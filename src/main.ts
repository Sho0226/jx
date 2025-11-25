import './style.css'

const root = document.querySelector<HTMLDivElement>('#app')

if (root) {
  root.innerHTML = `
    <main class="app">
      <h1>Jira ⇄ GitHub Markdown helper</h1>
      <p>コンテンツスクリプトが Jira 画面にコピー用ボタンを差し込みます。</p>
      <p class="sub">このページ自体は動作確認用プレースホルダーです。</p>
    </main>
  `
}

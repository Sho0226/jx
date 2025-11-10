# jira-github-md-converter

## 概要
このプロジェクトは、JiraのマークダウンとGitHubのマークダウンを相互に変換するためのVS Code拡張機能です。選択したテキストをJira形式またはGitHub形式に変換することができます。

## インストール
1. このリポジトリをクローンします。
   ```
   git clone https://github.com/yourusername/jira-github-md-converter.git
   ```
2. プロジェクトディレクトリに移動します。
   ```
   cd jira-github-md-converter
   ```
3. 依存関係をインストールします。
   ```
   npm install
   ```

## 使用方法
1. VS Codeを開き、拡張機能を実行します。
2. テキストを選択し、コマンドパレットを開きます（`Ctrl + Shift + P`）。
3. `Convert to Jira Markdown` または `Convert to GitHub Markdown` コマンドを選択します。

## ファイル構成
- `src/extension.ts`: 拡張機能のエントリーポイント
- `src/commands/convertToJira.ts`: Jiraマークダウンへの変換コマンド
- `src/commands/convertToGitHub.ts`: GitHubマークダウンへの変換コマンド
- `src/providers/markdownPreview.ts`: マークダウンプレビューの提供
- `src/utils/converters.ts`: 変換ロジック
- `src/tests/extension.test.ts`: テストケース
- `src/types/index.ts`: 型定義

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。詳細はLICENSEファイルを参照してください。
# MITSURU FARM 圃場記録アプリ

公開サイトとは独立した認証付きSPAです。GitHub Pagesでは `/app/` に公開します。

```powershell
cd app
Copy-Item .env.example .env.local
npm install
npm run dev
```

`.env.local` にCognitoとAPI Gatewayの公開設定値を入力してから利用してください。値が未設定の場合は、ログイン画面に設定案内を表示します。

GitHub Pagesへデプロイする場合は、リポジトリの **Settings → Secrets and variables → Actions → Variables** に`.env.example`と同名の5項目を登録してください。`VITE_`で始まる値は公開されるため、AWSアクセスキーやDropboxトークンは登録しません。

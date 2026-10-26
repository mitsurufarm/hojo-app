# MITSURU FARM 圃場記録アプリ

公開サイトとは独立した認証付きSPAです。GitHub Pagesでは `/hojo-app/` に公開します。

```powershell
cd app
Copy-Item .env.example .env.local
npm install
npm run dev
```

`.env.local` にCognitoとLambda 関数URL（`VITE_MASTER_API_URL`, `VITE_CULTIVATION_API_URL`, `VITE_PHOTO_API_URL`）の公開設定値を入力してから利用してください。値が未設定の場合は、ログイン画面に設定案内を表示します。

GitHub Pagesへデプロイする場合は、リポジトリの **Settings → Secrets and variables → Actions → Variables** に`.env.example`と同名の7項目を登録してください。`VITE_`で始まる値は公開されるため、AWSアクセスキーやGoogle Driveの秘密情報は登録しません。

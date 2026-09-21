# MITSURU FARM 圃場記録アプリ SPA実装設計

## 1. 目的

本書は、MITSURU FARM 圃場記録アプリのSPAを実装するための具体的な実装ルールを定義する。

対象は以下とする。

- ソースコード構成
- React Routerによる画面ルーティング
- TypeScript型
- APIクライアント
- Cognito認証
- AWS Amplify Auth
- 画面state
- フォーム
- エラー処理
- ページング
- 写真アップロード
- GitHub Pages
- GitHub Actions
- 実装順序

## 2. 前提

既存の設計書で確定している以下を前提とする。

- React + TypeScript + Vite
- React Router
- 通常のCSS
- Fetch API
- React標準state / context
- Amazon Cognito Hosted UI
- Authorization Code Flow + PKCE
- Cognito連携にはAWS Amplify Authを使用
- GitHub Pages
- GitHub Actions
- オンライン専用
- 初期版ではRedux等を使用しない
- 初期版ではReact Query等を使用しない
- 初期版ではテストフレームワークを導入しない

## 3. ソースコード構成

```text
mitsurufarm-spa/
├─ public/
│  ├─ 404.html
│  └─ ...
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ AppLayout.tsx
│  │  └─ routes.tsx
│  ├─ pages/
│  │  ├─ Login/
│  │  │  └─ LoginPage.tsx
│  │  ├─ Home/
│  │  │  └─ HomePage.tsx
│  │  ├─ Fields/
│  │  │  ├─ FieldListPage.tsx
│  │  │  ├─ FieldDetailPage.tsx
│  │  │  └─ FieldFormPage.tsx
│  │  ├─ Areas/
│  │  │  ├─ AreaDetailPage.tsx
│  │  │  └─ AreaFormPage.tsx
│  │  ├─ Cultivations/
│  │  │  ├─ CultivationListPage.tsx
│  │  │  ├─ CultivationDetailPage.tsx
│  │  │  └─ CultivationFormPage.tsx
│  │  ├─ WorkLogs/
│  │  │  ├─ WorkLogListPage.tsx
│  │  │  └─ WorkLogFormPage.tsx
│  │  ├─ Harvests/
│  │  │  ├─ HarvestListPage.tsx
│  │  │  └─ HarvestFormPage.tsx
│  │  ├─ Photos/
│  │  │  ├─ PhotoListPage.tsx
│  │  │  └─ PhotoUploadPage.tsx
│  │  └─ Crops/
│  │     ├─ CropListPage.tsx
│  │     └─ CropFormPage.tsx
│  ├─ components/
│  │  ├─ Header/
│  │  ├─ BottomNavigation/
│  │  ├─ Loading/
│  │  ├─ ErrorMessage/
│  │  ├─ EmptyState/
│  │  └─ ConfirmDialog/
│  ├─ api/
│  │  ├─ client.ts
│  │  ├─ fields.ts
│  │  ├─ areas.ts
│  │  ├─ cultivations.ts
│  │  ├─ workLogs.ts
│  │  ├─ harvests.ts
│  │  ├─ photos.ts
│  │  └─ crops.ts
│  ├─ auth/
│  │  ├─ cognito.ts
│  │  └─ AuthContext.tsx
│  ├─ types/
│  │  └─ index.ts
│  ├─ styles/
│  │  ├─ global.css
│  │  └─ ...
│  ├─ main.tsx
│  └─ vite-env.d.ts
├─ .github/
│  └─ workflows/
│     └─ deploy.yml
├─ .gitignore
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

ページ単位を基本とし、複数画面で明確に再利用するUIだけを`components/`へ切り出す。

## 4. アプリ起動

```text
main.tsx
  ↓
App
  ↓
AuthProvider
  ↓
Router
  ↓
AppLayout / Page
```

`main.tsx`をSPAのエントリーポイントとする。

## 5. ルーティング

React Routerを使用する。

```text
/login
/
/fields
/fields/new
/fields/:fieldId
/fields/:fieldId/edit
/fields/:fieldId/areas/new
/fields/:fieldId/areas/:areaId
/fields/:fieldId/areas/:areaId/edit

/cultivations
/cultivations/new
/cultivations/:cultivationId
/cultivations/:cultivationId/edit
/cultivations/:cultivationId/work-logs
/cultivations/:cultivationId/work-logs/new
/cultivations/:cultivationId/work-logs/:workLogId/edit
/cultivations/:cultivationId/harvests
/cultivations/:cultivationId/harvests/new
/cultivations/:cultivationId/harvests/:harvestId/edit
/cultivations/:cultivationId/photos
/cultivations/:cultivationId/photos/new

/crops
/crops/new
/crops/:cropId/edit
```

画面URLとAPI URLは分離する。

## 6. 認証

認証が必要な画面は`ProtectedRoute`相当の処理で保護する。

```text
未認証
 ↓
/login
 ↓
Cognito Hosted UI
 ↓
callback
 ↓
認証済み
 ↓
目的の画面
```

ログイン済みで`/login`へアクセスした場合はホームへ遷移する。

## 7. Cognito / AWS Amplify Auth

Cognito連携にはAWS Amplify Authを使用する。

認証方式：

- Cognito Hosted UI
- Authorization Code Flow
- PKCE
- SPAでパスワードを直接扱わない

`src/auth/cognito.ts`ではAmplifyの具体的なAPI呼び出しをアプリから隠蔽し、以下の役割を提供する。

```text
configureAuth()
signIn()
signOut()
getCurrentAuthState()
getAccessToken()
```

`AuthContext.tsx`は認証状態をアプリ全体へ提供する。

状態：

```text
loading
authenticated
unauthenticated
```

SPAへAWSアクセスキーやDropboxアクセストークンは配置しない。

## 8. 環境変数

```text
VITE_API_BASE_URL
VITE_COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID
VITE_COGNITO_DOMAIN
VITE_COGNITO_REDIRECT_URI
```

`.env.local`はGitへ登録しない。

`.env.example`を用意し、必要な設定項目だけを示す。

公開されるVite環境変数には秘密情報を入れない。

## 9. APIクライアント

API通信は`src/api/client.ts`へ集約する。

```text
Page
 ↓
api/*.ts
 ↓
api/client.ts
 ↓
fetch()
 ↓
API Gateway
```

ページから直接`fetch()`を呼ばない。

### 共通関数

```text
get<T>()
post<T>()
put<T>()
delete<T>()
upload<T>()
```

共通処理：

1. API URLを組み立てる
2. Amplify Authからアクセストークンを取得
3. `Authorization: Bearer <token>`を付与
4. JSONの場合はContent-Typeを設定
5. Fetch実行
6. HTTPステータスを確認
7. APIエラーを共通形式へ変換
8. JSONレスポンスを返す

写真アップロードは`multipart/form-data`を使用する。FormData使用時はブラウザがboundaryを設定するため、Content-Typeを手動設定しない。

## 10. APIモジュール

### fields.ts

```text
getFields()
getField(fieldId)
createField(request)
updateField(fieldId, request)
deleteField(fieldId)
```

### areas.ts

```text
getAreas(fieldId)
getArea(fieldId, areaId)
createArea(fieldId, request)
updateArea(fieldId, areaId, request)
deleteArea(fieldId, areaId)
getAreaCultivations(fieldId, areaId, params)
```

### cultivations.ts

```text
getCurrentCultivations(params)
getCultivations(params)
getCultivation(cultivationId)
createCultivation(request)
updateCultivation(cultivationId, request)
deleteCultivation(cultivationId)
```

### workLogs.ts

```text
getWorkLog(cultivationId, workLogId)
createWorkLog(cultivationId, request)
updateWorkLog(cultivationId, workLogId, request)
deleteWorkLog(cultivationId, workLogId)
```

### harvests.ts

```text
getHarvest(cultivationId, harvestId)
createHarvest(cultivationId, request)
updateHarvest(cultivationId, harvestId, request)
deleteHarvest(cultivationId, harvestId)
```

### photos.ts

```text
getPhoto(cultivationId, photoId)
getPhotos(cultivationId, params)
uploadPhoto(cultivationId, formData)
deletePhoto(cultivationId, photoId)
```

### crops.ts

```text
getCrops(params)
getCrop(cropId)
createCrop(request)
updateCrop(cropId, request)
```

CROPは物理削除せず、`active=false`への更新で利用停止する。

## 11. TypeScript型

リソース型とAPIリクエスト型を分離する。

基本リソース型：

```text
Field
Area
Crop
Cultivation
WorkLog
Harvest
Photo
```

API共通型：

```text
ApiError
PagedResponse<T>
```

リクエスト型：

```text
CreateFieldRequest
UpdateFieldRequest
CreateAreaRequest
UpdateAreaRequest
CreateCropRequest
UpdateCropRequest
CreateCultivationRequest
UpdateCultivationRequest
CreateWorkLogRequest
UpdateWorkLogRequest
CreateHarvestRequest
UpdateHarvestRequest
CreatePhotoRequest
```

初期版では型ファイルを細かく分割せず、`src/types/index.ts`を基本の型定義場所とする。

## 12. ページ実装ルール

ページの基本責務：

```text
URLパラメータ取得
↓
API呼び出し
↓
loading / error状態管理
↓
画面固有state管理
↓
表示
```

APIの具体的な通信処理は`api/*.ts`へ委譲する。

画面固有stateは`useState`等で管理する。

## 13. 各ページの実装

### HomePage

- 現在栽培中
- 最近の作業
- クイックアクション
- `GET /api/v1/cultivations/current`

### FieldListPage

- `GET /api/v1/fields`
- 新規登録
- 詳細遷移

### FieldDetailPage

- `GET /api/v1/fields/{fieldId}`
- `GET /api/v1/fields/{fieldId}/areas`

### FieldFormPage

- 新規：`POST /api/v1/fields`
- 編集：`PUT /api/v1/fields/{fieldId}`
- 削除：`DELETE /api/v1/fields/{fieldId}`

削除前に確認ダイアログを表示する。

### AreaDetailPage

- `GET /api/v1/fields/{fieldId}/areas/{areaId}`
- `GET /api/v1/fields/{fieldId}/areas/{areaId}/cultivations`

### AreaFormPage

- 新規：`POST /api/v1/fields/{fieldId}/areas`
- 編集：`PUT /api/v1/fields/{fieldId}/areas/{areaId}`
- 削除：`DELETE /api/v1/fields/{fieldId}/areas/{areaId}`

### CultivationListPage

以下で絞り込み可能とする。

- 現在栽培中
- 作物
- 年
- 圃場
- エリア

### CultivationDetailPage

栽培概要を表示し、以下へ遷移する。

```text
作業
収穫
写真
```

### CultivationFormPage

- 新規：`POST /api/v1/cultivations`
- 編集：`PUT /api/v1/cultivations/{cultivationId}`

### WorkLogListPage

- `GET /api/v1/cultivations/{cultivationId}/work-logs`
- 新しい日付を上に表示

### WorkLogFormPage

- 新規：`POST /api/v1/cultivations/{cultivationId}/work-logs`
- 編集：`PUT /api/v1/cultivations/{cultivationId}/work-logs/{workLogId}`
- 削除：`DELETE /api/v1/cultivations/{cultivationId}/work-logs/{workLogId}`

### HarvestListPage

- `GET /api/v1/cultivations/{cultivationId}/harvests`

### HarvestFormPage

- 新規：`POST /api/v1/cultivations/{cultivationId}/harvests`
- 編集：`PUT /api/v1/cultivations/{cultivationId}/harvests/{harvestId}`
- 削除：`DELETE /api/v1/cultivations/{cultivationId}/harvests/{harvestId}`

### PhotoListPage

- `GET /api/v1/cultivations/{cultivationId}/photos`
- Lambdaが生成したDropbox一時URLで表示

### PhotoUploadPage

- `POST /api/v1/cultivations/{cultivationId}/photos`
- `multipart/form-data`
- 最大3MB

削除：

```text
DELETE /api/v1/cultivations/{cultivationId}/photos/{photoId}
```

### CropListPage / CropFormPage

- `GET /api/v1/crops`
- `POST /api/v1/crops`
- `GET /api/v1/crops/{cropId}`
- `PUT /api/v1/crops/{cropId}`

利用停止は`active=false`とする。

## 14. フォーム設計

```text
初期表示
 ↓
入力
 ↓
SPA側バリデーション
 ↓
保存
 ↓
二重送信防止
 ↓
API
 ↓
成功
 ↓
詳細または一覧へ遷移
```

SPA側では明らかな入力ミスをチェックし、最終的な整合性チェックはLambdaに任せる。

保存中は保存ボタンを無効化する。

PUTは全リソース置換として扱う。

## 15. エラー処理

API共通エラー：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "area must be greater than or equal to 0"
  }
}
```

| HTTP | SPAの処理 |
|---|---|
| 400 | 入力内容を確認するメッセージ |
| 401 | 認証状態を確認しログインへ |
| 403 | 権限エラー表示 |
| 404 | 対象データなし表示 |
| 409 | 競合・整合性エラー表示 |
| 500 | サーバーエラー表示 |
| 502 | 外部サービスエラー表示 |

内部的なスタックトレース等は画面に表示しない。

401の場合はAmplify側のセッション更新を一度試行し、それでも認証できなければログイン画面へ遷移する。無限リトライは行わない。

## 16. ページング

一覧APIでは以下を使用する。

```text
limit
nextToken
```

初期値：

```text
limit = 50
```

最大：

```text
limit = 100
```

`nextToken`はAPIから返された値を次ページ取得時に利用する。

初期版は「次のページ」方式とする。

## 17. 共通UI

共通コンポーネント：

```text
Header
BottomNavigation
Loading
ErrorMessage
EmptyState
ConfirmDialog
```

一覧・詳細・保存・削除・アップロードでは以下の状態を管理する。

```text
loading
success
empty
error
```

## 18. レイアウト

PC：

```text
Sidebar | Main Content
```

モバイル：

```text
Header
Main Content
Bottom Navigation
```

モバイルファーストで設計する。

## 19. CSS

通常のCSSを使用する。

- `global.css`で全体設定
- 必要に応じてコンポーネント固有CSSを分離
- CSSフレームワークなし
- UIコンポーネントライブラリなし
- モバイルファースト
- タップ操作を前提としたボタンサイズ・余白を確保

## 20. GitHub Pages

```text
Git push
 ↓
GitHub Actions
 ↓
npm ci
 ↓
npm run build
 ↓
GitHub Pagesへdeploy
```

History APIによる直接アクセスに対応するため`404.html`を用意する。

Viteの`base`は実際のGitHub Pages公開パスと一致させる。

## 21. GitHub Actions

`.github/workflows/deploy.yml`で自動デプロイする。

基本処理：

```text
checkout
 ↓
Node.js setup
 ↓
npm ci
 ↓
npm run build
 ↓
GitHub Pages artifact upload
 ↓
GitHub Pages deploy
```

初期版ではテストフレームワークの実行ステップを設けない。

## 22. package.json主要依存関係

想定：

```text
react
react-dom
react-router-dom
aws-amplify
typescript
vite
@vitejs/plugin-react
```

バージョンは実装開始時点の安定版を採用する。

## 23. テスト方針

初期版ではテストフレームワークを導入しない。

基本確認：

```text
TypeScript型チェック
 ↓
npm run build
 ↓
ローカルブラウザ確認
 ↓
GitHub Pages確認
 ↓
PC / Android等で実機確認
```

Vitest、React Testing Library、Playwright等は必要になった時点で追加する。

## 24. 実装順序

### Phase 1：基盤

1. Vite + React + TypeScript
2. React Router
3. AWS Amplify
4. Cognito
5. AuthContext
6. AppLayout
7. 共通UI
8. API client
9. GitHub Pages
10. GitHub Actions

### Phase 2：主要画面

1. Login
2. Home
3. Field一覧
4. Field詳細
5. Area詳細
6. Cultivation詳細

### Phase 3：記録機能

1. Cultivation登録・編集
2. WorkLog
3. Harvest
4. 削除
5. バリデーション・エラー処理

### Phase 4：写真

1. Photo一覧
2. Photoアップロード
3. Dropbox一時URL
4. Photo削除

### Phase 5：マスター

1. Crop
2. Area管理
3. Field管理
4. UI調整

## 25. 初期版で実装しないもの

- Redux等の外部状態管理
- React Query等のサーバー状態管理
- CSSフレームワーク
- UIコンポーネントライブラリ
- オフライン対応
- Service Worker
- PWA
- WebSocket
- 高度なフォームライブラリ
- テストフレームワーク
- 高度なキャッシュ
- 高度な検索
- CSV入出力

## 26. セキュリティ

- Cognitoで認証
- API GatewayでJWTを検証
- SPAにAWSアクセスキーを配置しない
- SPAにDropboxアクセストークンを配置しない
- API通信はHTTPS
- CORSは許可したoriginのみ
- SPAとLambdaの両方で入力値を検証
- 写真サイズはSPAとLambdaの両方で検証

## 27. 実装ルール

- API通信は`api/*.ts`へ集約する
- ページから直接`fetch()`しない
- リソース型とAPIリクエスト型を分離する
- 画面固有stateを基本とする
- 複数画面で共有する必要が生じた場合のみContextを検討する
- 明確に再利用するUIだけ共通コンポーネント化する
- 認証はAWS Amplify Authへ委譲する
- APIエラー処理は共通化する
- 画面URLとAPI URLを混同しない
- ID、createdAt、updatedAt等のサーバー管理項目をSPA側で勝手に生成しない

## 28. 完成条件

- GitHub PagesからSPAへアクセスできる
- Cognito Hosted UIからログインできる
- 認証後にホームを表示できる
- Cognito JWT付きでAPI Gatewayへアクセスできる
- 圃場・エリア・栽培を表示できる
- 栽培詳細から作業・収穫・写真へ遷移できる
- 作業・収穫を登録・編集・削除できる
- 写真をアップロード・表示・削除できる
- 作物を管理できる
- Loading / Empty / Error状態を表示できる
- GitHubへのpushからGitHub Pagesへ自動デプロイできる

## 29. 関連設計書

- `docs/home.md`
- `docs/システム概要.md`
- `docs/データ設計.md`
- `docs/テーブル構成設計.md`
- `docs/DynamoDB詳細設計.md`
- `docs/API設計.md`
- `docs/画面設計.md`
- `docs/SPA設計.md`
- `docs/AWS構成.md`
- `docs/開発履歴.md`

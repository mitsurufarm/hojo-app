# 圃場記録アプリ SPA設計

> 2026-09-19更新：React + TypeScript + Vite、React Router（History API）、通常のCSS、Fetch API、React標準state/context、Cognito Hosted UI + Authorization Code Flow（PKCE）、GitHub Actions → GitHub Pagesを採用。

## 1. 目的

MITSURU FARM 圃場記録アプリのフロントエンドSPAについて、技術構成、ルーティング、コンポーネント構成、API連携、認証、状態管理、ビルド・デプロイ方法を定義する。

- 個人利用
- スマートフォンを主端末とする
- PCでも利用可能
- オンライン専用
- GitHub Pagesで公開
- APIは `docs/API設計.md` に従う
- 画面は `docs/画面設計.md` に従う

## 2. 技術スタック

| 項目 | 採用 |
|---|---|
| UI | React |
| 言語 | TypeScript |
| ビルド | Vite |
| ルーティング | React Router / History API |
| CSS | 通常のCSS |
| API通信 | Fetch API |
| 状態管理 | React標準のstate / context等 |
| 認証 | Amazon Cognito Hosted UI |
| 認証フロー | Authorization Code Flow + PKCE |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |
| オフライン | 対応しない |

初期版ではRedux等の外部状態管理ライブラリを導入しない。

## 3. 全体構成

```text
GitHub Pages
  ↓
React + TypeScript + Vite
  ├─ React Router
  ├─ Cognito認証
  ├─ API Client（fetch）
  └─ 画面・共通コンポーネント
  ↓ HTTPS / JSON
API Gateway HTTP API
  ↓ Cognito JWT
Lambda
  ├─ DynamoDB
  └─ Dropbox API
```

## 4. ディレクトリ構成

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ routes.tsx
│  └─ AppLayout.tsx
├─ pages/
│  ├─ Login/
│  ├─ Home/
│  ├─ Fields/
│  ├─ Areas/
│  ├─ Cultivations/
│  ├─ WorkLogs/
│  ├─ Harvests/
│  ├─ Photos/
│  └─ Crops/
├─ components/
│  ├─ Header/
│  ├─ BottomNavigation/
│  ├─ Loading/
│  ├─ ErrorMessage/
│  ├─ ConfirmDialog/
│  └─ EmptyState/
├─ api/
│  ├─ client.ts
│  ├─ fields.ts
│  ├─ areas.ts
│  ├─ cultivations.ts
│  ├─ workLogs.ts
│  ├─ harvests.ts
│  ├─ photos.ts
│  └─ crops.ts
├─ auth/
│  └─ cognito.ts
├─ types/
│  └─ index.ts
└─ styles/
   ├─ global.css
   └─ ...
```

基本単位はページとし、複数画面で明確に再利用されるものだけ共通コンポーネントへ切り出す。

## 5. SPAルーティング

React Routerを使用し、History API方式を採用する。

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

## 6. GitHub Pages

History APIによる直接アクセス時の404に対応するためSPA用404フォールバックを用意する。

```text
/fields/F0001へ直接アクセス
        ↓
GitHub Pages
        ↓
404.html
        ↓
SPAへフォールバック
        ↓
React Router
```

Viteの`base`設定とGitHub Pagesの公開パスを一致させる。

## 7. Cognito認証

Amazon Cognito Hosted UI + Authorization Code Flow（PKCE）を使用する。

SPA内でパスワードを直接処理する方式は採用しない。

```text
SPA
 ↓ ログイン
Cognito Hosted UI
 ↓ 認証
認証コード
 ↓
SPA callback
 ↓ PKCE
トークン取得
 ↓ Bearer JWT
API Gateway
```

SPAの責務：

- ログイン開始
- コールバック処理
- 認証状態確認
- トークン取得
- Authorizationヘッダー付与
- ログアウト

未認証で認証必須ページへアクセスした場合は`/login`へ遷移する。

## 8. APIクライアント

Fetch APIをベースに`api/client.ts`へ共通処理をまとめる。

```text
pages / components
       ↓
api/*.ts
       ↓
api/client.ts
       ↓
fetch()
       ↓
API Gateway
```

ページコンポーネントから直接fetchを呼ばない。

## 9. TypeScript型

`src/types/index.ts`を基本の型定義場所とする。

主な型：

```text
Field
Area
Crop
Cultivation
WorkLog
Harvest
Photo
ApiError
PagedResponse<T>
```

## 10. 状態管理

外部状態管理ライブラリは使用しない。

- 画面固有状態：React state
- 共有状態：必要な場合のみContext
- サーバーデータ：各画面のstate

初期版では高度なサーバーキャッシュを導入しない。

## 11. 共通UI

- Header
- BottomNavigation
- Loading
- ErrorMessage
- EmptyState
- ConfirmDialog

## 12. フォーム

- 必須項目を明確にする
- SPA側で簡易チェック
- Lambdaで最終チェック
- 保存中は二重送信を防止
- 成功後は詳細または一覧へ遷移
- PUTはリソース全体置換

## 13. APIエラー処理

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "area must be greater than or equal to 0"
  }
}
```

| HTTP | SPAの扱い |
|---|---|
| 400 | 入力内容を確認 |
| 401 | 認証状態を確認しログイン画面へ |
| 403 | 権限エラー |
| 404 | 対象データなし |
| 409 | データ競合等 |
| 500 | サーバーエラー |
| 502 | Dropbox等の外部サービスエラー |

## 14. ページング

- 初期値：50件
- 最大：100件
- `nextToken`：次ページ取得用
- 初期版は「次のページ」方式

## 15. 写真

最大3MB。

```text
写真選択
 ↓
API Gateway
 ↓
photo-api Lambda
 ↓
Dropbox
 ↓
PHOTO登録
```

Dropboxの認証情報・アクセストークンはSPAへ公開しない。

写真表示はAPIから取得したDropbox一時URLを使用する。

## 16. 削除

削除前にSPAで確認ダイアログを表示する。

FIELD、AREA、CULTIVATIONなど配下データを持つリソースはLambda側の削除ルールに従う。

CROPは物理削除せず`active=false`の利用停止とする。

## 17. 環境設定

```text
VITE_API_BASE_URL
VITE_COGNITO_DOMAIN
VITE_COGNITO_CLIENT_ID
VITE_COGNITO_REDIRECT_URI
```

公開可能な値だけをVite環境変数へ置き、AWSアクセスキーやDropboxトークンは配置しない。

## 18. ビルド・デプロイ

```text
GitHub
 ↓ push
GitHub Actions
 ├─ Node.js setup
 ├─ npm ci
 ├─ npm run build
 └─ GitHub Pagesへdeploy
```

```bash
npm run dev
npm run build
```

## 19. CORS

本番ではGitHub Pagesの正規originのみを許可する。

開発時は必要に応じてローカル開発originを許可する。

## 20. 初期実装順

### Phase 1
1. Vite + React + TypeScript
2. React Router
3. Cognito認証
4. AppLayout
5. Home
6. Fields
7. Areas
8. Cultivation detail
9. API client

### Phase 2
1. Cultivation登録・編集
2. WorkLog
3. Harvest
4. 削除
5. バリデーション・エラー処理

### Phase 3
1. Photo一覧
2. Photoアップロード
3. Dropbox一時URL
4. Photo削除

### Phase 4
1. Crop
2. Area管理
3. Field管理
4. UI調整

## 21. 初期版で採用しないもの

- Redux等の外部状態管理
- React Query等のサーバー状態管理
- CSSフレームワーク
- UIコンポーネントライブラリ
- オフライン対応
- Service Worker
- PWA
- 複雑なキャッシュ
- WebSocket
- 高度なフォームライブラリ
- 高度なテスト基盤

## 22. セキュリティ

- Cognitoで認証
- API GatewayでJWT検証
- SPAにAWSアクセスキーを置かない
- SPAにDropboxアクセストークンを置かない
- CORSは必要なoriginのみ
- 入力値はSPAとLambdaの両方で検証

## 23. 関連設計書

- `docs/システム概要.md`
- `docs/データ設計.md`
- `docs/テーブル構成設計.md`
- `docs/DynamoDB詳細設計.md`
- `docs/API設計.md`
- `docs/画面設計.md`
- `docs/AWS構成.md`

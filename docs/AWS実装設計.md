# AWS実装設計

## 1. 目的

MITSURU FARM 圃場記録アプリのAWS環境を実装するための具体的な設計を定義する。

本書では、AWSリソースの構成、リージョン、Lambda、API Gateway、DynamoDB、Cognito、IAM、CloudWatch Logs、GitHub ActionsによるLambdaデプロイ、Dropbox連携などを定義する。

本書は以下の設計書を前提とする。

- システム概要
- データ設計
- テーブル構成設計
- DynamoDB詳細設計
- API設計
- 画面設計
- SPA設計
- SPA実装設計

---

## 2. 基本方針

| 項目 | 方針 |
|---|---|
| AWSリージョン | 東京 `ap-northeast-1` |
| Lambdaランタイム | Python |
| Lambda構成 | `master-api` / `cultivation-api` / `photo-api` |
| Lambdaデプロイ | GitHub Actions |
| Lambdaリポジトリ | SPAとは別リポジトリ |
| AWSリソース構築 | AWS Management Consoleで手動構築 |
| IAM | Lambdaごとに個別Execution Role |
| API Gateway | HTTP API |
| DB | DynamoDB |
| DynamoDBテーブル | `FARM_TBL` |
| 認証 | Amazon Cognito |
| ログ | Amazon CloudWatch Logs |
| ログ保持期間 | 30日 |
| 写真保存 | Dropbox |
| SPA公開 | GitHub Pages |
| 初期環境 | 単一AWS環境 |

---

## 3. 全体構成

```text
                     ┌──────────────────────┐
                     │      GitHub Pages    │
                     │        SPA           │
                     │ React + TypeScript   │
                     └──────────┬───────────┘
                                │ HTTPS
                                ▼
                     ┌──────────────────────┐
                     │    API Gateway       │
                     │       HTTP API       │
                     │    /api/v1/...       │
                     └──────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ master-api   │  │cultivation-api│  │  photo-api   │
      │   Lambda     │  │    Lambda     │  │    Lambda    │
      │   Python     │  │    Python     │  │    Python    │
      └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
             └─────────────────┼─────────────────┘
                               ▼
                     ┌──────────────────────┐
                     │      DynamoDB        │
                     │      FARM_TBL        │
                     └──────────────────────┘

      photo-api ──────────────► Dropbox API

      Lambda ─────────────────► CloudWatch Logs

      SPA ────────────────────► Cognito
```

---

## 4. AWSリソース一覧

| リソース | 内容 |
|---|---|
| API Gateway | HTTP API |
| Lambda | `master-api` |
| Lambda | `cultivation-api` |
| Lambda | `photo-api` |
| DynamoDB | `FARM_TBL` |
| Cognito | User Pool / App Client / Hosted UI |
| IAM | LambdaごとのExecution Role |
| CloudWatch Logs | Lambdaログ |
| SSM Parameter Store | Dropbox認証情報の安全な保管 |
| Dropbox | 写真ファイル保存先 |

すべて東京リージョン `ap-northeast-1` を基本とする。

---

## 5. AWS環境

初期段階では、開発・ステージング・本番をAWS上で分離せず、単一環境として構築する。

理由は個人利用のアプリであり、AWSリソースを複数環境に分けることで管理対象とコストが増えるためである。

ローカル開発時は、ローカルのSPAからAWS APIを利用できるようにCORSを設定する。

本番SPAはGitHub PagesからAWS APIを利用する。

---

## 6. DynamoDB

### 6.1 テーブル

テーブル名：

```text
FARM_TBL
```

リージョン：

```text
ap-northeast-1
```

### 6.2 キャパシティ

```text
Billing mode: PAY_PER_REQUEST
```

### 6.3 テーブルクラス

```text
Standard
```

### 6.4 暗号化

AWS所有キーによるサーバーサイド暗号化を使用する。

### 6.5 バックアップ

初期構成では以下を使用しない。

- Point-in-Time Recovery
- DynamoDB Streams
- 複雑なトランザクション処理

必要になった段階で追加する。

### 6.6 キー・GSI

キー構造とGSIは `テーブル構成設計.md` および `DynamoDB詳細設計.md` に従う。

---

## 7. Lambda

### 7.1 関数構成

```text
master-api
├─ FIELD
├─ AREA
└─ CROP

cultivation-api
├─ CULTIVATION
├─ WORK_LOG
└─ HARVEST

photo-api
└─ PHOTO / Dropbox
```

### 7.2 ランタイム

```text
Python
```

実装開始時点でAWSがサポートしているPythonバージョンを選択する。

### 7.3 共通設定

- CloudWatch Logsを有効化
- 非機密設定のみ環境変数へ設定
- Dropbox認証情報は環境変数へ直接記載しない
- タイムアウトとメモリは初期値を小さく設定し、必要に応じて調整

想定環境変数：

```text
TABLE_NAME=FARM_TBL
AWS_REGION=ap-northeast-1
```

---

## 8. Lambda Execution Role

Lambdaごとに個別IAM Roleを作成する。

```text
mitsurufarm-master-api-role
mitsurufarm-cultivation-api-role
mitsurufarm-photo-api-role
```

### 8.1 共通

CloudWatch Logs出力に必要な権限を付与する。

代表例：

```text
logs:CreateLogGroup
logs:CreateLogStream
logs:PutLogEvents
```

AWS管理ポリシーを利用する場合は `AWSLambdaBasicExecutionRole` を利用できる。

### 8.2 master-api / cultivation-api

必要なDynamoDB操作：

```text
GetItem
PutItem
UpdateItem
DeleteItem
Query
```

### 8.3 photo-api

上記DynamoDB権限に加えて、Dropboxアクセストークン取得のためSSM Parameter Store参照権限を付与する。

```text
ssm:GetParameter
```

SecureStringの暗号化方式に応じてKMS権限を追加する。

---

## 9. API Gateway

### 9.1 APIタイプ

```text
HTTP API
```

### 9.2 APIベースパス

```text
/api/v1/
```

### 9.3 認証

Amazon Cognito JWT Authorizerを使用する。

初期段階では全APIを認証必須とする。

### 9.4 ルーティング

URL構造は `API設計.md` に従う。

```text
GET    /api/v1/fields
POST   /api/v1/fields

GET    /api/v1/fields/{fieldId}
PUT    /api/v1/fields/{fieldId}
DELETE /api/v1/fields/{fieldId}

GET    /api/v1/fields/{fieldId}/areas
POST   /api/v1/fields/{fieldId}/areas

GET    /api/v1/fields/{fieldId}/areas/{areaId}
PUT    /api/v1/fields/{fieldId}/areas/{areaId}
DELETE /api/v1/fields/{fieldId}/areas/{areaId}

GET    /api/v1/cultivations/{cultivationId}
PUT    /api/v1/cultivations/{cultivationId}
DELETE /api/v1/cultivations/{cultivationId}

GET    /api/v1/cultivations/{cultivationId}/work-logs
POST   /api/v1/cultivations/{cultivationId}/work-logs

GET    /api/v1/cultivations/{cultivationId}/work-logs/{workLogId}
PUT    /api/v1/cultivations/{cultivationId}/work-logs/{workLogId}
DELETE /api/v1/cultivations/{cultivationId}/work-logs/{workLogId}

GET    /api/v1/cultivations/{cultivationId}/harvests
POST   /api/v1/cultivations/{cultivationId}/harvests

GET    /api/v1/cultivations/{cultivationId}/harvests/{harvestId}
PUT    /api/v1/cultivations/{cultivationId}/harvests/{harvestId}
DELETE /api/v1/cultivations/{cultivationId}/harvests/{harvestId}

GET    /api/v1/cultivations/{cultivationId}/photos
POST   /api/v1/cultivations/{cultivationId}/photos

GET    /api/v1/cultivations/{cultivationId}/photos/{photoId}
DELETE /api/v1/cultivations/{cultivationId}/photos/{photoId}

GET    /api/v1/crops
POST   /api/v1/crops

GET    /api/v1/crops/{cropId}
PUT    /api/v1/crops/{cropId}
DELETE /api/v1/crops/{cropId}
```

CROPのDELETEは物理削除ではなく `active=false` とする。

### 9.5 CORS

許可するOrigin：

- GitHub Pagesの本番Origin
- ローカル開発Origin

本番OriginはGitHub Pages URL確定後に設定する。

### 9.6 API Gatewayログ

初期段階ではAPI Gateway専用の詳細アクセスログを必須としない。

LambdaのCloudWatch Logsを基本的なアプリケーションログとして利用する。

---

## 10. Cognito

### 10.1 User Pool

Amazon Cognito User Poolを使用する。

### 10.2 App Client

SPA用のApp Clientを作成する。

SPAではClient Secretを使用しない。

### 10.3 認証方式

```text
Authorization Code Flow
PKCE
```

### 10.4 Hosted UI

Cognito Hosted UIを使用する。

### 10.5 SPA設定

```text
VITE_COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID
VITE_COGNITO_DOMAIN
VITE_COGNITO_REDIRECT_URI
```

### 10.6 API認証

API GatewayのCognito JWT Authorizerでアクセストークンを検証する。

---

## 11. Dropbox連携

### 11.1 保存先

写真ファイルはS3ではなくDropboxへ保存する。

### 11.2 処理

```text
SPA
 ↓ multipart/form-data
API Gateway
 ↓
photo-api Lambda
 ↓
Dropbox API
 ↓
Dropbox
```

### 11.3 アクセストークン

DropboxアクセストークンはSPAに公開しない。

SSM Parameter StoreのSecureStringとして保管する。

想定：

```text
/mitsurufarm/dropbox/access-token
```

### 11.4 アップロード

1. Lambdaがリクエストを受信
2. 入力値を検証
3. Dropboxへファイルをアップロード
4. Dropboxのパスを取得
5. DynamoDBへPHOTOを登録
6. 作成したPHOTOを返却

DynamoDB登録に失敗した場合、初期実装ではDropbox側の孤立ファイルを許容する。

### 11.5 削除

1. Dropboxファイルを削除
2. DynamoDBのPHOTOを削除

Dropbox側ですでにファイルが存在しない場合は、削除済みとして扱う。

---

## 12. CloudWatch Logs

LambdaログはCloudWatch Logsへ出力する。

標準的なロググループ：

```text
/aws/lambda/master-api
/aws/lambda/cultivation-api
/aws/lambda/photo-api
```

保持期間：

```text
30日
```

CloudWatch Logsは完全無料ではないが、AWSの無料利用枠がある。

個人利用でログ量が少ない間は無料枠内に収まる可能性が高い。

ただし、無料利用枠を超えた場合は料金が発生する可能性があるため、不要な大量ログを出力せず、30日で自動削除する。

アクセストークンやリクエスト本文などの機密情報はログへ出力しない。

---

## 13. ID採番

DynamoDB Atomic Counterを使用する。

```text
COUNTER / F
COUNTER / A
COUNTER / P
COUNTER / C
COUNTER / W
COUNTER / H
COUNTER / PH
```

`UpdateItem` の `ADD` で採番する。

4桁ゼロ埋め：

```text
F0001
A0001
P0001
C0001
W0001
H0001
PH0001
```

MAX+1方式は使用しない。

---

## 14. Lambdaリポジトリ

SPAとは別のGitHubリポジトリを使用する。

```text
MITSURU FARM
├─ SPA repository
│   └─ GitHub Actions
│       └─ GitHub Pages
│
└─ Lambda repository
    ├─ master-api
    ├─ cultivation-api
    └─ photo-api
```

LambdaリポジトリはLambda実装のみを管理する。

AWSリソースは初期段階ではAWS Consoleで構築する。

---

## 15. GitHub ActionsによるLambdaデプロイ

### 15.1 デプロイ方式

AWSリソースはConsoleで作成し、Lambdaコード更新をGitHub Actionsから実行する。

初期実装ではAWS CLIによるZIPデプロイを基本とする。

```text
GitHub
  │ push
  ▼
GitHub Actions
  │
  ├─ Python依存関係インストール
  ├─ ZIP作成
  └─ AWS CLI
       │
       ▼
   Lambda更新
```

### 15.2 対象

```text
master-api
cultivation-api
photo-api
```

### 15.3 トリガー

Lambdaリポジトリの `main` ブランチへのpushを基本とする。

### 15.4 AWS認証

GitHub ActionsからAWSへ接続する際は、長期的なAWS Access KeyをGitHubへ保存する方式を避け、GitHub Actions OIDCとAWS IAM Roleを利用する。

---

## 16. GitHub Actions用IAM

Lambda実行Roleとは別に、GitHub Actions用IAM Roleを作成する。

例：

```text
mitsurufarm-github-actions-lambda-deploy-role
```

主な権限：

```text
lambda:UpdateFunctionCode
lambda:GetFunction
```

必要な権限だけを追加する。

Lambda実行権限とデプロイ権限を分離する。

---

## 17. Lambda実装方針

### 17.1 入力検証

SPAでも簡易チェックを行うが、最終的な検証はLambdaで行う。

### 17.2 CULTIVATION削除

`DELETE /api/v1/cultivations/{cultivationId}` では、
対象CULTIVATIONに紐付く以下の子リソースを削除する。

- WORK_LOG
- HARVEST
- PHOTO

PHOTOについてはDynamoDBのPHOTOレコードに加えて、
対応するDropboxファイルも削除する。

DynamoDBの削除はBatchWriteItemを使用し、
25件を超える場合は分割して処理する。

### 17.3 エラー形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "area must be greater than or equal to 0"
  }
}
```

### 17.4 ステータスコード

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
502 Bad Gateway
```

### 17.5 日時

`createdAt` と `updatedAt` はLambda側で設定する。

UTCのISO 8601形式を基本とする。

### 17.6 ページング

DynamoDBの `LastEvaluatedKey` をAPI用 `nextToken` に変換する。

デフォルト：

```text
50件
```

最大：

```text
100件
```

---

## 18. LambdaからDynamoDBへのアクセス

boto3を使用する。

主な操作：

```text
GetItem
PutItem
UpdateItem
DeleteItem
Query
BatchWriteItem
```

親削除など複数削除ではBatchWriteItemを使用する。

BatchWriteItemの25件制限を考慮し、25件単位で処理する。

`UnprocessedItems` が返された場合はリトライする。

---

## 19. 親子削除

親リソース削除時は子リソースを先に処理する。

基本順序：

```text
FIELD
 ↓
AREA
 ↓
CULTIVATION
 ↓
WORK_LOG / HARVEST / PHOTO
```

PHOTOはDropboxファイルも削除する。

---

## 20. セキュリティ

- APIはCognito認証必須
- DropboxアクセストークンをSPAへ渡さない
- DropboxアクセストークンをGitHubへ保存しない
- DropboxアクセストークンをLambda環境変数へ直接記載しない
- GitHub ActionsはOIDCを使用
- IAMは最小権限
- LambdaごとにExecution Roleを分離
- CloudWatch Logsへ秘密情報を出力しない
- CORSを必要なOriginに限定
- API GatewayはHTTPSのみ
- GitHub ActionsのAWS権限をLambda実行権限と分離

---

## 21. AWSリソース構築順序

### Phase 1：DynamoDB

1. 東京リージョンへ切り替え
2. `FARM_TBL` 作成
3. PK/SK設定
4. GSI設定
5. PAY_PER_REQUEST設定
6. 暗号化設定

### Phase 2：Cognito

1. User Pool作成
2. App Client作成
3. Hosted UI設定
4. ドメイン設定
5. コールバックURL設定
6. ログアウトURL設定

### Phase 3：IAM

1. `master-api` Role作成
2. `cultivation-api` Role作成
3. `photo-api` Role作成
4. GitHub Actions用Role作成
5. 最小権限を付与

### Phase 4：SSM

1. Dropboxアクセストークン用SecureString作成
2. `photo-api` Roleへ参照権限を付与

### Phase 5：Lambda

1. `master-api` 作成
2. `cultivation-api` 作成
3. `photo-api` 作成
4. 環境変数設定
5. Execution Role設定
6. CloudWatch Logs保持期間設定

### Phase 6：API Gateway

1. HTTP API作成
2. Lambda統合作成
3. `/api/v1/...` ルート作成
4. Cognito JWT Authorizer設定
5. 各ルートへAuthorizer設定
6. CORS設定

### Phase 7：GitHub Actions

1. Lambdaリポジトリ作成
2. GitHub OIDC設定
3. AWS IAM Role設定
4. Workflow作成
5. ZIPビルド
6. Lambdaコード更新
7. デプロイ確認

### Phase 8：疎通確認

1. Cognitoログイン確認
2. API認証確認
3. FIELD CRUD確認
4. AREA CRUD確認
5. CULTIVATION CRUD確認
6. CULTIVATION削除時の配下データ削除確認
7. WORK_LOG CRUD確認
8. HARVEST CRUD確認
9. PHOTOアップロード確認
10. PHOTO表示確認
11. PHOTO削除確認
12. Dropbox確認
13. CloudWatch Logs確認

---

## 22. 初期実装で行わないもの

- AWS SAM / CDK / Terraform等によるIaC
- 複数AWS環境
- API Gateway詳細アクセスログ
- DynamoDB Streams
- PITR
- WebSocket
- 非同期ジョブ基盤
- S3への写真保存
- Dropbox孤立ファイルの自動削除
- 高度な監視・アラート
- 複雑なCI/CDパイプライン
- 自動ロールバック

必要になった時点で追加する。

---

## 23. コスト方針

個人利用を前提に固定費と運用コストを抑える。

- DynamoDBはPAY_PER_REQUEST
- Lambdaは従量課金
- API GatewayはHTTP API
- CloudWatch Logsは30日保持
- 不要なログを大量出力しない
- S3は使用しない
- 常時稼働サーバーを使用しない
- 不要なAWSリソースを作成しない

AWSの無料利用枠や料金体系は変更される可能性があるため、実運用開始時にはAWS公式料金ページを確認する。

---

## 24. 実装時の確認事項

以下は実装開始時に具体値を確定する。

- GitHub Pagesの本番Origin
- GitHub Lambdaリポジトリ名
- Lambda関数名
- API Gateway API名
- Cognito User Pool名
- Cognito Hosted UIドメイン
- CognitoコールバックURL
- CognitoログアウトURL
- GitHub Actions OIDCの対象リポジトリ・ブランチ
- LambdaのPythonランタイムの具体的バージョン
- Lambdaのメモリ・タイムアウト
- Dropbox App設定
- Dropboxアクセストークン
- SSM Parameter Storeのパラメータ名

---

## 25. 関連設計書

- [システム概要](システム概要.md)
- [データ設計](データ設計.md)
- [テーブル構成設計](テーブル構成設計.md)
- [DynamoDB詳細設計](DynamoDB詳細設計.md)
- [API設計](API設計.md)
- [画面設計](画面設計.md)
- [SPA設計](SPA設計.md)
- [SPA実装設計](SPA実装設計.md)
- [AWS構成](AWS構成.md)
- [Lambda実装設計](Lambda実装設計.md)
- [開発履歴](開発履歴.md)

# 圃場記録アプリ API設計

## 1. 概要

本書では、MITSURU FARM 圃場記録アプリの初期版API仕様を定義する。

APIは GitHub Pages 上のSPAから Amazon API Gateway HTTP API を経由して
AWS Lambda を呼び出し、DynamoDBおよびDropboxを操作する。

``` text
SPA
 │ HTTPS / JSON
 ▼
API Gateway HTTP API
 │ Cognito JWT認証
 ▼
Lambda
 ├─ DynamoDB
 └─ Dropbox API
```

既存の「データ設計」「テーブル構成設計」「DynamoDB詳細設計」を前提とし、初期版の実装時にAPI仕様で迷わないことを目的とする。

## 2. 基本方針

  項目                 方針
  -------------------- -----------------------------------------
  API方式              API Gateway HTTP API
  APIバージョン        `/api/v1`
  認証                 Amazon Cognito JWT
  HTTPメソッド         GET / POST / PUT / DELETE
  ID採番               Lambda + DynamoDB Atomic Counter
  更新                 PUTによるリソース全体更新
  削除                 DELETE。SPA側で確認してから実行
  ページング           `nextToken`
  デフォルト取得件数   50
  最大取得件数         100
  バリデーション       SPAで簡易チェック、Lambdaで最終チェック
  エラー形式           統一JSON形式
  写真アップロード     `multipart/form-data`、最大3MB
  写真保存先           Dropbox
  写真表示             LambdaがDropbox一時URLを生成
  CORS                 GitHub Pagesの公開元のみ許可
  Lambda構成           機能単位で分離
  オフライン           対応しない

## 3. 認証・認可

初期版では全APIをCognito認証必須とする。

API Gateway HTTP APIのJWT
Authorizerを使用し、認証に成功したリクエストだけをLambdaへ渡す。

将来、一部APIを公開する場合は、API
Gatewayのルート単位で認証要件を変更する。

### 3.1 認証エラー

-   `401 Unauthorized`: 認証失敗
-   `403 Forbidden`: 認証後の権限不足

## 4. URL規約

APIのルートは `/api/v1` を使用する。

``` text
https://{api-id}.execute-api.{region}.amazonaws.com/api/v1
```

例:

``` text
GET /api/v1/fields
GET /api/v1/fields/F0001
PUT /api/v1/fields/F0001
DELETE /api/v1/fields/F0001
GET /api/v1/fields/F0001/areas/A0001
PUT /api/v1/fields/F0001/areas/A0001
DELETE /api/v1/fields/F0001/areas/A0001
GET /api/v1/cultivations/C0001/work-logs/W0001
PUT /api/v1/cultivations/C0001/work-logs/W0001
DELETE /api/v1/cultivations/C0001/work-logs/W0001
GET /api/v1/cultivations/C0001/harvests/H0001
PUT /api/v1/cultivations/C0001/harvests/H0001
DELETE /api/v1/cultivations/C0001/harvests/H0001
GET /api/v1/cultivations/C0001/photos/PH0001
DELETE /api/v1/cultivations/C0001/photos/PH0001
```

## 5. 共通リクエスト規約

JSONを使用するAPIでは `Content-Type: application/json` とする。

### 5.1 ページング

一覧取得APIでは以下を使用する。

``` text
limit
nextToken
```

-   `limit` 未指定: 50
-   `limit` 最大: 100
-   100を超える値: `400 Bad Request`

`nextToken`はDynamoDBの`LastEvaluatedKey`をLambda側でAPI用にエンコードした値とする。

レスポンス:

``` json
{
  "items": [],
  "nextToken": "..."
}
```

次ページがない場合は`nextToken`を省略または`null`とする。

## 6. 共通レスポンス規約

### 6.1 作成

POST成功時は作成されたリソース全体を返す。

`201 Created`

### 6.2 更新

PUT成功時は更新後のリソース全体を返す。

`200 OK`

### 6.3 取得

`200 OK`

### 6.4 削除

削除成功時はレスポンスボディを返さない。

`204 No Content`

## 7. 共通エラー形式

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "area must be greater than or equal to 0"
  }
}
```

    HTTP code                 用途
  ------ -------------------- -----------------------------
     400 `VALIDATION_ERROR`   入力値不正
     400 `INVALID_REQUEST`    リクエスト形式不正
     401 `UNAUTHORIZED`       認証失敗
     403 `FORBIDDEN`          権限不足
     404 `NOT_FOUND`          対象データなし
     409 `CONFLICT`           状態・整合性の競合
     500 `INTERNAL_ERROR`     内部エラー
     502 `DEPENDENCY_ERROR`   Dropbox等外部サービスエラー

内部エラーの詳細情報や認証情報などはクライアントへ返さない。

## 8. FIELD API

  Method   Path                         内容
  -------- ---------------------------- -----------
  GET      `/api/v1/fields`             FIELD一覧
  POST     `/api/v1/fields`             FIELD作成
  GET      `/api/v1/fields/{fieldId}`   FIELD取得
  PUT      `/api/v1/fields/{fieldId}`   FIELD更新
  DELETE   `/api/v1/fields/{fieldId}`   FIELD削除

FIELD一覧はGSI4を使用する。

FIELD削除では、配下のAREA、CULTIVATION、WORK_LOG、HARVEST、PHOTOを削除する。PHOTOはDropboxを先に削除する。

## 9. AREA API

  -----------------------------------------------------------------------
  Method     Path                                           内容
  ---------- ---------------------------------------------- -------------
  GET        `/api/v1/fields/{fieldId}/areas`               AREA一覧

  POST       `/api/v1/fields/{fieldId}/areas`               AREA作成

  GET        `/api/v1/fields/{fieldId}/areas/{areaId}`      AREA取得

  PUT        `/api/v1/fields/{fieldId}/areas/{areaId}`      AREA更新

  DELETE     `/api/v1/fields/{fieldId}/areas/{areaId}`      AREA削除
  -----------------------------------------------------------------------

AREA一覧はBase Tableの `PK=fieldId`、`SK begins_with AREA#` を使用する。

AREA削除では、配下のCULTIVATION、WORK_LOG、HARVEST、PHOTOを削除する。

## 10. CROP API

  Method   Path                       内容
  -------- -------------------------- ------------
  GET      `/api/v1/crops`            CROP一覧
  POST     `/api/v1/crops`            CROP作成
  GET      `/api/v1/crops/{cropId}`   CROP取得
  PUT      `/api/v1/crops/{cropId}`   CROP更新
  DELETE   `/api/v1/crops/{cropId}`   CROP無効化

CROPは栽培履歴から参照されるマスターデータのため物理削除しない。

DELETEは `active=false` に変更する。

## 11. CULTIVATION API

  ------------------------------------------------------------------------------------
  Method   Path                                                     内容
  -------- -------------------------------------------------------- ------------------
  GET      `/api/v1/cultivations`                                   CULTIVATION一覧

  GET      `/api/v1/cultivations/current`                           現在栽培中一覧

  POST     `/api/v1/cultivations`                                   CULTIVATION作成

  GET      `/api/v1/cultivations/{cultivationId}`                   CULTIVATION取得

  PUT      `/api/v1/cultivations/{cultivationId}`                   CULTIVATION更新

  DELETE   `/api/v1/cultivations/{cultivationId}`                   CULTIVATION削除

  GET      `/api/v1/fields/{fieldId}/areas/{areaId}/cultivations`   AREA栽培履歴

  GET      `/api/v1/crops/{cropId}/cultivations`                    CROP栽培履歴
  ------------------------------------------------------------------------------------

`/cultivations/current`
はGSI3、CROPからの検索はGSI2、CULTIVATION詳細はGSI1を使用する。

作成・更新時には以下をLambdaで検証する。

-   FIELDが存在する
-   AREAが存在する
-   AREAが指定されたFIELDに属する
-   CROPが存在する
-   CROPが利用可能である
-   yearが妥当
-   日付形式が正しい
-   statusが許可値である

CULTIVATION削除では、配下のWORK_LOG、HARVEST、PHOTOを削除する。

## 12. WORK_LOG API

  --------------------------------------------------------------------------------------
  Method   Path                                                           内容
  -------- -------------------------------------------------------------- --------------
  GET      `/api/v1/cultivations/{cultivationId}/work-logs`               WORK_LOG一覧

  POST     `/api/v1/cultivations/{cultivationId}/work-logs`               WORK_LOG作成

  GET      `/api/v1/cultivations/{cultivationId}/work-logs/{workLogId}`   WORK_LOG取得

  PUT      `/api/v1/cultivations/{cultivationId}/work-logs/{workLogId}`   WORK_LOG更新

  DELETE   `/api/v1/cultivations/{cultivationId}/work-logs/{workLogId}`   WORK_LOG削除
  --------------------------------------------------------------------------------------

一覧はGSI1を使用する。

## 13. HARVEST API

  ------------------------------------------------------------------------------------
  Method   Path                                                          内容
  -------- ------------------------------------------------------------- -------------
  GET      `/api/v1/cultivations/{cultivationId}/harvests`               HARVEST一覧

  POST     `/api/v1/cultivations/{cultivationId}/harvests`               HARVEST作成

  GET      `/api/v1/cultivations/{cultivationId}/harvests/{harvestId}`   HARVEST取得

  PUT      `/api/v1/cultivations/{cultivationId}/harvests/{harvestId}`   HARVEST更新

  DELETE   `/api/v1/cultivations/{cultivationId}/harvests/{harvestId}`   HARVEST削除
  ------------------------------------------------------------------------------------

一覧はGSI1を使用する。

## 14. PHOTO API

  -------------------------------------------------------------------------------------------
  Method   Path                                                      内容
  -------- --------------------------------------------------------- ------------------------
  GET      `/api/v1/cultivations/{cultivationId}/photos`             PHOTO一覧

  POST     `/api/v1/cultivations/{cultivationId}/photos`             PHOTOアップロード

  GET      `/api/v1/cultivations/{cultivationId}/photos/{photoId}`   PHOTO取得・一時URL取得

  DELETE   `/api/v1/cultivations/{cultivationId}/photos/{photoId}`   PHOTO削除
  -------------------------------------------------------------------------------------------

### 14.1 アップロード

``` http
POST /api/v1/cultivations/{cultivationId}/photos
Content-Type: multipart/form-data
```

最大3MB。

処理順序:

``` text
SPA
 ↓
API Gateway
 ↓
Lambda
 ↓
Dropboxへアップロード
 ↓
DynamoDBへPHOTO登録
 ↓
PHOTOを返す
```

DynamoDB登録失敗時、初期版ではDropboxファイルを自動ロールバックしない。孤児ファイルが発生する可能性がある。

### 14.2 表示

LambdaがDropboxの一時URLを生成して返す。

``` json
{
  "photoId": "PH0001",
  "caption": "播種直後",
  "url": "https://..."
}
```

一時URLは長期保存せず、表示時に取得する。

### 14.3 削除

``` text
1. DynamoDBからPHOTOを取得
2. Dropboxファイルを削除
3. 成功後にDynamoDB PHOTO Itemを削除
```

Dropbox上に既にファイルがない場合は削除済みとして扱う。

Dropbox削除に失敗した場合はDynamoDB Itemを削除しない。

## 15. PUT更新方式

PUTでは対象リソースの項目を基本的に全て送信する。

`fieldId`、`createdAt`、`updatedAt`などのシステム管理項目はクライアントから変更できない。

-   `createdAt`: 作成時の値を維持
-   `updatedAt`: Lambdaが現在時刻に更新

初期版では同時編集・楽観的ロックは実装しない。

## 16. ID採番

IDはLambdaからDynamoDB Atomic Counterを使用して採番する。

  データ        Prefix   例
  ------------- -------- --------
  FIELD         F        F0001
  AREA          A        A0001
  CROP          P        P0001
  CULTIVATION   C        C0001
  WORK_LOG      W        W0001
  HARVEST       H        H0001
  PHOTO         PH       PH0001

欠番は許容する。初期版では4桁を超える採番をエラーとする。

## 17. バリデーション

SPAでは操作性向上のため簡易バリデーションを行う。

Lambdaではクライアント入力を信用せず、最終バリデーションを行う。

対象:

-   必須項目
-   型
-   許可値
-   ID形式
-   日付
-   数値範囲
-   親子関係
-   CROPの存在・状態
-   写真サイズ・形式
-   システム管理項目の改変

## 18. 親子関係の整合性

以下の階層を前提とする。

``` text
FIELD
 └─ AREA
     └─ CULTIVATION
         ├─ WORK_LOG
         ├─ HARVEST
         └─ PHOTO
```

A方式では、この親子関係をAPI URLにも反映する。

``` text
FIELD
 └─ /fields/{fieldId}
     └─ /areas/{areaId}
         └─ /cultivations/{cultivationId}
             ├─ /work-logs/{workLogId}
             ├─ /harvests/{harvestId}
             └─ /photos/{photoId}
```

LambdaではURLに指定された親IDと対象リソースの実際の親子関係を検証する。
例えば、`areaId` が指定された `fieldId` に属していない場合や、
`workLogId`、`harvestId`、`photoId` が指定された `cultivationId`
に属していない場合は拒否する。

このAPI
URL変更はURL階層の変更であり、DynamoDBのPK/SK/GSIを変更するものではない。

## 19. 作成日時・更新日時

`createdAt`、`updatedAt`はLambdaが管理する。

UTCのISO 8601形式:

``` text
2026-09-17T06:30:00.000Z
```

## 20. CORS

初期版ではGitHub PagesのSPAを配信するオリジンだけを許可する。

開発時には必要な開発用オリジンを追加する。

不要な `*` 許可は行わない。

## 21. Lambda構成

機能単位でLambdaを分離する。

``` text
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

実装時の関数単位はAPI
Gatewayのルート、権限、デプロイ単位を考慮して確定する。

## 22. DynamoDBアクセス

DynamoDBはLambdaからPythonの `boto3` を使用する。

一覧・検索は原則Eventually Consistent
Readを使用する。直前の書き込み結果を確実に取得する必要がある処理のみStrongly
Consistent Readを検討する。

主要アクセス:

  API                操作
  ------------------ ------------------
  FIELD一覧          Query GSI4
  AREA一覧           Query Base Table
  CULTIVATION詳細    Query GSI1
  CROP一覧           Query GSI4
  CROP→CULTIVATION   Query GSI2
  現在栽培中         Query GSI3
  WORK_LOG一覧       Query GSI1
  HARVEST一覧        Query GSI1
  PHOTO一覧          Query GSI1

## 23. 削除処理

大量削除ではDynamoDB `BatchWriteItem`
を25件単位で使用し、`UnprocessedItems` を再試行する。

PHOTOについてはDropbox削除を先に行い、成功後にDynamoDBを削除する。

## 24. 初期版で実装しない事項

以下は初期版の必須仕様には含めない。

-   高度なレート制限
-   高度なCloudWatch監視・アラート
-   高度なAPI認可
-   Dropbox孤児ファイルの自動クリーンアップ
-   高度なバックアップ機能
-   オフライン同期
-   同時編集制御
-   高度なキャッシュ・パフォーマンス最適化

これらは必要になった時点で追加設計する。未決定事項によって初期版の実装が停止しないことを基本とする。

## 25. 関連設計書

-   `docs/システム概要.md`
-   `docs/データ設計.md`
-   `docs/テーブル構成設計.md`
-   `docs/DynamoDB詳細設計.md`

次工程では、本API設計を前提として「画面設計」を定義する。

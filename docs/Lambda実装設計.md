# Lambda実装設計

## 1. 目的

本書では、MITSURU FARM 圃場記録アプリのバックエンド実装において、
Amazon API Gateway HTTP API から呼び出される AWS Lambda の設計を定義する。

前提とする設計書は以下のとおり。

- `システム概要.md`
- `データ設計.md`
- `テーブル構成設計.md`
- `DynamoDB詳細設計.md`
- `API設計.md`
- `画面設計.md`
- `SPA設計.md`
- `AWS実装設計.md`

本書は、Lambda の責務分割、共通基盤、DynamoDBアクセスパターン、入力検証、エラーハンドリング、Dropbox連携、デプロイ方式を定義する。

---

## 2. 基本方針

| 項目 | 方針 |
|---|---|
| 実行環境 | Python 3.x |
| API Gateway | HTTP API |
| API認証 | Cognito JWT Authorizer |
| データ保存 | DynamoDB 1テーブル方式 |
| Lambda構成 | `master-api` / `cultivation-api` / `photo-api` |
| レスポンス形式 | JSON |
| 例外ハンドリング | 例外を `code` / `message` に変換し API 成功時と同一形式へ整形 |
| ロギング | AWS CloudWatch Logs |
| 写真保存 | Dropbox API |
| シークレット管理 | SSM Parameter Store を採用（初期版） |
| AWSリソース構築 | AWS Management Console で手動構築 |
| デプロイ | GitHub Actions から zip 配布 |
| 初期版 | 1環境・個人利用前提 |
| ユーザー管理 | 1ユーザー前提、将来拡張を見据えた userId 属性を準備 |
| 削除方針 | 親削除時は確認付き cascade 削除 |

---

## 3. Lambda構成

### 3.1 全体構成

```text
API Gateway HTTP API
  ├─ master-api
  │   ├─ FIELD
  │   ├─ AREA
  │   └─ CROP
  │
  ├─ cultivation-api
  │   ├─ CULTIVATION
  │   ├─ WORK_LOG
  │   └─ HARVEST
  │
  └─ photo-api
      └─ PHOTO / Dropbox
```

### 3.2 役割分担

#### master-api

- FIELD の CRUD
- AREA の CRUD
- CROP の CRUD / 無効化
- ルートに紐づく親子整合性の検証
- DynamoDB の ID 参照・採番処理

#### cultivation-api

- CULTIVATION の CRUD
- WORK_LOG の CRUD
- HARVEST の CRUD
- 現在栽培中一覧取得
- 指定 field / area / crop に紐づく栽培一覧取得
- 親子関係の整合性確認

#### photo-api

- PHOTO の一覧取得
- PHOTO のアップロード
- PHOTO の取得（Dropbox 一時URL生成）
- PHOTO の削除
- Dropbox API との連携

---

## 4. 共通アーキテクチャ

### 4.1 共通ライブラリ

各 Lambda で共通利用する処理を、共通モジュールとして切り出す。

```text
shared/
  __init__.py
  config.py
  logger.py
  dynamodb.py
  auth.py
  response.py
  validation.py
  error_handler.py
  id_generator.py
  timeutil.py
```

### 4.2 目的

- Lambda 関数の重複コードを削減する
- エラーレスポンス形式を統一する
- DynamoDB や Cognito 認証の共通処理を集約する
- テスト可能な構造を確保する

### 4.3 共通処理の責務

#### config.py

- 環境変数の読み込み
- `TABLE_NAME`, `AWS_REGION`, `DROPBOX_APP_KEY`, `DROPBOX_REFRESH_TOKEN` などの解決
- 環境変数不足時の明示的エラー

#### auth.py

- `Authorization` ヘッダーから JWT を取得
- Cognito 認証済みのユーザー sub を検出
- Lambda で利用する `user_id` を生成する

#### dynamodb.py

- `boto3.resource('dynamodb')` の初期化
- `put_item`, `get_item`, `update_item`, `delete_item`, `query`, `scan` 等のラッパー
- PK / SK / GSI 用のキー生成ヘルパー

#### response.py

- 成功時の JSON レスポンス整形
- `statusCode`, `headers`, `body` の共通生成
- `nextToken` の付与

#### validation.py

- 型チェック
- 必須項目チェック
- 日付フォーマット検証
- 数値範囲チェック
- `status` の許可値チェック

#### error_handler.py

- `ValidationError`, `NotFoundError`, `ConflictError` を HTTP ステータスへ変換
- API 形式に合わせたエラー JSON を出力

---

## 5. ルーティング方針

### 5.1 API Gateway のルーティング

HTTP API のルートは `/api/v1` を前提とする。

```text
/api/v1/fields
/api/v1/fields/{fieldId}
/api/v1/fields/{fieldId}/areas
/api/v1/fields/{fieldId}/areas/{areaId}
/api/v1/crops
/api/v1/crops/{cropId}
/api/v1/cultivations
/api/v1/cultivations/current
/api/v1/cultivations/{cultivationId}
/api/v1/cultivations/{cultivationId}/work-logs
/api/v1/cultivations/{cultivationId}/work-logs/{workLogId}
/api/v1/cultivations/{cultivationId}/harvests
/api/v1/cultivations/{cultivationId}/harvests/{harvestId}
/api/v1/cultivations/{cultivationId}/photos
/api/v1/cultivations/{cultivationId}/photos/{photoId}
```

### 5.2 Lambda 関数のマッピング

#### master-api

- `GET /fields` → `list_fields`
- `POST /fields` → `create_field`
- `GET /fields/{fieldId}` → `get_field`
- `PUT /fields/{fieldId}` → `update_field`
- `DELETE /fields/{fieldId}` → `delete_field`

- `GET /fields/{fieldId}/areas` → `list_areas`
- `POST /fields/{fieldId}/areas` → `create_area`
- `GET /fields/{fieldId}/areas/{areaId}` → `get_area`
- `PUT /fields/{fieldId}/areas/{areaId}` → `update_area`
- `DELETE /fields/{fieldId}/areas/{areaId}` → `delete_area`

- `GET /crops` → `list_crops`
- `POST /crops` → `create_crop`
- `GET /crops/{cropId}` → `get_crop`
- `PUT /crops/{cropId}` → `update_crop`
- `DELETE /crops/{cropId}` → `delete_crop` （物理削除ではなく `active=false`）

#### cultivation-api

- `GET /cultivations` → `list_cultivations`
- `GET /cultivations/current` → `list_current_cultivations`
- `POST /cultivations` → `create_cultivation`
- `GET /cultivations/{cultivationId}` → `get_cultivation`
- `PUT /cultivations/{cultivationId}` → `update_cultivation`
- `DELETE /cultivations/{cultivationId}` → `delete_cultivation`

- `GET /fields/{fieldId}/areas/{areaId}/cultivations` → `list_area_cultivations`
- `GET /crops/{cropId}/cultivations` → `list_crop_cultivations`

- `GET /cultivations/{cultivationId}/work-logs` → `list_work_logs`
- `POST /cultivations/{cultivationId}/work-logs` → `create_work_log`
- `GET /cultivations/{cultivationId}/work-logs/{workLogId}` → `get_work_log`
- `PUT /cultivations/{cultivationId}/work-logs/{workLogId}` → `update_work_log`
- `DELETE /cultivations/{cultivationId}/work-logs/{workLogId}` → `delete_work_log`

- `GET /cultivations/{cultivationId}/harvests` → `list_harvests`
- `POST /cultivations/{cultivationId}/harvests` → `create_harvest`
- `GET /cultivations/{cultivationId}/harvests/{harvestId}` → `get_harvest`
- `PUT /cultivations/{cultivationId}/harvests/{harvestId}` → `update_harvest`
- `DELETE /cultivations/{cultivationId}/harvests/{harvestId}` → `delete_harvest`

#### photo-api

- `GET /cultivations/{cultivationId}/photos` → `list_photos`
- `POST /cultivations/{cultivationId}/photos` → `upload_photo`
- `GET /cultivations/{cultivationId}/photos/{photoId}` → `get_photo`
- `DELETE /cultivations/{cultivationId}/photos/{photoId}` → `delete_photo`

---

## 6. DynamoDBアクセスパターン

### 6.1 共通アクセスパターン

DynamoDB は 1 テーブル方式を採用し、各 Lambda は PK / SK / GSI を使い分ける。

#### FIELD系

- `PK = fieldId`, `SK = FIELD`
- `fieldId` で FIELD 取得
- `PK = fieldId` で `AREA` 及び関連データの一覧取得

#### AREA系

- `PK = fieldId`, `SK = AREA#areaId`
- `PK = fieldId`, `SK begins_with AREA#` で一覧取得

#### CULTIVATION系

- `PK = fieldId`, `SK = AREA#areaId#CULTIVATION#year#cultivationId`
- `GSI1`: `entityType + cultivationId` で詳細取得
- `GSI2`: `cropId` で作物別履歴取得
- `GSI3`: `status = growing` で現在栽培中一覧取得

#### WORK_LOG / HARVEST

- `PK = fieldId`
- `SK = AREA#areaId#CULTIVATION#year#cultivationId#WORK#date#workLogId`
- `PK = fieldId`
- `SK = AREA#areaId#CULTIVATION#year#cultivationId#HARVEST#date#harvestId`

#### PHOTO

- `PK = fieldId`
- `SK = AREA#areaId#CULTIVATION#year#cultivationId#PHOTO#photoId`
- `url` は Dropbox の一時URLを持つ

### 6.2 Query / Get の使い分け

- 単一取得: `GetItem`
- 一覧取得: `Query`
- 親子整合性確認: `GetItem` をループして確認
- ID採番: `COUNTER` の `UpdateItem`

---

## 7. ID採番設計

### 7.1 採番方針

ID は Lambda で DynamoDB の `COUNTER` Item から採番する。

```text
COUNTER
  PK = COUNTER
  SK = F
  current = 1
```

採番ロジック:

1. `UpdateItem` で `current` を `+1` する
2. 更新後の値を取得する
3. 連番を `F0001` などの形式へ変換する

### 7.2 例

- `F` → `F0001`
- `A` → `A0001`
- `C` → `C0001`
- `W` → `W0001`
- `H` → `H0001`
- `PH` → `PH0001`

### 7.3 補足

- 欠番は許容する
- 4桁を超える採番時はエラーとして扱う
- DynamoDB の Atomic Counter により同時採番時の重複を防止する

---

## 8. 入力検証

### 8.1 共通検証

以下は Lambda で必ず実施する。

- 必須項目チェック
- 型チェック
- 文字列長チェック
- 日付形式チェック
- 数値の妥当性チェック
- `status` の許可値チェック
- 親リソース存在チェック
- 親子関係の整合性チェック

### 8.2 FIELD の検証

- `name` は必須
- `area` は `0` 以上
- `status` は `active` / `inactive` のいずれか

### 8.3 AREA の検証

- `name` は必須
- `fieldId` は対象 FIELD に存在すること
- `areaSize` は `0` 以上

### 8.4 CULTIVATION の検証

- `fieldId` と `areaId` が同一 FIELD 配下である
- `cropId` が存在し `active=true`
- `year` が妥当な範囲
- `status` が `planned|growing|completed|failed`
- `completedDate` は `completed` のときのみ許可

### 8.5 WORK_LOG / HARVEST の検証

- `date` は年月日形式
- `quantity` は 0 以上
- `sales` は 0 以上
- `unit` が存在する

---

## 9. エラー設計

### 9.1 例外分類

| 例外 | HTTPステータス | 意味 |
|---|---:|---|
| ValidationError | 400 | 入力不正 |
| NotFoundError | 404 | 対象データなし |
| ConflictError | 409 | 親子関係やステータス衝突 |
| DependencyError | 502 | Dropbox等外部依存エラー |
| InternalError | 500 | 予期しないサーバーエラー |

### 9.2 共通エラー形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "fieldId is required"
  }
}
```

### 9.3 Lambda でのエラー処理

- 例外を捕捉する
- `code` を決める
- `statusCode` を設定する
- `body` を JSON に変換して返す
- CloudWatch Logs に `trace_id` と `error` を出す

---

## 10. フィールド管理APIの実装設計

### 10.1 FIELD 作成

入力:

```json
{
  "name": "10a圃場",
  "area": 1000,
  "location": "韮崎市",
  "soilType": "黒ボク",
  "drainage": "良好",
  "sunlight": "良好",
  "status": "active",
  "note": "南側に水路あり"
}
```

処理:

1. JWT から `user_id` を取得
2. JSON 形式を検証
3. `FIELD` 向け ID を採番
4. `createdAt` と `updatedAt` をセット
5. DynamoDB に `PutItem`
6. 作成済み Item を返す

### 10.2 FIELD 更新

- `fieldId` に対して既存 Item を取得
- 変更禁止項目を除去
- `updatedAt` を更新
- `PutItem` で保存

### 10.3 FIELD 削除

初期版では物理削除を採用する。ただし、階層データがある場合は削除前に子データを確認し、必要に応じて cascade 処理を行う。

削除対象:

- FIELD
- AREA
- CULTIVATION
- WORK_LOG
- HARVEST
- PHOTO

※ PHOTO は Dropbox 削除を先に行うことを推奨する

---

## 11. エリア管理APIの実装設計

### 11.1 AREA 作成

- `fieldId` の存在確認
- `areaId` を採番
- `PK = fieldId`, `SK = AREA#areaId` の Item 生成
- `status` のデフォルトは `active`

### 11.2 AREA 更新

- 既存 `areaId` を確認
- `fieldId` の整合性確認
- `updatedAt` 更新

### 11.3 AREA 削除

削除対象の AREA 配下に CULTIVATION がある場合は、親子構造の整合性を確認し、削除前に確認を行う。

---

## 12. CROP管理APIの実装設計

### 12.1 CROP 作成

- `cropId` を採番
- `PK = cropId`, `SK = CROP`
- `active=true` を初期化
- `createdAt`, `updatedAt` を追加

### 12.2 CROP 更新

- `active` の変更許可
- `note` などの更新

### 12.3 CROP 削除

設計書の方針に従い、物理削除ではなく `active=false` へ変更する。

理由:

- 栽培履歴から参照されるマスタデータである
- 履歴の再現性を保つ
- 既存栽培記録を壊さない

---

## 13. CULTIVATION管理APIの実装設計

### 13.1 CULTIVATION 作成

処理順序:

1. `fieldId`, `areaId`, `cropId` の存在確認
2. `fieldId` と `areaId` の親子関係確認
3. `cropId` が有効か確認
4. `year` と `status` と日付の妥当性確認
5. `cultivationId` 採番
6. `PK / SK` を決定
7. `createdAt`, `updatedAt` を生成
8. DynamoDB に保存

### 13.2 現在栽培中一覧

GSI3 を利用して次の条件で取得する。

- `status = growing`
- `user_id` または `ownerId` に一致

### 13.3 ラベル定義

```text
planned   = 栽培予定
growing   = 栽培中
completed = 栽培完了
failed    = 栽培中止・失敗
```

---

## 14. WORK_LOG / HARVEST管理APIの実装設計

### 14.1 生成ルール

- `workLogId` / `harvestId` を採番
- 親の `cultivationId` を元に SK を組み立てる
- `date` を SK に含めることで時系列取得に適したデータ構成にする

### 14.2 一覧取得

- `cultivationId` を基準に query
- `date` をソートキーに含めて取得
- `nextToken` を返す

### 14.3 更新

- 対象 `workLogId` / `harvestId` の存在確認
- 親の `cultivationId` 整合性確認
- `updatedAt` を更新

---

## 15. PHOTO管理APIの実装設計

### 15.1 アップロード処理

```text
SPA
  -> API Gateway
  -> photo-api
  -> Dropbox API に multipart/form-data で送信
  -> Dropbox から file_id / shared_link を取得
  -> DynamoDB に PHOTO Item を保存
  -> PHOTOのメタデータをレスポンスとして返却
```

### 15.2 保存方式

#### 方式A: Dropbox の shared_link を保持

- 保存が簡単
- 一時URL生成も比較的簡単
- 実運用では URL の有効期限管理が必要

#### 方式B: Dropbox ファイル ID を保持し、都度一時URLを生成

- 監査性が高い
- セキュリティが高い
- 実装がやや複雑になる

初期版では、DynamoDB に `dropboxPath` または `fileId` を保存し、必要時に一時URLを生成する設計が安全である。

### 15.3 一時URL生成

- `files/get_temporary_link` または `sharing/create_shared_link_with_settings` を利用
- 返却時に URL だけを返す
- 一時URLは画面表示用であり、長期保存しない

### 15.4 削除処理

削除時は以下を順に行う。

1. DynamoDB から PHOTO メタデータを取得
2. Dropbox からファイル削除
3. DynamoDB から PHOTO Item を削除
4. Dropbox 失敗時は DynamoDB 削除を行わない

---

## 16. 認証・認可設計

### 16.1 JWT 認証

- API Gateway の JWT Authorizer を利用する
- `sub` を ID として扱う
- Lambda では `user_id` として保持する

### 16.2 ユーザー境界

初期版では個人利用を前提とし、1ユーザー専用アプリとして設計する。

推奨方式:

- `userId` を全データの共通属性として保持する
- 現時点では実装上は 1ユーザー前提とし、将来の多ユーザー対応を見据えて属性を残す
- `PK` / `SK` をそのままマルチユーザー前提にしすぎず、初期版は単一ユーザー運用を簡潔に保つ

> 1ユーザー前提を採用しつつ、将来の拡張を見据えて `userId` 属性を持たせる設計が最適である。

### 16.3 セキュアなシークレット管理

初期版では SSM Parameter Store を利用する。

理由:

- 個人利用の初期段階で十分なコスト効率がある
- 常時無料ではないが、個人利用レベルでの運用コストは低い
- Secrets Manager はより高機能だが、初期版では過剰な導入コストがある

現時点では、以下を推奨する。

- Dropbox のアクセストークン・Refresh Token は SSM Parameter Store に格納
- Lambda 環境変数には必要最小限のみ格納
- なるべく静的な秘密情報は Lambda に直接埋め込まない

### 16.4 削除方針

初期版では、親子関係のあるデータは確認付きで削除する。

- FIELD 削除時: 配下の AREA / CULTIVATION / WORK_LOG / HARVEST / PHOTO を対象にする
- AREA 削除時: 配下の CULTIVATION と関連写真を対象にする
- CULTIVATION 削除時: WORK_LOG / HARVEST / PHOTO を削除する
- PHOTO 削除時: Dropbox からの削除を成功してから DynamoDB 削除を行う

これは、データ整合性と運用安全性の両面を保つためである。

---

## 17. ログ設計

### 17.1 CloudWatch Logs

Lambda は以下をログに出力する。

- リクエスト ID
- リクエストパス
- HTTP メソッド
- ユーザー識別子
- 実行時間
- エラーコード
- 例外メッセージ
- 重要イベント（作成・更新・削除）

### 17.2 ログ保持期間

- 30日を基本とする

---

## 18. 環境変数

### 18.1 必須環境変数

```text
TABLE_NAME=FARM_TBL
AWS_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=...
COGNITO_CLIENT_ID=...
DROPBOX_APP_KEY=...
DROPBOX_APP_SECRET=...
DROPBOX_REFRESH_TOKEN=...
```

### 18.2 推奨非公開管理

- Dropbox のアクセストークン
- Refresh Token
- AWS 認証情報

は環境変数に直接埋め込まず、SSM Parameter Store または Secrets Manager に格納する。

---

## 19. デプロイ設計

### 19.1 デプロイ方式

- Lambda は別リポジトリで管理する
- GitHub Actions で zip 包含デプロイを行う
- 各 Lambda を独立した関数としてデプロイする

### 19.2 実行順序

1. コードを GitHub に push
2. GitHub Actions が Python バージョンをセットアップ
3. `pip install` と依存整理
4. `zip` 作成
5. AWS CLI または GitHub Action の AWS デプロイアクションで Lambda へアップロード
6. API Gateway のルートと Lambda の統合を更新

### 19.3 デプロイ物理構成

```text
lambda-master/
  app/
    handler.py
    requirements.txt
    shared/

lambda-cultivation/
  app/
    handler.py
    requirements.txt
    shared/

lambda-photo/
  app/
    handler.py
    requirements.txt
    shared/
```

---

## 20. 実装時の推奨ディレクトリ構成

```text
lambda-master/
  app/
    handlers/
      field_handler.py
      area_handler.py
      crop_handler.py
    services/
      field_service.py
      area_service.py
      crop_service.py
    shared/
      __init__.py
      config.py
      response.py
      dynamodb.py
      validation.py
      error_handler.py
    requirements.txt
    template.yaml

lambda-cultivation/
  app/
    handlers/
      cultivation_handler.py
      work_log_handler.py
      harvest_handler.py
    services/
      cultivation_service.py
      work_log_service.py
      harvest_service.py
    shared/
      ...
    requirements.txt

lambda-photo/
  app/
    handlers/
      photo_handler.py
    services/
      photo_service.py
      dropbox_service.py
    shared/
      ...
    requirements.txt
```

---

## 21. 確定した運用方針

以下の項目は、実装前の最終確認で確定した方針である。

### 21.1 AWSリソースの構築方法

- AWS Management Console で手動構築する
- 将来的に IaC 化する可能性はあるが、初期版では手動に固定する

理由は、個人利用の小規模アプリで初期学習コストを抑え、まずは動作検証と機能実装を優先するためである。

### 21.2 Dropbox 認証の格納方法

- Dropbox のシークレットは SSM Parameter Store に格納する
- Lambda 環境変数には秘密そのものを直接埋め込まない

これにより、個人利用レベルの安全性と運用簡便さのバランスが取れる。

### 21.3 ユーザー管理の要件

- 初期版は 1ユーザー前提で運用する
- `userId` 属性は残し、将来の多ユーザー対応を見据える

この方針で、初期構成を簡潔に保ちながら、将来拡張の余地を残せる。

### 21.4 削除時のポリシー

- 親データ削除時は子データも削除する
- ただし、SPA 側で確認ダイアログを表示し、誤削除を防ぐ
- PHOTO では Dropbox 上のファイル削除を成功後に DynamoDB から削除する

これにより、データ整合性と運用安全性の両立を図る。

### 21.5 API Gateway の Authorizer

- Cognito JWT Authorizer を採用する
- Lambda Authorizer は採用しない

これは既存設計と整合し、実装の複雑化を避けられる。

### 21.6 CORS の許可元

- GitHub Pages の本番ドメイン
- ローカル開発環境の `localhost`

本番と開発の両方を許可し、セキュリティと開発効率を両立する。

---

## 22. 実装優先順序

初期版では、以下の順で実装するのが安全である。

1. `master-api`
   - FIELD / AREA / CROP
2. `cultivation-api`
   - CULTIVATION / WORK_LOG / HARVEST
3. `photo-api`
   - PHOTO / Dropbox
4. 認証と API Gateway の統合
5. ログと監視の整備
6. GitHub Actions によるデプロイ

---

## 23. まとめ

本 Lambda 実装設計は、`AWS実装設計` と `API設計` を踏まえて、以下の設計を基本方針とする。

- `master-api` でマスターデータを管理する
- `cultivation-api` で栽培・作業・収穫を管理する
- `photo-api` で Dropbox 連携と写真管理を行う
- DynamoDB は 1 テーブル方式で親子階層を保持する
- Cognito JWT で API を保護する
- エラーとログを API 形式に統一する

本 Lambda 実装設計は、上記の最終方針を反映して確定済みである。実装は 3 Lambda 分割、Cognito JWT 認証、SSM Parameter Store、1ユーザー前提、確認付き削除を基本とする。

---

## 24. 実装開始の判断基準

以下の設計が確定しているため、次のフェーズとして Lambda のコード雛形を作成できる状態である。

1. Lambda は 3 関数分割で進める
2. Dropbox 認証情報は SSM Parameter Store で管理する
3. 初期版は 1ユーザー前提だが `userId` を保持する
4. 親削除時は子データも削除し、確認ダイアログを前提にする
5. AWS リソースは手動構築を基本とする

これらが確定したため、次は Lambda 実装コードの雛形と基本リクエストハンドラの作成に進める。

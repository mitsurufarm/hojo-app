# 圃場記録アプリ DynamoDB詳細設計

## 1. 文書の目的

本書では、`docs/テーブル構成設計.md` で確定したDynamoDB
1テーブル方式を、実装時に迷わないレベルまで具体化する。

対象システムはMITSURU FARMの個人利用を前提とする。

本書で定義する範囲: - DynamoDBテーブルの正式名称 - テーブルのキー構成 -
GSIの正式名称・キー・Projection - 各Itemの属性・型・必須/任意 -
ID自動採番 - CRUD処理 - 条件付き書き込み - 削除処理 -
PHOTOとDropboxの整合性 - ページング - 読み込み整合性 -
Lambdaからのアクセス方針 - サンプルItem


## 2. DynamoDB基本設定

  項目                     設定
  ------------------------ -----------------------------------
  テーブル名               `FARM_TBL`
  方式                     1テーブル方式
  Partition Key            `PK`
  Sort Key                 `SK`
  Capacity Mode            `PAY_PER_REQUEST`（オンデマンド）
  Table Class              Standard
  暗号化                   DynamoDB標準のAWS管理方式
  Point-in-Time Recovery   初期版では使用しない
  Streams                  初期版では使用しない

個人利用でデータ量・アクセス量が小さいため、初期版ではオンデマンド方式とする。


## 3. 共通データルール

### 3.1 DynamoDB型

  論理型         DynamoDB型   例
  -------------- ------------ -----------------------------
  文字列         `S`          `"大根"`
  数値           `N`          `100`
  真偽値         `BOOL`       `true`
  配列           `L`          `["鍬","三叉鍬"]`
  オブジェクト   `M`          `{"amount":10,"unit":"kg"}`

### 3.2 日付

日付だけを扱う属性は `YYYY-MM-DD` の文字列とする。

``` text
2026-09-12
```

対象: - `sowingDate` - `plantingDate` - `harvestStartDate` -
`harvestEndDate` - `completedDate` - WORK_LOG `date` - HARVEST
`harvestDate`

### 3.3 日時

システム上の作成日時・更新日時はUTCのISO 8601文字列とする。

``` text
2026-09-17T06:30:00.000Z
```

対象: - `createdAt` - `updatedAt`

### 3.4 年度

`CULTIVATION.year` は栽培開始年をNumberで保持する。

2026年9月播種・2027年1月収穫なら `year = 2026` とする。

### 3.5 ID

  データ        Prefix   例
  ------------- -------- ----------
  FIELD         `F`      `F0001`
  AREA          `A`      `A0001`
  CROP          `P`      `P0001`
  CULTIVATION   `C`      `C0001`
  WORK_LOG      `W`      `W0001`
  HARVEST       `H`      `H0001`
  PHOTO         `PH`     `PH0001`

4桁を超える採番は初期仕様ではエラーとする。


# 4. Base Tableキー設計

  --------------------------------------------------------------------------------------------------------------
  type                    PK                      SK
  ----------------------- ----------------------- --------------------------------------------------------------
  FIELD                   `F0001`                 `FIELD`

  AREA                    `F0001`                 `AREA#A0001`

  CULTIVATION             `F0001`                 `AREA#A0001#CULTIVATION#2026#C0001`

  WORK_LOG                `F0001`                 `AREA#A0001#CULTIVATION#2026#C0001#WORK#2026-09-12#W0001`

  HARVEST                 `F0001`                 `AREA#A0001#CULTIVATION#2026#C0001#HARVEST#2026-12-01#H0001`

  PHOTO                   `F0001`                 `AREA#A0001#CULTIVATION#2026#C0001#PHOTO#PH0001`

  CROP                    `P0001`                 `CROP`

  COUNTER                 `COUNTER`               `F` / `A` / `P` / `C` / `W` / `H` / `PH`
  --------------------------------------------------------------------------------------------------------------


# 5. GSI設計

FIELD/CROP一覧にもGSIを使用するため、GSIは4本とする。

  Index    目的
  -------- -----------------------------------------
  `GSI1`   CULTIVATION単位で作業・収穫・写真を取得
  `GSI2`   作物からCULTIVATIONを逆引き
  `GSI3`   現在栽培中のCULTIVATIONを一覧
  `GSI4`   FIELD一覧・CROP一覧

初期版では各GSIのProjectionを `ALL`
とする。個人利用でデータ量が小さく、Lambda側の実装を単純化することを優先する。

## 5.1 GSI1

CULTIVATION詳細からWORK_LOG/HARVEST/PHOTOを取得する。

CULTIVATION:

``` text
GSI1PK = C0001
GSI1SK = 00#CULTIVATION
```

WORK_LOG:

``` text
GSI1PK = C0001
GSI1SK = 10#WORK#2026-09-12#W0001
```

HARVEST:

``` text
GSI1PK = C0001
GSI1SK = 20#HARVEST#2026-12-01#H0001
```

PHOTO:

``` text
GSI1PK = C0001
GSI1SK = 30#PHOTO#PH0001
```

## 5.2 GSI2

CROPからCULTIVATIONを逆引きする。

``` text
GSI2PK = CROP#P0001
GSI2SK = 2026#F0001#A0001#C0001
```

## 5.3 GSI3

`status = growing` のCULTIVATIONだけを登録するSparse GSI。

``` text
GSI3PK = STATUS#growing
GSI3SK = 2026#F0001#A0001#C0001
```

`planned`、`completed`、`failed` にはGSI3キーを設定しない。

## 5.4 GSI4

FIELD一覧とCROP一覧をScanせずに取得する。

FIELD:

``` text
GSI4PK = ENTITY#FIELD
GSI4SK = F0001
```

CROP:

``` text
GSI4PK = ENTITY#CROP
GSI4SK = P0001
```


# 6. Item属性詳細

## 6.1 FIELD

  属性          型     必須 内容
  ------------- ---- ------ -----------------------
  `PK`          S         ○ `F0001`
  `SK`          S         ○ `FIELD`
  `type`        S         ○ `FIELD`
  `fieldId`     S         ○ 圃場ID
  `name`        S         ○ 圃場名
  `area`        N         ○ 面積m²
  `location`    S         △ 所在地
  `latitude`    N         △ 緯度
  `longitude`   N         △ 経度
  `soilType`    S         △ 土質
  `drainage`    S         △ 排水性
  `sunlight`    S         △ 日当たり
  `status`      S         ○ `active` / `inactive`
  `note`        S         △ 備考
  `GSI4PK`      S         ○ `ENTITY#FIELD`
  `GSI4SK`      S         ○ fieldId
  `createdAt`   S         ○ 作成日時
  `updatedAt`   S         ○ 更新日時

## 6.2 AREA

  属性          型     必須 内容
  ------------- ---- ------ -----------------------
  `PK`          S         ○ fieldId
  `SK`          S         ○ `AREA#A0001`
  `type`        S         ○ `AREA`
  `areaId`      S         ○ エリアID
  `fieldId`     S         ○ 所属圃場ID
  `name`        S         ○ エリア名
  `areaSize`    N         ○ 面積m²
  `position`    S         △ 圃場内位置
  `status`      S         ○ `active` / `inactive`
  `note`        S         △ 備考
  `createdAt`   S         ○ 作成日時
  `updatedAt`   S         ○ 更新日時

## 6.3 CROP

  属性          型       必須 内容
  ------------- ------ ------ ----------------
  `PK`          S           ○ cropId
  `SK`          S           ○ `CROP`
  `type`        S           ○ `CROP`
  `cropId`      S           ○ 作物ID
  `name`        S           ○ 作物名
  `category`    S           △ 根菜・葉菜など
  `active`      BOOL        ○ 選択可能か
  `note`        S           △ 備考
  `GSI4PK`      S           ○ `ENTITY#CROP`
  `GSI4SK`      S           ○ cropId
  `createdAt`   S           ○ 作成日時
  `updatedAt`   S           ○ 更新日時

## 6.4 CULTIVATION

  属性                 型     必須 内容
  -------------------- ---- ------ ------------------------------------------------
  `PK`                 S         ○ fieldId
  `SK`                 S         ○ エリア・年度・栽培ID
  `type`               S         ○ `CULTIVATION`
  `cultivationId`      S         ○ 栽培ID
  `fieldId`            S         ○ 圃場ID
  `areaId`             S         ○ エリアID
  `cropId`             S         ○ 作物ID
  `year`               N         ○ 栽培開始年
  `variety`            S         △ 品種
  `season`             S         △ 作型・季節
  `sowingDate`         S         △ 播種日
  `plantingDate`       S         △ 定植日
  `harvestStartDate`   S         △ 収穫開始日
  `harvestEndDate`     S         △ 収穫終了日
  `completedDate`      S         △ 栽培完了日
  `status`             S         ○ `planned` / `growing` / `completed` / `failed`
  `note`               S         △ 備考
  `GSI1PK`             S         ○ cultivationId
  `GSI1SK`             S         ○ `00#CULTIVATION`
  `GSI2PK`             S         ○ `CROP#` + cropId
  `GSI2SK`             S         ○ year + field/area/cultivation
  `GSI3PK`             S      条件 `STATUS#growing`
  `GSI3SK`             S      条件 year + field/area/cultivation
  `createdAt`          S         ○ 作成日時
  `updatedAt`          S         ○ 更新日時

## 6.5 WORK_LOG

  属性                型      必須 内容
  ------------------- ----- ------ --------------------------
  `PK`                S          ○ fieldId
  `SK`                S          ○ 栽培・日付・作業ID
  `type`              S          ○ `WORK_LOG`
  `workLogId`         S          ○ 作業記録ID
  `fieldId`           S          ○ 圃場ID
  `areaId`            S          ○ エリアID
  `cultivationId`     S          ○ 栽培ID
  `date`              S          ○ 作業日
  `workType`          S          ○ 作業種別
  `description`       S          △ 作業内容
  `workMinutes`       N          △ 作業時間分
  `workerCount`       N          △ 作業人数
  `materials`         L/M        △ 使用資材
  `tools`             L          △ 使用道具・機械
  `weather`           S          △ 天候
  `temperature`       N          △ 気温
  `soilCondition`     S          △ 土壌状態
  `beforeCondition`   S          △ 作業前状態
  `afterCondition`    S          △ 作業後状態
  `note`              S          △ メモ
  `GSI1PK`            S          ○ cultivationId
  `GSI1SK`            S          ○ `10#WORK#date#workLogId`
  `createdAt`         S          ○ 登録日時
  `updatedAt`         S          ○ 更新日時

`materials` は例えば以下のList/Map構造を許容する。

``` json
[
  {
    "name": "米ぬか",
    "quantity": 5,
    "unit": "kg"
  }
]
```

## 6.6 HARVEST

  属性                        型     必須 内容
  --------------------------- ---- ------ -----------------------------
  `PK`                        S         ○ fieldId
  `SK`                        S         ○ 栽培・日付・収穫ID
  `type`                      S         ○ `HARVEST`
  `harvestId`                 S         ○ 収穫ID
  `fieldId`                   S         ○ 圃場ID
  `areaId`                    S         ○ エリアID
  `cultivationId`             S         ○ 栽培ID
  `harvestDate`               S         ○ 収穫日
  `quantity`                  N         ○ 収穫量
  `unit`                      S         ○ kg、個など
  `saleQuantity`              N         △ 販売量
  `selfConsumptionQuantity`   N         △ 自家消費量
  `discardQuantity`           N         △ 廃棄量
  `sales`                     N         △ 売上
  `salesChannel`              S         △ 販路
  `note`                      S         △ 備考
  `GSI1PK`                    S         ○ cultivationId
  `GSI1SK`                    S         ○ `20#HARVEST#date#harvestId`
  `createdAt`                 S         ○ 作成日時
  `updatedAt`                 S         ○ 更新日時

## 6.7 PHOTO

  属性              型     必須 内容
  ----------------- ---- ------ --------------------
  `PK`              S         ○ fieldId
  `SK`              S         ○ 栽培・写真ID
  `type`            S         ○ `PHOTO`
  `photoId`         S         ○ 写真ID
  `fieldId`         S         ○ 圃場ID
  `areaId`          S         △ エリアID
  `cultivationId`   S         △ 栽培ID
  `workLogId`       S         △ 作業記録ID
  `harvestId`       S         △ 収穫記録ID
  `dropboxPath`     S         ○ Dropboxパス
  `caption`         S         △ 写真説明
  `GSI1PK`          S         ○ cultivationId
  `GSI1SK`          S         ○ `30#PHOTO#photoId`
  `createdAt`       S         ○ 登録日時

## 6.8 COUNTER

  属性             型     必須 内容
  ---------------- ---- ------ ------------------------------------------
  `PK`             S         ○ `COUNTER`
  `SK`             S         ○ `F` / `A` / `P` / `C` / `W` / `H` / `PH`
  `counterValue`   N         ○ 現在の採番値


# 7. ID採番

## 7.1 採番方式

DynamoDB `UpdateItem` の `ADD` を利用したAtomic Counterで採番する。

例:

``` text
PK = COUNTER
SK = F
```

に対して `counterValue` を1増加させる。

概念:

``` text
UpdateItem
  Key:
    PK = COUNTER
    SK = F

  UpdateExpression:
    ADD counterValue :increment

  :increment = 1

  ReturnValues:
    UPDATED_NEW
```

取得値を4桁ゼロ埋めする。

``` text
1    → F0001
15   → F0015
9999 → F9999
```

## 7.2 上限

4桁IDの上限を9999とする。

採番前に、

``` text
counterValue < 9999
```

を条件として確認する。

上限到達後は採番エラーとし、5桁IDを自動生成しない。

## 7.3 欠番

Atomic
Counterの更新後に後続のPutItemが失敗するなどにより、IDの欠番が発生する可能性がある。

本アプリではIDの欠番を許容する。


# 8. CRUD設計

## 8.1 作成

``` text
1. ID採番
2. Item生成
3. PutItem
```

新規Item作成時は、同じPK/SKの既存Itemを誤って上書きしないため、

``` text
attribute_not_exists(PK)
```

をConditionExpressionに指定する。

## 8.2 取得

単一Item:

``` text
GetItem
```

一覧・履歴:

``` text
Query
```

主要検索ではScanを使用しない。

## 8.3 更新

単一Itemの更新:

``` text
UpdateItem
```

更新可能な属性だけを`SET`する。

同時編集保護は初期版では実装しない。

## 8.4 削除

単一Item:

``` text
DeleteItem
```

関連Itemがある場合はQueryで対象を取得してから削除する。


# 9. 関連データ削除

## 9.1 対象

FIELD削除:

``` text
FIELD
├─ AREA
├─ CULTIVATION
├─ WORK_LOG
├─ HARVEST
└─ PHOTO
```

AREA削除:

``` text
AREA
├─ CULTIVATION
├─ WORK_LOG
├─ HARVEST
└─ PHOTO
```

CULTIVATION削除:

``` text
CULTIVATION
├─ WORK_LOG
├─ HARVEST
└─ PHOTO
```

## 9.2 処理順

``` text
1. 対象の子ItemをQuery
2. PHOTOを抽出
3. Dropbox上の写真を削除
4. Dropbox削除成功後、DynamoDB Itemを削除
5. 最後に親Itemを削除
```

Dropbox削除に失敗したPHOTOはDynamoDBから削除しない。

これにより残ったPHOTO ItemからDropboxパスを取得して再試行できる。

## 9.3 BatchWriteItem

大量削除は25件ずつ処理する。

``` text
Query
  ↓
25件ずつ分割
  ↓
BatchWriteItem
  ↓
UnprocessedItems確認
  ↓
残件を再試行
```

`BatchWriteItem`
は一括処理全体がall-or-nothingではないため、`UnprocessedItems`
を確認する。


# 10. PHOTOとDropboxの整合性

## 10.1 アップロード

``` text
SPA
 ↓
API Gateway
 ↓
Lambda
 ↓
Dropboxへアップロード
 ↓
Dropbox path取得
 ↓
DynamoDBへPHOTO登録
```

DynamoDB登録に失敗した場合、Dropbox上に孤立ファイルが残る可能性がある。

初期版ではロールバック処理を実装せず、孤立ファイルを許容する。

## 10.2 削除

``` text
PHOTO削除要求
       ↓
Dropbox削除
       ↓
成功
       ↓
DynamoDB PHOTO削除
```

Dropbox側ですでに対象ファイルが存在しない場合は、すでに削除済みとして扱いDynamoDB削除へ進める。

Dropbox一時エラー時はDynamoDB PHOTOを削除しない。

## 10.3 Dropboxフォルダ

``` text
MITSURU FARM/
└── F0001_10a圃場/
    └── A0001_Aエリア/
        └── 2026/
            └── C0001_大根/
                ├── 作業/
                └── 収穫/
```

PHOTO ItemにはDropboxパスを保存する。

圃場名・エリア名・作物名を変更しても、初期版では既存Dropboxフォルダを自動リネームしない。


# 11. 読み込み整合性

原則としてEventually Consistent Readを使用する。

対象: - 一覧 - 履歴 - 検索 - 写真一覧 - 作業一覧 - 収穫一覧

直前の書き込み結果を確実に取得する必要がある処理だけStrongly Consistent
Readを検討する。


# 12. ページング

DynamoDB Queryの`LastEvaluatedKey`をAPI用の`nextToken`へ変換する。

レスポンス例:

``` json
{
  "items": [],
  "nextToken": "..."
}
```

初期値: - デフォルト件数: 50 - 最大件数: 100

実際のHTTPパラメータ名はAPI設計で確定する。


# 13. アクセスパターン

  AP      内容                 操作
  ------- -------------------- --------------------------
  AP-01   FIELD一覧            Query GSI4
  AP-02   FIELD → AREA         Query Base Table
  AP-03   AREA栽培履歴         Query Base Table
  AP-04   AREA・年度栽培       Query Base Table
  AP-05   CULTIVATION詳細      Query GSI1
  AP-06   CROP → CULTIVATION   Query GSI2
  AP-07   CROP・年度           Query GSI2 + begins_with
  AP-08   現在栽培中           Query GSI3
  AP-09   作業履歴             Query GSI1 + begins_with
  AP-10   収穫履歴             Query GSI1 + begins_with
  AP-11   写真一覧             Query GSI1 + begins_with
  AP-12   CROP一覧             Query GSI4


# 14. 代表的なサンプルItem

## 14.1 FIELD

``` json
{
  "PK": "F0001",
  "SK": "FIELD",
  "type": "FIELD",
  "fieldId": "F0001",
  "name": "10a圃場",
  "area": 1000,
  "location": "山梨県韮崎市",
  "soilType": "水田転換畑",
  "drainage": "やや悪い",
  "sunlight": "良好",
  "status": "active",
  "note": "自然栽培試験圃場",
  "GSI4PK": "ENTITY#FIELD",
  "GSI4SK": "F0001",
  "createdAt": "2026-09-01T00:00:00.000Z",
  "updatedAt": "2026-09-01T00:00:00.000Z"
}
```

## 14.2 AREA

``` json
{
  "PK": "F0001",
  "SK": "AREA#A0001",
  "type": "AREA",
  "areaId": "A0001",
  "fieldId": "F0001",
  "name": "Aエリア",
  "areaSize": 300,
  "position": "南側",
  "status": "active",
  "createdAt": "2026-09-01T00:00:00.000Z",
  "updatedAt": "2026-09-01T00:00:00.000Z"
}
```

## 14.3 CROP

``` json
{
  "PK": "P0001",
  "SK": "CROP",
  "type": "CROP",
  "cropId": "P0001",
  "name": "大根",
  "category": "根菜",
  "active": true,
  "GSI4PK": "ENTITY#CROP",
  "GSI4SK": "P0001",
  "createdAt": "2026-09-01T00:00:00.000Z",
  "updatedAt": "2026-09-01T00:00:00.000Z"
}
```

## 14.4 CULTIVATION

``` json
{
  "PK": "F0001",
  "SK": "AREA#A0001#CULTIVATION#2026#C0001",
  "type": "CULTIVATION",
  "cultivationId": "C0001",
  "fieldId": "F0001",
  "areaId": "A0001",
  "cropId": "P0001",
  "year": 2026,
  "variety": "耐病総太り",
  "season": "秋冬",
  "sowingDate": "2026-09-12",
  "status": "growing",
  "note": "秋大根",
  "GSI1PK": "C0001",
  "GSI1SK": "00#CULTIVATION",
  "GSI2PK": "CROP#P0001",
  "GSI2SK": "2026#F0001#A0001#C0001",
  "GSI3PK": "STATUS#growing",
  "GSI3SK": "2026#F0001#A0001#C0001",
  "createdAt": "2026-09-12T01:00:00.000Z",
  "updatedAt": "2026-09-12T01:00:00.000Z"
}
```

## 14.5 WORK_LOG

``` json
{
  "PK": "F0001",
  "SK": "AREA#A0001#CULTIVATION#2026#C0001#WORK#2026-09-12#W0001",
  "type": "WORK_LOG",
  "workLogId": "W0001",
  "fieldId": "F0001",
  "areaId": "A0001",
  "cultivationId": "C0001",
  "date": "2026-09-12",
  "workType": "播種",
  "description": "大根を播種",
  "workMinutes": 60,
  "workerCount": 1,
  "tools": ["鍬"],
  "weather": "晴れ",
  "soilCondition": "適度に湿っている",
  "GSI1PK": "C0001",
  "GSI1SK": "10#WORK#2026-09-12#W0001",
  "createdAt": "2026-09-12T05:00:00.000Z",
  "updatedAt": "2026-09-12T05:00:00.000Z"
}
```


# 15. Lambdaからのアクセス方式

Lambdaの開発言語・ランタイムは **Python** を採用する。

DynamoDBへのアクセスには、AWS SDK for Pythonである **boto3** を使用する。

```text
SPA
 ↓
API Gateway
 ↓
Lambda（Python）
 ↓
boto3
 ↓
DynamoDB
```

通常のCRUD処理では、コードをシンプルにするため `boto3` のDynamoDB Resource APIを基本とする。

```python
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("FARM_TBL")

response = table.get_item(
    Key={
        "PK": field_id,
        "SK": "FIELD"
    }
)
```

Atomic Counterや条件付き書き込みなど、DynamoDBの低レベルAPIが必要な処理ではDynamoDB Clientも使用できる。

Lambda環境変数:

``` text
DYNAMODB_TABLE_NAME=FARM_TBL
```

テーブル名をコードへ直接ハードコードしない。

Dropboxの認証情報もLambda側で管理し、SPAへ公開しない。


# 16. 条件付き書き込み

同時編集保護は初期版では実装しないが、データ破壊防止を目的とした最低限の条件は使用する。

新規作成:

``` text
attribute_not_exists(PK)
```

削除:

対象Itemが存在しない場合でも、物理削除APIは冪等に扱えるようにする。

更新:

バージョン番号による楽観的排他制御は初期版では行わない。


# 17. エラー処理

  ケース                   API上の扱い
  ------------------------ ----------------
  Item不存在               404
  作成時のキー重複         409
  入力不正                 400
  認証失敗                 401
  権限不足                 403
  AWS/DynamoDB一時エラー   500系
  Dropbox一時エラー        502系
  採番上限到達             409または500系

AWS SDK側の標準的な再試行も利用する。


# 18. データ整合性ルール

CULTIVATION作成:

``` text
FIELD存在
  ↓
AREA存在
  ↓
CROP存在
  ↓
CULTIVATION作成
```

WORK_LOG/HARVEST作成:

``` text
CULTIVATION存在
  ↓
WORK_LOG / HARVEST作成
```

PHOTO作成:

関連するCULTIVATION/WORK_LOG/HARVESTの存在確認を行った上で登録する。


# 19. DynamoDB Itemサイズ

写真本体はDynamoDBへ保存しない。

DynamoDBにはPHOTOメタデータとDropbox pathだけを保存する。


# 20. 初期版で意図的に行わないこと

- 論理削除
- 同時編集保護
- オフライン同期
- DynamoDB Streams
- DynamoDBトリガー
- 複雑なトランザクション
- 大規模な一括更新
- PHOTOの自動孤立ファイル回収
- Dropboxフォルダの自動リネーム
- 高度なバックアップ機能

必要になった段階で追加する。


# 21. 実装時の重要ルール

1.  DynamoDBの主要検索はScanではなくQueryを使用する。
2.  GSI4を使用してFIELD/CROP一覧を取得する。
3.  GSI3は`status=growing`だけを登録するSparse GSIとする。
4.  GSI1はCULTIVATIONを起点にWORK/HARVEST/PHOTOを取得する。
5.  GSI2はCROPからCULTIVATIONを逆引きする。
6.  IDはAtomic Counterで採番する。
7.  IDの欠番は許容する。
8.  IDは4桁を上限とし、9999を超える場合はエラーとする。
9.  面積はm²で保存し、aは画面側で換算する。
10. `year`は栽培開始年とする。
11. 日付は`YYYY-MM-DD`、日時はUTC ISO 8601とする。
12. 関連データの削除は親より子を先に処理する。
13. PHOTO削除はDropbox削除成功後にDynamoDBを削除する。
14. BatchWriteItemは25件単位で処理する。
15. `UnprocessedItems`は再試行する。
16. Dropboxアップロード後のDynamoDB登録失敗による孤立ファイルは初期版では許容する。
17. DynamoDBの通常読み込みはEventually Consistentを基本とする。
18. 同時編集保護は初期版では行わない。
19. LambdaはPythonで実装し、DynamoDBアクセスにはboto3を使用する。
20. Lambda環境変数からDynamoDBテーブル名を取得する。
21. Dropboxの認証情報はLambda側だけで管理し、SPAへ公開しない。


# 22. 次の設計書

本書まででDynamoDBの物理設計を確定する。

次工程では `docs/API設計.md` に以下を定義する。

- APIエンドポイント
- HTTPメソッド
- リクエスト/レスポンス
- Cognito認証
- Lambda処理
- バリデーション
- エラー形式
- ページング
- PHOTOアップロード
- PHOTO削除
- FIELD/AREA/CULTIVATION削除
- Dropbox連携

# 無人航空機 飛行日誌・整備記録アプリ — 引き継ぎドキュメント

## プロジェクト概要

航空法に準拠した無人航空機（ドローン）の飛行・整備記録を管理するWebアプリ。
現場での使いやすさ（iPhone対応、大きいフォント、オフライン動作）を最優先に設計。

## アーキテクチャ

```
drone-log.html          ← フロントエンド（単一ファイル）
gas/code.gs             ← バックエンド（Google Apps Script）
```

- **フロントエンド**: 単一HTMLファイル、バニラJS、カスタムCSS
- **バックエンド**: Google Apps Script（GAS）
- **データベース**: Google スプレッドシート（各シートがテーブル）
- **デプロイ**: GitHub Pages（HTMLのみ）
- **外部API**: OpenWeatherMap（気象情報、GAS経由でAPIキー管理）

## 開発モード切り替え

```javascript
// drone-log.html 冒頭
const TEST_MODE = true;   // ← ローカルストレージ使用、ダミーデータ
const TEST_MODE = false;  // ← GAS連携、本番
const GAS_URL = 'YOUR_GAS_WEB_APP_URL_HERE'; // 本番時にGASデプロイURLを設定
```

**TEST_MODE = true の挙動**
- localStorage をDB代わりに使用
- GPS取得の代わりにダミー座標を即時返却
- 気象情報はダミー文字列を即時返却
- フォームにダミーデータが自動入力される
- 起動時にサンプルの機体・操縦者が自動登録される

## データ構造

### スプレッドシートシート構成

| シート名 | 主なフィールド |
|---------|--------------|
| 機体 | id, manufacturer, model, serialNumber, registrationNumber, weight, purchaseDate, appRegisteredDate, preRegistrationMins |
| 操縦者 | id, name, licenseType, licenseNumber, issueDate, expiryDate, birthDate, address, phone, email, notes, limitations(JSON) |
| 飛行記録 | id, droneId, pilotId, date, startTime, endTime, takeoffAddress, landingAddress, location, purpose, flightMode, weather, notes, preflightChecks(JSON), preflightNotes, postflightChecks(JSON), postflightNotes, flightReport, sessions(JSON), totalFlightSecs, createdAt |
| 整備記録 | id, droneId, date, type, technician, description, maintenanceLocation, nextDate, notes, createdAt |
| 飛行目的 | purpose |

### sessions配列の構造（飛行記録内）
```json
[
  {
    "num": 1,
    "takeoffTime": "09:15",
    "landingTime": "09:42",
    "elapsedSeconds": 1620,
    "takeoffCoords": "北緯34.396560, 東経132.459560",
    "landingCoords": "北緯34.396560, 東経132.459560"
  }
]
```

## 実装済み機能

### 飛行日誌タブ
- 飛行開始ボタン → GPS取得（テスト時はダミー）→ タイマー開始
- 飛行前点検チェックリスト（11項目、国交省記載要領準拠）＋特記事項
- 飛行形態チェックボックス（9項目＋自由入力、複数選択可）
- 離陸・着陸場所（住所）入力
- 気象状況（自動取得 or 手動）
- バッテリー交換ボタン → セッション1終了・再開待ち → 飛行再開ボタン → セッション2開始
- 飛行終了ボタン → 飛行後点検モーダル（9項目＋特記事項＋レポート）
- 複数セッション対応、セッション別の離陸・着陸時刻と飛行時間を記録
- 記録中のセッション時刻のインライン編集
- 飛行後は整備記録を自動作成（オプション）
- 機体を選択すると前回飛行の操縦者・目的を自動入力
- 記録カードで ✏ 編集ボタン（飛行場所・目的・気象・時刻・備考を編集可）
- 飛行時間は分単位で表示（「27分」「1時間15分」）

### 整備記録タブ
- 整備種別選択（定期点検、飛行後点検、修理、部品交換、清掃、その他）
- 整備場所（テスト時ダミー、本番はGPS取得）

### 機体管理タブ
- 機体カードに総飛行統計バナー（累計総飛行時間・飛行回数・最終飛行日）
- 登録前の累積飛行時間を分単位で入力可能（アプリ導入前の飛行時間を加算）
- 機体情報の編集モーダル（✏ 編集ボタン）

### 操縦者管理タブ
- 技能証明の有効期限警告（残り30日未満で橙色、期限切れで赤色）
- 限定事項（機体種類・飛行方法）の管理

## GAS側で必要なアクション

`doPost` で以下の `action` を処理する：

- getDrones / addDrone / updateDrone
- getPilots / addPilot
- getFlightLogs / addFlightLog / updateFlightLog
- getMaintenanceLogs / addMaintenanceLog
- getAllData
- addFlightPurpose
- getWeather（OpenWeatherMap API呼び出し）

## UI設計原則

- **フォントサイズ最小16px**（iPhone自動ズーム防止）
- **タブ切り替え時は最上部へ即時スクロール**
- **飛行開始後は記録UIへスムーズスクロール**
- 単一HTMLファイル構成を維持（外部CSS/JSファイルなし）
- `render()` 関数で全UI再描画（Virtual DOM不使用）
- モーダルはHTML文字列として `render()` 内で生成

## 既知のTODO / 今後の改善候補

- [ ] GAS本番モードへの完全移行テスト
- [ ] PDF出力の日本語フォント対応（現状は英語のみ）
- [ ] 操縦者情報の編集機能（機体と同様）
- [ ] 飛行記録の削除機能
- [ ] 整備記録の編集・削除機能
- [ ] 飛行記録CSVエクスポート
- [ ] 国土交通省DIPSへの連携検討

## セットアップ手順（本番環境）

1. Google スプレッドシートを新規作成
2. ツール → Apps Script を開き `gas/code.gs` の内容をペースト
3. ウェブアプリとしてデプロイ（アクセス：全員）
4. スクリプトプロパティに `OPENWEATHER_API_KEY` を設定
5. デプロイURLをコピー
6. `drone-log.html` の `GAS_URL` にペースト、`TEST_MODE = false` に変更
7. GitHub リポジトリにプッシュ、GitHub Pages を有効化

## ファイル構成

```
/
├── drone-log.html      ← メインアプリ（これ1ファイルでフロントエンド完結）
├── gas/
│   └── code.gs         ← GASバックエンド
├── CLAUDE.md           ← このファイル
└── README.md           ← （任意）
```

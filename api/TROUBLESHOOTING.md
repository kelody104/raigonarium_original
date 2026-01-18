# Sheet API Proxy Setup Guide

## トラブルシューティング

### 1. "Network error - Cannot reach proxy server" エラー
- PHPプロキシサーバーが起動していません
- **解決方法**：
  ```bash
  cd api
  php -S localhost:8000
  ```
  この コマンドを実行してPHPサーバーを起動してください

### 2. "Proxy not found (404)" エラー
- PHP プロキシのパスが間違っています
- `sheet-api.service.ts`の `localProxyUrl` を確認してください

### 3. "Server error (500)" エラー
- PHPプロキシが設定ファイルを読み込めていません
- **確認事項**：
  - `api/config.php` ファイルが存在するか
  - `GAS_API_TOKEN` が設定されているか

### 4. CORS エラー
- ブラウザの CORS ポリシーによるエラー
- `sheet-proxy.php` で Access-Control-Allow-Origin が正しく設定されているか確認

### 5. GAS_API_TOKEN エラー
- GAS_API_TOKEN が設定されていません
- **設定方法**：
  1. GAS（Google Apps Script）側で API トークンを生成
  2. `api/config.php` の `GAS_API_TOKEN` に貼り付け

## PHPサーバーの起動

開発環境でテストする場合：
```bash
cd c:\program\Raigonarium-master\api
php -S localhost:8000
```

その後、`sheet-api.service.ts` の `localProxyUrl` が使用されます：
```
http://localhost:8000/api/sheet-proxy.php
```

## 本番環境での設定

- PHPサーバーは、ロリポップなどのレンタルサーバー上で動作させます
- `sheet-api.service.ts` の `proxyUrl` を本番環境のURLに設定：
```
https://mitarashi.link/api/sheet-proxy.php
```

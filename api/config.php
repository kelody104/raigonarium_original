<?php
// config.php - API設定ファイル
// ★重要：このファイルを編集して、GAS_API_TOKENを設定してください

// GAS側でPropertiesService.getScriptProperties().setProperty('API_TOKEN', 'your-token-here');
// で設定したトークンを以下に入力してください

// 開発環境用の設定
define('GAS_API_TOKEN', 'YOUR_GAS_API_TOKEN_HERE');

// 本番環境での推奨設定：
// .envファイルまたは環境変数から読み込む
// define('GAS_API_TOKEN', getenv('GAS_API_TOKEN') ?: '');

// トークンが空の場合のエラーチェックはsheet-proxy.phpで行われます

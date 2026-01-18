<?php
// config.php - API設定ファイル
// ★環境に応じてAPI_TOKENを設定してください

// 開発環境用の設定
define('GAS_API_TOKEN', ''); // 本番では .env から読み込むか、環境変数から取得

// 本番環境での推奨設定：
// define('GAS_API_TOKEN', getenv('GAS_API_TOKEN') ?: '');

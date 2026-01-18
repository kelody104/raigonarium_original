import { Component, OnInit } from '@angular/core';
import { SheetApiService, SheetApiResponse } from 'service/sheet-api.service';

interface ActionButton {
  name: string;
  action: string;
  method: 'get' | 'post';
  description: string;
}

@Component({
  selector: 'sheet-api-check',
  templateUrl: './sheet-api-check.component.html',
  styleUrls: ['./sheet-api-check.component.css']
})
export class SheetApiCheckComponent implements OnInit {
  isTesting = false;
  isSuccess = false;
  isFailed = false;
  result: any = null;
  errorMessage = '';
  
  // 利用可能なアクションボタン
  getActions: ActionButton[] = [
    { name: 'Ping', action: 'ping', method: 'get', description: '疎通確認' },
    { name: 'Season', action: 'season', method: 'get', description: 'シーズン情報' },
    { name: 'Tournaments', action: 'tournaments', method: 'get', description: '大会一覧' },
    { name: 'Players', action: 'players', method: 'get', description: 'プレイヤー一覧' },
  ];
  
  postActions: ActionButton[] = [
    { name: 'Ping (POST)', action: 'ping', method: 'post', description: '疎通確認 (POST)' },
    { name: 'Season (POST)', action: 'season', method: 'post', description: 'シーズン情報 (POST)' },
  ];

  constructor(private sheetApiService: SheetApiService) {}

  ngOnInit(): void {}

  /**
   * スプレッドシート通信テスト実行
   */
  testConnection() {
    this.executeAction('ping', 'get');
  }

  /**
   * アクションを実行
   */
  executeAction(action: string, method: 'get' | 'post') {
    this.isTesting = true;
    this.isSuccess = false;
    this.isFailed = false;
    this.result = null;
    this.errorMessage = '';

    let request: any;
    
    if (method === 'get') {
      request = this.sheetApiService.get(action);
    } else {
      request = this.sheetApiService.post(action, {});
    }

    request.subscribe(
      (response: SheetApiResponse) => {
        this.isTesting = false;

        if (response.ok) {
          this.isSuccess = true;
          this.result = response;
        } else {
          this.isFailed = true;
          this.errorMessage = response.error || 'Unknown error';
          this.result = response;
        }
      },
      (error: any) => {
        this.isTesting = false;
        this.isFailed = true;
        this.errorMessage = error?.message || error?.toString() || 'Network error';
        this.result = null;
      }
    );
  }

  /**
   * 結果をJSON文字列として取得
   */
  getResultJson(): string {
    return JSON.stringify(this.result, null, 2);
  }

  /**
   * テスト結果をリセット
   */
  reset() {
    this.isTesting = false;
    this.isSuccess = false;
    this.isFailed = false;
    this.result = null;
    this.errorMessage = '';
  }
}


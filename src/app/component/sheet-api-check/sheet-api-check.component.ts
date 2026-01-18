import { Component, OnInit } from '@angular/core';
import { SheetApiService, SheetApiResponse } from 'service/sheet-api.service';

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

  constructor(private sheetApiService: SheetApiService) {}

  ngOnInit(): void {}

  /**
   * スプレッドシート通信テスト実行
   */
  testConnection() {
    this.isTesting = true;
    this.isSuccess = false;
    this.isFailed = false;
    this.result = null;
    this.errorMessage = '';

    // pingで疎通確認
    this.sheetApiService.ping().subscribe(
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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

export interface SheetApiResponse {
  ok: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SheetApiService {
  // ★本番環境では環境設定から読み込む
  private proxyUrl = 'https://mitarashi.link/sheet-proxy.php';
  private localProxyUrl = 'http://localhost:8000/sheet-proxy.php';

  constructor(private http: HttpClient) {}

  /**
   * GASへのGETリクエスト
   * @param action アクション名（season, tournaments, entries, etc）
   * @param params クエリパラメータ
   */
  get<T = SheetApiResponse>(action: string, params: any = {}): Observable<T> {
    const queryParams = { action, ...params };
    const queryString = this.buildQueryString(queryParams);
    const url = `${this.getProxyUrl()}?${queryString}`;

    return this.http.get<T>(url).pipe(
      retry(1),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * GASへのPOSTリクエスト
   * @param action アクション名（append, cancel, update, etc）
   * @param data リクエストボディ
   */
  post<T = SheetApiResponse>(action: string, data: any): Observable<T> {
    const url = `${this.getProxyUrl()}?action=${encodeURIComponent(action)}`;
    const body = { action, ...data };

    return this.http.post<T>(url, body).pipe(
      retry(1),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Ping（疎通確認）
   */
  ping(): Observable<SheetApiResponse> {
    return this.get('ping');
  }

  /**
   * シーズン情報取得
   */
  getSeason(): Observable<SheetApiResponse> {
    return this.get('season');
  }

  /**
   * 大会一覧取得
   */
  getTournaments(): Observable<SheetApiResponse> {
    return this.get('tournaments');
  }

  /**
   * プレイヤーの進捗取得
   */
  getProgress(playerId: string): Observable<SheetApiResponse> {
    return this.get('progress', { playerId });
  }

  /**
   * 大会別参加者取得
   */
  getEntriesByTournament(tournamentId: string): Observable<SheetApiResponse> {
    return this.get('entries', { tournamentId });
  }

  /**
   * 特定エントリー取得
   */
  getEntry(entryId: string): Observable<SheetApiResponse> {
    return this.get('entry', { entryId });
  }

  /**
   * スイス方式データ取得
   */
  getSwiss(tournamentId: string): Observable<SheetApiResponse> {
    return this.get('swiss', { tournamentId });
  }

  /**
   * ブラケット取得
   */
  getBracket(tournamentId: string): Observable<SheetApiResponse> {
    return this.get('bracket', { tournamentId });
  }

  /**
   * プレイヤー一覧取得
   */
  getPlayers(): Observable<SheetApiResponse> {
    return this.get('players');
  }

  /**
   * プレイヤー別エントリー取得
   */
  getEntriesByPlayerId(playerId: string): Observable<SheetApiResponse> {
    return this.get('entries', { playerId });
  }

  /**
   * エントリー追加
   */
  appendEntry(data: any): Observable<SheetApiResponse> {
    return this.post('append', data);
  }

  /**
   * エントリーキャンセル
   */
  cancelEntry(data: any): Observable<SheetApiResponse> {
    return this.post('cancel', data);
  }

  /**
   * エントリー更新
   */
  updateEntry(data: any): Observable<SheetApiResponse> {
    return this.post('update', data);
  }

  /**
   * ログアップロード
   */
  uploadLog(data: any): Observable<SheetApiResponse> {
    return this.post('uploadlog', data);
  }

  /**
   * スイスログ更新
   */
  updateSwissLog(data: any): Observable<SheetApiResponse> {
    return this.post('updateswisslog', data);
  }

  /**
   * ログイン
   */
  login(data: any): Observable<SheetApiResponse> {
    return this.post('login', data);
  }

  /**
   * プロキシURLの選択（環境に応じて）
   */
  private getProxyUrl(): string {
    // development環境ではlocalhost、本番環境ではmitarashi.linkを使用
    if (this.isLocalEnvironment()) {
      return this.localProxyUrl;
    }
    return this.proxyUrl;
  }

  /**
   * ローカル環境判定
   */
  private isLocalEnvironment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.startsWith('192.168.');
  }

  /**
   * クエリ文字列の構築
   */
  private buildQueryString(params: any): string {
    return Object.keys(params)
      .filter(key => params[key] !== null && params[key] !== undefined)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
      .join('&');
  }

  /**
   * エラーハンドリング
   */
  private handleError(error: any) {
    console.error('Sheet API Error:', error);
    
    let errorMessage = 'Unknown error occurred';
    let errorDetails = {
      url: this.getProxyUrl(),
      status: error?.status,
      statusText: error?.statusText,
      errorResponse: error?.error,
      message: error?.message
    };

    // エラータイプ別のメッセージ
    if (error?.status === 0) {
      errorMessage = 'Network error - Cannot reach proxy server. Check if the server is running and accessible.';
    } else if (error?.status === 404) {
      errorMessage = 'Proxy not found (404) - PHP proxy file may not exist or path is incorrect.';
    } else if (error?.status === 500) {
      errorMessage = `Server error (500) - ${error?.error?.error || 'Server-side error occurred'}`;
    } else if (error?.status === 403) {
      errorMessage = 'Forbidden (403) - Check authentication token configuration.';
    } else if (error?.statusText === 'Unknown Error') {
      errorMessage = 'CORS error or proxy server not accessible - Check proxy URL and CORS configuration.';
    } else if (error?.error?.error) {
      errorMessage = error.error.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    console.error('Error Details:', errorDetails);
    return throwError(() => new Error(`${errorMessage}\n\nProxy URL: ${this.getProxyUrl()}`));
  }
}

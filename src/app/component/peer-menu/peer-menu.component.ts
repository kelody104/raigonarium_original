import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
//import { HttpClient } from '@angular/common/http';

import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { PeerContext } from '@udonarium/core/system/network/peer-context';
import { EventSystem, Network } from '@udonarium/core/system';
import { PeerCursor } from '@udonarium/peer-cursor';

import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ContextMenuComponent } from 'component/context-menu/context-menu.component';
import { LobbyComponent } from 'component/lobby/lobby.component';
import { AppConfigService } from 'service/app-config.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { TabletopActionService } from 'service/tabletop-action.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { ContextMenuService, ContextMenuAction } from 'service/context-menu.service';
import DiscordWebhook, { Webhook } from 'discord-webhook-ts';
import statusData from 'json/status.json';
const Status = (statusData as any)?.Status || statusData as any;
import { SoundEffect, PresetSound } from '../../class/sound-effect';
import kisekigomaData from 'json/kisekigoma.json';
import playerData from 'json/player_.json';
const kuze = (playerData as any)?.kuze || playerData as any;
const yakumo = (playerData as any)?.yakumo || playerData as any;
const rakura = (playerData as any)?.rakura || playerData as any;
const hisetsu = (playerData as any)?.hisetsu || playerData as any;
const shigure = (playerData as any)?.shigure || playerData as any;
const tobari = (playerData as any)?.tobari || playerData as any;
const other = (playerData as any)?.other || playerData as any;
import raijinData from 'json/raijin.json';
const raijin = (raijinData as any)?.raijin || raijinData as any;
import { CardStack } from '../../class/card-stack';
import parameterData from 'json/parameter.json';

@Component({
  selector: 'peer-menu',
  templateUrl: './peer-menu.component.html',
  styleUrls: ['./peer-menu.component.css']
})
export class PeerMenuComponent implements OnInit, OnDestroy, AfterViewInit {
  [x: string]: any;

  targetUserId: string = '';
  networkService = Network;
  gameRoomService = ObjectStore.instance;
  password: string = "";
  help: string = '';
  mode: string = 'Raigo';
 // Otonashi = (kisekigomaData as any).otonashi;
 // Kotodama = (kisekigomaData as any).kotodama;
  Ougi = ((kisekigomaData as any).ougi);
  Category: string = "kotodama";
  koma: string = null;
  selected: string = null;
  isunlock: boolean = false;
  GroupA: string = null;
  GroupB: string = null;
  GroupC: string = null;
  family: string = null;
  Kuze = kuze;
  Yakumo = yakumo;
  Rakura = rakura;
  Hisetsu = hisetsu;
  Shigure = shigure;
  Tobari = tobari;
  Other = other;
  raijinnum: number = 9;
  isBAN: boolean = false;

  get myPeer(): PeerCursor { return PeerCursor.myCursor; }
  get Raijin() {
    return raijin.filter(r => r.available == true);
  }
  get otonashi() { return ((kisekigomaData as any).otonashi as any)?.filter ? ((kisekigomaData as any).otonashi as any).filter(o => o.visible == true) : []; }
  get kotodama() { return ((kisekigomaData as any).kotodama as any)?.filter ? ((kisekigomaData as any).kotodama as any).filter(o => o.visible == true) : []; }
  get ougi() { return ((kisekigomaData as any).ougi as any)?.filter ? ((kisekigomaData as any).ougi as any).filter(o => o.visible == true) : []; }
  get ougi_raijinmode() { return ((kisekigomaData as any).ougi as any)?.filter ? ((kisekigomaData as any).ougi as any).filter(o => o.visible == true && o.raijinmode == true) : []; }
  get isConvention(): boolean { return Status.ConventionMode; }
  get Rank() { return ((parameterData as any).Rank); }
  get time() { return ((parameterData as any).Time); }

  constructor(
    private ngZone: NgZone,
    private pointerDeviceService: PointerDeviceService,
    private modalService: ModalService,
    private panelService: PanelService,
    private tabletopActionService: TabletopActionService,
    public appConfigService: AppConfigService,
    private contextMenuService: ContextMenuService,
   // private http: HttpClient
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.panelService.title = 'メインメニュー');
  }

  checkall(flag: boolean) {
    for (let kiseki of ougi) {
      if (kiseki.visible) {
        if (flag) kiseki.available = true;
        else kiseki.available = false;
      }
    }
  }

  async game(mode: string) {
    switch (mode) {
      case "Raigo":
        this.reset(false);
        break;
      case "Raijin":
        this.reset(true);
        this.tabletopActionService.createRaijin();
        break;
      case "RaijinCup":
        this.reset(true);
        break;
      case "ToyamaCup":
        this.reset(true);
        break;
      case "TanabataCup":
        this.reset_tanabata(true);
        break;
    }
  }

  Toyama(num: number) {
    if (num == null) num = Math.floor((Math.random() * (this.Raijin.length)));
    this.tabletopActionService.createToyama(num);
    SoundEffect.play(PresetSound.cardDraw);
  }

  Partner(userId: string) {
    PeerCursor.myCursor.partner = userId;
    SoundEffect.play(PresetSound.cardDraw);
  }

  PartnerReset() {
    PeerCursor.myCursor.partner = null;
    SoundEffect.play(PresetSound.cardDraw);
  }

  Guide(name: string) {
    PeerCursor.myCursor.choose = name;
  }

  Sen(name: string,type: string) {
    PeerCursor.myCursor.choose = name;
    this.tabletopActionService.createRaigo_(name,type);
    SoundEffect.play(PresetSound.cardDraw);
  }

  async reset(Raijinmode) {
    var res = confirm("フィールドをゲーム開始前の状態にします。\n本当によろしいですか？");
    if (res == true) {
      console.log(this.time_min);
      await this.tabletopActionService.deleteAllCards();
      await this.tabletopActionService.deleteAllCardStacks();
      await this.tabletopActionService.deleteAllCharacters();
      await this.tabletopActionService.deleteAllDiceSymbols();
      await this.tabletopActionService.deleteAlltableMasks();
      await this.tabletopActionService.deleteAllTerrains();
      //await this.tabletopActionService.changeField();
      await this.tabletopActionService.resetStatus();
      SoundEffect.play(PresetSound.cardDraw);
      await this.tabletopActionService.createRaigoOngoma(this.time.Playing.Minite, this.time.Playing.Second);
      await this.tabletopActionService.createRaigo(Raijinmode);
      await this.tabletopActionService.createkyokoku();
      //this.getCSV();
      //this.upload();
    }
  }

  async reset_tanabata(Raijinmode) {
    (otonashi as any)[6].quantity = 3;
    var res = confirm("フィールドをゲーム開始前の状態にします。\n本当によろしいですか？");
    if (res == true) {
      console.log(this.time_min);
      await this.tabletopActionService.deleteAllCards();
      await this.tabletopActionService.deleteAllCardStacks();
      await this.tabletopActionService.deleteAllCharacters();
      await this.tabletopActionService.deleteAllDiceSymbols();
      await this.tabletopActionService.deleteAlltableMasks();
      await this.tabletopActionService.deleteAllTerrains();
      //await this.tabletopActionService.changeField();
      await this.tabletopActionService.resetStatus();
      SoundEffect.play(PresetSound.cardDraw);
      await this.tabletopActionService.createRaigoOngoma(this.time.Playing.Minite, this.time.Playing.Second);
      await this.tabletopActionService.createRaigo_tanabata(Raijinmode);
      await this.tabletopActionService.createkyokoku();
      //this.getCSV();
      //this.upload();
    }
    (otonashi as any)[6].quantity = 4;
  }

  Recruitment() {
    var res = confirm("Discordで募集しますか？\n募集したら、Discordが起動します。\n空いているボイスチャンネルに入室してお待ちください。\n※対戦者が見つかるまでに、時間がかかる場合があります。\n「キャンセル」をクリックした場合、募集をかけずにルームの作成のみ行われます。");
    if (res == true) {
      const discordClient = new DiscordWebhook('https://discord.com/api/webhooks/905356970012340264/yiSX2K6P3stJ92eGlA0JD1cVc_e0pamFvEUrMeFezhpCXy00QG16ufFjCX_mM30gty9w')
      //const discordClient = new DiscordWebhook('https://discord.com/api/webhooks/905330922918924298/DwR73ZoIGGibPYu4oQ7TZ3JhNlBHw7LsrBhGmfzHBqxiws72VLj6MFQtMmBxgPuYbJpM')
      const requestBody: Webhook.input.POST = {
        content: PeerCursor.myCursor.name + 'さんが対戦相手を探しています。\n対戦される方は、' + PeerCursor.myCursor.name + 'さんが入室しているボイスチャンネルに接続してください。',
        embeds: [
          {
            title: Network.peerContext.roomName + "/" + Network.peerContext.roomId,
            description: 'https://raigonarium.org/#' + Network.peerId,
          },
        ]
      };
      discordClient.execute(requestBody) // -> Promise<AxiosResponse>
      window.open("https://discord.com/channels/846338999265525760/861162062021787688")
    }
  }

  ngAfterViewInit() {
    EventSystem.register(this)
      .on('OPEN_NETWORK', event => {
        this.ngZone.run(() => { });
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  changeIcon() {
    if (!PeerCursor.myCursor.GodeyeMode) {
      this.contextMenuService.open(this.pointerDeviceService.pointers[0], [
        { name: "初代雷神　空晴 太樹", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[6]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "二代目雷神　空晴 天音", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[2]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "三代目雷神　飛雪 美琴", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[9]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "四代目雷神　時雨 影助", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[10]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "五代目雷神　飛雪 琳太郎", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[3]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "六代目雷神　空晴 十梁", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[12]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "七代目雷神　時雨 清十郎", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[5]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "八代目雷神　雷藏 千歳", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[11]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "九代目雷神　八雲 雹", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[7]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "十代目雷神　八雲 茶々", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[4]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "十一代目雷神　飛雪 爽伍", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[8]"; SoundEffect.play(PresetSound.cardDraw); } },
        { name: "十二代目雷神　雷藏 黒光", action: () => { PeerCursor.myCursor.imageIdentifier = "icon[1]"; SoundEffect.play(PresetSound.cardDraw); } },
      ])
    }
  }
  certification() {
    const result = window.prompt("フルサイズで遊ぶにはパスワードが必要です。\nパスワードを入力してください。");
    if (result == "VbnM") {
      this.tabletopActionService.isFullSize = true;
      this.isunlock = true;
      SoundEffect.play(PresetSound.cardDraw);
    }
  }

  connectPeer() {
    let targetUserId = this.targetUserId;
    this.targetUserId = '';
    if (targetUserId.length < 1) return;
    this.help = '';
    let context = PeerContext.create(targetUserId);
    if (context.isRoom) return;
    ObjectStore.instance.clearDeleteHistory();
    Network.connect(context.peerId);
  }

  getCSV() {
    let name = PeerCursor.myCursor.name;
    //var req = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
    //req.open("delete", name + ".csv"); // アクセスするファイルを指定
    //req.send(null); // HTTPリクエストの発行
    // レスポンスが返ってきたらconvertCSVtoArray()を呼ぶ	
    //let result = this.convertCSVtoArray(req.responseText); // 渡されるのは読み込んだCSVデータ
    //console.log(result);
  }
 
// 読み込んだCSVデータを二次元配列に変換する関数convertCSVtoArray()の定義
  convertCSVtoArray(str) { // 読み込んだCSVデータが文字列として渡される
    var result = []; // 最終的な二次元配列を入れるための配列
    var tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成

    // 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
    for (var i = 0; i < tmp.length; ++i) {
      result[i] = tmp[i].split(',');
    }
    return result;
  }

  upload() {
    const xhr = new XMLHttpRequest();
    // ［3］ファイルを取得
    let f = "aaa";
    // ［4］ファイルをセット
    const fd = new FormData();
    fd.append('uploadfile.csv', f);
    // (4) ファイル送信
    xhr.open("POST", "/", false, "velvet.jp-raigonarium","R6aEBMi@U7Tf5p!"); // アクセスするファイルを指定
    xhr.send(fd); // HTTPリクエストの発行
  }

  disconnectPeer() {
    Network.disconnect(PeerCursor.myCursor.peerId);
    Network.open();
    this.tabletopActionService.deleteAllCards(true);
    this.tabletopActionService.deleteAllCardStacks();
    this.tabletopActionService.deleteAllCharacters();
    this.tabletopActionService.deleteAllDiceSymbols(true);
    this.tabletopActionService.deleteAlltableMasks();
    this.tabletopActionService.deleteAllTerrains();
    SoundEffect.play(PresetSound.cardDraw);
  }

  createnameplate(name) {
    let design: string = this.judgedesign(this.myPeer.Rank);
    let Name: string = name;
    if (this.myPeer.Rank != null) Name += " " + this.myPeer.Rank;
    this.tabletopActionService.createnameplate(Name, design);
    SoundEffect.play(PresetSound.cardDraw);
  }

  judgedesign(r: string) {
    let design: string = "temp[1]";
    (this.Rank as any)?.forEach((r: any) => {
      if (this.myPeer.Rank == r.name) design = r.plate;
    })
    return design;
  }

  //async connectPeerHistory() {
  //  this.help = '';
  //  let conectPeers: PeerContext[] = [];
  //  let roomId: string = '';

  //  for (let peerId of this.appConfigService.peerHistory) {
  //    let context = PeerContext.parse(peerId);
  //    if (context.isRoom) {
  //      if (roomId !== context.roomId) conectPeers = [];
  //      roomId = context.roomId;
  //      conectPeers.push(context);
  //    } else {
  //      if (roomId !== context.roomId) conectPeers = [];
  //      conectPeers.push(context);
  //    }
  //  }

  //  if (roomId.length) {
  //    console.warn('connectPeerRoom <' + roomId + '>');
  //    let conectPeers: PeerContext[] = [];
  //    let peerIds = await Network.listAllPeers();
  //    for (let peerId of peerIds) {
  //      let context = PeerContext.parse(peerId);
  //      if (context.roomId === roomId) {
  //        conectPeers.push(context);
  //      }
  //    }
  //    if (conectPeers.length < 1) {
  //      this.help = '前回接続していたルームが見つかりませんでした。既に解散しているかもしれません。';
  //      console.warn('Room is already closed...');
  //      return;
  //    }
  //    Network.open(PeerContext.generateId(), conectPeers[0].roomId, conectPeers[0].roomName, conectPeers[0].password, conectPeers[0].capacity);
  //  } else {
  //    console.warn('connectPeers ' + conectPeers.length);
  //    Network.open();
  //  }

  //  PeerCursor.myCursor.peerId = Network.peerId;

  //  let listener = EventSystem.register(this);
  //  listener.on('OPEN_NETWORK', event => {
  //    console.log('OPEN_NETWORK', event.data.peerId);
  //    EventSystem.unregisterListener(listener);
  //    ObjectStore.instance.clearDeleteHistory();
  //    for (let context of conectPeers) {
  //      Network.connect(context.peerId);
  //    }
  //  });
  //}

  CreateOugi(A, B, C) {
    if (A == B && A != null) {
      alert("同じ奥義駒を選択することはできません。"); 
    }
    else if (B == C && B != null) {
      alert("同じ奥義駒を選択することはできません。");
    }
    else if (C == A && C != null) {
      alert("同じ奥義駒を選択することはできません。");
    }
    else if (A == B && B == C && C == A && A == null) {
      alert("奥義駒を選択してください。");
    }
    else {
      let OugiStack: CardStack = this.tabletopActionService.createRaijin_(A, B, C);
      OugiStack.BAN_flag = !this.isBAN;
      SoundEffect.play(PresetSound.cardDraw);
    }
  }

  showLobby() {
    this.modalService.open(LobbyComponent, { width: 700, height: 400, left: 0, top: 400 });
  }

  findUserId(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.userId : '';
  }

  findOtherPeerImage(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? PeerCursor.findByPeerId(peerId).image : '';
  }

  findPeerName(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.name : '';
  }

  findPartner(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.partner : '';
  }
}

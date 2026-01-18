import { AfterViewInit, Component, NgZone, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';

import { Card } from '@udonarium/card';
import { Room } from '@udonarium/room';
import { ChatTabList } from '@udonarium/chat-tab-list';
import { AudioPlayer } from '@udonarium/core/file-storage/audio-player';
import { AudioSharingSystem } from '@udonarium/core/file-storage/audio-sharing-system';
import { AudioStorage } from '@udonarium/core/file-storage/audio-storage';
import { FileArchiver } from '@udonarium/core/file-storage/file-archiver';
import { ImageFile, ImageContext } from '@udonarium/core/file-storage/image-file';
import { ImageSharingSystem } from '@udonarium/core/file-storage/image-sharing-system';
import { ImageStorage } from '@udonarium/core/file-storage/image-storage';
import { ObjectFactory } from '@udonarium/core/synchronize-object/object-factory';
import { ObjectSerializer } from '@udonarium/core/synchronize-object/object-serializer';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { ObjectSynchronizer } from '@udonarium/core/synchronize-object/object-synchronizer';
import { EventSystem, Network } from '@udonarium/core/system';
import { DataSummarySetting } from '@udonarium/data-summary-setting';
import { DiceBot } from '@udonarium/dice-bot';
import { Jukebox } from '@udonarium/Jukebox';
import { PeerCursor } from '@udonarium/peer-cursor';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TableSelecter } from '@udonarium/table-selecter';

import { ChatWindowComponent } from 'component/chat-window/chat-window.component';
import { ContextMenuComponent } from 'component/context-menu/context-menu.component';
import { FileStorageComponent } from 'component/file-storage/file-storage.component';
import { GameCharacterGeneratorComponent } from 'component/game-character-generator/game-character-generator.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { GameObjectInventoryComponent } from 'component/game-object-inventory/game-object-inventory.component';
import { GameTableSettingComponent } from 'component/game-table-setting/game-table-setting.component';
import { JukeboxComponent } from 'component/jukebox/jukebox.component';
import { ModalComponent } from 'component/modal/modal.component';
import { PeerMenuComponent } from 'component/peer-menu/peer-menu.component';
import { TextViewComponent } from 'component/text-view/text-view.component';
import { UIPanelComponent } from 'component/ui-panel/ui-panel.component';
import { AppConfig, AppConfigService } from 'service/app-config.service';
import { ChatMessageService } from 'service/chat-message.service';
import { ContextMenuService, ContextMenuAction } from 'service/context-menu.service';
import { ModalService } from 'service/modal.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { SaveDataService } from 'service/save-data.service';
import { TabletopService } from 'service/tabletop.service';
import { TabletopActionService } from 'service/tabletop-action.service';
import { GameTable } from './class/game-table';

import { Status } from 'json/status.json';
import { PeerContext } from './class/core/system/network/peer-context';
import { PasswordCheckComponent } from './component/password-check/password-check.component';
import { DiceSymbol } from './class/dice-symbol';
import { Terrain } from './class/terrain';
import DiscordWebhook, { Webhook } from 'discord-webhook-ts';
import { ChatTab } from './class/chat-tab';
import { ChatMessage } from './class/chat-message';
import { Discord } from 'json/parameter.json';
import { CardStack } from './class/card-stack';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit, OnDestroy {

  @ViewChild('modalLayer', { read: ViewContainerRef, static: true }) modalLayerViewContainerRef: ViewContainerRef;
  @ViewChild('cursorTooltip') cursorTooltipElement: any;
  private immediateUpdateTimer: NodeJS.Timer = null;
  private lazyUpdateTimer: NodeJS.Timer = null;
  private openPanelCount: number = 0;
  private tooltipTimeout: any = null;
  isSaveing: boolean = false;
  isConvention: boolean = Status.ConventionMode;
  isOrganizer: boolean = Status.OrganizerMode;
  isRaijinmode: boolean = Status.Raijinmode;
  isRaijin: boolean = false;
  isGuide: boolean = false;
  height: number = 120;//395,555,605,680
  isgodeye: boolean = Status.OrganizerMode;
  progresPercent: number = 0;
  rooms: { alias: string, roomName: string, peerContexts: PeerContext[], capacity: string }[] = [];
  NetworkService = Network;

  get myPeer(): PeerCursor { return PeerCursor.myCursor; }

  constructor(
    private modalService: ModalService,
    private panelService: PanelService,
    private pointerDeviceService: PointerDeviceService,
    private chatMessageService: ChatMessageService,
    private appConfigService: AppConfigService,
    private saveDataService: SaveDataService,
    private ngZone: NgZone,
    private tabletopService: TabletopService,
    private tabletopActionService: TabletopActionService,
    private contextMenuService: ContextMenuService,
  ) {

    this.ngZone.runOutsideAngular(() => {
      EventSystem;
      Network;
      FileArchiver.instance.initialize();
      ImageSharingSystem.instance.initialize();
      ImageStorage.instance;
      AudioSharingSystem.instance.initialize();
      AudioStorage.instance;
      ObjectFactory.instance;
      ObjectSerializer.instance;
      ObjectStore.instance;
      ObjectSynchronizer.instance.initialize();
    });
    this.appConfigService.initialize();
    this.pointerDeviceService.initialize();

    TableSelecter.instance.initialize();
    ChatTabList.instance.initialize();
    DataSummarySetting.instance.initialize();

    let diceBot: DiceBot = new DiceBot('DiceBot');
    diceBot.initialize();
    DiceBot.getHelpMessage('').then(() => this.lazyNgZoneUpdate(true));

    let jukebox: Jukebox = new Jukebox('Jukebox');
    jukebox.initialize();

    let soundEffect: SoundEffect = new SoundEffect('SoundEffect');
    soundEffect.initialize();

    ChatTabList.instance.addChatTab('更新履歴', 'MainTab');
    ChatTabList.instance.addChatTab('チャット', 'SubTab');

    let fileContext = ImageFile.createEmpty('none_icon').toContext();
    fileContext.url = './assets/images/ic_account_circle_black_24dp_2x.png';
    let noneIconImage = ImageStorage.instance.add(fileContext);

    let fileContext_sat = ImageFile.createEmpty('sat_icon').toContext();
    fileContext_sat.url = './assets/images/image2.png';
    let SatImage = ImageStorage.instance.add(fileContext_sat);

    let fileContext_RediGames = ImageFile.createEmpty('RediGames_icon').toContext();
    fileContext_RediGames.url = './assets/images/RediGames.jpg';
    let RediGamesImage = ImageStorage.instance.add(fileContext_RediGames);

    let fileContexts: ImageContext[] = new Array(5);
    let IconImages: ImageFile[] = new Array(5)
    for (let i = 1; i <= 12; i++) {
      fileContexts[i-1] = ImageFile.createEmpty('icon[' + i + ']').toContext();
      fileContexts[i - 1].url = './assets/images/raigo/characters/chara[' + i + '].png';
      IconImages[i-1] = ImageStorage.instance.add(fileContexts[i - 1]);
    }

    //let a = Math.floor(Math.random() * (max + 1 - min)) + min;
    let i = Math.floor(Math.random() * 12 + 1);

    AudioPlayer.resumeAudioContext();
    PresetSound.dicePick = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.dicePut = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.diceRoll1 = AudioStorage.instance.add('./assets/sounds/on-jin/spo_ge_saikoro_teburu01.mp3').identifier;
    PresetSound.diceRoll2 = AudioStorage.instance.add('./assets/sounds/on-jin/spo_ge_saikoro_teburu02.mp3').identifier;
    PresetSound.cardDraw = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/card-turn-over1.mp3').identifier;
    PresetSound.cardPick = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.cardPut = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.cardShuffle = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/card-open1.mp3').identifier;
    PresetSound.piecePick = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/shoulder-touch1.mp3').identifier;
    PresetSound.piecePut = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/book-stack1.mp3').identifier;
    PresetSound.blockPick = AudioStorage.instance.add('./assets/sounds/tm2/tm2_pon002.wav').identifier;
    PresetSound.blockPut = AudioStorage.instance.add('./assets/sounds/tm2/tm2_pon002.wav').identifier;
    PresetSound.lock = AudioStorage.instance.add('./assets/sounds/tm2/tm2_switch001.wav').identifier;
    PresetSound.unlock = AudioStorage.instance.add('./assets/sounds/tm2/tm2_switch001.wav').identifier;
    PresetSound.sweep = AudioStorage.instance.add('./assets/sounds/tm2/tm2_swing003.wav').identifier;
    PresetSound.raigo = AudioStorage.instance.add('./assets/sounds/tm2/tm2_don19.wav').identifier;
    PresetSound.raijin = AudioStorage.instance.add('./assets/sounds/tm2/tm2_don09_a.wav').identifier;
    PresetSound.makimono = AudioStorage.instance.add('./assets/sounds/tm2/巻物開く音.mp3').identifier;
    PresetSound.raihou = AudioStorage.instance.add('./assets/sounds/tm2/塔解放時落雷.mp3').identifier;
    PresetSound.charge = AudioStorage.instance.add('./assets/sounds/tm2/陽玉蓄積音.mp3').identifier;
    PresetSound.on = AudioStorage.instance.add('./assets/sounds/tm2/隠駒.mp3').identifier;
    PresetSound.godeye = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/和太鼓でカカッ.mp3').identifier;
    PresetSound.chat = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/キャンセル4.mp3').identifier;
    PresetSound.enter = AudioStorage.instance.add('./assets/sounds/soundeffect-lab/鈴を鳴らす.mp3').identifier;
    PresetSound.bgm1 = AudioStorage.instance.add('./assets/sounds/dova/陰影.mp3').identifier;
    PresetSound.bgm2 = AudioStorage.instance.add('./assets/sounds/amca/「夜半ノ月」～夜道.mp3').identifier;
    PresetSound.bgm3 = AudioStorage.instance.add('./assets/sounds/amca/お地蔵様のいる小道.mp3').identifier;
    PresetSound.bgm4 = AudioStorage.instance.add('./assets/sounds/amca/ネオンパープル.mp3').identifier;
    PresetSound.bgm5 = AudioStorage.instance.add('./assets/sounds/amca/ミスト.mp3').identifier;
    //PresetSound.bgm6 = AudioStorage.instance.add('./assets/sounds/amca/傾きかけた日差し.mp3').identifier;
    PresetSound.bgm7 = AudioStorage.instance.add('./assets/sounds/amca/孤独とささやき.mp3').identifier;
    PresetSound.bgm8 = AudioStorage.instance.add('./assets/sounds/amca/悠久の時へ.mp3').identifier;
    PresetSound.bgm9 = AudioStorage.instance.add('./assets/sounds/amca/桜雲.mp3').identifier;
    PresetSound.bgm10 = AudioStorage.instance.add('./assets/sounds/amca/神々の宿る場所.mp3').identifier;
    PresetSound.bgm11 = AudioStorage.instance.add('./assets/sounds/amca/緩やかな風.mp3').identifier;

    AudioStorage.instance.get(PresetSound.dicePick).isHidden = true;
    AudioStorage.instance.get(PresetSound.dicePut).isHidden = true;
    AudioStorage.instance.get(PresetSound.diceRoll1).isHidden = true;
    AudioStorage.instance.get(PresetSound.diceRoll2).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardDraw).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardPick).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardPut).isHidden = true;
    AudioStorage.instance.get(PresetSound.cardShuffle).isHidden = true;
    AudioStorage.instance.get(PresetSound.piecePick).isHidden = true;
    AudioStorage.instance.get(PresetSound.piecePut).isHidden = true;
    AudioStorage.instance.get(PresetSound.blockPick).isHidden = true;
    AudioStorage.instance.get(PresetSound.blockPut).isHidden = true;
    AudioStorage.instance.get(PresetSound.lock).isHidden = true;
    AudioStorage.instance.get(PresetSound.unlock).isHidden = true;
    AudioStorage.instance.get(PresetSound.sweep).isHidden = true;
    AudioStorage.instance.get(PresetSound.raigo).isHidden = true;
    AudioStorage.instance.get(PresetSound.raijin).isHidden = true;
    AudioStorage.instance.get(PresetSound.makimono).isHidden = true;
    AudioStorage.instance.get(PresetSound.raihou).isHidden = true;
    AudioStorage.instance.get(PresetSound.charge).isHidden = true;
    AudioStorage.instance.get(PresetSound.on).isHidden = true;
    AudioStorage.instance.get(PresetSound.godeye).isHidden = true;
    AudioStorage.instance.get(PresetSound.chat).isHidden = true;
    AudioStorage.instance.get(PresetSound.enter).isHidden = true;
    AudioStorage.instance.get(PresetSound.bgm1).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm2).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm3).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm4).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm5).isHidden = false;
    //AudioStorage.instance.get(PresetSound.bgm6).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm7).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm8).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm9).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm10).isHidden = false;
    AudioStorage.instance.get(PresetSound.bgm11).isHidden = false;

    PeerCursor.createMyCursor();
    //PeerCursor.myCursor.name = default_names[i - 1];
    var url = new URL(window.location.href);
    var params = url.searchParams;
    if (params.get('name')) {
      PeerCursor.myCursor.name = params.get('name');
    }
    else {
      PeerCursor.myCursor.name = "名も無き雷人";
    }
    if (params.get('pass') == "VbnM") {
      this.tabletopActionService.isFullSize = true;
    }
    //PeerCursor.myCursor.name = "名も無き雷人";
    if (Status.OrganizerMode == true) PeerCursor.myCursor.imageIdentifier = noneIconImage.identifier;
    else PeerCursor.myCursor.imageIdentifier = IconImages[i - 1].identifier;

    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', event => { this.lazyNgZoneUpdate(event.isSendFromSelf); })
      .on('DELETE_GAME_OBJECT', event => { this.lazyNgZoneUpdate(event.isSendFromSelf); })
      .on('SYNCHRONIZE_AUDIO_LIST', event => { if (event.isSendFromSelf) this.lazyNgZoneUpdate(false); })
      .on('SYNCHRONIZE_FILE_LIST', event => { if (event.isSendFromSelf) this.lazyNgZoneUpdate(false); })
      .on<AppConfig>('LOAD_CONFIG', event => {
        console.log('LOAD_CONFIG !!!');
        Network.setApiKey(event.data.webrtc.key);
        Network.open();
      })
      .on<File>('FILE_LOADED', event => {
        this.lazyNgZoneUpdate(false);
      })
      .on('OPEN_NETWORK', event => {
        console.log('OPEN_NETWORK', event.data.peerId);
        PeerCursor.myCursor.peerId = Network.peerContext.peerId;
        PeerCursor.myCursor.userId = Network.peerContext.userId;
      })
      .on('NETWORK_ERROR', event => {
        console.log('NETWORK_ERROR', event.data.peerId);
        let errorType: string = event.data.errorType;
        let errorMessage: string = event.data.errorMessage;

        this.ngZone.run(async () => {
          //SKyWayエラーハンドリング
          let quietErrorTypes = ['peer-unavailable'];
          let reconnectErrorTypes = ['disconnected', 'socket-error', 'unavailable-id', 'authentication', 'server-error'];

          if (quietErrorTypes.includes(errorType)) return;
          await this.modalService.open(TextViewComponent, { title: 'ネットワークエラー', text: errorMessage });

          if (!reconnectErrorTypes.includes(errorType)) return;
          await this.modalService.open(TextViewComponent, { title: 'ネットワークエラー', text: 'このウィンドウを閉じると再接続を試みます。' });
          Network.open();
        });
      })
      .on('CONNECT_PEER', event => {
        if (event.isSendFromSelf) this.chatMessageService.calibrateTimeOffset();
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      })
      .on('DISCONNECT_PEER', event => {
        this.lazyNgZoneUpdate(event.isSendFromSelf);
      });
  }

  async connect(peerContexts: PeerContext[]) {
    await this.tabletopActionService.Resolve(3000);
    let context = peerContexts[0];
    let password = '';
    let capacity = peerContexts[0].capacity;
    if (context.hasPassword) {
      password = await this.modalService.open<string>(PasswordCheckComponent, { peerId: context.peerId, title: `${context.roomName}/${context.roomId}` });
      if (password == null) password = '';
    }
    if (!context.verifyPassword(password)) return;

    let userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    await Network.open(userId, context.roomId, context.roomName, password, capacity);
    PeerCursor.myCursor.peerId = Network.peerId;

    let triedPeer: string[] = [];
    EventSystem.register(triedPeer)
      .on('OPEN_NETWORK', event => {
        console.log('LobbyComponent OPEN_PEER', event.data.peerId);
        EventSystem.unregister(triedPeer);
        ObjectStore.instance.clearDeleteHistory();
        for (let context of peerContexts) {
          Network.connect(context.peerId);
        }
        EventSystem.register(triedPeer)
          .on('CONNECT_PEER', event => {
            console.log('接続成功！', event.data.peerId);
            triedPeer.push(event.data.peerId);
            console.log('接続成功 ' + triedPeer.length + '/' + peerContexts.length);
            if (peerContexts.length <= triedPeer.length) {
              this.resetNetwork();
              EventSystem.unregister(triedPeer);
            }
          })
          .on('DISCONNECT_PEER', event => {
            console.warn('接続失敗', event.data.peerId);
            triedPeer.push(event.data.peerId);
            console.warn('接続失敗 ' + triedPeer.length + '/' + peerContexts.length);
            if (peerContexts.length <= triedPeer.length) {
              this.resetNetwork();
              EventSystem.unregister(triedPeer);
            }
          });
      });
  }

  private resetNetwork() {
    if (Network.peerContexts.length < 1) {
      Network.open();
      PeerCursor.myCursor.peerId = Network.peerId;
    }
  }

  async ngAfterViewInit() {
    PanelService.defaultParentViewContainerRef = ModalService.defaultParentViewContainerRef = ContextMenuService.defaultParentViewContainerRef = this.modalLayerViewContainerRef;
    
    setTimeout(() => {
      if (Status.Testmode != true) {
        this.panelService.open(PeerMenuComponent, { width: 460, height: 395, left: 100 });
        //this.panelService.open(ChatWindowComponent, { width: 600, height: 685, left: 560 });
      }
    }, 0);
    if (location.hash.length > 1) {
      let context = PeerContext.parse(location.hash.slice(1));
      if (context.isRoom) {
        let peersOfroom: { [room: string]: PeerContext[] } = {};
        let alias = context.roomId + context.roomName + context.capacity;
        if (!(alias in peersOfroom)) {
          peersOfroom[alias] = [];
          peersOfroom[alias].push(context);
          for (let alias in peersOfroom) {
            this.rooms.push({ alias: alias, roomName: peersOfroom[alias][0].roomName, peerContexts: peersOfroom[alias], capacity: peersOfroom[alias][0].capacity });
          }
         await this.connect(this.rooms[0].peerContexts);
        }
      }
    }
    
    // ツールチップの初期化
    this.setupTooltips();
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  private setupTooltips() {
    // すべてのメニュー項目にイベントリスナーを設定
    const menuItems = document.querySelectorAll('nav ul li[title]');
    
    menuItems.forEach(item => {
      item.addEventListener('mouseenter', (e: MouseEvent) => {
        const title = (item as HTMLElement).getAttribute('title');
        if (title && this.cursorTooltipElement) {
          const tooltipEl = this.cursorTooltipElement.nativeElement;
          tooltipEl.textContent = title;
          tooltipEl.style.display = 'block';
          this.updateTooltipPosition(e as MouseEvent);
        }
      });
      
      item.addEventListener('mousemove', (e: MouseEvent) => {
        if (this.cursorTooltipElement) {
          this.updateTooltipPosition(e as MouseEvent);
        }
      });
      
      item.addEventListener('mouseleave', () => {
        if (this.cursorTooltipElement) {
          this.cursorTooltipElement.nativeElement.style.display = 'none';
        }
      });
    });
    
    // グローバルマウスムーブイベント
    document.addEventListener('mousemove', (e: MouseEvent) => {
      // アクティブなツールチップがある場合のみ位置を更新
      if (this.cursorTooltipElement && this.cursorTooltipElement.nativeElement.style.display === 'block') {
        this.updateTooltipPosition(e);
      }
    });
  }

  private updateTooltipPosition(event: MouseEvent) {
    if (!this.cursorTooltipElement) return;
    
    const tooltipEl = this.cursorTooltipElement.nativeElement;
    const offsetX = 10; // カーソルから右へ
    const offsetY = 10; // カーソルから下へ
    
    tooltipEl.style.left = (event.clientX + offsetX) + 'px';
    tooltipEl.style.top = (event.clientY + offsetY) + 'px';
  }

  open(componentName: string) {
    let component: { new(...args: any[]): any } = null;
    let option: PanelOption = { width: 0, height: 0, left: 0, top: 0 }
    switch (componentName) {
      case 'PeerMenuComponent':
        component = PeerMenuComponent;
        option = { width: 460, height: 395, left: 100, top: 0 }
        break;
      case 'ChatWindowComponent':
        component = ChatWindowComponent;
        option = { width: 600, height: 685, left: 100, top: 0 }
        break;
      case 'GameTableSettingComponent':
        component = GameTableSettingComponent;
        option = { width: 480, height: 250, left: 100, top: 0 };
        break;
      case 'FileStorageComponent':
        component = FileStorageComponent;
        option = { width: 370, height: 500, left: 100, top: 0 };
        break;
      case 'GameCharacterSheetComponent':
        component = GameCharacterSheetComponent;
        option = { width: 500, height: 370, left: 100, top: 0 };
        break;
      case 'JukeboxComponent':
        component = JukeboxComponent;
        option = { width: 450, height: 400, left: 100, top: 0 };
        break;
      case 'GameCharacterGeneratorComponent':
        component = GameCharacterGeneratorComponent;
        option = { width: 777, height: 370, left: 100, top: 0 };
        break;
      case 'GameObjectInventoryComponent':
        component = GameObjectInventoryComponent;
        option = { width: 500, height: 370, left: 100, top: 0 };
        break;
    }
    if (component) {
      this.panelService.open(component, option);
    }
  }

  Godeyemodechange() {
    if (this.isgodeye == false) {
      var res = confirm("本当によろしいですか？");
      if (res == true) {
        PeerCursor.myCursor.GodeyeMode = true;
        SoundEffect.play(PresetSound.godeye);
        PeerCursor.myCursor.name = PeerCursor.myCursor.name + '（観戦中です）';
        PeerCursor.myCursor.imageIdentifier = "none_icon";
        this.isgodeye = true;
        this.tabletopActionService.updateAllCards();
        this.tabletopActionService.updateAllCardStacks();
      }
    }
    else {
      //if (Status.OrganizerMode != true) {
        PeerCursor.myCursor.GodeyeMode = false
        SoundEffect.play(PresetSound.cardDraw);
      let i = Math.floor(Math.random() * 12 + 1);
      PeerCursor.myCursor.name = PeerCursor.myCursor.name.slice(0, -7);
        PeerCursor.myCursor.imageIdentifier = "icon[" + i + "]";
      this.isgodeye = false;
      this.tabletopActionService.updateAllCards();
      this.tabletopActionService.updateAllCardStacks();
      //}
    }
  }

  Guidemodechange() {
    if (this.isGuide == false) {
      PeerCursor.myCursor.GuideMode = true;
      //SoundEffect.play(PresetSound.cardDraw);
        this.isGuide = true;
    }
    else {
        PeerCursor.myCursor.GuideMode = false;
        //SoundEffect.play(PresetSound.cardDraw);
        this.isGuide = false;
    }
  }

  Raijinmodechange() {
    if (this.isRaijin == false) {
      PeerCursor.myCursor.RaijinMode = true;
      SoundEffect.play(PresetSound.cardDraw);
      this.isRaijin = true;
    }
    else {
      PeerCursor.myCursor.RaijinMode = false;
      SoundEffect.play(PresetSound.cardDraw);
      this.isRaijin = false;
    }
  }

  link() {
    this.contextMenuService.open(this.pointerDeviceService.pointers[0], [
      { name: "購入ページ", action: () => { window.open("https://www.kickstarter.com/projects/redigames628/1727649523") } },
      { name: "レビューする", action: () => { window.open("https://bodoge.hoobby.net/games/raigou/reviews") } },
      { name: "Twitter", action: () => { window.open("https://twitter.com/redigames628") } },
      { name: "YouTube", action: () => { window.open("https://www.youtube.com/channel/UC0gCexfhATOuMRt6aQDzPfg") } },
      { name: "Discord", action: () => { window.open("https://discord.com/channels/846338999265525760/846352712580988928/846359343850848287") } },
    ])
  }

  record() {
    let Players: { name: string, points: number, uchigomas: number, KAI:string}[] = [];
    let points: Card[] = this.tabletopService.cards.filter(card => { return card.name == "得点" });
    //let cursors = ObjectStore.instance.getObjects<PeerCursor>(PeerCursor);
    let players: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
    let Ougidecks: CardStack[] = this.tabletopService.cardStacks.filter(cardStack => { return cardStack.name == "奥義駒" });
    for (let player of players) {
      player.general = this.tabletopActionService.SearchUchigoma(player);
    }
    for (let i = 0; i <= 3; i++) {
      for (let card of points) {
        for (let player of players) {
          for (let Ougideck of Ougidecks) {
            if (card.rotate == i * 90 && card.rotate == player.rotate && Ougideck.rotate == player.rotate) {
              let key: string = card.imageFile.identifier;
              let a = key.substr(key.indexOf('[') + 1);
              let point = a.substr(0, a.indexOf(']'));
              Players.push({ name: player.raijinname, points: Number(point), uchigomas: player.general, KAI: Ougideck.KAI });
            }
          }
        }
      }
    }
    this.Record("【2人戦】", Players[0], Players[1]);
  }

  Record(rule: string, PlayerA, PlayerB?, PlayerC?, PlayerD?) {
    let text_A: string = "";
    let text_B: string = "";
    let towers: Terrain[] = this.tabletopService.terrains.filter(terrain => { return terrain.name == "役名" && terrain.parts != "" && terrain.rotate == 0 });
    for (let i = 0; i < towers.length; i++) {
      text_A += towers[i].towername + "（";
      if (towers[i].RaigoFlag == true) text_A += "雷轟解放）（";
      text_A += towers[i].parts;
      text_A += "）\n";
    }
    towers = this.tabletopService.terrains.filter(terrain => { return terrain.name == "役名" && terrain.parts != "" && terrain.rotate == 180 });
    for (let i = 0; i < towers.length; i++) {
      text_B += towers[i].towername + "（";
      if (towers[i].RaigoFlag == true) text_B += "雷轟解放）（";
      text_B += towers[i].parts;
      text_B += "）\n";
    }
    this.Discord(PlayerA,text_A, PlayerB,text_B);
  }

  Discord(PlayerA, text_A: string, PlayerB, text_B: string) {
    let DiscordURL : string = null;
    Discord.forEach(dis => {
      if (dis.GameRoom == Network.peerContext.roomName) DiscordURL = dis.WebHook;
    })
    const discordClient = new DiscordWebhook(DiscordURL);
      const requestBody_A: Webhook.input.POST = {
        embeds: [
          {
            title: PlayerA.name + "\n" + "点数:" + PlayerA.points + "点 内駒:" + PlayerA.uchigomas + "個 開:" + PlayerA.KAI,
            description: text_A,
          },
        ]
    };
    const requestBody_B: Webhook.input.POST = {
      embeds: [
        {
          title: PlayerB.name + "\n" + "点数:" + PlayerB.points + "点 内駒:" + PlayerB.uchigomas + "個 開:" + PlayerB.KAI,
          description: text_B,
        },
      ]
    };

    discordClient.execute(requestBody_A) // -> Promise<AxiosResponse>
    discordClient.execute(requestBody_B) // -> Promise<AxiosResponse>
  }

  tweet() {
    let Players: { name: string, points: number, uchigomas: number }[] = [];
    let points: Card[] = this.tabletopService.cards.filter(card => { return card.name == "得点" });
    //let cursors = ObjectStore.instance.getObjects<PeerCursor>(PeerCursor);
    let players: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
    for (let player of players) {
      player.general = this.tabletopActionService.SearchUchigoma(player);
    }
    for (let i = 0; i <= 3; i++) {
      for (let card of points) {
        for (let player of players) {
          if (card.rotate == i * 90 && card.rotate == player.rotate) {
            let key: string = card.imageFile.identifier;
            let a = key.substr(key.indexOf('[') + 1);
            let point = a.substr(0, a.indexOf(']'));
            Players.push({ name: player.raijinname, points: Number(point), uchigomas: player.general });
          }
        }
      }
    }
    switch (Players.length) {
      case 1:
        this.Tweet("【循環鍛錬】",Players[0]);
        break;
      case 2:
        this.Tweet("【2人戦】", Players[0], Players[1]);
        break;
      case 3:
        this.Tweet("【3人戦】",Players[0], Players[1], Players[2]);
        break;
      case 4:
        this.Tweet("【2人チーム戦】",Players[0], Players[1], Players[2], Players[3]);
        break;
      default:
        break;
    }
  }

  Tweet(rule: string, PlayerA, PlayerB?, PlayerC?, PlayerD?) {
    let text: string = "雷轟オンライン対戦" + rule + "%0d";
    if (PlayerD) {
      text
        += "【" + PlayerA.points + "%2b" + PlayerC.points + "点（内駒" + PlayerA.uchigomas + "%2b" + PlayerC.uchigomas + "）】" + PlayerA.name + "%26" + PlayerC.name + "%0d"
        + "【" + PlayerB.points + "%2b" + PlayerD.points + "点（内駒" + PlayerB.uchigomas + "%2b" + PlayerD.uchigomas + "）】" + PlayerB.name + "%26" + PlayerD.name + "%0d"
    }
    else if (PlayerC) {
      text += "【" + PlayerA.points + "点（内駒" + PlayerA.uchigomas + "）】" + PlayerA.name + "%0d" + "【" + PlayerB.points + "点（内駒" + PlayerB.uchigomas + "）】" + PlayerB.name + "%0d" + "【" + PlayerC.points + "点（内駒" + PlayerC.uchigomas + "）】" + PlayerC.name + "%0d";
    }
    else if (PlayerB) {
      text += "【" + PlayerA.points + "点（内駒" + PlayerA.uchigomas + "）】" + PlayerA.name + "%0d" + "【" + PlayerB.points + "点（内駒" + PlayerB.uchigomas + "）】" + PlayerB.name + "%0d";
    }
    else {
      text += "【" + PlayerA.points + "点（内駒" + PlayerA.uchigomas + "）】%0d";
    }

    text += "【完成させた塔】%0d";
    let rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    let towers: Terrain[] = this.tabletopService.terrains.filter(terrain => { return terrain.name == "役名" && terrain.parts != "" && terrain.rotate == rotate });
    for (let i = 0; i < towers.length; i++) {
      text += towers[i].towername + "（";
      if (towers[i].RaigoFlag == true) text += "雷轟解放）（";
      text += towers[i].parts;
      text += "）%0d";
    }
    text += "https://raigonarium.org/Tutorial %0d";
    window.open("https://twitter.com/intent/tweet?text=" + text + "&hashtags=ライゴナリウム,雷轟,RediGames", null, "height = 600 , width = 600, toolbar = yes, menubar = yes, scrollbars = yes");
  }

  async JudgeCall() {
    var res = confirm("運営をボイスチャットに呼びますか？");
    if (res == true) {
      const discordClient = new DiscordWebhook('https://discord.com/api/webhooks/934395480958447636/4Fm0MHOUEo9Ez-mJr8EkfVoEGje5PisaQRJessA1SFZ8XfLl6gAG19JWt15cPMgLIsJj');
      const requestBody: Webhook.input.POST = {
        content: "<@961588171496390666>",
        embeds: [
          {
            title: "【業務連絡】ジャッジコールがありました。",
            description: "【プレイヤー】" + PeerCursor.myCursor.name + "\n【対戦ルーム】" + Network.peerContext.roomName + "/" + Network.peerContext.roomId,
          },
        ]
      };
      discordClient.execute(requestBody) // -> Promise<AxiosResponse>
    }
  }

  async reset() {
    var res = confirm("フィールドをゲーム開始前の状態にします。\n本当によろしいですか？");
    if (res == true) {
      await this.tabletopActionService.deleteAllCards();
      await this.tabletopActionService.deleteAllCardStacks();
      await this.tabletopActionService.deleteAllCharacters();
      await this.tabletopActionService.deleteAllDiceSymbols();
      await this.tabletopActionService.deleteAlltableMasks();
      await this.tabletopActionService.deleteAllTerrains();
      //await this.tabletopActionService.changeField();
      await this.tabletopActionService.resetStatus();
      SoundEffect.play(PresetSound.cardDraw);
      this.tabletopActionService.createRaigoOngoma(0,0);
      this.tabletopActionService.createRaigo(true);
      this.tabletopActionService.createkyokoku();
    }
  }

  //textfileDownload() {
  //  let Players: PeerCursor[] = new Array();
  //  let nameplates: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
  //  let cursors = ObjectStore.instance.getObjects<PeerCursor>(PeerCursor);
  //  for (let cursor of cursors) {
  //    cursor.uchigomas = this.tabletopActionService.SearchUchigoma(cursor);
  //  }
  //  for (let i = 0; i <= 3; i++) {
  //    for (let nameplate of nameplates) {
  //      for (let cursor of cursors) {
  //        if (nameplate.rotate == i * 90 && nameplate.raijinname == cursor.name) {
  //          Players.push(cursor);
  //        }
  //      }
  //    }
  //  }
  //  let roomName: string = Network.peerContext.roomName;
  //  let format: string = this.CalcFormat(Players);
  //  let playerinfo: string = "対戦ルーム名,対戦ルームID,対戦形式,プレイヤー名,プレイヤーID,点数,内駒数,役1,塔1,役2,塔2,役3,塔3,役4,塔4,役5,塔5,役6,塔6\n";
  //  Players.forEach(Player => {
  //    playerinfo += Network.peerContext.roomName + "," + Network.peerContext.roomId + "," + format + "," + Player.name + "," + Player.userId + "," + Player.points + "," + Player.uchigomas + ",";
  //    for (let i = 0; i < Player.towers.length; i++) {
  //      playerinfo += Player.towers[i] + "," + Player.towerpro[i] + ",";
  //    }
  //    playerinfo += "\n";
  //  }
  //  );
  //  const blob = new Blob([playerinfo], { type: "text/plain" });
  //  const link = document.createElement("a");
  //  link.href = URL.createObjectURL(blob);
  //  link.download = roomName + Date.now() + ".txt";
  //  link.click();
  //}

  chessclock() {
    let chessclock: Terrain[] = this.tabletopService.terrains.filter(terrain => { return terrain.name == "隠駒" });
    for (let terrain of chessclock) {
      if (terrain.timer == false) {
        terrain.timer = true;
        this.start(terrain);
      }
      else {
        terrain.timer = false;
      }
    }
  }

  async start(terrain: Terrain) {
    for (; ;) {
      if (terrain.timer_A_flag == true) {
        if (terrain.timer_A_sec == 0) {
          terrain.timer_A_min--;
          terrain.timer_A_sec = 59;
        }
        else terrain.timer_A_sec--;
      }
      if (terrain.timer_B_flag == true) {
        if (terrain.timer_B_sec == 0) {
          terrain.timer_B_min--;
          terrain.timer_B_sec = 59;
        }
        else terrain.timer_B_sec--;
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (terrain.timer == false) break;
      if (terrain.timer_A_min == 0 && terrain.timer_A_sec == 0) break;
      if (terrain.timer_B_min == 0 && terrain.timer_B_sec == 0) break;
    }
  }

  async save() {
    if (this.isSaveing) return;
    this.isSaveing = true;
    this.progresPercent = 0;

  　let Nameplates: Card[] = this.tabletopService.cards.filter(plate => { return plate.name == "名札" });
    let roomName = Network.peerContext && 0 < Network.peerContext.roomName.length
      ? Network.peerContext.roomName
      : '対戦ログ_' + Nameplates[0].playername + ' VS ' + Nameplates[1].playername;
    
    try {
      console.log('セーブ処理開始...');
      const zipFile = await this.saveDataService.saveRoomAsync(roomName, percent => {
        this.progresPercent = percent;
      });

      console.log('zipファイル作成完了:', zipFile);
      
      // ローカルダウンロード
      this.fallbackLocalDownload(zipFile, roomName);

      // ダウンロード完了メッセージ
      //alert('ダウンロードが完了しました');

    } catch (error) {
      console.error('Save failed:', error);
      alert('保存に失敗しました: ' + error.message);
    }

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }



  private fallbackLocalDownload(zipFile: any, fileName: string) {
    console.log('ローカルダウンロードにフォールバック...');
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipFile instanceof Blob ? zipFile : new Blob([zipFile]));
    link.download = fileName + '_' + new Date().toISOString().slice(0, 10) + '.zip';
    link.click();
  }



  handleFileSelect(event: Event) {
    let input = <HTMLInputElement>event.target;
    let files = input.files;
    if (files.length) FileArchiver.instance.load(files);
    input.value = '';
  }

  CalcFormat(Players: PeerCursor[]) {
    switch (Players.length) {
      case 1:
        return "循環鍛錬";
      case 2:
        return "2人戦";
      case 3:
        return "3人戦";
      case 4:
        return "2人チーム戦";
      default:
        return "";
    }
  }

  private lazyNgZoneUpdate(isImmediate: boolean) {
    if (isImmediate) {
      if (this.immediateUpdateTimer !== null) return;
      this.immediateUpdateTimer = setTimeout(() => {
        this.immediateUpdateTimer = null;
        if (this.lazyUpdateTimer != null) {
          clearTimeout(this.lazyUpdateTimer);
          this.lazyUpdateTimer = null;
        }
        this.ngZone.run(() => { });
      }, 0);
    } else {
      if (this.lazyUpdateTimer !== null) return;
      this.lazyUpdateTimer = setTimeout(() => {
        this.lazyUpdateTimer = null;
        if (this.immediateUpdateTimer != null) {
          clearTimeout(this.immediateUpdateTimer);
          this.immediateUpdateTimer = null;
        }
        this.ngZone.run(() => { });
      }, 100);
    }
  }
}

PanelService.UIPanelComponentClass = UIPanelComponent;
ContextMenuService.ContextMenuComponentClass = ContextMenuComponent;
ModalService.ModalComponentClass = ModalComponent;

import { Component, OnDestroy, OnInit } from '@angular/core';

import { PeerContext } from '@udonarium/core/system/network/peer-context';
import { EventSystem, Network } from '@udonarium/core/system';
import { PeerCursor } from '@udonarium/peer-cursor';

import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

import DiscordWebhook, { Webhook } from 'discord-webhook-ts';

@Component({
  selector: 'room-setting',
  templateUrl: './room-setting.component.html',
  styleUrls: ['./room-setting.component.css']
})
export class RoomSettingComponent implements OnInit, OnDestroy {
  peers: PeerContext[] = [];
  isReloading: boolean = false;

  roomName: string = '雷轟手合わせ部屋';
  password: string = '';
  capacity: string = '9';
  isPrivate: boolean = false;

  get peerId(): string { return Network.peerId; }
  get isConnected(): boolean { return Network.peerIds.length <= 1 ? false : true; }
  validateLength: boolean = false;

  constructor(
    private panelService: PanelService,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.modalService.title = this.panelService.title = 'ルーム作成');
    EventSystem.register(this);
    this.calcPeerId(this.roomName, this.password, this.capacity);
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  calcPeerId(roomName: string, password: string,capacity: string) {
    let userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    let context = PeerContext.create(userId, PeerContext.generateId('***'), roomName, password, capacity);
    this.validateLength = context.peerId.length < 64 ? true : false;
  }

  createRoom() {
    let userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateId();
    let id: string = "***";
    let EventName: string = "【大会用】" ;
    switch (this.roomName) {
      case "雷の間":
        this.roomName = EventName + this.roomName;
        id = "A**";
        break;

      case "蛇の間":
        this.roomName = EventName + this.roomName;
        id = "B**";
        break;

      case "斬の間":
        this.roomName = EventName + this.roomName;
        id = "C**";
        break;

      case "陣の間":
        this.roomName = EventName + this.roomName;
        id = "D**";
        break;

      case "轟の間":
        this.roomName = EventName + this.roomName;
        id = "E**";
        break;

      case "霧の間":
        this.roomName = EventName + this.roomName;
        id = "F**";
        break;

      case "瞬の間":
        this.roomName = EventName + this.roomName;
        id = "G**";
        break;

      case "浄の間":
        this.roomName = EventName + this.roomName;
        id = "H**";
        break;

      case "滅の間":
        this.roomName = EventName + this.roomName;
        id = "I**";
        break;

      case "幻の間":
        this.roomName = EventName + this.roomName;
        id = "J**";
        break;

      case "鳴の間":
        this.roomName = EventName + this.roomName;
        id = "K**";
        break;

      case "赫の間":
        this.roomName = EventName + this.roomName;
        id = "L**";
        break;

      default:
        break;
    }
    const roomId = PeerContext.generateId(id);
    Network.open(userId, roomId, this.roomName, this.password, this.capacity);
    PeerCursor.myCursor.peerId = Network.peerId;
    //var res = confirm("Discordで募集しますか？\n募集したら、Discordが起動します。\n空いているボイスチャンネルに入室してお待ちください。\n※対戦者が見つかるまでに、時間がかかる場合があります。\n「キャンセル」をクリックした場合、募集をかけずにルームの作成のみ行われます。");
    //if (res == true) {
    //  const discordClient = new DiscordWebhook('https://discord.com/api/webhooks/905356970012340264/yiSX2K6P3stJ92eGlA0JD1cVc_e0pamFvEUrMeFezhpCXy00QG16ufFjCX_mM30gty9w')
    //  //const discordClient = new DiscordWebhook('https://discord.com/api/webhooks/905330922918924298/DwR73ZoIGGibPYu4oQ7TZ3JhNlBHw7LsrBhGmfzHBqxiws72VLj6MFQtMmBxgPuYbJpM')
    //  const requestBody: Webhook.input.POST = {
    //    content: PeerCursor.myCursor.name + 'さんが対戦相手を探しています。\n対戦される方は、' + PeerCursor.myCursor.name + 'さんが入室しているボイスチャンネルに接続してください。',
    //    embeds: [
    //      {
    //        title: this.roomName + "/" + roomId,
    //        description: 'https://raigonarium.org/#' + Network.peerId,
    //      },
    //    ]
    //  };
    //  discordClient.execute(requestBody) // -> Promise<AxiosResponse>
    //  window.open("https://discord.com/channels/846338999265525760/861162062021787688")
    //}

    this.modalService.resolve();
  }
}

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';

import { Card } from '@udonarium/card';
import { CardStack } from '@udonarium/card-stack';
import { ObjectNode } from '@udonarium/core/synchronize-object/object-node';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { PeerCursor } from '../../class/peer-cursor';
import { TabletopActionService } from 'service/tabletop-action.service';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';

import { PanelOption, PanelService } from 'service/panel.service';
import { TabletopService } from 'service/tabletop.service';

import { Coodinate } from 'json/parameter.json';

@Component({
  selector: 'card-stack-list',
  templateUrl: './card-stack-list.component.html',
  styleUrls: ['./card-stack-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardStackListComponent implements OnInit, OnDestroy {
  @Input() cardStack: CardStack = null;

  owner: string = Network.peerContext.userId;

  constructor(
    private panelService: PanelService,
    private changeDetector: ChangeDetectorRef,
    private tabletopActionService: TabletopActionService,
    private tabletopService: TabletopService
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.panelService.title = this.cardStack.name + ' のカード一覧');
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.cardStack || !object) return;
        if ((this.cardStack === object)
          || (object instanceof ObjectNode && this.cardStack.contains(object))) {
          this.changeDetector.markForCheck();
        }
        if (event.data.identifier === this.cardStack.identifier && this.cardStack.owner !== this.owner) {
          this.panelService.close();
        }
      })
      .on('DELETE_GAME_OBJECT', -1000, event => {
        if (this.cardStack && this.cardStack.identifier === event.data.identifier) {
          this.panelService.close();
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.cardStack.owner === this.owner) {
      this.cardStack.owner = '';
    }
  }

  KAI(card: Card) {
    if (card.komaname != "織" && card.komaname != "彦" && card.komaname != "鵲")  this.cardStack.KAI_flag = true; 
    this.cardStack.KAI = card.komaname;
    this.drawCard(card);
  }

  drawCard(card: Card) {
    //card.parent.removeChild(card);
    //card.location.x = this.cardStack.location.x - 50 + (Math.floor(Math.random() * 25)) * 4;
    //card.location.y = this.cardStack.location.y + 75;
    //card.location.name = this.cardStack.location.name;
    //card.rotate += this.cardStack.rotate;
    //if (360 < card.rotate) card.rotate -= 360;    let sign: { x: number, y: number };
    card.parent.removeChild(card);
    card.toTopmost();

    switch (this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ)) {
      case 0:
        card.location.x = Coodinate.Player1.Drawcard[0].PositionX;
        card.location.y = Coodinate.Player1.Drawcard[0].PositionY;
        card.rotate = Coodinate.Player1.Drawcard[0].Rotate;
        card.setLocation(this.cardStack.location.name);
        card.owner = Network.peerContext.userId;
        break;
      case 180:
        card.location.x = Coodinate.Player2.Drawcard[0].PositionX;
        card.location.y = Coodinate.Player2.Drawcard[0].PositionY;
        card.rotate = Coodinate.Player2.Drawcard[0].Rotate;
        card.setLocation(this.cardStack.location.name);
        card.owner = Network.peerContext.userId;
        break;
      default:
        break;
    }

    SoundEffect.play(PresetSound.cardDraw);
    if (this.cardStack.name == "風") {
      this.cardStack.faceUpAll();
      let cardstacks: CardStack[] = this.tabletopService.cardStacks;
      cardstacks = cardstacks.filter(stack => { return stack.location.x == (Coodinate as any).Common.FrontDeck.PositionX && stack.location.y == (Coodinate as any).Common.FrontDeck.PositionY; });

      for (let stack of cardstacks) {
        if (stack != this.cardStack) {
          let cards = this.cardStack.drawCardAll();
          for (let card of cards) {
            stack.putOnTop(card);
          }
        }
      }

    }
    if (this.cardStack.cards.length == 0) this.cardStack.destroy();
    this.panelService.close();
  }

  BAN(card: Card) {
    card.isLocked = true;
    this.cardStack.BAN_flag = true;
    SoundEffect.play(PresetSound.cardDraw);
    this.panelService.close();
  }

  view(card: Card) {
    if (PeerCursor.myCursor.choose_Lock == false)   PeerCursor.myCursor.choose = card.komaname;
  }

  up(card: Card) {
    let parent = card.parent;
    let index: number = parent.children.indexOf(card);
    if (0 < index) {
      let prev = parent.children[index - 1];
      parent.insertBefore(card, prev);
    }
  }

  down(card: Card) {
    let parent = card.parent;
    let index: number = parent.children.indexOf(card);
    if (index < parent.children.length - 1) {
      let next = parent.children[index + 1];
      parent.insertBefore(next, card);
    }
  }
  
  close(needShuffle: boolean = false) {
    if (needShuffle) {
      this.cardStack.faceUpAll();
      //EventSystem.call('SHUFFLE_CARD_STACK', { identifier: this.cardStack.identifier });
      SoundEffect.play(PresetSound.cardDraw);
    }
    this.panelService.close();
  }

  showDetail(gameObject: Card) {
    let coordinate = {
      x: this.panelService.left,
      y: this.panelService.top
    };
    let title = 'カード設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x + 10, top: coordinate.y + 20, width: 600, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  trackByCard(index: number, card: Card) {
    return card.identifier;
  }
}

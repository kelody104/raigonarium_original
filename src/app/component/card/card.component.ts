import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Card, CardState } from '@udonarium/card';
import { CardStack } from '@udonarium/card-stack';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ObjectNode } from '@udonarium/core/synchronize-object/object-node';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { PeerCursor } from '@udonarium/peer-cursor';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuSeparator, ContextMenuService, ContextMenuAction } from 'service/context-menu.service';
import { ImageService } from 'service/image.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { TabletopService } from 'service/tabletop.service';
import { TabletopActionService } from 'service/tabletop-action.service';

import statusData from 'json/status.json';
const Status = (statusData as any)?.Status || statusData as any;
import { ougi } from 'json/kisekigoma.json';
import { Time,Coodinate } from 'json/parameter.json';

@Component({
  selector: 'card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() card: Card = null;
  @Input() cardstack: CardStack = null;

  @Input() is3D: boolean = false;

  get name(): string { return this.card.name; }
  get state(): CardState { return this.card.state; }
  set state(state: CardState) { this.card.state = state; }
  get rotate(): number { return this.card.rotate; }
  set rotate(rotate: number) { this.card.rotate = rotate; }
  get owner(): string { return this.card.owner; }
  set owner(owner: string) { this.card.owner = owner; }
  get zindex(): number { return this.card.zindex; }
  get size(): number { return this.adjustMinBounds(this.card.size); }
  get isLocked(): boolean { return this.card.isLocked; }
  set isLocked(isLocked: boolean) { this.card.isLocked = isLocked; }

  get isHand(): boolean { return this.card.isHand; }
  get isFront(): boolean { return this.card.isFront; }
  get isGod(): boolean { return this.card.isGod; }
  get isVisible(): boolean { return this.card.isVisible; }
  get hasOwner(): boolean { return this.card.hasOwner; }
  get ownerName(): string { return this.card.ownerName; }
  get imageFile(): ImageFile { return this.imageService.getSkeletonOr(this.card.imageFile); }
  get frontImage(): ImageFile { return this.imageService.getSkeletonOr(this.card.frontImage); }
  get backImage(): ImageFile { return this.imageService.getSkeletonOr(this.card.backImage); }

  private iconHiddenTimer: NodeJS.Timer = null;
  get isIconHidden(): boolean { return this.iconHiddenTimer != null };

  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private doubleClickTimer: NodeJS.Timer = null;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler = null;

  constructor(
    private ngZone: NgZone,
    private contextMenuService: ContextMenuService,
    private panelService: PanelService,
    private elementRef: ElementRef<HTMLElement>,
    private changeDetector: ChangeDetectorRef,
    private tabletopService: TabletopService,
    private imageService: ImageService,
    private pointerDeviceService: PointerDeviceService,
    private tabletopActionService: TabletopActionService
  ) { }

  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.card || !object) return;
        if ((this.card === object)
          || (object instanceof ObjectNode && this.card.contains(object))
          || (object instanceof PeerCursor && object.userId === this.card.owner)) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, event => {
        this.changeDetector.markForCheck();
      })
      .on('DISCONNECT_PEER', event => {
        let cursor = PeerCursor.findByPeerId(event.data.peerId);
        if (!cursor || this.card.owner === cursor.userId) this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.card,
      transformCssOffset: 'translateZ(0.15px)',
      colideLayers: ['terrain']
    };
    this.rotableOption = {
      tabletopObject: this.card
    };
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = e => this.ngZone.run(() => this.onInputStart(e));
  }

  ngOnDestroy() {
    this.input.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('carddrop', ['$event'])
  onCardDrop(e) {
    if (this.card === e.detail || (e.detail instanceof Card === false && e.detail instanceof CardStack === false)) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    if (e.detail instanceof CardStack) {
      let cardStack: CardStack = e.detail;
      let distance: number = (cardStack.location.x - this.card.location.x) ** 2 + (cardStack.location.y - this.card.location.y) ** 2 + (cardStack.posZ - this.card.posZ) ** 2;
      if (distance < 25 ** 2) {
        cardStack.location.x = this.card.location.x;
        cardStack.location.y = this.card.location.y;
        cardStack.posZ = this.card.posZ;
        cardStack.putOnBottom(this.card);
      }
    }
  }

  startDoubleClickTimer(e) {
    if (!this.doubleClickTimer) {
      this.stopDoubleClickTimer();
      this.doubleClickTimer = setTimeout(() => this.stopDoubleClickTimer(), e.touches ? 500 : 300);
      this.doubleClickPoint = this.input.pointer;
      return;
    }

    if (e.touches) {
      this.input.onEnd = this.onDoubleClick.bind(this);
    } else {
      this.onDoubleClick();
    }
  }

  stopDoubleClickTimer() {
    clearTimeout(this.doubleClickTimer);
    this.doubleClickTimer = null;
    this.input.onEnd = null;
  }

  async onDoubleClick() {
    this.stopDoubleClickTimer();
    if (this.name == "得点") {
      this.tabletopActionService.createDiceSymbolMarker(this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ));
    }
    if (this.isLocked == false) {
      if (this.name == "名札") {
        let namestack: CardStack = this.createStack("名札", "名札");
        namestack.shuffle();
        namestack.faceUpAll();
        SoundEffect.play(PresetSound.cardPut);
      } else {
        let distance = (this.doubleClickPoint.x - this.input.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input.pointer.y) ** 2;
        if (distance < 10 ** 2) {
          if (Status.Testmode == true) console.log('onDoubleClick !!!!');
          if (this.owner === Network.peerContext.userId) {
            this.card.faceUp();
            this.tabletopActionService.refresh();
            SoundEffect.play(PresetSound.cardDraw);
            if (this.state == CardState.FRONT && this.card.weight != 9) {
              for (let i = 0; i < 3; i++) {
                if (this.card.location.x == (Coodinate as any).Player1.tower[i][0].PositionX && this.card.location.y == (Coodinate as any).Player1.tower[i][0].PositionY) {
                  this.ZanBottom(this.card); return;
                }
                else if (this.card.location.x == (Coodinate as any).Player2.tower[i][0].PositionX && this.card.location.y == (Coodinate as any).Player2.tower[i][0].PositionY) {
                  this.ZanBottom(this.card); return;
                }
              }
              await new Promise(resolve => setTimeout(resolve, (Time as any).Waiting))
              //this.dust(this.card);
            }
            //return;
          }
          else if (this.state === CardState.FRONT) {
            this.card.faceDown();
            this.tabletopActionService.refresh();
            SoundEffect.play(PresetSound.cardDraw);
          } else {
            SoundEffect.play(PresetSound.cardDraw);
            this.card.faceDown();
            this.tabletopActionService.refresh();
            this.card.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
            this.owner = Network.peerContext.userId;
          }
        }
      }
    } else if (this.name == "得点") {
      this.tabletopActionService.createDiceSymbolMarker(this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ));
      SoundEffect.play(PresetSound.cardDraw);
    }
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  async onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.card.toTopmost();
    this.startIconHiddenTimer();
    if (Status.Testmode == true) console.log(this.card.location.x + "," + this.card.location.y);
    if (this.card.isFront == true || this.card.owner == Network.peerContext.userId) {
      if (PeerCursor.myCursor.choose_Lock == false) PeerCursor.myCursor.choose = this.card.komaname;
    }
    else {
      if (PeerCursor.myCursor.choose_Lock == false) PeerCursor.myCursor.choose = null;
    }

    if (Status.Testmode == true) console.log("position.x = " + this.card.location.x + " potision.y = " + this.card.location.y + " rotate = " + this.card.rotate);
    //if (this.card.isFront == true && PeerCursor.myCursor.AssistMode == true) {
    //  let cardstacks: CardStack[] = this.tabletopService.cardStacks;
    //  cardstacks = cardstacks.filter(stack => { return stack.name == "峡谷" && stack.komaname == this.card.komaname && stack.rotate == this.card.rotate; });
    //  for (let stack of cardstacks) {
    //    stack.putOnTop(this.card);
    //    SoundEffect.play(PresetSound.cardDraw);
    //  }
    //}

    if (this.isLocked) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    let position = this.pointerDeviceService.pointers[0];

    let actions: ContextMenuAction[] = [];
    let pat_Plus: ContextMenuAction[] = [];
    this.contextMenuService.open(position, actions, this.name);
    let subActions_Cardview: ContextMenuAction[] = [];
    let subActions_Rotate: ContextMenuAction[] = [];
    let subActions_Other: ContextMenuAction[] = [];

    if (this.name == "得点") {
      //actions.push({ name: `加点・減点する`, action: null, subActions: pat_Plus });
      for (let i = 6; i > -7; i--) {
        if (i > 0) {
          actions.push({
            name: "+" + i + '点する', action: () => {
              PeerCursor.myCursor.points += i;
              this.tabletopActionService.createDiceSymbolMarker(this.rotate);
            },
          });
        } else if (i == 0) actions.push(ContextMenuSeparator);
        else if (i < 0) {
          actions.push({
            name: i + '点する', action: () => {
              PeerCursor.myCursor.points += i;
              this.tabletopActionService.createDiceSymbolMarker(this.rotate);
            },
          });
        }
      }
      actions.push(ContextMenuSeparator);
      actions.push({
        name: '禁忌を行う', action: () => {
          PeerCursor.myCursor.points -= 1;
          this.tabletopActionService.createDiceSymbolMarker(this.rotate);
          this.tabletopActionService.createRaigoDark();
        }
      });
      actions.push(ContextMenuSeparator);
      actions.push(
        (this.isLocked
          ? {
            name: '固定解除', action: () => {
              this.isLocked = false;
              SoundEffect.play(PresetSound.unlock);
            }
          }
          : {
            name: '固定する', action: () => {
              this.isLocked = true;
              SoundEffect.play(PresetSound.lock);
            }
          }));
      actions.push({
        name: '削除する', action: () => {
          this.card.destroy();
          this.card = null;
          SoundEffect.play(PresetSound.sweep);
        }
      });
    }
    else {
      if (this.name == "葵石駒" && this.isLocked == false) {
        actions.push({
          name: '塔をまとめる', action: () => {
            this.CreateTower();
            SoundEffect.play(PresetSound.cardPut);
          }
        });
        actions.push(ContextMenuSeparator);
      }

      actions.push(
        (this.isLocked
          ? {
            name: '固定解除', action: () => {
              this.isLocked = false;
              SoundEffect.play(PresetSound.unlock);
            }
          }
          : {
            name: '固定する', action: () => {
              this.isLocked = true;
              SoundEffect.play(PresetSound.lock);
            }
          }));

      if (this.isLocked == false) actions.push({ name: `回転する`, action: null, subActions: subActions_Rotate });

      subActions_Rotate.push({
        name: '左に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ) - 90;
        }
      });

      subActions_Rotate.push({
        name: '前に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
        }
      });

      subActions_Rotate.push({
        name: '右に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ) + 90;
        }
      });

      subActions_Rotate.push({
        name: '手前に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ) + 180;
        }
      });

      if (this.isLocked == false) actions.push({ name: `カードを見る`, action: null, subActions: subActions_Cardview });
      if (Status.ConventionMode == false) {
        actions.push(ContextMenuSeparator);

        actions.push({
          name: '【斬（下）】で捨てる', action: () => {
            this.ZanBottom(this.card);
          }
        });

        if ((ougi as any)[10]?.available == true && this.name == "葵石駒") {
          actions.push({
            name: '【零】の効果で山札を作る', action: () => {
              this.createStack_st(true, true);
              SoundEffect.play(PresetSound.cardPut);
            }
          })
        }
        actions.push({
          name: '【群】の効果で山札を作る', action: () => {
            this.createStack_st(true, false);
            SoundEffect.play(PresetSound.cardPut);
          }
        })
        actions.push({
          name: 'カードをシャッフルする', action: () => {
            this.Shuffle();
            SoundEffect.play(PresetSound.cardPut);
          }
        });
        actions.push({ name: `その他の操作`, action: null, subActions: subActions_Other });
      }
      actions.push({
        name: '削除する', action: () => {
          this.card.destroy();
          this.card = null;
          SoundEffect.play(PresetSound.sweep);
        }
      });
    }

    subActions_Cardview.push(!this.isFront || this.isHand
      ? {
        name: '表にする', action: () => {
          this.card.faceUp();
          SoundEffect.play(PresetSound.cardDraw);
        }
      }
      : {
        name: '裏にする', action: () => {
          this.card.faceDown();
          SoundEffect.play(PresetSound.cardDraw);
        }
      });

    subActions_Cardview.push(this.isHand
      ? {
        name: '裏にする', action: () => {
          this.card.faceDown();
          SoundEffect.play(PresetSound.cardDraw);
        }
      }
      : {
        name: '自分だけ見る', action: () => {
          SoundEffect.play(PresetSound.cardDraw);
          this.card.faceDown();
          this.owner = Network.peerContext.userId;
        }
      })
    subActions_Other.push({
      name: '重なったカードで山札を作る', action: () => {
        this.createStack_st(false, true);
        SoundEffect.play(PresetSound.cardPut);
      }
    })

    subActions_Other.push({
      name: 'カードを編集', action: () => { this.showDetail(this.card); }
    });

    subActions_Other.push({
      name: 'コピーを作る', action: () => {
        let cloneObject = this.card.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.toTopmost();
        SoundEffect.play(PresetSound.cardPut);
      }
    });

  }

  onturn90() {
    this.rotate += 90;

  }

  onturn180() {
    this.rotate += 180;
  }

  onturn270() {
    this.rotate += -90;
  }

  onMove() {
    this.input.cancel();
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
    this.ngZone.run(() => this.dispatchCardDropEvent());
  }

  dust(card: Card) {
    let cardstacks: CardStack[] = this.tabletopService.cardStacks;
    cardstacks = cardstacks.filter(stack => { return stack.name == "峡谷" && stack.komaname == this.card.komaname && stack.rotate == this.card.rotate; });
    for (let stack of cardstacks) {
      if (card.location.x != stack.location.x) {
        stack.putOnTop(this.card);
        SoundEffect.play(PresetSound.cardPut);
      }
    }
  }

  private createStack(deckname, search) {
    let cardStack = CardStack.create(deckname);
    cardStack.location.x = this.card.location.x;
    cardStack.location.y = this.card.location.y;
    cardStack.posZ = this.card.posZ;
    cardStack.location.name = this.card.location.name;
    cardStack.rotate = this.rotate;
    cardStack.zindex = this.card.zindex;

    let cards: Card[] = this.tabletopService.cards.filter(card => { return card.name == search && card.isLocked == false; });

    for (let card of cards) {
      cardStack.putOnBottom(card);
    }
    if (cardStack.cards.length == 0) {
      cardStack.destroy();
      cardStack = null;
    }
    return cardStack;
  }

  private createStack_st(Rei: boolean, state_FRONT: boolean) {
    if (Rei == false) {
      let cardStack = CardStack.create('雷山');
      cardStack.location.x = this.card.location.x;
      cardStack.location.y = this.card.location.y;
      cardStack.posZ = this.card.posZ;
      cardStack.location.name = this.card.location.name;
      cardStack.rotate = this.rotate;
      cardStack.zindex = this.card.zindex;

      let cards: Card[] = this.tabletopService.cards.filter(card => {
        let distance: number = (card.location.x - this.card.location.x) ** 2 + (card.location.y - this.card.location.y) ** 2 + (card.posZ - this.card.posZ) ** 2;
        return distance < 100 ** 2;
      });

      cards.sort((a, b) => {
        if (a.zindex < b.zindex) return 1;
        if (a.zindex > b.zindex) return -1;
        return 0;
      });

      for (let card of cards) {
        cardStack.putOnBottom(card);
      }
    }
    else {
      let towername = '零';
      if (state_FRONT == false) towername = '雷山';
      let cardStack = CardStack.create(towername);
      cardStack.location.x = (Coodinate as any).Common.FrontDeck.PositionX;
      cardStack.location.y = (Coodinate as any).Common.FrontDeck.PositionY;
      cardStack.posZ = 0;
      //cardStack.location.name = this.card.location.name;
      cardStack.rotate = 0;
      cardStack.zindex = 0;
      cardStack.isLocked = true;

      let cards: Card[] = this.tabletopService.cards.filter(card => {
        let distance: number = (card.location.x - this.card.location.x) ** 2 + (card.location.y - this.card.location.y) ** 2 + (card.posZ - this.card.posZ) ** 2;
        return distance < 100 ** 2;
      });

      cards.sort((a, b) => {
        if (a.zindex < b.zindex) return 1;
        if (a.zindex > b.zindex) return -1;
        return 0;
      });

      for (let card of cards) {
        card.state = CardState.FRONT;
        if (state_FRONT == false) {
          card.state = CardState.BACK;
        }
        cardStack.putOnBottom(card);
        cardStack.shuffle();
      }
    }
  }

  private CreateTower() {
    let cardStack = CardStack.create('塔');
    cardStack.location.x = this.card.location.x;
    cardStack.location.y = this.card.location.y;
    cardStack.posZ = this.card.posZ;
    cardStack.location.name = this.card.location.name;
    cardStack.rotate = this.rotate;
    cardStack.zindex = this.card.zindex;

    let cards: Card[] = this.tabletopService.cards.filter(card => { return card.name == "葵石駒" && card.location.x == cardStack.location.x && card.rotate == cardStack.rotate; });

    switch (this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ)) {
      case 0:
        cards.sort((a, b) => {
          if (a.location.y < b.location.y) return -1;
          if (a.location.y > b.location.y) return 1;
          return 0;
        });
        break;
      case 180:
        cards.sort((a, b) => {
          if (a.location.y < b.location.y) return 1;
          if (a.location.y > b.location.y) return -1;
          return 0;
        });
        break;
    }

    //let sortedcards: Card[] = cards.filter(card => {
    //  if (card.location.x - this.card.location.x) {
    //    this.card.location.x = c;
    //    this.card.location.y = card.location.y;
    //    this.card.posZ = card.posZ;
    //    return card;
    //  }
    //})

    for (let card of cards) {
      cardStack.putOnBottom(card);
      if (cardStack.cards.length == 6) break;
    }
  }

  private Shuffle() {
    let cards: Card[] = this.tabletopService.cards.filter(card => { return card.name == "葵石駒"; });

    cards.sort((a, b) => {
      if (a.zindex < b.zindex) return 1;
      if (a.zindex > b.zindex) return -1;
      return 0;
    });

    let sortedcards: Card[] = cards.filter(card => {
      let distance: number = (card.location.x - this.card.location.x) ** 2 + (card.location.y - this.card.location.y) ** 2 + (card.posZ - this.card.posZ) ** 2;
      if (distance < 50 ** 2) {
        this.card.location.x = card.location.x;
        this.card.location.y = card.location.y;
        this.card.posZ = card.posZ;
      }
      //let quantity:number = Number(sortedcards.length);

      //for (let i = 0; i < quantity;i++) {
      //  let num = Math.floor(Math.random() * quantity);
      //  let str = sortedcards[--quantity];
      //  sortedcards[quantity] = sortedcards[num];
      //  sortedcards[num] = str;
      //}

      for (let card of sortedcards) {
        card.location.x = this.card.location.x;
        card.location.y = this.card.location.y;
      }

      return 0;
    })
  }

  private dispatchCardDropEvent() {
    if (Status.Testmode == true)  console.log('dispatchCardDropEvent');
    let element: HTMLElement = this.elementRef.nativeElement;
    let parent = element.parentElement;
    let children = parent.children;
    let event = new CustomEvent('carddrop', { detail: this.card, bubbles: true });
    for (let i = 0; i < children.length; i++) {
      children[i].dispatchEvent(event);
    }
  }

  async ZanBottom(card: Card) {
    card.state = CardState.FRONT;
    SoundEffect.play(PresetSound.cardDraw);
    await new Promise(resolve => setTimeout(resolve, (Time as any).Waiting))
    let PosX = card.location.x;
    let Rot = card.rotate;
    let cardstacks: CardStack[] = this.tabletopService.cardStacks;
    cardstacks = cardstacks.filter(stack => { return stack.name == "峡谷" && stack.komaname == this.card.komaname && stack.rotate == this.card.rotate; });
    for (let stack of cardstacks) {
      stack.putOnTop(this.card);
      SoundEffect.play(PresetSound.cardPut);
    }
    let cards: Card[] = this.tabletopService.cards;
    cards = cards.filter(tower => { return tower.location.x == PosX && tower.rotate == Rot; });
    for (let tower of cards) {
      switch (Rot) {
        case 0:
          tower.location.y += 100;
          break;
        case 180:
          tower.location.y -= 100;
          break;
      }
      tower.setLocation(tower.location.name);
    }
    SoundEffect.play(PresetSound.cardPut);
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null;
      this.changeDetector.markForCheck();
    }, 300);
    this.changeDetector.markForCheck();
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: Card) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = 'カード設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 300, top: coordinate.y - 300, width: 600, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }
}

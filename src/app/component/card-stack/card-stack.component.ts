import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
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
import { CardStackListComponent } from 'component/card-stack-list/card-stack-list.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuSeparator, ContextMenuService, ContextMenuAction } from 'service/context-menu.service';
import { ImageService } from 'service/image.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService, PointerCoordinate } from 'service/pointer-device.service';
import { TabletopService } from 'service/tabletop.service';
import { TabletopActionService } from 'service/tabletop-action.service';
import { DiceSymbol, DiceType } from '@udonarium/dice-symbol';
import { Terrain } from '../../class/terrain';

import statusData from 'json/status.json';
const Status = (statusData as any)?.Status || statusData as any;
import { ougi } from 'json/kisekigoma.json';
import { Time,Coodinate } from 'json/parameter.json';
import { TextNote } from '../../class/text-note';

@Component({
  selector: 'card-stack',
  templateUrl: './card-stack.component.html',
  styleUrls: ['./card-stack.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('shuffle', [
      state('active', style({ transform: '' })),
      transition('* => active', [
        animate('800ms ease', keyframes([
          style({ transform: 'scale3d(0, 0, 0) rotateZ(0deg)', offset: 0 }),
          style({ transform: 'scale3d(1.2, 1.2, 1.2) rotateZ(360deg)', offset: 0.5 }),
          style({ transform: 'scale3d(0.75, 0.75, 0.75) rotateZ(520deg)', offset: 0.75 }),
          style({ transform: 'scale3d(1.125, 1.125, 1.125) rotateZ(630deg)', offset: 0.875 }),
          style({ transform: 'scale3d(1.0, 1.0, 1.0) rotateZ(720deg)', offset: 1.0 })
        ]))
      ])
    ])
  ]
})
export class CardStackComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() cardStack: CardStack = null;
  @Input() is3D: boolean = false;
  isVisible: any;

  get name(): string { return this.cardStack.name; }
  get count(): number { return this.counting(this.cardStack); }
  get rotate(): number { return this.cardStack.rotate; }
  set rotate(rotate: number) { this.cardStack.rotate = rotate; }
  get zindex(): number { return this.cardStack.zindex; }
  get isShowTotal(): boolean { return this.cardStack.isShowTotal; }
  get cards(): Card[] { return this.cardStack.cards; }
  get isEmpty(): boolean { return this.cardStack.isEmpty; }
  get size(): number {
    let card = this.cardStack.topCard;
    return (card ? card.size : 2);
  }
  get isLocked(): boolean { return this.cardStack.isLocked; }
  set isLocked(isLocked: boolean) { this.cardStack.isLocked = isLocked; }

  get hasOwner(): boolean { return this.cardStack.hasOwner; }
  get ownerName(): string { return this.cardStack.ownerName; }

  get topCard(): Card { return this.cardStack.topCard; }
  get imageFile(): ImageFile { return this.imageService.getSkeletonOr(this.cardStack.imageFile); }

  animeState: string = 'inactive';

  private iconHiddenTimer: NodeJS.Timer = null;
  get isIconHidden(): boolean { return this.iconHiddenTimer != null };

  gridSize: number = 50;
  position_draw = 0;
  Jo_Flag = 0;

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
      .on('SHUFFLE_CARD_STACK', -1000, event => {
        if (event.data.identifier === this.cardStack.identifier) {
          this.animeState = 'active';
          this.changeDetector.markForCheck();
        }
      })
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.cardStack || !object) return;
        if ((this.cardStack === object)
          || (object instanceof ObjectNode && this.cardStack.contains(object))
          || (object instanceof PeerCursor && object.userId === this.cardStack.owner)
          //|| (object instanceof PeerCursor && object.userId === this.cardStack.god)
        ) {
          this.changeDetector.markForCheck();
        }
      })
      .on('CARD_STACK_DECREASED', event => {
        if (event.data.cardStackIdentifier === this.cardStack.identifier && this.cardStack) this.changeDetector.markForCheck();
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, event => {
        this.changeDetector.markForCheck();
      })
      .on('DISCONNECT_PEER', event => {
        let cursor = PeerCursor.findByPeerId(event.data.peerId);
        if (!cursor || this.cardStack.owner === cursor.userId) this.changeDetector.markForCheck();
        //if (!cursor || this.cardStack.god === cursor.userId) this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.cardStack,
      transformCssOffset: 'translateZ(0.15px)',
      colideLayers: ['terrain']
    };
    this.rotableOption = {
      tabletopObject: this.cardStack
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
    this.input = null;
    EventSystem.unregister(this);
  }

  animationShuffleStarted(event: any) {

  }

  animationShuffleDone(event: any) {
    this.animeState = 'inactive';
    this.changeDetector.markForCheck();
  }

  @HostListener('carddrop', ['$event'])
  onCardDrop(e) {
    if (this.cardStack === e.detail || (e.detail instanceof Card === false && e.detail instanceof CardStack === false)) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    if (e.detail instanceof Card) {
      let card: Card = e.detail;
      let distance: number = (card.location.x - this.cardStack.location.x) ** 2 + (card.location.y - this.cardStack.location.y) ** 2 + (card.posZ - this.cardStack.posZ) ** 2;
      if (distance < 50 ** 2) {
        if (this.cardStack.name != "峡谷" || this.cardStack.komaname == card.komaname) {
          card.rotate = this.cardStack.rotate;
          this.cardStack.putOnTop(card);
          this.tabletopActionService.refresh();
        }
      }
    } else if (e.detail instanceof CardStack) {
      let cardStack: CardStack = e.detail;
      let distance: number = (cardStack.location.x - this.cardStack.location.x) ** 2 + (cardStack.location.y - this.cardStack.location.y) ** 2 + (cardStack.posZ - this.cardStack.posZ) ** 2;
      if (distance < 25 ** 2) this.concatStack(cardStack);
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

  onDoubleClick() {
    this.stopDoubleClickTimer();
    let distance = (this.doubleClickPoint.x - this.input.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input.pointer.y) ** 2;
    if (distance < 10 ** 2) {
      console.log('onDoubleClick !!!!');
    }
    if (this.name == "塔") {
      this.breakTower(0);
    }
    else if (this.name == "名札") {
      let member: { locationx: number, locationy: number, rot: number }[] = [
        { locationx: 1730, locationy: 1340, rot: 0 },
        { locationx: 70, locationy: 170, rot: 180 },
        { locationx: 1487.5, locationy: -71.5, rot: 270 },
        { locationx: 317, locationy: 1577.5, rot: 90 },
      ];
      this.cardStack.shuffle();
      this.TeamDivide(member);
    } else if (this.name == "奥義駒") {
      this.OugiStack();
    }
    else if (this.name == "風" || this.name == "零") {
      this.showStackList(this.cardStack);
    }
    else if (this.name == "峡谷" && this.cards.length == 1) {
      return;
    } else {
      if (this.drawCard(1) != null) {
        SoundEffect.play(PresetSound.cardDraw);
      }
    }
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.cardStack.toTopmost();
    this.startIconHiddenTimer();
    if (this.isLocked) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
    }

    if (Status.Testmode == true) console.log("position.x = " + this.cardStack.location.x + " potision.y = " + this.cardStack.location.y);

    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: this.cardStack.identifier, className: 'GameCharacter' });
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    let position = this.pointerDeviceService.pointers[0];

    let actions: ContextMenuAction[] = [];
    this.contextMenuService.open(position, actions, this.name);

    let subActions_Jodraw: ContextMenuAction[] = [];
    let subActions_Fumake: ContextMenuAction[] = [];
    //let subActions_Rotate: ContextMenuAction[] = [];
    let subActions_Other: ContextMenuAction[] = [];

    if (this.name != "峡谷") {
      if (this.cardStack.name == "雷山") {
        if (Status.OrganizerMode == true) {
          actions.push({
            name: '山札を見る', action: () => {
              this.showStackList(this.cardStack);
            }
          });
          actions.push(ContextMenuSeparator);
        }
        actions.push({
          name: '1枚引く（1選）', action: () => {
            if (this.drawCard(1) != null) {
              SoundEffect.play(PresetSound.cardDraw);
              //this.rotate += PeerCursor.myCursor.deg;
            }
          }
        });
        actions.push({
          name: '2枚引く（2選）', action: () => {
            if (this.drawCard(1) != null)
              this.position_draw = -423;
            if (this.drawCard(2) != null) {
              SoundEffect.play(PresetSound.cardDraw);
              //this.rotate += PeerCursor.myCursor.deg;
            }
          }
        });
        actions.push(ContextMenuSeparator);
        actions.push({
          name: '3枚引く（浄）', action: () => {
            if (this.drawCard(1) != null)
              this.position_draw = -423;
            if (this.drawCard(2) != null)
              this.position_draw = -55;
            if (this.drawCard(3) != null)
              SoundEffect.play(PresetSound.cardDraw);
          }
        });
        actions.push({
          name: '4枚引く（浄）', action: () => {
            if (this.drawCard(1) != null)
              if (this.drawCard(2) != null)
                if (this.drawCard(3) != null)
                  if (this.drawCard(4) != null)
                    SoundEffect.play(PresetSound.cardDraw);
          }
        });

        //actions.push({ name: `【浄】の効果で引く`, action: null, subActions: subActions_Jodraw });
        if ((ougi as any)[31]?.available == true) {
          actions.push(ContextMenuSeparator);
          actions.push({ name: `【風】の効果で見る`, action: null, subActions: subActions_Fumake });
          // actions.push(ContextMenuSeparator);
          //actions.push({ name: `回転する`, action: null, subActions: subActions_Rotate });
        }
      }
      else if (this.name == "奥義駒") {
        actions.push({
          name: '奥義駒を選択する', action: () => {
            this.OugiStack();
          }
        });
        actions.push(ContextMenuSeparator);
        actions.push({
          name: '崩す', action: () => {
            this.breakTower_beside(true);
            SoundEffect.play(PresetSound.cardShuffle);
          }
        });
        actions.push({
          name: '崩す（自分だけ見る）', action: () => {
            this.breakTower_beside(false);
            SoundEffect.play(PresetSound.cardShuffle);
          }
        });
        actions.push(ContextMenuSeparator);
      }
      else if (this.name == "塔") {
        actions.push({
          name: '塔を解放する', action: () => {
            this.breakTower(0);
            //SoundEffect.play(PresetSound.cardShuffle);
          }
        });
        actions.push(ContextMenuSeparator);
        actions.push({
          name: '雷轟解放する', action: () => {
            this.breakTower(0, null, null, null, null, true);
            //SoundEffect.play(PresetSound.raigo);
          }
        });

        let subActions_Gora: ContextMenuAction[] = [];
        let subActions_Rei: ContextMenuAction[] = [];

        for (let i = 1; i <= 5; i++) {
          subActions_Gora.push({
            name: '豪雷' + i.toString(), action: () => {
              this.breakTower(i);
            }
          })
        }
        actions.push({ name: `豪雷を含む解放`, action: null, subActions: subActions_Gora });

        if ((ougi as any)[35]?.available == true && this.cardStack.cards.length < 6) {
          let subActions_Jin: ContextMenuAction[] = [];
          let Jin: string[] = ["桜花", "蓮花", "奇数蓮花", "偶数蓮花"];
          for (let i = 0; i <= 3; i++) {
            subActions_Jin.push({
              name: Jin[i], action: () => {
                this.breakTower(null, Jin[i]);
              }
            })
          }
          actions.push({ name: `【神】による解放`, action: null, subActions: subActions_Jin });
        }
        if ((ougi as any)[32]?.available == true && this.cardStack.cards.length < 6) {
          actions.push({ name: `【凛】による解放`, action: () => this.breakTower(null, null, true) });
        }
        if ((ougi as any)[3]?.available == true && this.cardStack.cards.length < 6) {
          actions.push({ name: `【和】による解放`, action: () => this.breakTower(null, null, null, true) });
        }
        if ((ougi as any)[17]?.available == true && this.cardStack.cards.length < 5) {
          actions.push({ name: `【麗】による解放`, action: () => this.breakTower(null, null, null, null, true) });
        }
        if ((ougi as any)[41]?.visible == true && this.cardStack.cards.length == 3) {
          actions.push({ name: `【鵲】による解放`, action: () => this.breakTower(null, null, null, null, null, null, true) });
        }
      } else if (this.name == "名札") {
        actions.push({
          name:
            this.cards[0].raijinname + " & " +
            this.cards[1].raijinname + " VS " +
            this.cards[2].raijinname + " & " +
            this.cards[3].raijinname, action: () => {
              let member: { locationx: number, locationy: number, rot: number }[] = [
                { locationx: 1730, locationy: 1390, rot: 0 },
                { locationx: 70, locationy: 170, rot: 180 },
                { locationx: 1510, locationy: -47, rot: 270 },
                { locationx: 287, locationy: 1605, rot: 90 },
              ];
              this.TeamDivide(member);
              SoundEffect.play(PresetSound.cardShuffle);
            }
        });
        actions.push({
          name:
            this.cards[0].raijinname + " & " +
            this.cards[2].raijinname + " VS " +
            this.cards[1].raijinname + " & " +
            this.cards[3].raijinname, action: () => {
              let member: { locationx: number, locationy: number, rot: number }[] = [
                { locationx: 1730, locationy: 1390, rot: 0 },
                { locationx: 1510, locationy: -47, rot: 270 },
                { locationx: 70, locationy: 170, rot: 180 },
                { locationx: 287, locationy: 1605, rot: 90 },
              ];
              this.TeamDivide(member);
              SoundEffect.play(PresetSound.cardShuffle);
            }
        });
        actions.push({
          name:
            this.cards[0].raijinname + " & " +
            this.cards[3].raijinname + " VS " +
            this.cards[2].raijinname + " & " +
            this.cards[1].raijinname, action: () => {
              let member: { locationx: number, locationy: number, rot: number }[] = [
                { locationx: 1730, locationy: 1390, rot: 0 },
                { locationx: 1510, locationy: -47, rot: 270 },
                { locationx: 287, locationy: 1605, rot: 90 },
                { locationx: 70, locationy: 170, rot: 180 },
              ];
              this.TeamDivide(member);
              SoundEffect.play(PresetSound.cardShuffle);
            }
        });
      } else if (this.name == "風" || this.name == "零") {
        actions.push({
          name: '山札を見る', action: () => {
            this.showStackList(this.cardStack);
          }
        });
      } else {
        actions.push({
          name: '崩す', action: () => {
            this.breakTower_beside(true);
            SoundEffect.play(PresetSound.cardShuffle);
          }
        });
        actions.push({
          name: '崩す（自分だけ見る）', action: () => {
            this.breakTower_beside(false);
            SoundEffect.play(PresetSound.cardShuffle);
          }
        });
        actions.push(ContextMenuSeparator);
      }
      if (Status.ConventionMode != true && this.cardStack.name == "雷山") {
        actions.push({
          name: '雷山を崩す', action: () => {
            //this.breakTower_beside();
            this.breakTower_beside(true);
            SoundEffect.play(PresetSound.cardShuffle);
          }
        });
        actions.push(ContextMenuSeparator);
      }
      if (this.cardStack.name != "塔") {
        if (Status.ConventionMode == false) {
          actions.push({ name: `その他の操作`, action: null, subActions: subActions_Other });

          actions.push({
            name: '削除する', action: () => {
              this.cardStack.destroy();
              this.cardStack = null;
              SoundEffect.play(PresetSound.sweep);
            }
          });
        }
      }
      else {
        actions.push({
          name: '塔を崩す', action: () => {
            this.breakTower_beside(true);
            SoundEffect.play(PresetSound.cardShuffle);
          }
        });
        actions.push(ContextMenuSeparator);

        actions.push({
          name: '元に戻す', action: () => {
            this.breakTower_replay();
            SoundEffect.play(PresetSound.cardShuffle);
          }
        });
      }

      subActions_Jodraw.push({
        name: '1枚引く', action: () => {
          if (this.drawCard(1) != null) {
            SoundEffect.play(PresetSound.cardDraw);
          }
        }
      });

      subActions_Jodraw.push({
        name: '2枚引く', action: () => {
          if (this.drawCard(1) != null)
            if (this.drawCard(2) != null)
              SoundEffect.play(PresetSound.cardDraw);
        }
      });

      subActions_Jodraw.push({
        name: '3枚引く', action: () => {
          if (this.drawCard(1) != null)
            if (this.drawCard(2) != null)
              if (this.drawCard(3) != null)
                SoundEffect.play(PresetSound.cardDraw);
        }
      });

      subActions_Jodraw.push({
        name: '4枚引く', action: () => {
          if (this.drawCard(1) != null)
            if (this.drawCard(2) != null)
              if (this.drawCard(3) != null)
                if (this.drawCard(4) != null)
                  SoundEffect.play(PresetSound.cardDraw);
        }
      });

      //subActions_Fumake.push({
      //  name: '1枚見る', action: () => {
      //    this.FumakeStack(1);
      //  }
      //});

      //subActions_Fumake.push({
      //  name: '2枚見る', action: () => {
      //    this.FumakeStack(2);
      //  }
      //});

      subActions_Fumake.push({
        name: '3枚見る', action: () => {
          this.FumakeStack(3);
        }
      });

      subActions_Fumake.push({
        name: '4枚見る', action: () => {
          this.FumakeStack(4);
        }
      });

      subActions_Fumake.push({
        name: '5枚見る', action: () => {
          this.FumakeStack(5);
        }
      });

      subActions_Other.push(
        {
          name: '雷山をシャッフルする', action: () => {
            this.cardStack.faceDownAll();
            this.cardStack.shuffle();
            this.cardStack.uprightAll();
            SoundEffect.play(PresetSound.cardShuffle);
            EventSystem.call('SHUFFLE_CARD_STACK', { identifier: this.cardStack.identifier });
          }
        }
      )

      subActions_Other.push(
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

      subActions_Other.push({
        name: '詳細を表示', action: () => { this.showDetail(this.cardStack); }
      });

      if (Status.OrganizerMode == true) {
        subActions_Other.push({
          name: '無作為化', action: () => {
            this.cardStack.faceDownAll();
            this.cardStack.shuffle();
            this.cardStack.uprightAll();
            this.tabletopActionService.Raizaninitial(2, this.cardStack);
            SoundEffect.play(PresetSound.cardShuffle);
            EventSystem.call('SHUFFLE_CARD_STACK', { identifier: this.cardStack.identifier });
          }
        });
      }

      subActions_Other.push({
        name: 'コピーを作る', action: () => {
          let cloneObject = this.cardStack.clone();
          cloneObject.location.x += this.gridSize;
          cloneObject.location.y += this.gridSize;
          cloneObject.update();
          SoundEffect.play(PresetSound.dicePut);
        }
      });
    }
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
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
    this.ngZone.run(() => this.dispatchCardDropEvent());
  }

  private drawCard(number:number): Card {
    let card = this.cardStack.drawCard();
    if (card) {
      this.cardStack.update(); // todo
      switch (this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ)) {
        case 0:
          card.location.x = (Coodinate as any).Player1.Drawcard[number-1].PositionX;
          card.location.y = (Coodinate as any).Player1.Drawcard[number-1].PositionY;
          card.rotate = (Coodinate as any).Player1.Drawcard[number-1].Rotate;
          card.setLocation(this.cardStack.location.name);
          break;
        case 180:
          card.location.x = (Coodinate as any).Player2.Drawcard[number-1].PositionX;
          card.location.y = (Coodinate as any).Player2.Drawcard[number-1].PositionY;
          card.rotate = (Coodinate as any).Player2.Drawcard[number-1].Rotate;
          card.setLocation(this.cardStack.location.name);
          break;
        default:
          break;
      }
    }
    if (this.cards.length == 0) {
      this.cardStack.setLocation('graveyard');
      this.cardStack.destroy();
    }
    return card;
  }

  private breakStack() {
    let cards = this.cardStack.drawCardAll().reverse();
    for (let card of cards) {
      card.location.x += 25 - (Math.random() * 50);
      card.location.y += 25 - (Math.random() * 50);
      card.toTopmost();
      card.setLocation(this.cardStack.location.name);
    }
    this.cardStack.setLocation('graveyard');
    this.cardStack.destroy();
    this.cardStack = null;
  }

  private OugiStack() {
    this.showStackList(this.cardStack);
  }

  private FumakeStack(times) {
    let FuStack = CardStack.create('風');
    FuStack.location.x = (Coodinate as any).Common.FrontDeck.PositionX;
    FuStack.location.y = (Coodinate as any).Common.FrontDeck.PositionY;
    FuStack.posZ = this.cardStack.posZ;
    FuStack.location.name = this.cardStack.location.name;
    FuStack.rotate = 0;
    FuStack.zindex = this.cardStack.zindex;
    FuStack.isLocked = true;
    for (let i = 1; i <= times; i++) {
      if (this.cardStack.cards.length != 0) {
        let Fu: Card = this.cardStack.drawCard();
        FuStack.putOnBottom(Fu);
      }
      if (this.cardStack.cards.length == 0) this.cardStack.destroy();
    }
    SoundEffect.play(PresetSound.cardPut);
    this.showStackList(FuStack);
  }

  private async breakTower(gora?: number, Jin?: string, Rin?: boolean, Wa?: boolean, Rei?: boolean, Raigo?: boolean, Deneb?: boolean) {
    let sign: { x: number, y: number };
    let dice: { x: number, y: number };
    let pos: { x: number, y: number };
    let name: { x: number, y: number };
    //let degree: number = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    let rot = await this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    await this.cardStack.faceUpAll();
    let cards = this.cardStack.drawCardAll();
    let tower: { name: string, type: string, point: number } = this.PointAssist(cards);
    if (Jin) {
      let q: number = Jin.length;
      if (tower.type == Jin) {
        this.rotate = rot;
        tower.name = "【神】" + Jin;
        if (Jin == "桜花") tower.point = 2;
        else tower.point = 1;
      }
    }
    if (Rin && tower.point != 0) {
      tower.name = "【凛】" + tower.name;
      tower.point += 2;
    }
    if (Wa && cards.length > 2) {
      let Weight: number = 0;
      for (let card of cards) {
        Weight += card.weight;
      }
      switch (Weight) {
        case 11:
          tower.name = "【和】重さ11";
          tower.point = 2;
          break;
        case 33:
          tower.name = "【和】重さ33";
          tower.point = 4;
          break;
        default:
          tower.name = "【和】不成立";
          tower.point = -1;
          break;
      }
    }
    if (Raigo && tower.point > 0) {
      tower.point += 2;
    }
    if (Deneb && tower.point == 3 && cards[0].weight == 9) {
      tower.point = 7;
      tower.name = "紫陽花";
    }
    let degree: number = this.rotate;
    switch (degree) {
      case 0:
        sign = { x: 0, y: 1 };
        dice = { x: 0.5, y: -0.5 };
        pos = { x: (Coodinate as any).Player1.Kaihouroku[0].PositionX, y: (Coodinate as any).Player1.Kaihouroku[0].PositionY };
        name = { x: 1, y: 0 };
        break;

      case 90:
        sign = { x: -1, y: 0 };
        dice = { x: 1.7, y: 0.7 };
        pos = { x: 440, y: 1620 };
        name = { x: -3.5, y: -3.05 };
        break;

      case 180:
        sign = { x: 0, y: -1 };
        dice = { x: 0.2, y: 2.4 };
        pos = { x: (Coodinate as any).Player2.Kaihouroku[0].PositionX, y: (Coodinate as any).Player2.Kaihouroku[0].PositionY };
        name = { x: -0.3, y: -7.2 };
        break;

      case 270:
        sign = { x: 1, y: 0 };
        dice = { x: -0.75, y: 0.7 };
        pos = { x: 1415, y: 210 };
        name = { x: 3.95, y: -4.55 };
        break;

      default:
        break;
    }
    let num: number = 0;
    let towers: Terrain[] = this.tabletopService.terrains.filter(tower => { return tower.name == "役名" && tower.rotate == rot });
    let times: number = towers.length;
    //PeerCursor.myCursor.towerpro[times] = "";
    pos.x -= times * 120 * sign.y;
    pos.y += times * 120 * sign.x;
    if (gora) {
      if (tower.name != "") tower.name += "+"
      tower.name += "豪雷" + gora.toString();
      tower.point += gora;
    }
    if (Rei) {
      let count: number = 0;
      for (let card of cards) {
        if (card.type == "otonashi") count++;
      }
      tower.name = "【麗】音無" + count.toString();
      tower.point = count;
    }
    let towerpro = this.makepro(cards, pos, sign, num, degree, tower.point);
    //await this.propush(towerpro);
    let diceposition: PointerCoordinate = { x: pos.x + 125 * dice.x, y: pos.y + 50 * dice.y, z: 0 };
    let nameposition: PointerCoordinate = { x: pos.x + 92.5 * name.x, y: pos.y + 50 * name.y, z: 0 };
    this.cardStack.setLocation('graveyard');
    if (this.cardStack.cards.length == 0) this.cardStack.destroy();
    if (tower.point > 0) {
      PeerCursor.myCursor.points += tower.point;
      let rot = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ).toString();
      let TowerCode: string = degree + times.toString();
      let TowerName; Terrain;
      if (Raigo && tower.point > 0) {
        TowerName = this.tabletopActionService.createsentences(nameposition, tower.name, cards, true);
      } else if (tower.name.length != 3 && gora > 0) TowerName = this.tabletopActionService.createsentences(nameposition, tower.name, cards, null, true);
      else TowerName = this.tabletopActionService.createsentences(nameposition, tower.name, cards);
      TowerName.rotate = degree;
      TowerName.towerpoint = tower.point;
      //if (tower.name.slice(0,2) != "豪雷" && gora > 0) {
      //    switch (TowerName.rotate) {
      //      case 0:
      //      default:
      //        break;
      //      case 90:
      //        TowerName.location.x -= 100;
      //        TowerName.location.y -= 100;
      //        break;
      //      case 180:
      //        TowerName.location.y -= 200;
      //        break;
      //      case 270:
      //        TowerName.location.x += 100;
      //        TowerName.location.y -= 100;
      //        break;
      //    }
      //}
      TowerName.isLocked = true;
      TowerName.towercode = TowerCode;
      //await PeerCursor.myCursor.towers.push(tower.name);
      //await this.towerpush(tower.name);
      let name: string = "陽玉（得点）";
      if (cards.length == 6 || gora > 0 || Rin || Jin || Wa) {
        name = "陽玉（得点)";
      }
      //let dice = this.tabletopActionService.createDiceSymbol(diceposition, name, DiceType.D30, "30_dice", tower.point);
      //dice.ownersID = null;
      //dice.towercode = TowerCode;
      //dice.isLocked = true;
      if (tower.point > 9) SoundEffect.play(PresetSound.raijin);
      else if (Raigo) SoundEffect.play(PresetSound.raigo);
      else SoundEffect.play(PresetSound.cardShuffle);
      //let dices: DiceSymbol[] = this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == Number(degree) && DiceSymbol.name == "陽玉"; });
      //for (let counter of dices) {
      //  counter.face = (Number(counter.face) + tower.point).toString();
      //  //total = null;
      //}
      //dice.rotate = degree;
    } else {
      await new Promise(resolve => setTimeout(resolve, (Time as any).Waiting))
      let cards: Card[] = this.tabletopService.cards;
      cards = cards.filter(card => { return card.location.x == pos.x && card.rotate == degree });
      for (let card of cards) {
        this.dust(card);
      }
      PeerCursor.myCursor.points += tower.point;
      if (tower.point == -1) {
        this.tabletopActionService.createRaigoDark();
      }
    }
    this.tabletopActionService.createDiceSymbolMarker(degree);
    this.tabletopActionService.refresh();
  }

  private TeamDivide(member: { locationx: number, locationy: number, rot: number }[]) {
    let cards = this.cardStack.drawCardAll();
    let num: number = 0;
    for (let card of cards) {
      if (num > 3) {
        card.location.x = 1600 + num * 100;
        card.location.y = 950;
        card.rotate = 0;
        card.toTopmost();
        card.setLocation(this.cardStack.location.name);
        card.isLocked = true;
        num++;
      } else {
        card.location.x = member[num].locationx;
        card.location.y = member[num].locationy;
        card.rotate = member[num].rot;
        num++;
        card.isLocked = true;
      }
    }
    SoundEffect.play(PresetSound.cardShuffle);
    this.cardStack.setLocation('graveyard');
    this.cardStack.destroy();
  }

  private breakTower_replay() {
    let signx, signy;
    let degree: number = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    switch (degree) {
      case 0:
        signx = 0;
        signy = 1;
        break;

      case 90:
        signx = -1;
        signy = 0;
        break;

      case 180:
        signx = 0;
        signy = -1;
        break;

      case 270:
        signx = 1;
        signy = 0;
        break;

      default:
        break;
    }
    this.cardStack.faceUpAll();
    let cards = this.cardStack.drawCardAll();
    let num = 0;
    for (let card of cards) {
      card.state = CardState.BACK;
      card.owner = Network.peerContext.userId;
      card.location.x = this.cardStack.location.x + (100 * signx * num);
      card.location.y = this.cardStack.location.y + (100 * signy * num);
      card.toTopmost();
      card.setLocation(this.cardStack.location.name);
      num++;
    }
    this.cardStack.setLocation('graveyard');
    this.cardStack.destroy();
    this.tabletopActionService.refresh();
    //this.cardStack = null;
  }

  private makepro(cards, pos, sign, num, rot, point) {
    let towerpro: string = "";
    for (let card of cards) {
      card.location.x = pos.x + (75 * sign.x * num);
      card.location.y = pos.y + (100 * sign.y * num);
      if (point != 0) card.isLocked = true;
      towerpro += card.komaname;
      card.toTopmost();
      card.setLocation(this.cardStack.location.name);
      card.rotate = rot;
      num++;
    }
    return towerpro;
  }

  private towerpush(name) {
     PeerCursor.myCursor.towers.push(name);
  }

  private propush(towerpro) {
    PeerCursor.myCursor.towerpro.push(towerpro);
  }

  private async breakTower_beside(open: boolean) {
    let signx, signy;
    let coodinate: number = this.cardStack.location.x;
    let Flag: boolean = false;
    if (this.cardStack.name == "塔") Flag = true;
    let degree: number = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    switch (degree) {
      case 0:
        signx = 0;
        signy = 1;
        break;

      case 90:
        signx = -1;
        signy = 0;
        break;

      case 180:
        signx = 0;
        signy = -1;
        break;

      case 270:
        signx = 1;
        signy = 0;
        break;

      default:
        break;
    }
    if (open == true) this.cardStack.faceUpAll();
    else this.cardStack.ownerAll();
    let cards = this.cardStack.drawCardAll();
    let num = 0;
    for (let card of cards) {
      card.rotate = degree;
      card.location.x = this.cardStack.location.x + (100 * signx * num);
      card.location.y = this.cardStack.location.y + (100 * signy * num);
      card.toTopmost();
      card.setLocation(this.cardStack.location.name);
      num++;
    }
    this.cardStack.setLocation('graveyard');
    this.cardStack.destroy();
    if (Flag == true) {
      await new Promise(resolve => setTimeout(resolve, (Time as any).Waiting))
      cards = cards.filter(card => { return card.location.x == coodinate && card.rotate == degree });
      for (let card of cards) {
        this.dust(card);
      }
    }
    this.tabletopActionService.refresh();
  }

  private splitStack(split: number) {
    if (split < 2) return;
    let cardStacks: CardStack[] = [];
    for (let i = 0; i < split; i++) {
      let cardStack = CardStack.create(this.cardStack.name);
      cardStack.location.x = this.cardStack.location.x + 50 - (Math.random() * 100);
      cardStack.location.y = this.cardStack.location.y + 50 - (Math.random() * 100);
      cardStack.posZ = this.cardStack.posZ;
      cardStack.location.name = this.cardStack.location.name;
      cardStack.rotate = this.rotate;
      cardStack.toTopmost();
      cardStacks.push(cardStack);
    }

    let cards = this.cardStack.drawCardAll();
    this.cardStack.setLocation('graveyard');
    this.cardStack.destroy();
    this.cardStack = null;

    let num = 0;
    let splitIndex = (cards.length / split) * (num + 1);
    for (let i = 0; i < cards.length; i++) {
      cardStacks[num].putOnBottom(cards[i]);
      if (splitIndex <= i + 1) {
        num++;
        splitIndex = (cards.length / split) * (num + 1);
      }
    }
  }

  private concatStack(topStack: CardStack, bottomStack: CardStack = this.cardStack) {
    let newCardStack = CardStack.create(topStack.name);
    newCardStack.location.name = bottomStack.location.name;
    newCardStack.location.x = bottomStack.location.x;
    newCardStack.location.y = bottomStack.location.y;
    newCardStack.posZ = bottomStack.posZ;
    newCardStack.zindex = topStack.zindex;
    newCardStack.rotate = bottomStack.rotate;

    let bottomCards: Card[] = bottomStack.drawCardAll();
    let topCards: Card[] = topStack.drawCardAll();
    for (let card of topCards.concat(bottomCards)) newCardStack.putOnBottom(card);

    bottomStack.setLocation('');
    bottomStack.destroy();
    bottomStack = null;

    topStack.setLocation('');
    topStack.destroy();
    bottomStack = null;
  }

  private dispatchCardDropEvent() {
    let element: HTMLElement = this.elementRef.nativeElement;
    let parent = element.parentElement;
    let children = parent.children;
    let event = new CustomEvent('carddrop', { detail: this.cardStack, bubbles: true });
    for (let i = 0; i < children.length; i++) {
      children[i].dispatchEvent(event);
    }
  }

  private showDetail(gameObject: CardStack) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = '山札設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 300, top: coordinate.y - 300, width: 600, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showStackList(gameObject: CardStack) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });

    let coordinate = this.pointerDeviceService.pointers[0];
    let option: PanelOption = { left: coordinate.x - 200, top: coordinate.y - 300, width: 180, height: 375 };

    gameObject.owner = Network.peerContext.userId;
    let component = this.panelService.open<CardStackListComponent>(CardStackListComponent, option);
    component.cardStack = gameObject;
    coordinate = null;
    option = null;
  }

  dust(card: Card) {
    let cardstacks: CardStack[] = this.tabletopService.cardStacks;
    cardstacks = cardstacks.filter(stack => { return stack.name == "峡谷" && stack.komaname == card.komaname && stack.rotate == card.rotate; });
    for (let stack of cardstacks) {
      if (card.location.x != stack.location.x) {
        stack.putOnTop(card);
        SoundEffect.play(PresetSound.cardPut);
      }
    }
  }

  counting(cardStack: CardStack) {
    let count: number = 0;
    let cardstacks: CardStack[] = this.tabletopService.cardStacks;
    cardstacks = cardstacks.filter(stack => { return stack.name == "峡谷" && stack.komaname == cardStack.komaname });
    for (let stack of cardstacks) {
      count += stack.cards.length - 1;
      }
    let cards: Card[] = this.tabletopService.cards;
    cards = cards.filter(card => { return card.komaname == cardStack.komaname && card.isVisible == true });
    return count + cards.length;
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null;
      this.changeDetector.markForCheck();
    }, 300);
    this.changeDetector.markForCheck();
  }

  private PointAssist(pat:Card[]) {
    switch (pat.length) {
      case 1:
        return { name: "", type:"役無しの塔", point: 0 };
        break;

      case 2:
        //不穏チェック
        if (pat[1].weight < pat[0].weight) return { name: "不穏の塔", type:"不穏", point: -1 };
        else return { name: "", type:"役無しの塔", point: 0 };
        break;

      case 3:
        //不穏チェック
        if (pat[2].weight < pat[1].weight || pat[1].weight < pat[0].weight) return { name: "不穏の塔", type:"不穏", point: -1 };
        else if (
          //桜花チェック
          pat[2].weight == pat[1].weight &&
          pat[1].weight == pat[0].weight) {
          if (
            //染めチェック
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "三重染め桜花", type:"桜花", point: 3, Jin:"桜花" };
          else return { name: "三重桜花", type:"桜花", point: 2 };
        }
        else if (
          //蓮花チェック
          pat[2].weight - pat[1].weight == pat[1].weight - pat[0].weight &&
          pat[1].weight - pat[0].weight < 3) {
          if (
            //染めチェック
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) {
            if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 1) return { name: "三重染め奇数蓮花", type:"奇数蓮花", point: 2 };
            else if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 0) return { name: "三重染め偶数蓮花", type:"偶数蓮花", point: 2 };
            else return { name: "三重染め蓮花", type:"蓮花", point: 2 };
          }
            else if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 1) return { name: "三重奇数蓮花", type:"奇数蓮花", point: 1 };
            else if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 0) return { name: "三重偶数蓮花", type:"偶数蓮花", point: 1 };
            else return { name: "三重蓮花", type:"蓮花", point: 1 };
          }
        else return { name: "", type:"役無しの塔", point: 0 };
        break;

      case 4:
        //不穏チェック
        if (pat[3].weight < pat[2].weight || pat[2].weight < pat[1].weight || pat[1].weight < pat[0].weight) return { name: "不穏の塔", type:"不穏", point: -1 };
        else if (
          //桜花チェック
          pat[3].weight == pat[2].weight &&
          pat[2].weight == pat[1].weight &&
          pat[1].weight == pat[0].weight) {
          if (
            //染めチェック
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "四重染め桜花", type:"桜花", point: 4 };
          else return { name: "四重桜花", type:"桜花", point: 3 };
        }
        else if (
          //蓮花チェック
          pat[3].weight - pat[2].weight == pat[2].weight - pat[1].weight &&
          pat[2].weight - pat[1].weight == pat[1].weight - pat[0].weight &&
          pat[1].weight - pat[0].weight < 3) {
          if (
            //染めチェック
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) {
            if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 1) return { name: "四重染め奇数蓮花", type:"奇数蓮花", point: 3 };
            else if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 0) return { name: "四重染め偶数蓮花", type:"偶数蓮花", point: 3 };
            else return { name: "四重染め蓮花", type:"蓮花", point: 3 };
          }
          else if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 1) return { name: "四重奇数蓮花", type:"奇数蓮花", point: 2 };
          else if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 0) return { name: "四重偶数蓮花", type:"偶数蓮花", point: 2 };
          else return { name: "四重蓮花", type:"蓮花", point: 2 };
        }
        else return { name: "", type:"役無しの塔", point: 0 };
        break;

      case 5:
        //不穏チェック
        if (pat[4].weight < pat[3].weight || pat[3].weight < pat[2].weight || pat[2].weight < pat[1].weight || pat[1].weight < pat[0].weight) return { name: "不穏の塔", type:"不穏", point: -1 };
        else if (
          //桜花チェック
          pat[4].weight == pat[3].weight &&
          pat[3].weight == pat[2].weight &&
          pat[2].weight == pat[1].weight &&
          pat[1].weight == pat[0].weight) {
          if (
            //染めチェック
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "五重染め桜花", type:"桜花", point: 5 };
          else return { name: "五重桜花", type:"桜花", point: 4 };
        }
        else if (
          //蓮花チェック
          pat[4].weight - pat[3].weight == pat[3].weight - pat[2].weight &&
          pat[3].weight - pat[2].weight == pat[2].weight - pat[1].weight &&
          pat[2].weight - pat[1].weight == pat[1].weight - pat[0].weight &&
          pat[1].weight - pat[0].weight < 3) {
          if (
            //染めチェック
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) {
            if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 1) return { name: "五重染め奇数蓮花", type:"奇数蓮花", point: 4 };
            else return { name: "五重染め蓮花", type:"蓮花", point: 4 };
          }
          else if (pat[1].weight - pat[0].weight == 2 && pat[0].weight % 2 == 1) return { name: "五重奇数蓮花", type:"奇数蓮花", point: 3 };
          else return { name: "五重蓮花", type:"蓮花", point: 3 };
        }
        else return { name: "", type:"役無しの塔", point: 0 };
      case 6:

        //不穏チェック
        if (pat[5].weight < pat[4].weight || pat[4].weight < pat[3].weight || pat[3].weight < pat[2].weight || pat[2].weight < pat[1].weight || pat[1].weight < pat[0].weight) return { name: "不穏の塔", type:"不穏", point: -1 };
        //時雨蓮花チェック
        else if (
          pat[5].weight == 8 && pat[5].type == "kotodama" &&
          pat[4].weight == 7 && pat[4].type == "kotodama" &&
          pat[3].weight == 6 && pat[3].type == "kotodama" &&
          pat[2].weight == 5 && pat[2].type == "kotodama" &&
          pat[1].weight == 4 && pat[1].type == "kotodama" &&
          pat[0].weight == 3 && pat[0].type == "kotodama" 
        ) return { name: "時雨蓮花", type:"雷神役", point: 10 };
        //霞・双頭蓮チェック
        else if (
          pat[5].weight == 8 && pat[5].type == "kotodama" &&
          pat[4].weight == 7 && pat[4].type == "kotodama" &&
          pat[3].weight == 6 && pat[3].type == "kotodama" &&
          pat[2].weight == 5 && pat[2].type == "kotodama" &&
          pat[1].weight == 5 && pat[1].type == "kotodama" &&
          pat[0].weight == 5 && pat[0].type == "kotodama" 
        ) return { name: "霞・双頭蓮", type: "雷神役", point: 11 };
        //桜花乱舞チェック
        else if (
          pat[5].weight == 5 && pat[5].type == "kotodama" &&
          pat[4].weight == 5 && pat[4].type == "otonashi" &&
          pat[3].weight == 5 && pat[3].type == "kotodama" &&
          pat[2].weight == 5 && pat[2].type == "otonashi" &&
          pat[1].weight == 5 && pat[1].type == "kotodama" &&
          pat[0].weight == 5 && pat[0].type == "otonashi" 
        ) return { name: "桜花乱舞", type: "雷神役", point: 11 };
        else if (
          pat[5].weight == 5 && pat[5].type == "otonashi" &&
          pat[4].weight == 5 && pat[4].type == "kotodama" &&
          pat[3].weight == 5 && pat[3].type == "otonashi" &&
          pat[2].weight == 5 && pat[2].type == "kotodama" &&
          pat[1].weight == 5 && pat[1].type == "otonashi" &&
          pat[0].weight == 5 && pat[0].type == "kotodama" 
        ) return { name: "桜花乱舞", type: "雷神役", point: 11 };
        //無限輪廻チェック
        else if (
          pat[5].weight == 6 && pat[5].type == "kotodama" &&
          pat[4].weight == 6 && pat[4].type == "otonashi" &&
          pat[3].weight == 6 && pat[3].type == "kotodama" &&
          pat[2].weight == 6 && pat[2].type == "otonashi" &&
          pat[1].weight == 6 && pat[1].type == "kotodama" &&
          pat[0].weight == 6 && pat[0].type == "otonashi" 
        ) return { name: "霧幻輪廻", type: "雷神役", point: 12 };
        else if (
          pat[5].weight == 6 && pat[5].type == "otonashi" &&
          pat[4].weight == 6 && pat[4].type == "kotodama" &&
          pat[3].weight == 6 && pat[3].type == "otonashi" &&
          pat[2].weight == 6 && pat[2].type == "kotodama" &&
          pat[1].weight == 6 && pat[1].type == "otonashi" &&
          pat[0].weight == 6 && pat[0].type == "kotodama" 
        ) return { name: "霧幻輪廻", type: "雷神役", point: 12 };
        //毘沙門櫓チェック
        else if (
          pat[5].weight == 3 && pat[5].type == "kotodama" &&
          pat[4].weight == 3 && pat[4].type == "kotodama" &&
          pat[3].weight == 3 && pat[3].type == "kotodama" &&
          pat[2].weight == 3 && pat[2].type == "kotodama" &&
          pat[1].weight == 3 && pat[1].type == "kotodama" &&
          pat[0].weight == 3 && pat[0].type == "kotodama" 
        ) return { name: "毘沙門櫓", type: "雷神役", point: 12 };
        //六花雪月チェック
        else if (
          pat[5].weight == 7 && pat[5].type == "kotodama" &&
          pat[4].weight == 7 && pat[4].type == "kotodama" &&
          pat[3].weight == 6 && pat[3].type == "kotodama" &&
          pat[2].weight == 6 && pat[2].type == "kotodama" &&
          pat[1].weight == 6 && pat[1].type == "otonashi" &&
          pat[0].weight == 6 && pat[0].type == "otonashi"
        ) return { name: "六花白雪", type: "雷神役", point: 12 };
        else if (
          //桜花チェック
          pat[5].weight == pat[4].weight &&
          pat[4].weight == pat[3].weight &&
          pat[3].weight == pat[2].weight &&
          pat[2].weight == pat[1].weight &&
          pat[1].weight == pat[0].weight) {
          if (
            //染めチェック
            pat[5].type == pat[4].type &&
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "六重染め桜花", type:"組み合わせ役", point: 6 };
          else return { name: "六重桜花", type: "組み合わせ役", point: 5 };
        }
        else if (
          //蓮花チェック
          pat[5].weight - pat[4].weight == pat[4].weight - pat[3].weight &&
          pat[4].weight - pat[3].weight == pat[3].weight - pat[2].weight &&
          pat[3].weight - pat[2].weight == pat[2].weight - pat[1].weight &&
          pat[2].weight - pat[1].weight == pat[1].weight - pat[0].weight &&
          pat[1].weight - pat[0].weight < 3) {
          if (
            //染めチェック
            pat[5].type == pat[4].type &&
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "六重染め蓮花", type: "組み合わせ役", point: 5 };
          else return { name: "六重蓮花", type: "組み合わせ役", point: 4 };
        }
        else if (
          //桜々花チェック
          pat[5].weight == pat[4].weight && pat[4].weight == pat[3].weight &&
          pat[2].weight == pat[1].weight && pat[1].weight == pat[0].weight) {
          if (
            //染めチェック
            pat[5].type == pat[4].type &&
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "六重染め桜々花", type: "組み合わせ役", point: 8 };
          else return { name: "六重桜々花", type: "組み合わせ役", point: 7 };
        }
        else if (
          //蓮桜花チェック
          pat[5].weight == pat[4].weight && pat[4].weight == pat[3].weight &&
          pat[2].weight - pat[1].weight == pat[1].weight - pat[0].weight &&
          pat[1].weight - pat[0].weight < 3) {
          if (
            //染めチェック
            pat[5].type == pat[4].type &&
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "六重染め蓮桜花", type: "組み合わせ役", point: 7 };
          else return { name: "六重蓮桜花", type: "組み合わせ役", point: 6 };
        }
        else if (
          //桜蓮花チェック
          pat[5].weight - pat[4].weight == pat[4].weight - pat[3].weight &&
          pat[2].weight == pat[1].weight && pat[1].weight == pat[0].weight &&
          pat[5].weight - pat[4].weight < 3) {
          if (
            //染めチェック
            pat[5].type == pat[4].type &&
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "六重染め桜蓮花", type: "組み合わせ役", point: 7 };
          else return { name: "六重桜蓮花", type: "組み合わせ役", point: 6 };
        }
        else if (
          //蓮々花チェック
          pat[5].weight - pat[4].weight == pat[4].weight - pat[3].weight &&
          pat[5].weight - pat[4].weight < 3 &&
          pat[2].weight - pat[1].weight == pat[1].weight - pat[0].weight &&
          pat[1].weight - pat[0].weight < 3) {
          if (
            //染めチェック
            pat[5].type == pat[4].type &&
            pat[4].type == pat[3].type &&
            pat[3].type == pat[2].type &&
            pat[2].type == pat[1].type &&
            pat[1].type == pat[0].type) return { name: "六重染め蓮々花", type: "組み合わせ役", point: 6 };
          else return { name: "六重蓮々花", type: "組み合わせ役", point: 5 };
        }
        else if (
          //山茶花チェック
          pat[5].weight == pat[4].weight &&
          pat[3].weight == pat[2].weight &&
          pat[1].weight == pat[0].weight) {
          if (
            //椿チェック
            pat[5].komaname == pat[4].komaname &&
            pat[3].komaname == pat[2].komaname &&
            pat[1].komaname == pat[0].komaname) return { name: "椿", type: "特殊役", point: 6 };
          else return { name: "山茶花", type: "特殊役", point: 4 };
        }
        else return { name: "", type:"役無しの塔", point: 0 };
        break;
    }
  }
}

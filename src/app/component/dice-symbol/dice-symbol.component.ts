import { animate, keyframes, style, transition, trigger } from '@angular/animations';
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
import { Terrain } from '@udonarium/terrain';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ObjectNode } from '@udonarium/core/synchronize-object/object-node';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { DiceSymbol, DiceType } from '@udonarium/dice-symbol';
import { PeerCursor } from '@udonarium/peer-cursor';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { ImageService } from 'service/image.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService, PointerCoordinate } from 'service/pointer-device.service';
import { TabletopService } from 'service/tabletop.service';
import { TabletopActionService } from 'service/tabletop-action.service';
import { ImageStorage } from '../../class/core/file-storage/image-storage';
import { Card } from '../../class/card';
import statusData from 'json/status.json';
const Status = (statusData as any)?.Status || statusData as any;

@Component({
  selector: 'dice-symbol',
  templateUrl: './dice-symbol.component.html',
  styleUrls: ['./dice-symbol.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('diceRoll', [
      transition('* => active', [
        animate('800ms ease', keyframes([
          style({ transform: 'scale3d(0.8, 0.8, 0.8) rotateZ(0deg)', offset: 0 }),
          style({ transform: 'scale3d(1.2, 1.2, 1.2) rotateZ(360deg)', offset: 0.5 }),
          style({ transform: 'scale3d(0.75, 0.75, 0.75) rotateZ(520deg)', offset: 0.75 }),
          style({ transform: 'scale3d(1.125, 1.125, 1.125) rotateZ(630deg)', offset: 0.875 }),
          style({ transform: 'scale3d(1.0, 1.0, 1.0) rotateZ(720deg)', offset: 1.0 })
        ]))
      ])
    ]),
    trigger('bounceInOut', [
      transition('void => *', [
        animate('600ms ease', keyframes([
          style({ transform: 'scale3d(0, 0, 0)', offset: 0 }),
          style({ transform: 'scale3d(1.5, 1.5, 1.5)', offset: 0.5 }),
          style({ transform: 'scale3d(0.75, 0.75, 0.75)', offset: 0.75 }),
          style({ transform: 'scale3d(1.125, 1.125, 1.125)', offset: 0.875 }),
          style({ transform: 'scale3d(1.0, 1.0, 1.0)', offset: 1.0 })
        ]))
      ]),
      transition('* => void', [
        animate(100, style({ transform: 'scale3d(0, 0, 0)' }))
      ])
    ])
  ]
})
export class DiceSymbolComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() diceSymbol: DiceSymbol = null;
  @Input() is3D: boolean = false;

  get face(): string { return this.diceSymbol.face; }
  set face(face: string) { this.diceSymbol.face = face; }
  get owner(): string { return this.diceSymbol.owner; }
  set owner(owner: string) { this.diceSymbol.owner = owner; }
  get rotate(): number { return this.diceSymbol.rotate; }
  set rotate(rotate: number) { this.diceSymbol.rotate = rotate; }
  get isLocked(): boolean { return this.diceSymbol.isLocked; }
  set isLocked(isLocked: boolean) { this.diceSymbol.isLocked = isLocked; }

  get name(): string { return this.diceSymbol.name; }
  set name(name: string) { this.diceSymbol.name = name; }
  get size(): number { return this.adjustMinBounds(this.diceSymbol.size); }

  get faces(): string[] { return this.diceSymbol.faces; }
  get imageFile(): ImageFile {
    return this.imageService.getEmptyOr(this.diceSymbol.imageFile);
  }

  get isMine(): boolean { return this.diceSymbol.isMine; }
  get hasOwner(): boolean { return this.diceSymbol.hasOwner; }
  get ownerName(): string { return this.diceSymbol.ownerName; }
  get isVisible(): boolean { return this.diceSymbol.isVisible; }

  animeState: string = 'inactive';

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
    private panelService: PanelService,
    private contextMenuService: ContextMenuService,
    private elementRef: ElementRef<HTMLElement>,
    private changeDetector: ChangeDetectorRef,
    private imageService: ImageService,
    private pointerDeviceService: PointerDeviceService,
    private tabletopService: TabletopService,
    private tabletopActionService: TabletopActionService
  ) { }

  ngOnInit() {
    EventSystem.register(this)
      .on('ROLL_DICE_SYNBOL', -1000, event => {
        if (event.data.identifier === this.diceSymbol.identifier) {
          this.ngZone.run(() => {
            this.animeState = 'inactive';
            this.changeDetector.markForCheck();
            setTimeout(() => { this.animeState = 'active'; this.changeDetector.markForCheck(); });
          });
        }
      })
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.diceSymbol || !object) return;
        if ((this.diceSymbol === object)
          || (object instanceof ObjectNode && this.diceSymbol.contains(object))
          || (object instanceof PeerCursor && object.userId === this.diceSymbol.owner)) {
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
        if (!cursor || this.diceSymbol.owner === cursor.userId) this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.diceSymbol,
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain']
    };
    this.rotableOption = {
      tabletopObject: this.diceSymbol
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

  @HostListener('dragstart', ['$event'])
  onDragstart(e: any) {
    e.stopPropagation();
    e.preventDefault();
  }

  animationShuffleDone(event: any) {
    this.animeState = 'inactive';
    this.changeDetector.markForCheck();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.startIconHiddenTimer();
    if (this.isLocked) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
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
    if (this.name == "陽玉") {
      if (this.face == "2") {
        //this.diceSymbol.ownersID = PeerCursor.myCursor.userId;
        this.diceRoll();
      }
      else {
        //this.diceSymbol.ownersID = PeerCursor.myCursor.userId;
        this.face = this.calcpoint();
        this.tabletopActionService.createDiceSymbolMarker(this.rotate);
        SoundEffect.play(PresetSound.dicePut);
      }
    }
    else if (this.name == "陽玉（得点）") {
      let position: PointerCoordinate = { x: this.diceSymbol.location.x + 25, y: this.diceSymbol.location.y + 25, z: 0 };
      SoundEffect.play(PresetSound.raigo);
      let raigo: DiceSymbol = this.tabletopActionService.createDiceSymbol(position, "陽玉（雷轟）", DiceType.D30, '30_raigo', (Number(this.face) + 2).toString())
      let dices: DiceSymbol[] = this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == this.rotate && DiceSymbol.name == "陽玉" });
      for (let counter of dices) {
        counter.face = (Number(counter.face) + 2).toString();
      }
      let Towernames: Terrain[] = this.tabletopService.terrains.filter(Terrain => { return Terrain.towercode == this.diceSymbol.towercode; });
      for (let Towername of Towernames) {
        let position: PointerCoordinate = { x: Towername.location.x, y: Towername.location.y, z: 0 };
        let raigoname = this.tabletopActionService.createsentences(position, Towername.towername, Towername.towers, true);
        raigoname.towercode = Towername.towercode;
        //switch (raigoname.rotate) {
        //  case 0:
        //    default:
        //    break;
        //  case 90:
        //    raigoname.location.x -= 100;
        //    raigoname.location.y -= 100;
        //    break;
        //  case 180:
        //    raigoname.location.y -= 200;
        //    break;
        //  case 270:
        //    raigoname.location.x += 100;
        //    raigoname.location.y -= 100;
        //    break;
        //}
        raigoname.setLocation(raigoname.location.name);
        Towername.destroy();
      }
      //PeerCursor.myCursor.points += 2;
      this.tabletopActionService.createDiceSymbolMarker(this.rotate);
      //PeerCursor.myCursor.towers[PeerCursor.myCursor.towers.length - 1] += "（雷轟解放）";
      raigo.towercode = this.diceSymbol.towercode;
      raigo.rotate = this.rotate;
      raigo.isLocked = true;
      this.diceSymbol.destroy();
    }
    else if (this.name == "陽玉（雷轟）") {
      let position: PointerCoordinate = { x: this.diceSymbol.location.x + 25, y: this.diceSymbol.location.y + 25, z: 0 };
      SoundEffect.play(PresetSound.dicePut);
      let def: DiceSymbol = this.tabletopActionService.createDiceSymbol(position, "陽玉（得点）", DiceType.D30, '30_dice', (Number(this.face) - 2).toString())
      let dices: DiceSymbol[] = this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == this.rotate && DiceSymbol.name == "陽玉" });
      for (let counter of dices) {
        counter.face = (Number(counter.face) - 2).toString();
      }
      let Raigonames: Terrain[] = this.tabletopService.terrains.filter(Terrain => { return Terrain.towercode == this.diceSymbol.towercode; });
      for (let Raigoname of Raigonames) {
        let position: PointerCoordinate = { x: Raigoname.location.x, y: Raigoname.location.y, z: 0 };
        let towername = this.tabletopActionService.createsentences(position, Raigoname.towername, Raigoname.towers);
        towername.towercode = Raigoname.towercode;
        //switch (towername.rotate) {
        //  case 0:
        //  default:
        //    break;
        //  case 90:
        //    towername.location.x += 100;
        //    towername.location.y += 100;
        //    break;
        //  case 180:
        //    towername.location.y += 200;
        //    break;
        //  case 270:
        //    towername.location.x -= 100;
        //    towername.location.y += 100;
        //    break;
        //}
        towername.setLocation(towername.location.name);
        Raigoname.destroy();
      }
      //PeerCursor.myCursor.points -= 2;
      this.tabletopActionService.createDiceSymbolMarker(this.rotate);
      //PeerCursor.myCursor.towers[PeerCursor.myCursor.towers.length - 1] = PeerCursor.myCursor.towers[PeerCursor.myCursor.towers.length - 1].slice(0, -6);
      def.towercode = this.diceSymbol.towercode;
      def.rotate = this.rotate;
      def.isLocked = true;
      this.diceSymbol.destroy();
    } 
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    let position = this.pointerDeviceService.pointers[0];

    let actions: ContextMenuAction[] = [];
    this.contextMenuService.open(position, actions, this.name);
    if (this.name != "陽玉") {
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
      actions.push(ContextMenuSeparator);
      actions.push({
        name: '陽玉を削除する', action: () => {
          let dices: DiceSymbol[] = this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == this.rotate && DiceSymbol.name == "陽玉" });
          for (let counter of dices) {
            if (this.diceSymbol.name != "枯れた陽玉") {
              counter.face = (Number(counter.face) - Number(this.diceSymbol.face)).toString();
              //PeerCursor.myCursor.points -= Number(this.diceSymbol.face);
            }
            else {
              counter.face = (Number(counter.face) + Number(this.diceSymbol.face)).toString();
              //PeerCursor.myCursor.points += 1;
            }
          }
          this.tabletopActionService.createDiceSymbolMarker(this.rotate);
          this.diceSymbol.destroy();
          this.diceSymbol = null;
          SoundEffect.play(PresetSound.sweep);
        }
      });
    }

    else {
      //actions.push(ContextMenuSeparator);
      ////if (this.isMine || this.hasOwner) {
      ////  actions.push({
      ////    name: 'ダイスを公開', action: () => {
      ////      this.owner = '';
      ////      SoundEffect.play(PresetSound.unlock);
      ////    }
      ////  });
      ////}
      ////if (!this.isMine) {
      ////  actions.push({
      ////    name: '自分だけ見る', action: () => {
      ////      this.owner = Network.peerContext.userId;
      ////      SoundEffect.play(PresetSound.lock);
      ////    }
      ////  });
      ////}

      //if (this.isVisible) {
      //  let subActions: ContextMenuAction[] = [];
        //let subActions: ContextMenuAction[] = [];
      let subActions_Rotate: ContextMenuAction[] = [];
      let subActions_Other: ContextMenuAction[] = [];
      let pat_Renge: ContextMenuAction[] = [];
      let pat_Ouka: ContextMenuAction[] = [];
      let pat_Combo: ContextMenuAction[] = [];
      let pat_Extra: ContextMenuAction[] = [];
      let pat_Raijin: ContextMenuAction[] = [];
      let pat_Plus: ContextMenuAction[] = [];
      let pat_Raigo: ContextMenuAction[] = [];
      let pat_Raigo_Renge: ContextMenuAction[] = [];
      let pat_Raigo_Ouka: ContextMenuAction[] = [];
      let pat_Other: ContextMenuAction[] = [];

      let point = Number(this.face);

      let Ouka: { Name: string, point: number }[] = [
        { Name: '三重桜花（2点）', point: 2 },
        { Name: '三重染め桜花（3点）', point: 3 },
        { Name: '四重桜花（3点）', point: 3 },
        { Name: '四重染め桜花（4点）', point: 4 },
        { Name: '五重桜花（4点）', point: 4 },
        { Name: '五重染め桜花（5点）', point: 5 },
        { Name: '六重桜花（5点）', point: 5 },
        { Name: '六重染め桜花（6点）', point: 6 },
      ];

      let Renge: { Name: string, point: number }[] = [

        { Name: '三重蓮花（1点）', point: 1 },
        { Name: '三重染め蓮花（2点）', point: 2 },
        { Name: '四重蓮花（2点）', point: 2 },
        { Name: '四重染め蓮花（3点）', point: 3 },
        { Name: '五重蓮花（3点）', point: 3 },
        { Name: '五重染め蓮花（4点）', point: 4 },
        { Name: '六重蓮花（4点）', point: 4 },
        { Name: '六重染め蓮花（5点）', point: 5 },
      ];

      let Combo: { Name: string, point: number }[] = [
        { Name: '六重蓮々花（5点）', point: 5 },
        { Name: '六重染め蓮々花（6点）', point: 6 },
        { Name: '六重蓮桜花/桜蓮花（6点）', point: 6 },
        { Name: '六重染め蓮桜花/桜蓮花（7点）', point: 7 },
        { Name: '六重桜々花（7点）', point: 7 },
        { Name: '六重染め桜々花（8点）', point: 8 },
      ];

      let Extra: { Name: string, point: number }[] = [
        { Name: '山茶花（4点）', point: 4 },
        { Name: '椿（6点）', point: 6 },
      ];

      let Raijin: { Name: string, point: number }[] = [
        { Name: '時雨蓮花（10点）', point: 10 },
        { Name: '霞・双頭蓮（11点）', point: 11 },
        { Name: '桜花乱舞（11点）', point: 11 },
        { Name: '無限輪廻（12点）', point: 12 },
        { Name: '毘沙門櫓（12点）', point: 12 },
      ];

      let Raigo_Ouka: { Name: string, point: number }[] = [
        { Name: '三重桜花（2点+2点）', point: 4 },
        { Name: '三重染め桜花（3点+2点）', point: 5 },
        { Name: '四重桜花（3点+2点）', point: 5 },
        { Name: '四重染め桜花（4点+2点）', point: 6 },
        { Name: '五重桜花（4点+2点）', point: 6 },
        { Name: '五重染め桜花（5点+2点）', point: 7 },
      ];

      let Raigo_Renge: { Name: string, point: number }[] = [

        { Name: '三重蓮花（1点+2点）', point: 3 },
        { Name: '三重染め蓮花（2点+2点）', point: 4 },
        { Name: '四重蓮花（2点+2点）', point: 4 },
        { Name: '四重染め蓮花（3点+2点）', point: 5 },
        { Name: '五重蓮花（3点+2点）', point: 5 },
        { Name: '五重染め蓮花（4点+2点）', point: 6 },
      ];

      let Other: { Name: string, point: number }[] = [
        { Name: '豪雷（1点）', point: 1 },
        { Name: '豪雷（2点）', point: 2 },
        { Name: '豪雷（3点）', point: 3 },
        { Name: '豪雷（4点）', point: 4 },
        { Name: '豪雷（5点）', point: 5 },
        { Name: '不穏・満月（-1点）', point: -1 },
      ];
       //actions.push({ name: `加点・減点する`, action: null, subActions: pat_Plus });
      actions.push({
        name: '1点減点する', action: () => {
          point -= 1;
          SoundEffect.play(PresetSound.dicePut);
          let huon: DiceSymbol = this.CreateRaigoorb(position, "枯れた陽玉", "huon");
          huon.rotate = this.rotate;
          this.diceSymbol.face = point.toString();
          PeerCursor.myCursor.points -= 1;
          this.tabletopActionService.createDiceSymbolMarker(this.rotate);
        },
      });
       actions.push(ContextMenuSeparator);

      if (Number(this.face) != 2) actions.push({
        name: '2点に戻す', action: () => {
        this.face = "2"; this.diceSymbol.ownersID = Network.peerContext.userId;
        SoundEffect.play(PresetSound.dicePut); }, });
      else actions.push({
        name: 'ダイスを振る', action: () => {
        this.diceRoll(); this.diceSymbol.ownersID = Network.peerContext.userId;
        SoundEffect.play(PresetSound.diceRoll1); }, });
      actions.push(ContextMenuSeparator);
      //actions.push({ name: `回転する`, action: null, subActions: subActions_Rotate });
      if (Status.OrganizerMode == true) actions.push({ name: '詳細を表示', action: () => { this.showDetail(this.diceSymbol); } });
      if (Status.ConventionMode != true) actions.push({ name: `その他の操作`, action: null, subActions: subActions_Other });
      actions.push({ name: '削除する', action: () => { this.diceSymbol.destroy(); this.diceSymbol = null; SoundEffect.play(PresetSound.sweep); } });

      Ouka.forEach(item => {
        {
          pat_Ouka.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
            }
          });
        }
      });

      Renge.forEach(item => {
        {
          pat_Renge.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
            }
          });
        }
      });

      Combo.forEach(item => {
        {
          pat_Combo.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
            }
          });
        }
      });

      Extra.forEach(item => {
        {
          pat_Extra.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
            }
          });
        }
      });

      Raijin.forEach(item => {
        {
          pat_Raijin.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              this.CreateRaigoorb(position, "陽玉（雷神役）", "raijin");
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
            }
          });
        }
      });

      for (let q = 1; q <= 12; q++) {
        if (q != 9) {
          pat_Plus.push({
            name: q + '点加点する', action: () => {
              point += q;
              SoundEffect.play(PresetSound.dicePut);
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
              PeerCursor.myCursor.points += q;
              this.tabletopActionService.createDiceSymbolMarker(this.rotate);
            },
          });
        }
      }
      pat_Plus.push(ContextMenuSeparator);
      pat_Plus.push({
        name: '1点減点する', action: () => {
          point -= 1;
          SoundEffect.play(PresetSound.dicePut);
          this.CreateRaigoorb(position, "枯れた陽玉", "huon");
          this.diceSymbol.face = point.toString();
          PeerCursor.myCursor.points -= 1;
          this.tabletopActionService.createDiceSymbolMarker(this.rotate);
        },
      });

      for (let q = 3; q <= 7; q++) {
        pat_Raigo.push({
          name: q + '点加点する', action: () => {
            point += q;
            SoundEffect.play(PresetSound.dicePut);
            this.CreateRaigoorb(position, "陽玉（雷轟解放）", "raigo");
            if (point > 30) this.pointoverflow(point, position);
            else this.diceSymbol.face = point.toString();;
          },
        });
      }

      Raigo_Ouka.forEach(item => {
        {
          pat_Raigo_Ouka.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              this.CreateRaigoorb(position, "陽玉（雷轟解放）", "raigo");
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
            }
          });
        }
      });

      Raigo_Renge.forEach(item => {
        {
          pat_Raigo_Renge.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              this.CreateRaigoorb(position, "陽玉（雷轟解放）", "raigo");
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();
            }
          });
        }
      });

      Other.forEach(item => {
        {
          pat_Other.push({
            name: `${item.Name}`, action: () => {
              point += item.point;
              SoundEffect.play(PresetSound.dicePut);
              if (point > 30) this.pointoverflow(point, position);
              else this.diceSymbol.face = point.toString();            }
          });
        }
      });

      subActions_Rotate.push({
        name: '90°回転', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.onturn90();
        }
      });

      subActions_Rotate.push({
        name: '180°回転', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.onturn180();
        }
      });

      subActions_Rotate.push({
        name: '-90°回転', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.onturn270();
        }
      });

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
        name: 'コピーを作る', action: () => {
          let cloneObject = this.diceSymbol.clone();
          cloneObject.location.x += this.gridSize;
          cloneObject.location.y += this.gridSize;
          cloneObject.update();
          SoundEffect.play(PresetSound.dicePut);
        }
      });
    }
  }

  onMove() {
    SoundEffect.play(PresetSound.dicePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.dicePut);
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

  diceRoll(): string {
    EventSystem.call('ROLL_DICE_SYNBOL', { identifier: this.diceSymbol.identifier });
    SoundEffect.play(PresetSound.diceRoll1);
    return this.diceSymbol.diceRoll();
  }

  showDetail(gameObject: DiceSymbol) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = 'ダイスシンボル設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 300, top: coordinate.y - 300, width: 600, height: 600 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  calcpoint() {
    let point: number = 2;
    let dices: DiceSymbol[] = this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == this.rotate && DiceSymbol.name != "陽玉" });
    for (let counter of dices) {
      if (counter.name != "枯れた陽玉") {
        point += Number(counter.face);
      } else {
        point--;
      }
    }
    return point.toString();
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null;
      this.changeDetector.markForCheck();
    }, 300);
    this.changeDetector.markForCheck();
  }

  private pointoverflow(point,position) {
    this.diceSymbol.face = "30";
    position.x = this.diceSymbol.location.x + 75;
    position.y = this.diceSymbol.location.y + 25;
    point -= 30;
    this.tabletopActionService.createDiceSymbol(position, "陽玉", DiceType.D30, '30_dice', point)
  }

  private CreateRaigoorb(position,dicename,diceid) {
    position.x = this.diceSymbol.location.x + 75;
    position.y = this.diceSymbol.location.y + 25;
    return this.tabletopActionService.createDiceSymbol(position, dicename, DiceType.Raigo, diceid, 1)
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }
}

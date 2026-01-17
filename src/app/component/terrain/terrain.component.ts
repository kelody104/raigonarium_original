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
import { Card } from '@udonarium/card';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ObjectNode } from '@udonarium/core/synchronize-object/object-node';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem } from '@udonarium/core/system';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { Terrain, TerrainViewState } from '@udonarium/terrain';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuSeparator, ContextMenuService, ContextMenuAction } from 'service/context-menu.service';
import { CoordinateService } from 'service/coordinate.service';
import { ImageService } from 'service/image.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService, PointerCoordinate } from 'service/pointer-device.service';
import { TabletopActionService } from 'service/tabletop-action.service';
import { TabletopService } from 'service/tabletop.service';
import { PeerCursor } from '@udonarium/peer-cursor';
import { DiceSymbol } from '../../class/dice-symbol';
import statusData from 'json/status.json';
const Status = (statusData as any)?.Status || statusData as any;
import kisekigomaData from 'json/kisekigoma.json';

@Component({
  selector: 'terrain',
  templateUrl: './terrain.component.html',
  styleUrls: ['./terrain.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TerrainComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() terrain: Terrain = null;
  @Input() is3D: boolean = false;

  get name(): string { return this.terrain.name; }
  get mode(): TerrainViewState { return this.terrain.mode; }
  set mode(mode: TerrainViewState) { this.terrain.mode = mode; }

  get isLocked(): boolean { return this.terrain.isLocked; }
  set isLocked(isLocked: boolean) { this.terrain.isLocked = isLocked; }
  get hasWall(): boolean { return this.terrain.hasWall; }
  get hasFloor(): boolean { return this.terrain.hasFloor; }

  get wallImage(): ImageFile { return this.imageService.getSkeletonOr(this.terrain.wallImage); }
  get floorImage(): ImageFile { return this.imageService.getSkeletonOr(this.terrain.floorImage); }

  get height(): number { return this.adjustMinBounds(this.terrain.height); }
  get width(): number { return this.adjustMinBounds(this.terrain.width); }
  get depth(): number { return this.adjustMinBounds(this.terrain.depth); }
  get rotate(): number { return this.terrain.rotate; }
  set rotate(rotate: number) { this.terrain.rotate = rotate; }

  get isVisibleFloor(): boolean { return 0 < this.width * this.depth; }
  get isVisibleWallTopBottom(): boolean { return 0 < this.width * this.height; }
  get isVisibleWallLeftRight(): boolean { return 0 < this.depth * this.height; }

  gridSize: number = 50;

  private iconHiddenTimer: NodeJS.Timer = null;
  get isIconHidden(): boolean { return this.iconHiddenTimer != null };

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private doubleClickTimer: NodeJS.Timer = null;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler = null;

  constructor(
    private ngZone: NgZone,
    private imageService: ImageService,
    private tabletopActionService: TabletopActionService,
    private tabletopService: TabletopService,
    private contextMenuService: ContextMenuService,
    private elementRef: ElementRef<HTMLElement>,
    private panelService: PanelService,
    private changeDetector: ChangeDetectorRef,
    private pointerDeviceService: PointerDeviceService,
    private coordinateService: CoordinateService
  ) { }

  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        let object = ObjectStore.instance.get(event.data.identifier);
        if (!this.terrain || !object) return;
        if (this.terrain === object || (object instanceof ObjectNode && this.terrain.contains(object))) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, event => {
        this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.terrain,
      colideLayers: ['terrain']
    };
    this.rotableOption = {
      tabletopObject: this.terrain
    };
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = this.onInputStart.bind(this);
  }

  ngOnDestroy() {
    this.input.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('terraindrop', ['$event'])

  startDoubleClickTimer(e) {
    if (!this.doubleClickTimer) {
      this.stopDoubleClickTimer();
      this.doubleClickTimer = setTimeout(() => this.stopDoubleClickTimer(), e.touches ? 500 : 300);
      this.doubleClickPoint = this.input.pointer;
      return;
    }

    console.log(this.terrain.location.x + "," + this.terrain.location.y)

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
    if (this.name == "隠駒") {
      this.changetimer();
      this.ongoma_on();
    }
    if (this.name == "役名") {
      this.raigo(this.terrain);
    }
  }

  ongoma_on() {
    let distance = (this.doubleClickPoint.x - this.input.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input.pointer.y) ** 2;
    if (distance < 10 ** 2) {
      console.log('onDoubleClick !!!!');
      let nameplates: Card[] = this.tabletopService.cards.filter(Card => { return Card.name == "名札" });
      let rot = 90;
      if ((nameplates.length == 3 && this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ) == 0) || nameplates.length < 3) rot = 180;
      this.rotate += rot;
      SoundEffect.play(PresetSound.on);
    }
  }

  @HostListener('dragstart', ['$event'])

  onDragstart(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    //this.input.cancel();
    this.startDoubleClickTimer(e);
//    this.terrain.toTopmost();
    this.startIconHiddenTimer();

    // TODO:もっと良い方法考える
    if (this.isLocked) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
    }
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null;
      this.changeDetector.markForCheck();
    }, 300);
    this.changeDetector.markForCheck();
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (this.name != "隠駒" || Status.OrganizerMode == true) {
      if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
      let position = this.pointerDeviceService.pointers[0];
      let actions: ContextMenuAction[] = [];
      if (Status.ConventionMode != true) {
        this.contextMenuService.open(position, actions, this.name);
      }
      let subActions_Rotate: ContextMenuAction[] = [];
      let subActions_Other: ContextMenuAction[] = [];

      if (this.name == "役名") {
        if (this.terrain.RaigoFlag == false) {
          actions.push({ name: `雷轟解放する`, action: () => { this.raigo(this.terrain); } });
        } else {
          actions.push({ name: `雷轟解放しない`, action: () => { this.raigo(this.terrain); } });
        }
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

      actions.push(ContextMenuSeparator);
      actions.push({ name: `回転する`, action: null, subActions: subActions_Rotate });
      actions.push(ContextMenuSeparator);
      actions.push({ name: `その他の操作`, action: null, subActions: subActions_Other });
      actions.push({ name: '削除する', action: () => { if (this.terrain.name == "禁忌") { PeerCursor.myCursor.points += 1; this.tabletopActionService.createDiceSymbolMarker(this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ)); } this.terrain.destroy(); this.terrain = null; SoundEffect.play(PresetSound.sweep); } });

      subActions_Rotate.push({
        name: '左に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ) + 90;
        }
      });

      subActions_Rotate.push({
        name: '前に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ) + 180;
        }
      });

      subActions_Rotate.push({
        name: '右に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ) - 90;
        }
      });

      subActions_Rotate.push({
        name: '手前に向ける', action: () => {
          SoundEffect.play(PresetSound.cardPut);
          this.rotate = this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ);
        }
      });

      subActions_Other.push((this.hasWall
        ? {
          name: '壁を非表示', action: () => {
            this.mode = TerrainViewState.FLOOR;
            if (this.depth * this.width === 0) {
              this.terrain.width = this.width <= 0 ? 1 : this.width;
              this.terrain.depth = this.depth <= 0 ? 1 : this.depth;
            }
          }
        } : {
          name: '壁を表示', action: () => {
            this.mode = TerrainViewState.ALL;
          }
        }));

      subActions_Other.push({
        name: '地形設定を編集', action: () => { this.showDetail(this.terrain); }
      });

      subActions_Other.push({
        name: 'コピーを作る', action: () => {
          let cloneObject = this.terrain.clone();
          cloneObject.location.x += this.gridSize;
          cloneObject.location.y += this.gridSize;
          cloneObject.isLocked = false;
          if (this.terrain.parent) this.terrain.parent.appendChild(cloneObject);
          SoundEffect.play(PresetSound.blockPut);
        }
      });
    }
    else {
      if (this.terrain.posZ == 0) {
        this.terrain.posZ = 0.1;
        this.roulette(this.terrain);
      }
    }
  }

 async roulette(terrain: Terrain) {
   let count: number = Math.floor(Math.random() * 2) + 4;
   for (let i = 1; i <= count; i++) {
     this.ongoma_on();
     await new Promise(resolve => setTimeout(resolve, 250))
    }
  }

  async start() {
    for (; ;) {
      if (this.terrain.timer_A_flag == true) {
        if (this.terrain.timer_A_sec == 0) {
          this.terrain.timer_A_min--;
          this.terrain.timer_A_sec = 59;
        }
        else this.terrain.timer_A_sec--;
      }
      if (this.terrain.timer_B_flag == true) {
        if (this.terrain.timer_B_sec == 0) {
          this.terrain.timer_B_min--;
          this.terrain.timer_B_sec = 59;
        }
        else this.terrain.timer_B_sec--;
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (this.terrain.timer == false) break;
      if (this.terrain.timer_A_min == 0 && this.terrain.timer_A_sec == 0) break;
      if (this.terrain.timer_B_min == 0 && this.terrain.timer_B_sec == 0) break;
    }
  }

  raigo(Name: Terrain) {
    let nameposition: PointerCoordinate = { x: Name.location.x, y: Name.location.y, z: 0 };
    let newName: Terrain;
    if (Name.RaigoFlag == false) {
      newName = this.tabletopActionService.createsentences(nameposition, Name.towername, null, true);
      SoundEffect.play(PresetSound.raigo);
      PeerCursor.myCursor.points += 2;
    } else {
      newName = this.tabletopActionService.createsentences(nameposition, Name.towername, null, false);
      SoundEffect.play(PresetSound.dicePut);
      PeerCursor.myCursor.points -= 2;

    }
    newName.parts = Name.parts;
    Name.destroy();
    this.tabletopActionService.createDiceSymbolMarker(this.tabletopActionService.CalcObjectRotate(PeerCursor.myCursor.RotZ));
  }

  changetimer() {
    if (this.terrain.timer_A_flag == true) {
      this.terrain.timer_A_flag = false;
      this.terrain.timer_B_flag = true;
    }
    else {
      this.terrain.timer_A_flag = true;
      this.terrain.timer_B_flag = false;
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
    SoundEffect.play(PresetSound.blockPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.blockPut);
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: Terrain) {
    EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: gameObject.identifier, className: gameObject.aliasName });
    let coordinate = this.pointerDeviceService.pointers[0];
    let title = '地形設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    let option: PanelOption = { title: title, left: coordinate.x - 250, top: coordinate.y - 150, width: 500, height: 300 };
    let component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }
}

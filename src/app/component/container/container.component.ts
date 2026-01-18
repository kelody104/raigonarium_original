import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, Input, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ObjectNode } from '@udonarium/core/synchronize-object/object-node';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem } from '@udonarium/core/system';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { Container } from '@udonarium/container';
// START: HTML5 Drag & Drop Support (Added for Container feature) - Can be removed to revert drag functionality
import { Card } from '@udonarium/card';
// END: HTML5 Drag & Drop Support
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuService } from 'service/context-menu.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

@Component({
  selector: 'container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContainerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() container: Container = null;
  @Input() is3D: boolean = false;

  get name(): string { return this.container.name; }
  set name(name: string) { this.container.name = name; }
  get contents(): string { return this.container.contents; }
  set contents(contents: string) { this.container.contents = contents; }
  get backgroundColor(): string { return this.container.backgroundColor; }
  set backgroundColor(color: string) { this.container.backgroundColor = color; }
  get rotate(): number { return this.container.rotate; }
  set rotate(rotate: number) { this.container.rotate = rotate; }
  get height(): number { return this.adjustMinBounds(this.container.height); }
  get width(): number { return this.adjustMinBounds(this.container.width); }
  get isLocked(): boolean { return this.container.isLocked; }
  set isLocked(isLocked: boolean) { this.container.isLocked = isLocked; }
  get cards() { return this.container.cards; }
  get cardStacks() { return this.container.cardStacks; }
  get itemCount(): number { return this.container.itemCount; }
  // START: HTML5 Drag & Drop Support (Added for Container feature) - Can be removed to revert drag functionality
  isDragOver: boolean = false;
  // END: HTML5 Drag & Drop Support

  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private callbackOnMouseUp = (e) => this.onMouseUp(e);

  constructor(
    private contextMenuService: ContextMenuService,
    private panelService: PanelService,
    private pointerDeviceService: PointerDeviceService,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone,
    public elementRef: ElementRef<HTMLElement>
  ) { }

  ngOnInit() {
    this.movableOption = {
      tabletopObject: this.container,
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain']
    };
    this.rotableOption = {
      tabletopObject: this.container
    };

    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', -1000, event => {
        if (event.data.identifier !== this.container.identifier) return;
        this.changeDetectorRef.markForCheck();
      })
      .on('SYNCHRONIZE_GAME_OBJECT', -1000, event => {
        if (event.data.identifier !== this.container.identifier) return;
        this.changeDetectorRef.markForCheck();
      });
  }

  ngAfterViewInit() {
    this.ngZone.run(() => { });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  onMove() {
    SoundEffect.play(PresetSound.piecePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.piecePut);
  }

  onMouseUp(e: any) {
    if (this.isLocked) return;
    this.ngZone.run(() => { this.contextMenuService.close(); });
    document.removeEventListener('mouseup', this.callbackOnMouseUp);
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    if (!this.isLocked) {
      e.preventDefault();
      this.ngZone.run(() => {
        let position = this.pointerDeviceService.pointers[0];
        this.contextMenuService.open(position, [
          {
            name: this.isLocked ? '固定解除' : '固定する',
            action: () => {
              this.isLocked = !this.isLocked;
              SoundEffect.play(this.isLocked ? PresetSound.lock : PresetSound.unlock);
            }
          },
          {
            name: '削除',
            action: () => {
              this.container.destroy();
              SoundEffect.play(PresetSound.piecePut);
            }
          }
        ], this.name);
      });
    }
  }

  // START: HTML5 Drag & Drop Support (Added for Container feature) - Can be removed to revert drag functionality
  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = true;
  }
  // END: HTML5 Drag & Drop Support

  // START: HTML5 Drag & Drop Support (Added for Container feature) - Can be removed to revert drag functionality
  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;
  }
  // END: HTML5 Drag & Drop Support

  // START: HTML5 Drag & Drop Support (Added for Container feature) - Can be removed to revert drag functionality
  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;

    // dataTransferからカードIDを取得
    if (e.dataTransfer) {
      const cardId = e.dataTransfer.getData('text/plain');
      if (cardId) {
        const card = ObjectStore.instance.get(cardId);
        if (card && card instanceof ObjectNode) {
          const obj = ObjectStore.instance.get<any>(cardId);
          if (obj && obj.className === 'Card') {
            this.container.addCard(obj);
            SoundEffect.play(PresetSound.piecePut);
            this.changeDetectorRef.markForCheck();
            return;
          }
        }
      }
    }

    // フォールバック：DOM要素からカード情報を取得
    const draggedElement = (e as any).srcElement || e.target;
    const cardComponent = this.findCardComponentInParents(draggedElement as HTMLElement);
    
    if (cardComponent) {
      const card = cardComponent.card;
      if (card) {
        this.container.addCard(card);
        SoundEffect.play(PresetSound.piecePut);
        this.changeDetectorRef.markForCheck();
      }
    }
  }
  // END: HTML5 Drag & Drop Support

  private findCardComponentInParents(element: HTMLElement): any {
    let current = element;
    while (current && current !== document.body) {
      const ng = (window as any).ng;
      if (ng && ng.probe) {
        const elementRef = ng.probe(current);
        if (elementRef && elementRef.componentInstance && elementRef.componentInstance.card) {
          return elementRef.componentInstance;
        }
      }
      current = current.parentElement;
    }
    return null;
  }
  // END: HTML5 Drag & Drop Support

  adjustMinBounds(value: number): number {
    return value < 1 ? 1 : value;
  }
}

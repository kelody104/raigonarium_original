import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { DataElement } from './data-element';
import { TabletopObject } from './tabletop-object';
import { moveToTopmost } from './tabletop-object-util';
import { ImageFile } from './core/file-storage/image-file';
import { ObjectStore } from './core/synchronize-object/object-store';
import { Card } from './card';
import { CardStack } from './card-stack';

@SyncObject('container')
export class Container extends TabletopObject {
  @SyncVar() rotate: number = 0;
  @SyncVar() zindex: number = 0;
  @SyncVar() isLocked: boolean = false;

  get width(): number { return this.getCommonValue('width', 4); }
  get height(): number { return this.getCommonValue('height', 4); }
  get name(): string { return this.getCommonValue('name', 'Container'); }
  set name(name: string) { this.setCommonValue('name', name); }
  get contents(): string { return this.getCommonValue('contents', ''); }
  set contents(contents: string) { this.setCommonValue('contents', contents); }
  get backgroundColor(): string { return this.getCommonValue('backgroundColor', '#22AA22'); }
  set backgroundColor(color: string) { this.setCommonValue('backgroundColor', color); }

  /**
   * コンテナ内のカード一覧を取得
   */
  get cards(): Card[] {
    return ObjectStore.instance.getObjects(Card).filter(card => card.parentId === this.identifier);
  }

  /**
   * コンテナ内のカードスタック一覧を取得
   */
  get cardStacks(): CardStack[] {
    return ObjectStore.instance.getObjects(CardStack).filter(stack => stack.parentId === this.identifier);
  }

  /**
   * コンテナ内のアイテム数を取得
   */
  get itemCount(): number {
    return this.cards.length + this.cardStacks.length;
  }

  /**
   * カードをコンテナに追加
   */
  addCard(card: Card) {
    if (card && !this.contains(card)) {
      this.appendChild(card);
    }
  }

  /**
   * カードスタックをコンテナに追加
   */
  addCardStack(cardStack: CardStack) {
    if (cardStack && !this.contains(cardStack)) {
      this.appendChild(cardStack);
    }
  }

  /**
   * コンテナからアイテムを削除
   */
  removeItem(item: Card | CardStack) {
    if (item && this.contains(item)) {
      this.removeChild(item);
      item.setLocation('table');
    }
  }

  toTopmost() {
    moveToTopmost(this);
  }

  static create(name: string, width: number = 4, height: number = 4, identifier?: string): Container {
    let object: Container = identifier ? new Container(identifier) : new Container();

    object.createDataElements();
    object.commonDataElement.appendChild(DataElement.create('name', name, {}, 'name_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('width', width, {}, 'width_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('height', height, {}, 'height_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('contents', '', { type: 'note' }, 'contents_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('backgroundColor', '#22AA22', {}, 'backgroundColor_' + object.identifier));
    object.initialize();
    
    // デフォルト座標を設定
    object.location.x = 0;
    object.location.y = 0;
    object.posZ = 0;

    return object;
  }
}

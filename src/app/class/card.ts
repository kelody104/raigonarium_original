import { ImageFile } from './core/file-storage/image-file';
import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { Network } from './core/system';
import { DataElement } from './data-element';
import { PeerCursor } from './peer-cursor';
import { TabletopObject } from './tabletop-object';
import { moveToTopmost } from './tabletop-object-util';
import { ChatTab } from './chat-tab';
import { TabletopService } from 'service/tabletop.service';
import { CardComponent } from '../component/card/card.component';

export enum CardState {
  FRONT,
  BACK,
}

@SyncObject('card')
export class Card extends TabletopObject {
  @SyncVar() state: CardState = CardState.FRONT;
  @SyncVar() rotate: number = 0;
  @SyncVar() owner: string = '';
  @SyncVar() god: string[] = new Array();
  @SyncVar() zindex: number = 0;
  @SyncVar() weight: number = null;
  @SyncVar() type: string = null;
  @SyncVar() isLocked: boolean = false;
  @SyncVar() komaname: string = null;
  @SyncVar() raijinname: string = "";
  @SyncVar() ownersID: string = "";
  @SyncVar() general: number = null;
  @SyncVar() playername: string = null;

  get isVisibleOnTable(): boolean {
    return this.location.name === 'table' && (!this.parentIsAssigned || this.parentIsDestroyed);
  }

  get name(): string { return this.getCommonValue('name', ''); }
  get size(): number { return this.getCommonValue('size', 2); }
  set size(size: number) { this.setCommonValue('size', size); }
  get frontImage(): ImageFile { return this.getImageFile('front'); }
  get backImage(): ImageFile { return this.getImageFile('back'); }
  get summeryImage(): ImageFile { return this.getImageFile('summery'); }

  get imageFile(): ImageFile { return this.isVisible ? this.frontImage : this.backImage; }

  get ownerName(): string {
    let object = PeerCursor.findByUserId(this.owner);
    return object ? object.name : '';
  }

  get hasOwner(): boolean { return 0 < this.owner.length; }
  get isHand(): boolean { return Network.peerContext.userId === this.owner; }
  get isGod(): boolean { return PeerCursor.myCursor.GodeyeMode === true; }
  get isFront(): boolean { return this.state === CardState.FRONT; }
  get isVisible(): boolean {
    return this.isHand || this.isFront || this.isGod;
  }

  faceUp() {
    this.state = CardState.FRONT;
    this.owner = '';
  }

  faceDown() {
    this.state = CardState.BACK;
    this.owner = '';
  }

  toTopmost() {
    moveToTopmost(this, ['card-stack']);
  }

  static create(name: string, front: string, back: string, size: number = 1, summery?: string, koma?: string, identifier?: string): Card {
    let object: Card = null;

    if (identifier) {
      object = new Card(identifier);
    } else {
      object = new Card();
    }
    object.createDataElements();
    object.commonDataElement.appendChild(DataElement.create('name', name, {}, 'name_' + object.identifier));
    object.commonDataElement.appendChild(DataElement.create('size', size, {}, 'size_' + object.identifier));
    object.imageDataElement.appendChild(DataElement.create('front', front, { type: 'image' }, 'front_' + object.identifier));
    object.imageDataElement.appendChild(DataElement.create('back', back, { type: 'image' }, 'back_' + object.identifier));
    object.imageDataElement.appendChild(DataElement.create('summery', summery, { type: 'image' }, 'summery_' + object.identifier));
    object.initialize();

    return object;
  }
}

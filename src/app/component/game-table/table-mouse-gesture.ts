import { InputHandler } from 'directive/input-handler';
import { PeerCursor } from '@udonarium/peer-cursor';
import { TabletopActionService } from 'service/tabletop-action.service';

type Callback = (srcEvent: TouchEvent | MouseEvent | PointerEvent) => void;
type OnTransformCallback = (transformX: number, transformY: number, transformZ: number, rotateX: number, rotateY: number, rotateZ: number, event: TableMouseGestureEvent, srcEvent: TouchEvent | MouseEvent | PointerEvent | KeyboardEvent) => void;

export enum TableMouseGestureEvent {
  DRAG = 'drag',
  ZOOM = 'zoom',
  ROTATE = 'rotate',
  KEYBOARD = 'keyboard',
}

enum Keyboard {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
  H = 'H',
  I = 'I',
  J = 'J',
  K = 'K',
  L = 'L',
  M = 'M',
  N = 'N',
  O = 'O',
  P = 'P',
  Q = 'Q',
  R = 'R',
  S = 'S',
  T = 'T',
  U = 'U',
  V = 'V',
  W = 'W',
  X = 'X',
  Y = 'Y',
  Z = 'Z',
  ArrowLeft = 'ArrowLeft',
  ArrowUp = 'ArrowUp',
  ArrowRight = 'ArrowRight',
  ArrowDown = 'ArrowDown',
  Space = 'Space',
  Enter = 'Enter',
}

export class TableMouseGesture {
  private currentPositionX: number = 0;
  private currentPositionY: number = 0;

  private buttonCode: number = 0;
  private input: InputHandler = null;

  get isGrabbing(): boolean { return this.input.isGrabbing; }
  get isDragging(): boolean { return this.input.isDragging; }

  private callbackOnWheel = (e) => this.onWheel(e);
  private callbackOnKeydown = (e) => this.onKeydown(e);

  onstart: Callback = null;
  onend: Callback = null;
  ontransform: OnTransformCallback = null;

  constructor(readonly targetElement: HTMLElement) {
    this.initialize();
  }

  private initialize() {
    this.input = new InputHandler(this.targetElement, { capture: true });
    this.addEventListeners();
    this.input.onStart = this.onInputStart.bind(this);
    this.input.onMove = this.onInputMove.bind(this);
    this.input.onEnd = this.onInputEnd.bind(this);
  }

  cancel() {
    this.input.cancel();
  }

  destroy() {
    this.input.destroy();
    this.removeEventListeners();
  }

  onInputStart(ev: any) {
    this.currentPositionX = this.input.pointer.x;
    this.currentPositionY = this.input.pointer.y;
    this.buttonCode = ev.button;
    if (this.onstart) this.onstart(ev);
  }

  onInputEnd(ev: any) {
    if (this.onend) this.onend(ev);
  }

  onInputMove(ev: any) {
    let x = this.input.pointer.x;
    let y = this.input.pointer.y;
    let deltaX = x - this.currentPositionX;
    let deltaY = y - this.currentPositionY;

    let transformX = 0;
    let transformY = 0;
    let transformZ = 0;

    let rotateX = 0;
    let rotateY = 0;
    let rotateZ = 0;

    let event = TableMouseGestureEvent.DRAG;

    if (this.buttonCode === 2) {
      event = TableMouseGestureEvent.ROTATE;
      rotateZ = -deltaX / 5;
      rotateX = -deltaY / 5;
    } else {
      transformX = deltaX;
      transformY = deltaY;
    }

    this.currentPositionX = x;
    this.currentPositionY = y;

    if (this.ontransform) this.ontransform(transformX, transformY, transformZ, rotateX, rotateY, rotateZ, event, ev);
  }

  onWheel(ev: WheelEvent) {
    let pixelDeltaY = 0;
    switch (ev.deltaMode) {
      case WheelEvent.DOM_DELTA_LINE:
        pixelDeltaY = ev.deltaY * 16;
        break;
      case WheelEvent.DOM_DELTA_PAGE:
        pixelDeltaY = ev.deltaY * window.innerHeight;
        break;
      default:
        pixelDeltaY = ev.deltaY;
        break;
    }
    let transformX = 0;
    let transformY = 0;
    let transformZ = 0;

    let rotateX = 0;
    let rotateY = 0;
    let rotateZ = 0;

    transformZ = pixelDeltaY * -1.5;
    if (300 ** 2 < transformZ ** 2) transformZ = Math.min(Math.max(transformZ, -300), 300);

    if (this.ontransform) this.ontransform(transformX, transformY, transformZ, rotateX, rotateY, rotateZ, TableMouseGestureEvent.ZOOM, ev);
  }

  onKeydown(ev: KeyboardEvent) {
    let transformX = 0;
    let transformY = 0;
    let transformZ = 0;

    let rotateX = 0;
    let rotateY = 0;
    let rotateZ = 0;

    let key = this.getKeyName(ev);
    switch (key) {
      case Keyboard.ArrowLeft:
        if (ev.shiftKey) {
          rotateZ = -90;
        } else {
          transformX = 10;
        }
        break;
      case Keyboard.ArrowUp:
        if (ev.shiftKey) {
          transformZ = -1180;
          rotateX = -50;
          transformY = 140;
        } else if (ev.ctrlKey) {
          transformZ = 5;
        } else {
          transformY = 10;
        }
        break;
      case Keyboard.ArrowRight:
        if (ev.shiftKey) {
          rotateZ = 90;
        } else {
          transformX = -10;
        }
        break;
      case Keyboard.ArrowDown:
        if (ev.shiftKey) {
          transformZ = 1180;
          rotateX = 50;
          transformY = -73.5;
        } else if (ev.ctrlKey) {
          transformZ = -5;
        } else {
          transformY = -10;
        }
        break;
      case Keyboard.Space:
        rotateZ = -180;
        break;
    }
    let isArrowKey = Keyboard[key] != null;
    if (isArrowKey && this.ontransform) this.ontransform(transformX, transformY, transformZ, rotateX, rotateY, rotateZ, TableMouseGestureEvent.KEYBOARD, ev);
  }

  private getKeyName(keyboard: KeyboardEvent): string {
    if (keyboard.keyCode == 32) return Keyboard.Space;
    if (keyboard.key) return keyboard.key;
    switch (keyboard.keyCode) {
      case 13: return Keyboard.Enter;
      case 32: return Keyboard.Space;
      case 37: return Keyboard.ArrowLeft;
      case 38: return Keyboard.ArrowUp;
      case 39: return Keyboard.ArrowRight;
      case 40: return Keyboard.ArrowDown;
      case 65: return Keyboard.A;
      case 66: return Keyboard.B;
      case 67: return Keyboard.C;
      case 68: return Keyboard.D;
      case 69: return Keyboard.E;
      case 70: return Keyboard.F;
      case 71: return Keyboard.G;
      case 72: return Keyboard.H;
      case 73: return Keyboard.I;
      case 74: return Keyboard.J;
      case 75: return Keyboard.K;
      case 76: return Keyboard.L;
      case 77: return Keyboard.M;
      case 78: return Keyboard.N;
      case 79: return Keyboard.O;
      case 80: return Keyboard.P;
      case 81: return Keyboard.Q;
      case 82: return Keyboard.R;
      case 83: return Keyboard.S;
      case 84: return Keyboard.T;
      case 85: return Keyboard.U;
      case 86: return Keyboard.V;
      case 87: return Keyboard.W;
      case 88: return Keyboard.X;
      case 89: return Keyboard.Y;
      case 90: return Keyboard.Z;
      default: return '';
    }
  }

  ViewfromUp() {

  }

  private addEventListeners() {
    this.targetElement.addEventListener('wheel', this.callbackOnWheel, false);
    document.body.addEventListener('keydown', this.callbackOnKeydown, false);
  }

  private removeEventListeners() {
    this.targetElement.removeEventListener('wheel', this.callbackOnWheel, false);
    document.body.removeEventListener('keydown', this.callbackOnKeydown, false);
  }
}

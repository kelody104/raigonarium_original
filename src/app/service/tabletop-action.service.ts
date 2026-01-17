import { Injectable } from '@angular/core';
import { Card, CardState } from '@udonarium/card';

import { CardStack } from '@udonarium/card-stack';
import { ImageContext, ImageFile } from '@udonarium/core/file-storage/image-file';
import { ImageStorage } from '@udonarium/core/file-storage/image-storage';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { EventSystem, Network } from '@udonarium/core/system';
import { DiceSymbol, DiceType } from '@udonarium/dice-symbol';
import { GameCharacter } from '@udonarium/game-character';
import { GameTable } from '@udonarium/game-table';
import { GameTableMask } from '@udonarium/game-table-mask';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { TableSelecter } from '@udonarium/table-selecter';
import { Terrain } from '@udonarium/terrain';
import { TextNote } from '@udonarium/text-note';
import { ChatMessageContext } from '../class/chat-message';
import { PeerContext } from '../class/core/system/network/peer-context';
import { PeerCursor } from '../class/peer-cursor';
import { ChatTab } from '../class/chat-tab';
import { ChatTabList } from '@udonarium/chat-tab-list';
import { ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';

import playerData from 'json/player.json';
import raijinData from 'json/raijin.json';
import kisekigomaData from 'json/kisekigoma.json';
import diceData from 'json/dices.json';
import statusData from 'json/status.json';
import historyData from 'json/history.json';
import menuData from 'json/ichinichimenu.json';
import parameterData from 'json/parameter.json';

const player = (playerData as any)?.player || playerData;
const raijin = (raijinData as any)?.raijin || raijinData;
const halfsize = (kisekigomaData as any)?.halfsize || kisekigomaData?.halfsize || [];
const otonashi = (kisekigomaData as any)?.otonashi || kisekigomaData?.otonashi || [];
const kotodama = (kisekigomaData as any)?.kotodama || kisekigomaData?.kotodama || [];
const ougi = (kisekigomaData as any)?.ougi || kisekigomaData?.ougi || [];
const dice = (diceData as any)?.dice || diceData;
const Status = (statusData as any)?.Status || statusData;
const EventData = (historyData as any)?.EventData || historyData;
const OukaMenu = (menuData as any)?.OukaMenu || menuData;
const RengeMenu = (menuData as any)?.RengeMenu || menuData;
const CombiMenu = (menuData as any)?.CombiMenu || menuData;
const SpecialMenu = (menuData as any)?.SpecialMenu || menuData;
const RaijinMenu = (menuData as any)?.RaijinMenu || menuData;
const OtherMenu = (menuData as any)?.OtherMenu || menuData;
const Time = (parameterData as any)?.Time || parameterData;
const Coodinate = (parameterData as any)?.Coodinate || parameterData;

import { ContextMenuAction } from './context-menu.service';
import { ChatMessageService } from 'service/chat-message.service';
import { PointerCoordinate } from './pointer-device.service';
import { TabletopService } from 'service/tabletop.service';
import { PeerCursorComponent } from '../component/peer-cursor/peer-cursor.component';



@Injectable({
  providedIn: 'root'
})


export class TabletopActionService {
  image;
  constructor
    (
      private tabletopService: TabletopService,
      private chatMessageService: ChatMessageService,
      private contextMenuService: ContextMenuService,
  ) { }

  isFullSize: boolean = Status.OrganizerMode;
  //isFullSize: boolean = true;

  makeDefaultTable() {
    let tableSelecter = new TableSelecter('tableSelecter');
    tableSelecter.initialize();

    let gameTable = new GameTable('gameTable');
    let gameTable_2 = new GameTable('gameTable_2');
    let gameTable_3 = new GameTable('gameTable_3');

    let testBgFile: ImageFile = null;
    let bgFileContext = ImageFile.createEmpty('testTableBackgroundImage_image').toContext();
    bgFileContext.url = './assets/images/raigo/field.png';
    testBgFile = ImageStorage.instance.add(bgFileContext);

    let testBgFile_2: ImageFile = null;
    let bgFileContext_2 = ImageFile.createEmpty('testTableBackgroundImage_image_2').toContext();
    bgFileContext_2.url = './assets/images/raigo/field_2.png';
    testBgFile_2 = ImageStorage.instance.add(bgFileContext_2);

    let testBgFile_3: ImageFile = null;
    let bgFileContext_3 = ImageFile.createEmpty('testTableBackgroundImage_image_3').toContext();
    bgFileContext_3.url = './assets/images/raigo/field_3.png';
    testBgFile_3 = ImageStorage.instance.add(bgFileContext_3);

    let testBgFile_BG: ImageFile = null;
    let bgFileContext_BG = ImageFile.createEmpty('testTableBackgroundImage_image_BG').toContext();
    bgFileContext_BG.url = './assets/images/raigo/BG.png';
    testBgFile_BG = ImageStorage.instance.add(bgFileContext_BG);

    let testBgFile_BG_Half: ImageFile = null;
    let bgFileContext_BG_Half = ImageFile.createEmpty('testTableBackgroundImage_image_BG_Half').toContext();
    bgFileContext_BG.url = './assets/images/raigo/BG_Half.png';
    testBgFile_BG_Half = ImageStorage.instance.add(bgFileContext_BG_Half);

    gameTable.name = 'ライゴナリウム';
    gameTable.imageIdentifier = testBgFile.identifier;
    gameTable.backgroundImageIdentifier = testBgFile_BG.identifier;
    gameTable.width = 49;
    gameTable.height = 28;
    gameTable.initialize();
    gameTable.gridType = -1;

    gameTable_2.name = 'ライゴナリウム';
    gameTable_2.imageIdentifier = testBgFile_2.identifier;
    gameTable_2.backgroundImageIdentifier = testBgFile_BG.identifier;
    gameTable_2.width = 38;
    gameTable_2.height = 38;
    gameTable_2.initialize();
    gameTable_2.gridType = -1;

    gameTable_3.name = 'ライゴナリウム';
    gameTable_3.imageIdentifier = testBgFile_3.identifier;
    gameTable_3.backgroundImageIdentifier = testBgFile_BG.identifier;
    gameTable_3.width = 38;
    gameTable_3.height = 38;
    gameTable_3.initialize();
    gameTable_3.gridType = -1;

    tableSelecter.viewTableIdentifier = gameTable.identifier;
  }

  makeDefaultContextMenuActions(position: PointerCoordinate): ContextMenuAction[] {
    if (PeerCursor.myCursor.name.slice(0, 1) == "@") {
      return [
        this.IchinichiMenu_Ouka(position),
        this.IchinichiMenu_Renge(position),
        this.IchinichiMenu_Combi(position),
        this.IchinichiMenu_Special(position),
        this.IchinichiMenu_Raijin(position),
        this.IchinichiMenu_Other(position),
        this.IchinichiMenu_Total(position),
      ]
    }
    else if (Status.OrganizerMode == true) {
      return [
        //this.getCreateDiceSymbolMenu(position),
        //ContextMenuSeparator,
        //this.getCreateNameplateMenu(position, "空晴家"),
        //this.getCreateNameplateMenu(position, "飛雪家"),
        //this.getCreateNameplateMenu(position, "雷藏家"),
        //this.getCreateNameplateMenu(position, "八雲家"),
        //this.getCreateNameplateMenu(position, "時雨家"),
        //this.getCreateNameplateMenu(position, "その他"),
        //ContextMenuSeparator,
        this.getCreateSummaryMenu(position),
        ContextMenuSeparator,
        this.getCreateObjectMenu(position),
        this.getCreateRaijinMenu(position),
        this.getDeleteObjectMenu(),
        ContextMenuSeparator,
        //this.getCreateHistory(),
        //ContextMenuSeparator,
        this.MenuHidden()
      ];
    } else if (PeerCursor.myCursor.GodeyeMode == true) {
      return [
       // this.getCreateDiceSymbolMenu(position),
        //ContextMenuSeparator,
        //this.getCreateNameplateMenu(position, "空晴家"),
        //this.getCreateNameplateMenu(position, "飛雪家"),
        //this.getCreateNameplateMenu(position, "雷藏家"),
        //this.getCreateNameplateMenu(position, "八雲家"),
        //this.getCreateNameplateMenu(position, "時雨家"),
        //this.getCreateNameplateMenu(position, "その他"),
        //ContextMenuSeparator,
        this.getCreateSummaryMenu(position),
        //this.getCreateHistory(),
        //ContextMenuSeparator,
        this.MenuHidden()
      ];
    } else if (Status.ConventionMode == true) {
      return [
        //this.getCreateDiceSymbolMenu(position),
        //ContextMenuSeparator,
        //this.getCreateNameplateMenu(position, "空晴家"),
        //this.getCreateNameplateMenu(position, "飛雪家"),
        //this.getCreateNameplateMenu(position, "雷藏家"),
        //this.getCreateNameplateMenu(position, "八雲家"),
        //this.getCreateNameplateMenu(position, "時雨家"),
        //this.getCreateNameplateMenu(position, "その他"),
        //this.getChangeIconMenu(),
        //ContextMenuSeparator,
        this.getCreateSummaryMenu(position),
        ContextMenuSeparator,
        this.MenuHidden()
      ];
    } else if (this.isFullSize == false) {
      return [
        //this.getCreateDiceSymbolMenu(position),
        //ContextMenuSeparator,
        //this.getCreateNameplateMenu(position, "空晴家"),
        //this.getCreateNameplateMenu(position, "飛雪家"),
        //this.getCreateNameplateMenu(position, "雷藏家"),
        //this.getCreateNameplateMenu(position, "八雲家"),
        //this.getCreateNameplateMenu(position, "時雨家"),
        //this.getCreateNameplateMenu(position, "その他"),
        //this.getChangeIconMenu(),
        //ContextMenuSeparator,
        this.getCreateSummaryMenu(position),
        ContextMenuSeparator,
        this.MenuHidden()
      ];
    } else return [
      //this.getCreateDiceSymbolMenu(position),
      //ContextMenuSeparator,
      //this.getCreateNameplateMenu(position, "空晴家"),
      //this.getCreateNameplateMenu(position, "飛雪家"),
      //this.getCreateNameplateMenu(position, "雷藏家"),
      //this.getCreateNameplateMenu(position, "八雲家"),
      //this.getCreateNameplateMenu(position, "時雨家"),
      //this.getCreateNameplateMenu(position, "その他"),
      //this.getChangeIconMenu(),
      //ContextMenuSeparator,
      //this.getCreateRaijinMenu(position),
      this.getCreateSummaryMenu(position),
      //this.getCreateHistory(),
      //ContextMenuSeparator,
      //this.getDeleteObjectMenu(),
      ContextMenuSeparator,
      this.MenuHidden()
    ];
  }

  private MenuHidden(): ContextMenuAction {
    let name: string = "Menuを表示する";
    if (PeerCursor.myCursor.MenuVisible == true) name = "Menuを表示しない";
    return {
      name: name, action: () => {
        PeerCursor.myCursor.MenuVisible = !PeerCursor.myCursor.MenuVisible;
      }
    }
  }

  private IchinichiMenu_Ouka(position?: PointerCoordinate): ContextMenuAction {
    let subMenus_Ichinichiouka: ContextMenuAction[] = [];

    let menus = OukaMenu.SubMenuname;

    menus.forEach(item => {
      subMenus_Ichinichiouka.push({
        name: item.menuName, action: () => {
          this.createsentences(position, item.menuName.slice(1));
          SoundEffect.play(PresetSound.sweep);
        }
      });
    });
    return { name: OukaMenu.MainMenuName, action: null, subActions: subMenus_Ichinichiouka };
  }

  private IchinichiMenu_Renge(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Ichinichirenge: ContextMenuAction[] = [];

    let menus = RengeMenu.SubMenuname;

    menus.forEach(item => {
      subMenus_Ichinichirenge.push({
        name: item.menuName, action: () => {
          this.createsentences(position, item.menuName.slice(1));
          SoundEffect.play(PresetSound.sweep);
        }
      });
    });
    return { name: RengeMenu.MainMenuName, action: null, subActions: subMenus_Ichinichirenge };
  }

  private IchinichiMenu_Combi(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Ichinichicombi: ContextMenuAction[] = [];
    let menus = CombiMenu.SubMenuname;

    menus.forEach(item => {
      subMenus_Ichinichicombi.push({
        name: item.menuName, action: () => {
          this.createsentences(position, item.menuName.slice(1));
          SoundEffect.play(PresetSound.sweep);
        }
      });
    });
    return { name: CombiMenu.MainMenuName, action: null, subActions: subMenus_Ichinichicombi };
  }

  private IchinichiMenu_Special(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Ichinichispecial: ContextMenuAction[] = [];

    let menus = SpecialMenu.SubMenuname;

    menus.forEach(item => {
      subMenus_Ichinichispecial.push({
        name: item.menuName, action: () => {
          this.createsentences(position, item.menuName.slice(1));
          SoundEffect.play(PresetSound.sweep);
        }
      });
    });
    return { name: SpecialMenu.MainMenuName, action: null, subActions: subMenus_Ichinichispecial };
  }

  private IchinichiMenu_Raijin(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Ichinichiraijin: ContextMenuAction[] = [];
    let menus = RaijinMenu.SubMenuname;

    menus.forEach(item => {
      subMenus_Ichinichiraijin.push({
        name: item.menuName, action: () => {
          this.createsentences(position, item.menuName.slice(1));
          SoundEffect.play(PresetSound.sweep);
        }
      });
    });
    return { name: RaijinMenu.MainMenuName, action: null, subActions: subMenus_Ichinichiraijin };
  }

  private IchinichiMenu_Other(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Ichinichiother: ContextMenuAction[] = [];
    let menus = OtherMenu.SubMenuname;

    menus.forEach(item => {
      subMenus_Ichinichiother.push({
        name: item.menuName, action: () => {
          this.createsentences(position, item.menuName);
          SoundEffect.play(PresetSound.sweep);
        }
      });
    });
    return { name: OtherMenu.MainMenuName, action: null, subActions: subMenus_Ichinichiother };
  }

  private IchinichiMenu_Total(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Ichinichiother: ContextMenuAction[] = [];
    for (let i = 1; i <= 30; i++) {
      subMenus_Ichinichiother.push({
        name: i + "点", action: () => {
          let url: string = './assets/images/dice/30_dice_yakumo/30_dice_yakumo[' + i.toString() + '].png';
          if (!ImageStorage.instance.get(url))
            ImageStorage.instance.add(url);
          let total: Card = Card.create("得点", url, url, 4);
          total.location.x = position.x;
          total.location.y = position.y;
          SoundEffect.play(PresetSound.dicePut);
        }
      });
    }
    return { name: '合計得点', action: null, subActions: subMenus_Ichinichiother };
  }

  changeField() {
    if (Status.Testmode != true) {
      let nameplates: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
      if (nameplates.length > 3) this.changeFieldto4P();
      else if (nameplates.length == 3) this.changeFieldto3P();
      else this.changeFieldto2P();
    }
  }

  changeFieldto2P() {
    let tableSelecter = ObjectStore.instance.get<TableSelecter>('tableSelecter');
    tableSelecter.viewTableIdentifier = 'gameTable_2';
  }

  changeFieldto3P() {
    let tableSelecter = ObjectStore.instance.get<TableSelecter>('tableSelecter');
    tableSelecter.viewTableIdentifier = 'gameTable_3';
  }

  changeFieldto4P() {
    let tableSelecter = ObjectStore.instance.get<TableSelecter>('tableSelecter');
    tableSelecter.viewTableIdentifier = 'gameTable';
  }

  private getCreateObjectMenu(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Createobject: ContextMenuAction[] = [];

    subMenus_Createobject.push({
      name: 'キャラクターを作成', action: () => {
        let character = this.createGameCharacter(position);
        EventSystem.trigger('SELECT_TABLETOP_OBJECT', { identifier: character.identifier, className: character.aliasName });
        SoundEffect.play(PresetSound.piecePut);
      }
    });

    subMenus_Createobject.push({
      name: 'マップマスクを作成', action: () => {
        this.createGameTableMask(position);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    //subMenus_Createobject.push({
    //  name: 'トランプの山札を作成', action: () => {
    //    this.createTrump(position);
    //    SoundEffect.play(PresetSound.cardPut);
    //  }
    //});

    subMenus_Createobject.push({
      name: '共有メモを作成', action: () => {
        this.createTextNote(position);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    return { name: 'その他のオブジェクト作成', action: null, subActions: subMenus_Createobject };
  }

  private BoardResetMenu(mode: boolean): ContextMenuAction {
    return {
      name: '全削除＋隠駒・雷山作成', action: () => {
        var res = confirm("本当によろしいですか？");
        if (res == true) {
          // OKなら実行
          this.deleteAllCards();
          this.deleteAllCardStacks();
          this.deleteAllCharacters();
          this.deleteAllTerrains();
          this.deleteAlltableMasks();
          this.deleteAllDiceSymbols();
          this.createRaigoOngoma(0,0);
          this.createRaigo(mode);
          SoundEffect.play(PresetSound.sweep);
        }
      }
    }
  }

  private getCreateHistory(): ContextMenuAction {
    let subMenus_History: ContextMenuAction[] = [];
    for (let i = 0; i < EventData.length; i++) {
      subMenus_History.push({
        name: '【' + EventData[i].Date + '】' + EventData[i].Name, action: () => {
          let kisekis = new Array();
          for (let j = 0; j < EventData[i].Data.length; j++) {
            let target;
            target = otonashi.filter(card => { return card.filename == EventData[i].Data[j] });
            if (target.length == 0) target = (kotodama.filter(card => { return card.filename == EventData[i].Data[j] }));
            if (target.length == 0) target = (ougi.filter(card => { return card.filename == EventData[i].Data[j] }));
            console.log(target);
            kisekis.push(target);
          }
          if (this.isFullSize == true) this.CreateHistory(kisekis);
        }
      });
    }
    return { name: '大会ヒストリー', action: null, subActions: subMenus_History };
  }

  private getDeleteObjectMenu(): ContextMenuAction {
    let subMenus_Deleteobject: ContextMenuAction[] = [];

    subMenus_Deleteobject.push({
      name: '全てのオブジェクトを削除', action: () => {
        this.deleteAllCards();
        this.deleteAllCardStacks();
        this.deleteAllCharacters();
        this.deleteAllTerrains();
        this.deleteAlltableMasks();
        this.deleteAllDiceSymbols();
        SoundEffect.play(PresetSound.sweep);
      }
    });

    subMenus_Deleteobject.push({
      name: 'カードを全て削除', action: () => {
        this.deleteAllCards();
        SoundEffect.play(PresetSound.sweep);
      }
    });

    if (Status.OrganizerMode == true) {
      subMenus_Deleteobject.push({
        name: '山札を全て削除', action: () => {
          this.deleteAllCardStacks();
          SoundEffect.play(PresetSound.sweep);
        }
      });

      subMenus_Deleteobject.push({
        name: 'キャラクターを全て削除', action: () => {
          this.deleteAllCharacters();
          SoundEffect.play(PresetSound.sweep);
        }
      });

      subMenus_Deleteobject.push({
        name: '地形を全て削除', action: () => {
          this.deleteAllTerrains();
          SoundEffect.play(PresetSound.sweep);
        }
      });

      subMenus_Deleteobject.push({
        name: 'マップマスクを全て削除', action: () => {
          this.deleteAlltableMasks();
          SoundEffect.play(PresetSound.sweep);
        }
      });

      subMenus_Deleteobject.push({
        name: 'ダイスを全て削除', action: () => {
          this.deleteAllDiceSymbols();
          SoundEffect.play(PresetSound.sweep);
        }
      });
    }
    return { name: 'オブジェクト削除', action: null, subActions: subMenus_Deleteobject };
  }

  private getCreateRaigoObjectMenu(position: PointerCoordinate): ContextMenuAction {
    let subMenus_CreateRaigoobject: ContextMenuAction[] = [];

    subMenus_CreateRaigoobject.push({
      name: '雷山（フル）を作成', action: () => {
        this.createRaigo(true);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    subMenus_CreateRaigoobject.push({
      name: '隠駒を作成', action: () => {
        this.createRaigoOngoma(0,0);
        SoundEffect.play(PresetSound.blockPut);
      }
    });

    return { name: '雷山・隠駒を作成', action: null, subActions: subMenus_CreateRaigoobject };
  }

  private getCreateSummaryMenu(position: PointerCoordinate): ContextMenuAction {
    let subMenus_summery: ContextMenuAction[] = [];

    subMenus_summery.push({
      name: '全て', action: () => {
        this.createRaigoManual(position, 1, 8);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    subMenus_summery.push({
      name: '手番の動き', action: () => {
        this.createRaigoManual(position, 1, 1);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    subMenus_summery.push({
      name: '役の種類', action: () => {
        this.createRaigoManual(position, 2, 2);
        SoundEffect.play(PresetSound.cardPut);
      }
    });


    subMenus_summery.push({
      name: '得点計算など', action: () => {
        this.createRaigoManual(position, 3, 3);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    subMenus_summery.push({
      name: '言霊の効果', action: () => {
        this.createRaigoManual(position, 4, 4);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    subMenus_summery.push({
      name: '奥義駒の効果', action: () => {
        this.createRaigoManual(position, 5, 8);
        SoundEffect.play(PresetSound.cardPut);
      }
    });

    if (Status.ConventionMode != true) {
      subMenus_summery.push({
        name: '循環鍛錬の書', action: () => {
          this.createRaigoManual(position, 0, 0);
          SoundEffect.play(PresetSound.cardPut);
        }
      });
    }
    return { name: '説明書（サマリー）を表示', action: null, subActions: subMenus_summery };
  }

  private getCreateDiceSymbolMenu(position: PointerCoordinate): ContextMenuAction {
    let rot: number = PeerCursor.myCursor.RotZ;
    if (this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == this.CalcObjectRotate(rot) && DiceSymbol.name == "陽玉" }).length == 0) {
      return {
        name: '得点（陽玉）を表示', action: () => this.createDefaultDiceSymbol()
      }
    }
    else {
      let dices = dice.filter(dice => { return dice.visible == true });
      let subMenus_Nameplate: ContextMenuAction[] = [];

      dices.forEach(item => {
        subMenus_Nameplate.push({
          name: item.menuName, action: () => {
            let dice = this.createDiceSymbol(position, item.diceName, DiceType.D30, item.imagePathPrefix, item.point);
            dice.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
            let dices: DiceSymbol[] = this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == dice.rotate && DiceSymbol.name == "陽玉" });
            for (let counter of dices) {
              counter.face = (Number(counter.face) + Number(item.point)).toString();
            }
            //PeerCursor.myCursor.points += Number(item.point);
            this.createDiceSymbolMarker(rot);
            if (Number(item.point) < 9) SoundEffect.play(PresetSound.dicePut);
            else SoundEffect.play(PresetSound.raijin);
          }
        });
      });
      return { name: '得点（陽玉）を表示', action: null, subActions: subMenus_Nameplate };
    }
  }

  private getCreateNameplateMenu(position: PointerCoordinate, familyname: string): ContextMenuAction {
    let subMenus_nameplate: ContextMenuAction[] = [];
    player.filter(player => { return player.family == familyname }).forEach(item => {
      if (item.Visiable == true) {
        subMenus_nameplate.push({
          name: item.Name, action: () => {
            this.createNameplate(position, item.Name);
            PeerCursor.myCursor.name = item.Name;
            SoundEffect.play(PresetSound.cardPick);
          }
        });
      }
    });
    return { name: '名札を表示（' + familyname + '）', action: null, subActions: subMenus_nameplate };
  }

  private getChangeIconMenu(): ContextMenuAction {
    let subMenus_Icon: ContextMenuAction[] = [];

    raijin.forEach(item => {
      if (item.release != 0) {
        subMenus_Icon.push({
          name: item.Name, action: () => {
            PeerCursor.myCursor.imageIdentifier = "icon[" + item.release + "]";
            SoundEffect.play(PresetSound.cardDraw);
          }
        });
      }
    });
    return { name: 'アイコンを変更する', action: null, subActions: subMenus_Icon };
  }

  private getCreateRaijinMenu(position: PointerCoordinate): ContextMenuAction {
    let subMenus_Icon: ContextMenuAction[] = [];
    ougi.forEach(item => {
      if (item.available == true && item.group == "Ａ") {
        subMenus_Icon.push({
          name: "【グループ" + item.group + "】" + item.filename, action: () => {
            this.createOugi(position, item.filename);
            SoundEffect.play(PresetSound.cardDraw);
          }
        });
      }
    });

    subMenus_Icon.push(ContextMenuSeparator);

    ougi.forEach(item => {
      if (item.available == true && item.group == "Ｂ") {
        subMenus_Icon.push({
          name: "【グループ" + item.group + "】" + item.filename, action: () => {
            this.createOugi(position, item.filename);
            SoundEffect.play(PresetSound.cardDraw);
          }
        });
      }
    });

    subMenus_Icon.push(ContextMenuSeparator);

    ougi.forEach(item => {
      if (item.available == true && item.group == "Ｃ") {
        subMenus_Icon.push({
          name: "【グループ" + item.group + "】" + item.filename, action: () => {
            this.createOugi(position, item.filename);
            SoundEffect.play(PresetSound.cardDraw);
          }
        });
      }
    });
    return { name: '奥義駒選択', action: null, subActions: subMenus_Icon };
  }

  private getCreateRaijinMenu_(): ContextMenuAction {
    let subMenus_Icon: ContextMenuAction[] = [];
    raijin.forEach(item => {
      if (item.available == true) {
        subMenus_Icon.push({
          name: "【" + item.Ougi1 + "・" + item.Ougi2 + "・" + item.Ougi3 + "】" + item.Name, action: () => {
            let rot = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
            let decks = this.tabletopService.cardStacks.filter(CardStack => { return CardStack.rotate == rot && CardStack.name == "奥義駒" });
            decks.forEach(CardStack => {
              CardStack.destroy();
            });
            PeerCursor.myCursor.imageIdentifier = "icon[" + item.release + "]";
            this.createRaijin_(item.Ougi1, item.Ougi2, item.Ougi3);
            SoundEffect.play(PresetSound.cardDraw);
          }
        });
      }
    });
    return { name: '奥義駒選択（テスト）', action: null, subActions: subMenus_Icon };
  }

  createGameCharacter(position: PointerCoordinate): GameCharacter {
    let character = GameCharacter.create('新しいキャラクター', 1, '');
    character.location.x = position.x - 25;
    character.location.y = position.y - 25;
    character.posZ = position.z;
    return character;
  }

  createGameTableMask(position: PointerCoordinate): GameTableMask {
    let viewTable = this.getViewTable();
    if (!viewTable) return;

    let tableMask = GameTableMask.create('マップマスク', 5, 5, null, 100);
    tableMask.location.x = position.x - 25;
    tableMask.location.y = position.y - 25;
    tableMask.posZ = position.z;

    viewTable.appendChild(tableMask);
    return tableMask;
  }

  createRaigoOngoma(time_min: number, time_sec: number): Terrain {
    let url: string = './assets/images/raigo/on.png';
    let image: ImageFile = ImageStorage.instance.get(url)
    if (!image) image = ImageStorage.instance.add(url);

    url = './assets/images/raigo/on_wall.png';
    let image_wall: ImageFile = ImageStorage.instance.get(url)
    if (!image_wall) image_wall = ImageStorage.instance.add(url);

    let viewTable = this.getViewTable();
    if (!viewTable) return;

    let terrain = Terrain.create('隠駒', 8.5, 8.5, 0, image_wall.identifier, image.identifier);
    terrain.location.x = Coodinate.Common.Ongoma.PositionX;
    terrain.location.y = Coodinate.Common.Ongoma.PositionY;
    terrain.posZ = 0;
    terrain.timer_A_min = time_min;
    terrain.timer_A_sec = time_sec;
    terrain.timer_B_min = time_min;
    terrain.timer_B_sec = time_sec;
    terrain.isLocked = true;
    viewTable.appendChild(terrain);
    return terrain;
  }

  createRaigoDark(): Terrain {
    let url: string = './assets/images/dice/huon/huon[1].png';
    let image: ImageFile = ImageStorage.instance.get(url)
    if (!image) image = ImageStorage.instance.add(url);

    url = './assets/images/raigo/on_wall.png';
    let image_wall: ImageFile = ImageStorage.instance.get(url)
    if (!image_wall) image_wall = ImageStorage.instance.add(url);

    let viewTable = this.getViewTable();
    if (!viewTable) return;

    let rot: number = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    let huons: Terrain[] = this.tabletopService.terrains.filter(Terrain => { return Terrain.name == "禁忌" && Terrain.rotate == rot });
    let terrain = Terrain.create('禁忌', 1.5, 1.5, 0, image_wall.identifier, image.identifier);
    switch (rot) {
      case 0:
        terrain.location.x = Coodinate.Player1.kinki[huons.length].PositionX;
        terrain.location.y = Coodinate.Player1.kinki[huons.length].PositionY;
        break;
      case 180:
        terrain.location.x = Coodinate.Player2.kinki[huons.length].PositionX;
        terrain.location.y = Coodinate.Player2.kinki[huons.length].PositionY;
        break;
    }
    terrain.rotate = rot;
    terrain.posZ = 0;
    terrain.isLocked = true;
    viewTable.appendChild(terrain);
    SoundEffect.play(PresetSound.dicePut);
    return terrain;
  }

  createTextNote(position: PointerCoordinate): TextNote {
    let textNote = TextNote.create('共有メモ', 'テキストを入力してください', 5, "", 4, 3);
    textNote.location.x = position.x;
    textNote.location.y = position.y;
    textNote.posZ = position.z;
    return textNote;
  }

  createDefaultDiceSymbol() {
    let dice = this.createDiceSymbol({ x: 0, y: 0, z: 0 }, "陽玉", DiceType.D30, '30_dice', '2');
    //dice.face = "2";
    //dice.ownersID = PeerCursor.myCursor.userId;
    dice.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    switch (dice.rotate) {
      case 0:
        dice.location.x = 1245;
        dice.location.y = 1250;
        break;
      case 90:
        dice.location.x = 600;
        dice.location.y = 1245;
        break;
      case 180:
        dice.location.x = 605;
        dice.location.y = 600;
        break;
      case 270:
        dice.location.x = 1250;
        dice.location.y = 605;
        break;
    }
    dice.isLocked = true;
    this.createDiceSymbolMarker(dice.rotate);
    SoundEffect.play(PresetSound.dicePut);
  }

  createDiceSymbol(position: PointerCoordinate, name: string, diceType: DiceType, imagePathPrefix: string, point): DiceSymbol {
    if (point > 9) { name = "陽玉（雷神）"; imagePathPrefix = "30_raijin"; }
    let diceSymbol = DiceSymbol.create(name, diceType, 1, point);
    let image: ImageFile = null;
    let img: string = "";
    if (diceType == DiceType.D30) {
      img = this.IconJudge();
    }
    diceSymbol.faces.forEach(face => {
      let url: string = `./assets/images/dice/${imagePathPrefix + img}/${imagePathPrefix + img}[${face}].png`;
      //let url: string = `./assets/images/dice/orb.png`;
      image = ImageStorage.instance.get(url);
      if (!image) { image = ImageStorage.instance.add(url); }
      diceSymbol.imageDataElement.getFirstElementByName(face).value = image.identifier;
    });

    diceSymbol.location.x = position.x - 25;
    diceSymbol.location.y = position.y - 25;
    diceSymbol.posZ = position.z;
    diceSymbol.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    image = null;
    img = null;
    return diceSymbol;
  }

  async createDiceSymbolMarker(rot: number) {
    //let dices: DiceSymbol[] = this.tabletopService.diceSymbols.filter(DiceSymbol => { return DiceSymbol.rotate == rot && DiceSymbol.name == "陽玉" });
    let totals: Card[] = this.tabletopService.cards.filter(Card => { return Card.rotate == rot && Card.name == "得点"; });
    for (let total of totals) {
      total.destroy();
    }
    let point: string = PeerCursor.myCursor.points.toString();
    let icon = this.IconJudge();
    let url: string = './assets/images/dice/' + '/30_dice' + icon + '/30_dice' + icon + '[' + point + '].png';
    if (!ImageStorage.instance.get(url)) ImageStorage.instance.add(url);
    let total: Card = Card.create("得点", url, url, 4);
    //total.ownersID = PeerCursor.myCursor.userId;
    total.rotate = rot;
    //total.zindex = 1;
    switch (total.rotate) {
      case 0:
        total.location.x = Coodinate.Player1.Point.PositionX;
        total.location.y = Coodinate.Player1.Point.PositionY;
        break;
      case 90:
        total.location.x = -1.5;
        total.location.y = 1672.5;
        break;
      case 180:
        total.location.x = Coodinate.Player2.Point.PositionX;
        total.location.y = Coodinate.Player2.Point.PositionY;
        break;
      case 270:
        total.location.x = 1698.5;
        total.location.y = 25;
        break;
    }
    total.isLocked = true;
    SoundEffect.play(PresetSound.dicePut);
    return total;
  }

  calcPoint() {
    let TowerName: Terrain[] = this.tabletopService.terrains;
    let point: number = 2;
    let rot = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    TowerName = TowerName.filter(towername => { return towername.rotate == rot; });
    for (let key of TowerName) {
      point += key.towerpoint;
    }
    return point.toString();
  }

  createRaigeki(location: { x: number, y: number }) {
    let url: string = './assets/images/raigo/gif/rakurai.gif';
    let image: ImageFile = ImageStorage.instance.get(url)
    if (!image) image = ImageStorage.instance.add(url);
    let raigeki: TextNote = TextNote.create("", "", 1, url, 6, 5);
    raigeki.location.x = location.x;
    raigeki.location.y = location.y;
    raigeki.isLocked = true;
    return raigeki;
  }

  createspread(location: { x: number, y: number }) {
    let url: string = './assets/images/raigo/gif/spread.gif';
    let image: ImageFile = ImageStorage.instance.get(url)
    if (!image) image = ImageStorage.instance.add(url);
    let spread: Card = Card.create("", url, url, 5);
    spread.location.x = location.x;
    spread.location.y = location.y;
    spread.isLocked = true;
    return spread;
  }

  createcharge(location: { x: number, y: number }) {
    let url: string = './assets/images/raigo/gif/charge.gif';
    let image: ImageFile = ImageStorage.instance.get(url)
    if (!image) image = ImageStorage.instance.add(url);
    let charge: Card = Card.create("", url, url, 15);
    charge.location.x = location.x;
    charge.location.y = location.y;
    charge.zindex = 99;
    charge.isLocked = true;
    return charge;
  }

  createkyokoku() {
    Coodinate.Player1.Kyokoku.forEach(item => {
      let cardStack = CardStack.create('峡谷');
      cardStack.komaname = item.Komaname;
      cardStack.location.x = item.PositionX;
      cardStack.location.y = item.PositionY - 10;
      cardStack.rotate = item.Rotate;
      cardStack.posZ = 0;
      cardStack.isLocked = true;
      let url: string = './assets/images/raigo/' + item.Komaname + '.jpg';
      if (!ImageStorage.instance.get(url)) {
        ImageStorage.instance.add(url);
      }
      let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + item.Komaname + '.jpg';
      if (!ImageStorage.instance.get(summery_url)) {
        ImageStorage.instance.add(summery_url);
      }
      let card = Card.create("葵石駒", url, url, 1.8, summery_url);
      cardStack.putOnBottom(card);
      cardStack.uprightAll();
    });

    Coodinate.Player2.Kyokoku.forEach(item => {
      let cardStack = CardStack.create('峡谷');
      cardStack.komaname = item.Komaname;
      cardStack.location.x = item.PositionX;
      cardStack.location.y = item.PositionY + 10;
      cardStack.rotate = item.Rotate;
      cardStack.isLocked = true;
      cardStack.posZ = 0;
      let url: string = './assets/images/raigo/' + item.Komaname + '.jpg';
      if (!ImageStorage.instance.get(url)) {
        ImageStorage.instance.add(url);
      }
      let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + item.Komaname + '.jpg';
      if (!ImageStorage.instance.get(summery_url)) {
        ImageStorage.instance.add(summery_url);
      }
      let card = Card.create("葵石駒", url, url, 1.8, summery_url);
      cardStack.putOnBottom(card);
      cardStack.uprightAll();
    });
  }

  //createTrump(position: PointerCoordinate): CardStack {
  //  let cardStack = CardStack.create('トランプ山札');
  //  cardStack.location.x = position.x - 25;
  //  cardStack.location.y = position.y - 25;
  //  cardStack.posZ = position.z;

  //  let back: string = './assets/images/trump/z02.gif';
  //  if (!ImageStorage.instance.get(back)) {
  //    ImageStorage.instance.add(back);
  //  }

  //  let suits: string[] = ['c', 'd', 'h', 's'];
  //  let trumps: string[] = [];

  //  for (let suit of suits) {
  //    for (let i = 1; i <= 13; i++) {
  //      trumps.push(suit + (('00' + i).slice(-2)));
  //    }
  //  }

  //  trumps.push('x01');
  //  trumps.push('x02');

  //  for (let trump of trumps) {
  //    let url: string = './assets/images/trump/' + trump + '.gif';
  //    if (!ImageStorage.instance.get(url)) {
  //      ImageStorage.instance.add(url);
  //    }
  //    let card = Card.create('カード', url, back);
  //    cardStack.putOnBottom(card);
  //  }
  //  return cardStack;
  //}

  createKiseki(players: number, size?: string, Raijinmode?: boolean) {
    let kisekis: { filename: string, weight: number, type: string, quantity: number, name: string }[] = new Array();
    for (let i = 1; i <= halfsize; i++) {
      kisekis.push(otonashi[i - 1]);
      kisekis.push(kotodama[i - 1]);
    }
    if (this.isFullSize == true) {
      for (let i = halfsize + 1; i <= 8; i++) {
        kisekis.push(otonashi[i - 1]);
        kisekis.push(kotodama[i - 1]);
      }
      if (!Raijinmode) {
        let availableOugi = ougi.filter(ougi => { return ougi.available == true });
        let num: number = Math.floor(Math.random() * availableOugi.length);
        kisekis.push(availableOugi[num]);
      }
      if (players != 4) kisekis = kisekis.filter(kiseki => { return kiseki.filename != "八" });
    }
    return kisekis;
  }

  createRaijin() {
    let cardStack = CardStack.create('奥義駒');
    cardStack.location.x = Coodinate.Common.FrontDeck.PositionX;
    cardStack.location.y = Coodinate.Common.FrontDeck.PositionY;
    cardStack.posZ = 0;
    let availableOugi = ougi.filter(ougi => { return ougi.available == true && ougi.filename != "滅" });
    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }
    availableOugi.forEach(kiseki => {
      let url: string = './assets/images/raigo/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(url)) {
        ImageStorage.instance.add(url);
      }
      let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(summery_url)) {
        ImageStorage.instance.add(summery_url);
      }
      for (let q = 1; q <= kiseki.quantity; q++) {
        let card = Card.create("葵石駒", url, back, 1.8, summery_url);
        card.weight = kiseki.weight;
        card.type = kiseki.type;
        card.komaname = kiseki.filename;
        card.state = CardState.BACK;
        cardStack.putOnBottom(card);
        cardStack.uprightAll();
      }
    });
    cardStack.shuffle();
    cardStack.faceDownAll();
    cardStack.uprightAll();
    cardStack.isLocked = true;
    let players: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
    if (players.length > 0) {
      let member: { locationx: number, locationy: number, rot: number }[] = [
        { locationx: Coodinate.Player1.Ougi.PositionX, locationy: Coodinate.Player1.Ougi.PositionY, rot: Coodinate.Player1.Ougi.Rotate },
        { locationx: Coodinate.Player2.Ougi.PositionX, locationy: Coodinate.Player2.Ougi.PositionY, rot: Coodinate.Player2.Ougi.Rotate },
        { locationx: 1323, locationy: 937.5, rot: 270 },
        { locationx: 528.5, locationy: 880, rot: 90 }
      ];
      for (let player = 0; player < players.length; player++) {
        let OugiStack = CardStack.create('奥義駒');
        for (let cards = 1; cards <= 2; cards++) {
          let Ougi = cardStack.drawCard();
          OugiStack.putOnBottom(Ougi);
          OugiStack.location.x = member[player].locationx;
          OugiStack.location.y = member[player].locationy;
          OugiStack.rotate = member[player].rot;
          OugiStack.isLocked = true;
          OugiStack.BAN_flag = true;
        }
      }
      cardStack.destroy();
    }
  }

  createOugi(position: PointerCoordinate, koma: string) {
    let kiseki = ougi.filter(ougi => { return ougi.filename == koma })[0];
    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }
    let url: string = './assets/images/raigo/' + kiseki.filename + '.jpg';
    if (!ImageStorage.instance.get(url)) {
      ImageStorage.instance.add(url);
    }
    let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki.filename + '.jpg';
    if (!ImageStorage.instance.get(summery_url)) {
      ImageStorage.instance.add(summery_url);
    }
    let card = Card.create("葵石駒", url, back, 1.8, summery_url);
    card.weight = kiseki.weight;
    card.type = kiseki.type;
    card.komaname = kiseki.filename;
    card.state = CardState.BACK;
    card.owner = Network.peerContext.userId;
    card.location.x = position.x;
    card.location.y = position.y;
    card.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    card.setLocation(card.location.name);
  }

  createRaijin_(ougi1?: string, ougi2?: string, ougi3?: string) {
    let cardStack = CardStack.create('奥義駒');
    cardStack.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    switch (cardStack.rotate) {
      //case 0:
      //  cardStack.location.x = 1431;
      //  cardStack.location.y = 1172.5;
      //  break;
      case 0:
        cardStack.location.x = Coodinate.Player1.Ougi.PositionX;
        cardStack.location.y = Coodinate.Player1.Ougi.PositionY;
        break;
      case 90:
        cardStack.location.x = 528.5;
        cardStack.location.y = 880;
        break;
      case 180:
        cardStack.location.x = Coodinate.Player2.Ougi.PositionX;
        cardStack.location.y = Coodinate.Player2.Ougi.PositionY;
        break;
      case 270:
        cardStack.location.x = 1323;
        cardStack.location.y = 937.5;
        break;
    }
    cardStack.posZ = 0;
    let availableOugi = ougi.filter(ougi => { return ougi.filename != "滅" && ougi.filename == ougi1 || ougi.filename == ougi2 || ougi.filename == ougi3 });
    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }
    availableOugi.forEach(kiseki => {
      let url: string = './assets/images/raigo/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(url)) {
        ImageStorage.instance.add(url);
      }
      let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(summery_url)) {
        ImageStorage.instance.add(summery_url);
      }
      for (let q = 1; q <= kiseki.quantity; q++) {
        let card = Card.create("葵石駒", url, back, 1.8, summery_url);
        card.weight = kiseki.weight;
        card.type = kiseki.type;
        card.komaname = kiseki.filename;
        card.state = CardState.BACK;
        cardStack.putOnBottom(card);
        cardStack.uprightAll();
      }
    });
    cardStack.isLocked = true;
    //let players: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
    //if (players.length > 0) {
    //  let member: { locationx: number, locationy: number, rot: number }[] = [
    //    //{ locationx: 898.5, locationy: 1315, rot: 0 },
    //    //{ locationx: 951, locationy: 525, rot: 180 },
    //    //{ locationx: 1323, locationy: 937.5, rot: 270 },
    //    //{ locationx: 528.5, locationy: 880, rot: 90 }
    //  ];
    //  for (let player = 0; player < players.length; player++) {
    //    let OugiStack = CardStack.create('奥義駒');
    //    for (let cards = 1; cards <= 2; cards++) {
    //      let Ougi = cardStack.drawCard();
    //      OugiStack.putOnBottom(Ougi);
    //      OugiStack.location.x = member[player].locationx;
    //      OugiStack.location.y = member[player].locationy;
    //      OugiStack.rotate = member[player].rot;
    //      OugiStack.isLocked = true;
    //    }
    //  }
    //  cardStack.destroy();
    //}
    return cardStack;
  }

  createRaigo_(koma: string,type: string) {
    let kiseki;
    switch (type) {
      case "otonashi":
        kiseki = otonashi.filter(otonashi => { return otonashi.filename == koma })[0];
        break;
      case "kotodama":
        kiseki = kotodama.filter(kotodama => { return kotodama.filename == koma })[0];
        break;
      case "ougi":
        kiseki = ougi.filter(ougi => { return ougi.filename == koma })[0];
        break;
      default:
        break;
    }
    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }
    let url: string = './assets/images/raigo/' + kiseki.filename + '.jpg';
    if (!ImageStorage.instance.get(url)) {
      ImageStorage.instance.add(url);
    }
    let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki.filename + '.jpg';
    if (!ImageStorage.instance.get(summery_url)) {
      ImageStorage.instance.add(summery_url);
    }
    let card = Card.create("葵石駒", url, back, 1.8, summery_url);
    card.weight = kiseki.weight;
    card.type = kiseki.type;
    card.komaname = kiseki.filename;
    card.state = CardState.FRONT;
    switch (this.CalcObjectRotate(PeerCursor.myCursor.RotZ)) {
      case 0:
        card.location.x = Coodinate.Player1.Drawcard[0].PositionX;
        card.location.y = Coodinate.Player1.Drawcard[0].PositionY;
        card.rotate = Coodinate.Player1.Drawcard[0].Rotate;
        break;
      case 90:
        card.location.x = 528.5;
        card.location.y = 880;
        break;
      case 180:
        card.location.x = Coodinate.Player2.Drawcard[0].PositionX;
        card.location.y = Coodinate.Player2.Drawcard[0].PositionY;
        card.rotate = Coodinate.Player2.Drawcard[0].Rotate;
        break;
      case 270:
        card.location.x = 1323;
        card.location.y = 937.5;
        break;
    }
    card.setLocation(card.location.name);
  }

  createToyama(num: number) {
    let cardStacks: CardStack[] = this.tabletopService.cardStacks.filter(deck => { return deck.name == "雷山" });
    let availableRaijins = raijin.filter(God => { return God.available == true; });
    let Ougi: CardStack = this.createRaijin_(availableRaijins[num].Ougi1, availableRaijins[num].Ougi2, availableRaijins[num].Ougi3);
    cardStacks.forEach(Stack => {
      let NewStack: CardStack = this.concatStack(Ougi, Stack);
      NewStack.shuffle();
      NewStack.uprightAll();
    });
  }

  concatStack(topStack: CardStack, bottomStack: CardStack) {
    let newCardStack = CardStack.create(bottomStack.name);
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

    return newCardStack;
  }

  Raizaninitial(players: number, cardStack: CardStack) {
    cardStack.shuffle();
    cardStack.faceDownAll();
    cardStack.uprightAll();
    cardStack.isLocked = true;

    let top: Card = cardStack.drawCard();
    top.location.x = Coodinate.Common.Gora.PositionX;
    top.location.y = Coodinate.Common.Gora.PositionY;
    if (players == 4) top.state = CardState.FRONT;
    else top.state = CardState.BACK;
    top.isLocked = true;
  }

  Raizaninitial_tanabata(players: number, cardStack: CardStack) {
    let kiseki = otonashi.filter(otonashi => { return otonashi.filename == "七" })[0];
    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }
    let url: string = './assets/images/raigo/' + kiseki.filename + '.jpg';
    if (!ImageStorage.instance.get(url)) {
      ImageStorage.instance.add(url);
    }
    let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki.filename + '.jpg';
    if (!ImageStorage.instance.get(summery_url)) {
      ImageStorage.instance.add(summery_url);
    }
    let card = Card.create("葵石駒", url, back, 1.8, summery_url);
    card.weight = kiseki.weight;
    card.type = kiseki.type;
    card.komaname = kiseki.filename;
    card.state = CardState.FRONT;
    card.owner = Network.peerContext.userId;
    card.location.x = Coodinate.Common.Gora.PositionX;
    card.location.y = Coodinate.Common.Gora.PositionY;
    card.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    card.isLocked = true;
    card.setLocation(card.location.name);
    cardStack.shuffle();
  }

 createRaigo(Raijinmode: boolean): CardStack {
    let cardStack = CardStack.create('雷山');
    let deckvolume: { players: number, size: string } = { players: 2, size: "Half" };
    let nameplates: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
    if (nameplates.length > 2) deckvolume.players = 4;
    if (this.isFullSize == true) deckvolume.size = "Full";
    let kisekis = this.createKiseki(deckvolume.players, deckvolume.size, Raijinmode);
    cardStack.location.x = Coodinate.Common.Deck.PositionX;
    cardStack.location.y = Coodinate.Common.Deck.PositionY;
    cardStack.posZ = 0;

    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }

    kisekis.forEach(kiseki => {
      let url: string = './assets/images/raigo/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(url)) {
        ImageStorage.instance.add(url);
      }
      let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(summery_url)) {
        ImageStorage.instance.add(summery_url);
      }
      for (let q = 1; q <= kiseki.quantity; q++) {
        let card = Card.create("葵石駒", url, back, 1.8, summery_url);
        card.weight = kiseki.weight;
        card.type = kiseki.type;
        card.komaname = kiseki.filename;
        card.state = CardState.BACK;
        cardStack.putOnBottom(card);
        cardStack.uprightAll();
      }
    });
    this.Raizaninitial(deckvolume.players, cardStack);
      return cardStack;
  }

  createRaigo_tanabata(Raijinmode: boolean): CardStack {
    let cardStack = CardStack.create('雷山');
    let deckvolume: { players: number, size: string } = { players: 2, size: "Half" };
    let nameplates: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
    if (nameplates.length > 2) deckvolume.players = 4;
    if (this.isFullSize == true) deckvolume.size = "Full";
    let kisekis = this.createKiseki(deckvolume.players, deckvolume.size, Raijinmode);
    cardStack.location.x = Coodinate.Common.Deck.PositionX;
    cardStack.location.y = Coodinate.Common.Deck.PositionY;
    cardStack.posZ = 0;

    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }

    kisekis.forEach(kiseki => {
      let url: string = './assets/images/raigo/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(url)) {
        ImageStorage.instance.add(url);
      }
      let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki.filename + '.jpg';
      if (!ImageStorage.instance.get(summery_url)) {
        ImageStorage.instance.add(summery_url);
      }
      for (let q = 1; q <= kiseki.quantity; q++) {
        let card = Card.create("葵石駒", url, back, 1.8, summery_url);
        card.weight = kiseki.weight;
        card.type = kiseki.type;
        card.komaname = kiseki.filename;
        card.state = CardState.BACK;
        cardStack.putOnBottom(card);
        cardStack.uprightAll();
      }
    });
    this.Raizaninitial_tanabata(deckvolume.players, cardStack);
    return cardStack;
  }

  createRaigoManual(position: PointerCoordinate, start: number, end: number): CardStack {
    let cardStack = CardStack.create('説明書（サマリー）');
    cardStack.location.x = position.x - 5;
    cardStack.location.y = position.y - 5;
    cardStack.posZ = position.z;
    cardStack.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);

    for (let i = start; i <= end; i++) {
      let url: string = './assets/images/raigo/manual/' + i + '.jpg';
      if (!ImageStorage.instance.get(url))
        ImageStorage.instance.add(url);

      let card = Card.create('説明書（サマリー）', url, url, 10);
      card.state = CardState.FRONT;
      cardStack.putOnBottom(card);
    }
    return cardStack;
  }

  createNameplate(position: PointerCoordinate, name: string): Card {
    let url: string = './assets/images/raigo/nameplate/' + name + '.png';
    if (!ImageStorage.instance.get(url))
      ImageStorage.instance.add(url);
    let card = Card.create('名札', url, url, 2);
    card.location.x = position.x - 5;
    card.location.y = position.y - 5;
    card.raijinname = name;
    card.posZ = position.z;
    card.state = CardState.FRONT;
    card.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    return card;
  }

  createnameplate(name: string, design: string): Card {
    let url: string = './assets/images/raigo/nameplate/' + design + '.jpg';
    if (!ImageStorage.instance.get(url))
      ImageStorage.instance.add(url);
    let card = Card.create('名札', url, url, 8);
    switch (this.CalcObjectRotate(PeerCursor.myCursor.RotZ)) {
      case 0:
        card.location.x = Coodinate.Player1.Nameplate.PositionX;
        card.location.y = Coodinate.Player1.Nameplate.PositionY;
        card.rotate = 0;
        this.createDiceSymbolMarker(0);
        break;
      case 180:
        card.location.x = Coodinate.Player2.Nameplate.PositionX;
        card.location.y = Coodinate.Player2.Nameplate.PositionY;
        card.rotate = 180;
        this.createDiceSymbolMarker(180);
        break;
      default:
        break;
    }
    card.raijinname = name;
    card.posZ = 0;
    card.state = CardState.FRONT;
    card.playername = name;
    card.isLocked = true;
    return card;
  }

  makeDefaultTabletopObjects() {

  }

  getViewTable(): GameTable {
    let tableSelecter = ObjectStore.instance.get<TableSelecter>('tableSelecter');
    return tableSelecter ? tableSelecter.viewTable : null;
  }

  deleteAllCards(all?: boolean) {
    let cards: Card[] = this.tabletopService.cards;
    if (!all) cards = cards.filter(Card => { return Card.name != "名札" && Card.name != "得点"; });
    for (let card of cards) {
      card.destroy();
      card = null;
    }
  }

  updateAllCards(all?: boolean) {
    let cards: Card[] = this.tabletopService.cards;
    if (!all) cards = cards.filter(Card => { return Card.name != "名札" });
    for (let card of cards) {
      card.setLocation(card.location.name);
    }
  }

  updateAllCardStacks(all?: boolean) {
    let cardstack: CardStack[] = this.tabletopService.cardStacks;
    for (let stack of cardstack) {
      stack.setLocation(stack.location.name);
    }
  }

  deleteAllCardStacks() {
    let cardstacks: CardStack[] = this.tabletopService.cardStacks;
    for (let cardstack of cardstacks) {
      cardstack.destroy();
      cardstack = null;
    }
  }

  deleteAllCharacters() {
    let characters: GameCharacter[] = this.tabletopService.characters;
    for (let character of characters) {
      character.destroy();
      character = null;
    }
  }

  deleteAllTerrains() {
    let terrains: Terrain[] = this.tabletopService.terrains;
    for (let terrain of terrains) {
      terrain.destroy();
      terrain = null;
    }
  }

  deleteAlltableMasks() {
    let tablemasks: GameTableMask[] = this.tabletopService.tableMasks;
    for (let tablemask of tablemasks) {
      tablemask.destroy();
      tablemask = null;
    }
  }

  deleteAllDiceSymbols(all?: boolean) {
    let dices: DiceSymbol[] = this.tabletopService.diceSymbols;
    if (!all) dices = dices.filter(DiceSymbol => { return DiceSymbol.name != "陽玉"; });
    for (let dice of dices) {
      dice.destroy();
      dice = null;
    }
  }

  async CreateHistory(kisekis) {
    await this.deleteAllCards();
    await this.deleteAllCardStacks();
    await this.deleteAllCharacters();
    await this.deleteAllTerrains();
    await this.deleteAlltableMasks();
    await this.deleteAllDiceSymbols();
    await this.createRaigoOngoma(0,0);
    let cardStack = CardStack.create('雷山');
    cardStack.location.x = Coodinate.Common.Deck.PositionX;
    cardStack.location.y = Coodinate.Common.Deck.PositionY;
    cardStack.posZ = 0;
    let back: string = './assets/images/raigo/ura.jpg';
    if (!ImageStorage.instance.get(back)) {
      ImageStorage.instance.add(back);
    }

    kisekis.forEach(kiseki => {
      let url: string = './assets/images/raigo/' + kiseki[0].filename + '.jpg';
      if (!ImageStorage.instance.get(url)) {
        ImageStorage.instance.add(url);
      }
      let summery_url: string = './assets/images/raigo/manual/kisekigoma/' + kiseki[0].filename + '.jpg';
      if (!ImageStorage.instance.get(summery_url)) {
        ImageStorage.instance.add(summery_url);
      }
      let card = Card.create(kiseki[0].name, url, back, 1.8, summery_url);
      card.weight = kiseki[0].weight;
      card.type = kiseki[0].type;
      card.state = CardState.BACK;
      cardStack.putOnBottom(card);
    });
    cardStack.faceDownAll();
    cardStack.uprightAll();
    cardStack.isLocked = true;

    let top: Card = cardStack.drawCard();
    top.location.x = Coodinate.Common.Gora.PositionX;
    top.location.y = Coodinate.Common.Gora.PositionY;
    top.state = CardState.BACK;
    top.isLocked = true;

    SoundEffect.play(PresetSound.raijin);
    back = null;
    return cardStack;
  }

  createsentences(position: PointerCoordinate, menuName: string, cards?: Card[], RaigoFlag?: boolean, GoraFlag?: boolean): Terrain {
    let url: string = './assets/images/raigo/ichinichi/' + menuName + '.png';
    if (RaigoFlag == true) url = './assets/images/raigo/ichinichi/' + menuName + '（雷轟解放）.png';
    let image: ImageFile = ImageStorage.instance.get(url)
    if (!image) image = ImageStorage.instance.add(url);

    let viewTable = this.getViewTable();
    if (!viewTable) return;
    let depth: number = 9;
    if (menuName.slice(0, 1) == "+") depth = 1;
    if (RaigoFlag == true || GoraFlag == true) depth = 9;
    let sentences: Terrain = Terrain.create('役名', 0.5, depth, 0, image.identifier, image.identifier);
    sentences.location.x = position.x;
    sentences.location.y = position.y;
    sentences.posZ = position.z;
    sentences.towername = menuName;
    sentences.rotate = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    if (cards) {
      sentences.towers = cards;
      for (let i = 0; i < cards.length; i++) {
        sentences.parts += cards[i].komaname;
      }
    }
    if (RaigoFlag == true) sentences.RaigoFlag = true;
    viewTable.appendChild(sentences);
    return sentences;
  }

  CalcObjectRotate(RotZ: number) {
    for (; RotZ < 360; RotZ += 360) { }
    let radian: number = Math.floor(RotZ / 45);
    switch (radian % 8) {
      case 0:
      case 7:
        return 0;
      case 1:
      case 2:
        return 270;
      case 3:
      case 4:
        return 180;
      case 5:
      case 6:
        return 90;
    }
  }

  SearchUchigoma(player: Card) {
    let deg: number = this.CalcObjectRotate(player.rotate);
    let start: { x: number, y: number } = this.CalcUchigomaPointer_Start(deg);
    let end: { x: number, y: number } = this.CalcUchigomaPointer_End(deg);

    let card_filterA: Card[] = this.tabletopService.cards.filter(card => { return card.name == "葵石駒" && start.x < card.location.x && card.location.x < end.x });
    let card_filterB: Card[] = card_filterA.filter(card => { return start.y < card.location.y && card.location.y < end.y });
    return card_filterB.length;
  }

  CalcUchigomaPointer_Start(deg: number) {
    switch (deg) {
      case 0:
        return { x: 900, y: 900 };
        break;
      case 90:
        return { x: 225, y: 700 };
        break;
      case 180:
        return { x: 900, y: 25 };
        break;
      case 270:
        return { x: 1325, y: 725 };
        break;
    }
  }

  CalcUchigomaPointer_End(deg: number) {
    switch (deg) {
      case 0:
        return { x: 1450, y: 1275 };
        break;
      case 90:
        return { x: 575, y: 1075 };
        break;
      case 180:
        return { x: 1425, y: 425 };
        break;
      case 270:
        return { x: 1650, y: 1225 };
        break;
    }
  }

  resetStatus() {
    let cursors = ObjectStore.instance.getObjects<PeerCursor>(PeerCursor);
    cursors.forEach(cursor => {
      cursor.points = 2;
      cursor.towers = new Array();
      cursor.towerpro = new Array();
      cursor.raigotimes = 0;
    })
  }

  Calcmakimonoppoint() {
    let cards: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" });
    if (cards.length > 2)
      return [
        { locationx: 1190, locationy: 1280, rot: 0, color: "_rakura" },
        { locationx: 43, locationy: -30, rot: 180, color: "_yakumo" },
        { locationx: 1270, locationy: 55, rot: 270, color: "_hisetsu" },
        { locationx: -35, locationy: 1190, rot: 90, color: "_kuze" },
      ];
    else return [
      { locationx: 1190, locationy: 1280, rot: 0, color: "_kuze" },
      { locationx: 43, locationy: -30, rot: 180, color: "_shigure" },
    ];
  }

  async createMakimono(member: { locationx: number, locationy: number, rot: number, color: string }, id: string) {
    let color: string = this.IconJudge();
    let deg: number = this.CalcObjectRotate(PeerCursor.myCursor.RotZ);
    let url: string = "./assets/images/raigo/makimono/makimono" + member.color + id;
    let image: ImageFile = ImageStorage.instance.get(url);
    if (!image) image = ImageStorage.instance.add(url);
    let image_wall: ImageFile = ImageStorage.instance.get(url)
    if (!image_wall) image_wall = ImageStorage.instance.add(url);

    let viewTable = this.getViewTable();
    if (!viewTable) return;

    let terrain = Terrain.create('解放目録', 13.3, 13, 0, image_wall.identifier, image.identifier);
    terrain.location.x = member.locationx;
    terrain.location.y = member.locationy;
    terrain.posZ = 0;
    terrain.rotate = member.rot;
    terrain.isLocked = true;

    viewTable.appendChild(terrain);
    return terrain;
  }

  Resolve(value) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(1);
      }, value);
    })
  }

  teamdivide() {
    let cardStack = CardStack.create("名札");
    let member: { locationx: number, locationy: number, rot: number }[] = [
      { locationx: 1730, locationy: 1380, rot: 0 },
      { locationx: 70, locationy: 180, rot: 180 },
      { locationx: 1502.5, locationy: -46.5, rot: 270 },
      { locationx: 297, locationy: 1600, rot: 90 },
    ];
    let cards: Card[] = this.tabletopService.cards.filter(card => { return card.name == "名札" && card.isLocked == false });

    for (let card of cards) {
      card.isLocked = false;
      cardStack.putOnBottom(card);
    }
    if (cardStack.cards.length == 0) {
      cardStack.destroy();
      cardStack = null;
    }
    cardStack.shuffle();
    let names = cardStack.drawCardAll();
    let num: number = 0;
    for (let card of names) {
      if (num > 3) {
        card.location.x = 1600 + num * 100;
        card.location.y = 950;
        card.rotate = 0;
        card.toTopmost();
        card.setLocation(cardStack.location.name);
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
    cardStack.setLocation('graveyard');
    cardStack.destroy();
  }

  refresh() {
    let cardstacks: CardStack[] = this.tabletopService.cardStacks;
    cardstacks = cardstacks.filter(stack => { return stack.name == "峡谷"});
    for (let stack of cardstacks) {
      stack.setLocation(stack.location.name);
    }

  }

  IconJudge() {
    let img: string = "";
    switch (PeerCursor.myCursor.imageIdentifier) {
      case "icon[1]":
      case "icon[11]":
        img = "_rakura";
        break;
      case "icon[2]":
      case "icon[6]":
      case "icon[12]":
        img = "_kuze";
        break;
      case "icon[3]":
      case "icon[8]":
      case "icon[9]":
        img = "_hisetsu";
        break;
      case "icon[4]":
      case "icon[7]":
        img = "_yakumo";
        break;
      case "icon[5]":
      case "icon[10]":
        img = "_shigure";
        break;
      default:
        break;
    }
    return img;
  }

}

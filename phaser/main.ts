import Phaser from "phaser";
import {redCards} from "../src/data";
import {champions} from "../src/engine/champions";
import type {CardDefinition} from "../src/types";
import {getLayout,getDropLane,lanes,clamp,type BoardLayout,type Lane,type Rect} from "./layout";
import "./style.css";

// A deliberately isolated vertical slice: the engine, rules, IA and tokens
// will be connected only after touch+mouse dragging passes real-browser QA.
const CARDS=redCards.slice(0,3);
const LABELS:Record<Lane,string>={siniestra:"SINIESTRA",trono:"TRONO",diestra:"DIESTRA"};
const PALETTE={dark:0x191a18,board:0x2a302c,slot:0x31362f,gold:0xd6b77d,cream:0xf1e4cc,black:0x121412};
const assetBase=window.location.pathname.includes("/gameplay-phaser/")
  ?new URL("../gameplay-v1-lab/",window.location.href).href
  :new URL("../gameplay-v1-lab/",window.location.href).href;

class DaggerScene extends Phaser.Scene{
  private geometry!:BoardLayout;
  private selected:number|null=null;
  private used=new Map<number,Lane>();
  private hoverPreview:Phaser.GameObjects.Container|null=null;
  private modal:Phaser.GameObjects.Container|null=null;
  private highlighted:Lane|null=null;
  private cardObjects=new Map<number,Phaser.GameObjects.Container>();
  private resizeHandler=()=>this.rebuild();

  constructor(){super("DaggerlightPhaserPreview");}

  preload(){
    this.load.image("playerFace",assetBase+"champions/faces/dextral.webp");
    this.load.image("rivalFace",assetBase+"champions/faces/sinistral.webp");
    this.load.image("redBackground",assetBase+"champions/backgrounds/red.webp");
    this.load.image("blueBackground",assetBase+"champions/backgrounds/blue.webp");
    this.load.image("redSheet",assetBase+"cards/v4/red-1.webp");
  }

  create(){
    if(this.textures.exists("redSheet")){
      try{
        const img=this.textures.get("redSheet").getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet("redCells",img,{
          frameWidth:Math.floor(img.width/3),
          frameHeight:Math.floor(img.height/2),
          endFrame:5
        });
      }catch(error){console.warn("Card sprite preview unavailable:",error);}
    }
    this.input.dragDistanceThreshold=8;
    this.scale.on(Phaser.Scale.Events.RESIZE,this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.scale.off(Phaser.Scale.Events.RESIZE,this.resizeHandler);
    });
    this.rebuild();
  }

  private rectangle(rect:Rect,fill:number,stroke=0x8a7651,opacity=1,interactive=false){
    const object=this.add.rectangle(rect.x+rect.w/2,rect.y+rect.h/2,rect.w,rect.h,fill,opacity)
      .setStrokeStyle(1,stroke);
    if(interactive)object.setInteractive({useHandCursor:true});
    return object;
  }

  private text(text:string,x:number,y:number,size:number,color="#efe2cb",weight="700"){
    return this.add.text(x,y,text,{
      fontFamily:"Inter, Arial, sans-serif",fontSize:size+"px",
      fontStyle:weight==="900"?"900":"bold",color
    }).setOrigin(.5);
  }

  private portrait(rect:Rect,key:string,name:string,health:number,active:boolean){
    this.rectangle(rect,0x24221e,0x81663e);
    const height=rect.h;
    const imgW=this.geometry.mode==="mobile"?height*.85:rect.w;
    const portraitRect=this.geometry.mode==="mobile"
      ?{x:rect.x+4,y:rect.y+4,w:imgW-8,h:height-8}
      :{x:rect.x+3,y:rect.y+3,w:rect.w-6,h:rect.h*.66};
    if(this.textures.exists(key)){
      const picture=this.add.image(portraitRect.x+portraitRect.w/2,
        portraitRect.y+portraitRect.h/2,key);
      const source=picture.texture.getSourceImage() as HTMLImageElement;
      const scale=Math.max(portraitRect.w/source.width,portraitRect.h/source.height);
      picture.setScale(scale);
      // Keep the head in the upper third, including the nonhuman portraits.
      if(this.geometry.mode==="desktop")picture.setY(portraitRect.y+portraitRect.h*.50);
    }
    const ribbonH=21;
    const left=rect.x+(this.geometry.mode==="mobile"?imgW+10:10);
    const labelY=this.geometry.mode==="mobile"?rect.y+height*.40:rect.y+height*.76;
    if(this.geometry.mode==="desktop"){
      this.add.rectangle(rect.x+43,rect.y+19,86,ribbonH,PALETTE.cream);
      this.text(name==="MAJESTAD CARMESÍ"?"VOS":"RIVAL",rect.x+40,rect.y+19,10,"#151515","900");
    }
    const nameLabel=this.text(name,
      this.geometry.mode==="mobile"?left+12:rect.x+rect.w/2,
      labelY,this.geometry.mode==="mobile"?14:16);
    if(this.geometry.mode==="mobile")nameLabel.setOrigin(0,.5);
    const lifeX=this.geometry.mode==="mobile"?rect.x+rect.w-41:rect.x+rect.w-38;
    const lifeY=this.geometry.mode==="mobile"?rect.y+rect.h/2:rect.y+rect.h*.58;
    this.add.circle(lifeX,lifeY,26,PALETTE.dark).setStrokeStyle(2,PALETTE.gold);
    this.text(String(health),lifeX,lifeY,24,"#f5e2bf","900");
    if(active){
      const ring=this.add.rectangle(rect.x+rect.w/2,rect.y+rect.h/2,
        rect.w-5,rect.h-5).setStrokeStyle(3,PALETTE.gold).setFillStyle(0,0);
      this.tweens.add({targets:ring,alpha:{from:.25,to:1},duration:900,yoyo:true,repeat:-1});
    }
  }

  private drawSlot(rect:Rect,lane:Lane,side:"player"|"opponent"){
    const rectObject=this.rectangle(rect,PALETTE.slot,0x7c6a4d,.97,side==="player");
    if(side==="player"){
      const handler=()=>{if(this.selected!==null)this.place(this.selected,lane);};
      rectObject.on("pointerup",handler);
    }
    const archivY=side==="player"?rect.y+12:rect.y+rect.h-12;
    this.text("ARCHIVO 0",rect.x+rect.w-44,archivY,
      this.geometry.mode==="mobile"?8:10,"#dbc492");
    if(side==="player"){
      for(const [idx,playedLane] of this.used.entries()){
        if(playedLane!==lane)continue;
        const h=clamp(72,rect.h*.72,145),w=h*.707;
        this.drawCard(idx,rect.x+rect.w/2,rect.y+rect.h/2,w,h,false);
      }
    }
  }

  private drawCard(index:number,x:number,y:number,w:number,h:number,interactive:boolean){
    const card=CARDS[index];
    const surface=this.add.container(x,y);
    const bg=this.add.rectangle(0,0,w,h,0x161615).setStrokeStyle(2,0xd6b77d);
    surface.add(bg);
    const inset=4;
    if(this.textures.exists("redCells")){
      const face=this.add.image(0,0,"redCells",index);
      face.setDisplaySize(w-inset*2,h-inset*2);
      surface.add(face);
    }else{
      surface.add(this.add.rectangle(0,-h*.12,w-inset*2,h*.67,0x6a3025));
      surface.add(this.add.text(-w*.39,-h*.31,String(card.power),{
        fontFamily:"Arial",fontSize:Math.max(13,w*.22)+"px",fontStyle:"bold",color:"#f6e7d6"
      }));
      surface.add(this.add.text(-w*.40,h*.18,card.name,{
        fontFamily:"Arial",fontSize:Math.max(9,w*.095)+"px",color:"#f3ebd9",
        wordWrap:{width:w*.8}
      }));
    }
    if(!interactive){surface.setDepth(8);return surface;}
    surface.setInteractive(new Phaser.Geom.Rectangle(-w/2,-h/2,w,h),Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(surface,true);
    surface.setDepth(12);
    let dragged=false;
    surface.on("pointerover",()=>{
      if(!dragged && !this.modal && this.geometry.mode==="desktop")this.showPreview(index);
    });
    surface.on("pointerout",()=>{if(!dragged && this.selected!==index)this.hidePreview();});
    surface.on("pointerup",()=>{
      if(dragged||this.modal)return;
      if(this.selected===index){
        this.showInspector(index);
      }else{
        this.selected=index;
        this.time.delayedCall(0,()=>this.rebuild());
      }
    });
    surface.on("dragstart",()=>{
      dragged=true;
      this.selected=index;
      this.hidePreview();
      surface.setScale(1.2).setDepth(150);
    });
    surface.on("drag",(_pointer:Phaser.Input.Pointer,dragX:number,dragY:number)=>{
      surface.setPosition(dragX,dragY);
      const target=getDropLane(this.geometry,dragX,dragY);
      if(target!==this.highlighted){
        this.highlighted=target;
        this.showStatus(target?"SOLTÁ PARA JUGAR EN "+LABELS[target]:"ARRASTRÁ A UNA POSICIÓN");
      }
    });
    surface.on("dragend",(_pointer:Phaser.Input.Pointer,dragX:number,dragY:number)=>{
      dragged=false;
      const target=getDropLane(this.geometry,dragX,dragY);
      if(target)this.place(index,target);
      else this.time.delayedCall(0,()=>this.rebuild());
      this.highlighted=null;
    });
    this.cardObjects.set(index,surface);
    return surface;
  }

  private showPreview(index:number){
    this.hidePreview();
    const area=this.geometry.arena;
    const h=this.geometry.mode==="desktop"?Math.min(area.h*.77,390):Math.min(area.h*.7,270);
    const w=h*.707;
    this.hoverPreview=this.drawCard(index,area.x+area.w/2,area.y+area.h/2,w,h,false)
      .setDepth(95);
    // Render preview itself is never interactive; all target hit areas remain live.
  }

  private hidePreview(){
    if(this.hoverPreview){this.hoverPreview.destroy();this.hoverPreview=null;}
  }

  private showInspector(index:number){
    if(this.modal)return;
    this.hidePreview();
    const width=this.geometry.width,height=this.geometry.height;
    const overlay=this.add.container(width/2,height/2).setDepth(500);
    const bg=this.add.rectangle(0,0,width,height,0x060707,.88).setInteractive();
    bg.on("pointerup",()=>{overlay.destroy();this.modal=null;});
    overlay.add(bg);
    const h=Math.min(height*.75,width*.95/0.707,520),w=h*.707;
    const card=this.drawCard(index,0,-14,w,h,false);
    // Reparent without losing its centered position.
    overlay.add(card.setDepth(501));
    overlay.add(this.add.text(0,h/2+9,"TOCÁ FUERA PARA CERRAR",{
      color:"#d6b77d",fontFamily:"Arial",fontSize:12
    }).setOrigin(.5));
    this.modal=overlay;
  }

  private place(index:number,lane:Lane){
    if(this.used.has(index)||Array.from(this.used.values()).includes(lane))return;
    this.used.set(index,lane);
    this.selected=null;
    this.hidePreview();
    this.time.delayedCall(0,()=>this.rebuild());
  }

  private statusText:Phaser.GameObjects.Text|null=null;
  private showStatus(message:string){
    this.statusText?.setText(message);
  }

  private rebuild(){
    if(!this.scene.isActive())return;
    this.hidePreview();
    this.modal=null;
    this.cardObjects.clear();
    this.children.removeAll(true);
    this.geometry=getLayout(this.scale.width,this.scale.height);
    const l=this.geometry;
    this.add.rectangle(l.width/2,l.height/2,l.width,l.height,0x242824);
    const header=this.rectangle(l.topbar,0x151615,0x94754a);
    header.setDepth(2);
    this.text("DAGGERLIGHT",90,l.topbar.h/2,l.mode==="mobile"?14:20,"#ebdfc9","900").setDepth(3);
    this.text(l.mode==="mobile"?"PHASER · MÓVIL":"PHASER · DESKTOP",
      l.width-95,l.topbar.h/2,11,"#d9b984").setDepth(3);

    this.portrait(l.opponentBanner,"rivalFace","VOR CALASTA",9,false);
    this.portrait(l.playerBanner,"playerFace",champions.dextral.name.split(",")[0].toUpperCase(),9,true);

    this.rectangle(l.arena,PALETTE.board,0x6b5a40);
    for(const lane of lanes){
      this.drawSlot(l.opponentSlots[lane],lane,"opponent");
      this.rectangle(l.labels[lane],PALETTE.dark,0xb89962);
      this.text(LABELS[lane],l.labels[lane].x+l.labels[lane].w/2,
        l.labels[lane].y+l.labels[lane].h/2,
        l.mode==="mobile"?Math.max(10,l.width/37):clamp(15,l.arena.w/32,30),
        "#e7c693","900");
      this.drawSlot(l.playerSlots[lane],lane,"player");
    }

    this.rectangle(l.dock,0x1b201c,0x94764a);
    if(this.used.size===3){
      const reset=this.text("↻  REINICIAR PRUEBA",l.dock.x+l.dock.w/2,
        l.dock.y+l.dock.h/2,22,"#e8c58b","900");
      reset.setInteractive({useHandCursor:true}).on("pointerup",()=>{
        this.used.clear();this.selected=null;this.rebuild();
      });
    }else{
      l.hand.forEach((rect,index)=>{
        if(this.used.has(index))return;
        const isSelected=this.selected===index;
        const y=rect.y+rect.h/2-(isSelected?8:0);
        const card=this.drawCard(index,rect.x+rect.w/2,y,rect.w,rect.h,true);
        if(isSelected)card.setScale(1.05);
      });
    }
    const caption=this.selected===null
      ?l.mode==="mobile"?"TOCÁ UNA CARTA O ARRASTRALA":"ARRASTRÁ UNA CARTA O HACÉ CLIC PARA SELECCIONAR"
      :"CARTA SELECCIONADA · TOCÁ UNA POSICIÓN";
    this.statusText=this.text(caption,l.arena.x+l.arena.w/2,
      l.arena.y+Math.min(24,l.arena.h*.08),
      l.mode==="mobile"?10:12,"#dfc391");
    this.statusText.setDepth(12);
  }
}

new Phaser.Game({
  type:Phaser.AUTO,
  parent:"game",
  backgroundColor:"#171817",
  scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},
  input:{activePointers:3},
  render:{pixelArt:false,antialias:true},
  scene:[DaggerScene]
});

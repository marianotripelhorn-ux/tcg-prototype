/** Pure layout math; used by desktop, portrait mobile and hit-test tests. */
export type Rect={x:number;y:number;w:number;h:number};
export type Lane="siniestra"|"trono"|"diestra";
export type ScreenMode="desktop"|"mobile";
export type BoardLayout={
 mode:ScreenMode;width:number;height:number;sidebar:Rect|null;
 topbar:Rect;opponentBanner:Rect;playerBanner:Rect;arena:Rect;dock:Rect;
 labels:Record<Lane,Rect>;
 opponentSlots:Record<Lane,Rect>;playerSlots:Record<Lane,Rect>;
 hand:Rect[];
};
export const lanes:Lane[]=["siniestra","trono","diestra"];
export const clamp=(min:number,value:number,max:number)=>Math.min(max,Math.max(min,value));
export function intersects(a:Rect,b:Rect):boolean{
 return a.x < b.x+b.w && a.x+a.w>b.x && a.y < b.y+b.h && a.y+a.h>b.y;
}
export function contains(r:Rect,x:number,y:number):boolean{
 return x>=r.x&&y>=r.y&&x<=r.x+r.w&&y<=r.y+r.h;
}
export function getLayout(w:number,h:number):BoardLayout{
 const width=Math.max(300,Math.round(w)),height=Math.max(480,Math.round(h));
 const mobile=width<760||width/height<1.04;
 const top=mobile?56:74;
 const sidebar=mobile?null:{x:0,y:top,w:clamp(218,width*.237,352),h:height-top};
 const availableW=width-(sidebar?.w||0);
 const dockH=mobile?clamp(148,height*.235,204):clamp(150,height*.25,245);
 const bannerH=mobile?clamp(70,height*.109,103):0;
 const playLeft=sidebar?sidebar.w:0;
 const gap=mobile?4:clamp(6,width*.008,17);
 const arenaTop=top+bannerH;
 const arenaBottom=height-dockH-bannerH;
 const arenaH=arenaBottom-arenaTop;
 const arena={x:playLeft,y:arenaTop,w:availableW,h:arenaH};
 const axisHeight=mobile?32:clamp(41,arenaH*.105,56);
 const slotH=(arenaH-axisHeight-2*gap)/2;
 const laneW=(availableW-4*gap)/3;
 const labelY=arenaTop+slotH+gap;
 const labels={} as Record<Lane,Rect>,opponentSlots={} as Record<Lane,Rect>,playerSlots={} as Record<Lane,Rect>;
 lanes.forEach((lane,i)=>{
   const x=playLeft+gap+i*(laneW+gap);
   opponentSlots[lane]={x,y:arenaTop+gap,w:laneW,h:slotH};
   labels[lane]={x,y:labelY,w:laneW,h:axisHeight};
   playerSlots[lane]={x,y:labelY+axisHeight,w:laneW,h:slotH};
 });
 const dock={x:playLeft,y:height-dockH,w:availableW,h:dockH};
 const cardH=mobile?clamp(116,dockH-19,173):clamp(125,dockH-18,220);
 const cardW=cardH*0.707;
 const handCenter=playLeft+availableW/2;
 const handGap=mobile?8:clamp(12,availableW*.021,28);
 const hand=Array.from({length:3},(_,i)=>({
   x:handCenter+(i-1)*(cardW+handGap)-cardW/2,
   y:dock.y+9,w:cardW,h:cardH
 }));
 const opponentBanner=mobile
  ?{x:0,y:top,w:width,h:bannerH}
  :{x:0,y:top,w:sidebar!.w,h:(height-top-dockH-55)/2};
 const playerBanner=mobile
  ?{x:0,y:arenaBottom,w:width,h:bannerH}
  :{x:0,y:top+opponentBanner.h+55,w:sidebar!.w,h:(height-top-dockH-55)/2};
 return {
  mode:mobile?"mobile":"desktop",width,height,sidebar,
  topbar:{x:0,y:0,w:width,h:top},
  opponentBanner,playerBanner,arena,dock,labels,opponentSlots,playerSlots,hand
 };
}
export function getDropLane(layout:BoardLayout,x:number,y:number):Lane|null{
 return lanes.find(lane=>contains(layout.playerSlots[lane],x,y))||null;
}

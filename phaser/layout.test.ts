import {describe,expect,it} from "vitest";
import {getLayout,getDropLane,intersects,lanes} from "./layout";

describe("Phaser adaptive interaction geometry",()=>{
  for(const [width,height,mode] of [
    [1920,1080,"desktop"],[1366,768,"desktop"],[1024,768,"desktop"],
    [390,844,"mobile"],[375,667,"mobile"],[430,932,"mobile"]
  ] as const){
    it(`${width}x${height} keeps every drop zone available in ${mode}`,()=>{
      const layout=getLayout(width,height);
      expect(layout.mode).toBe(mode);
      expect(layout.hand).toHaveLength(3);
      for(const lane of lanes){
        const slot=layout.playerSlots[lane];
        const cx=slot.x+slot.w/2,cy=slot.y+slot.h/2;
        expect(getDropLane(layout,cx,cy)).toBe(lane);
        expect(intersects(slot,layout.dock)).toBe(false);
        expect(intersects(slot,layout.opponentSlots[lane])).toBe(false);
        expect(slot.w).toBeGreaterThan(75);
        expect(slot.h).toBeGreaterThan(40);
      }
      expect(layout.hand.every(card=>card.y>=layout.dock.y)).toBe(true);
      if(mode==="desktop")expect(layout.sidebar).not.toBeNull();
    });
  }
  it("rejects misses, preventing accidental plays",()=>{
    const layout=getLayout(1440,900);
    expect(getDropLane(layout,layout.hand[0].x,layout.hand[0].y)).toBeNull();
    expect(getDropLane(layout,layout.labels.trono.x+30,layout.labels.trono.y+5)).toBeNull();
  });
});

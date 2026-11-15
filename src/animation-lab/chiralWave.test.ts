import { describe,expect,it } from "vitest";
import { chiralWaveMask,clamp01 } from "./chiralWave";

describe("Chiral color-wave masks",()=>{
  it("clamps progress independently of GSAP time",()=>{
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(3)).toBe(1);
  });
  it("moves the left surface from the edge toward the center",()=>{
    expect(chiralWaveMask("left",0)).toContain("polygon(0% 0%");
    expect(chiralWaveMask("left",1)).toContain("52.00% 0.00%");
  });
  it("moves the right surface inward from the opposite side",()=>{
    expect(chiralWaveMask("right",0)).toContain("100.00% 0.00%");
    expect(chiralWaveMask("right",1)).toContain("48.00% 0.00%");
  });
  it("stays deterministic for matching replay frames",()=>{
    expect(chiralWaveMask("left",.42)).toBe(chiralWaveMask("left",.42));
    expect(chiralWaveMask("right",.73)).toBe(chiralWaveMask("right",.73));
    expect(chiralWaveMask("left",.45)).not.toBe(chiralWaveMask("right",.45));
  });
  it("returns valid finite polygon coordinates even with unusual progress",()=>{
    for(const p of [-100,0,.5,1,42]){
      const left=chiralWaveMask("left",p);
      const right=chiralWaveMask("right",p);
      expect(left).not.toMatch(/NaN|Infinity|undefined/);
      expect(right).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});

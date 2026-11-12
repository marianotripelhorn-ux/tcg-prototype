import { defineConfig } from "vite";
export default defineConfig({
  root:"phaser",
  publicDir:false,
  base:"./",
  build:{outDir:"../dist-phaser",emptyOutDir:true,target:"es2022"}
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins:[react()],
  root:"duelboard",
  publicDir:"../public",
  base:"./",
  build:{outDir:"../dist-duelboard",emptyOutDir:true,target:"es2022"}
});

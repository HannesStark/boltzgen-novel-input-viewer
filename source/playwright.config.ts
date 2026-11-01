import { defineConfig, devices } from '@playwright/test';
const base=process.env.SITE_BASE??'/agentic-design-test/';
const port=process.env.SITE_PORT??'4197';
export default defineConfig({testDir:'./tests',timeout:120000,expect:{timeout:45000},fullyParallel:false,workers:1,reporter:'list',use:{baseURL:`http://127.0.0.1:${port}${base}`,launchOptions:{args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']},trace:'retain-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1560,height:1040}}}],webServer:{command:`SITE_BASE=${base} npx vite preview --host 127.0.0.1 --port ${port}`,url:`http://127.0.0.1:${port}${base}`,reuseExistingServer:false,timeout:120000}});

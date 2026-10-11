import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
import worker from "../src/worker.js";import {MENU} from "../src/menu-data.mjs";
const H="https://x.test";
const env=(o={})=>({TELEGRAM_BOT_TOKEN:"T",TELEGRAM_CHAT_ID:"C",ASSETS:{fetch:async()=>new Response("asset")},...o});
const req=(body,h={})=>new Request(H+"/api/order",{method:"POST",headers:{origin:H,"content-type":"application/json",...h},body:typeof body==="string"?body:JSON.stringify(body)});
const del={mode:"delivery",items:[{id:"b1",qty:2},{id:"t1",qty:1}],phone:"+66 81 234 5678",map:"https://maps.app.goo.gl/abc"};
const pick={mode:"pickup",items:[{id:"b1",qty:1}],when:"19:30"};
function tg(ok=true,status=200){const sent=[];globalThis.fetch=async(u,o)=>{sent.push({u:String(u),b:JSON.parse(o.body)});return new Response(JSON.stringify({ok}),{status})};return sent}
test("delivery → Telegram with server-side total",async()=>{const s=tg();const r=await worker.fetch(req({...del,price:1,total:1}),env());
 assert.equal(r.status,200);assert.equal(s[0].u,"https://api.telegram.org/botT/sendMessage");assert.equal(s[0].b.chat_id,"C");
 assert.match(s[0].b.text,/Доставка/);assert.match(s[0].b.text,/Итого: <b>฿580<\/b>/);assert.match(s[0].b.text,/maps\.app\.goo\.gl\/abc/)});
test("pickup needs no phone",async()=>{const s=tg();const r=await worker.fetch(req(pick),env());assert.equal(r.status,200);assert.match(s[0].b.text,/Самовывоз/);assert.match(s[0].b.text,/К 19:30/);assert.doesNotMatch(s[0].b.text,/📞/)});
test("pickup ASAP",async()=>{const s=tg();await worker.fetch(req({...pick,when:"ASAP"}),env());assert.match(s[0].b.text,/Как можно скорее/)});
test("rejects bad data",async()=>{tg();for(const b of [{...del,phone:"123"},{...del,map:"https://evil.com/x"},{...del,items:[{id:"zzz",qty:1}]},{...del,items:[{id:"b1",qty:0}]},{...del,items:[]},{...pick,when:"25:00"},{...pick,when:"soon"},{mode:"x"}])
 assert.equal((await worker.fetch(req(b),env())).status,422,JSON.stringify(b))});
test("html is escaped",async()=>{const s=tg();await worker.fetch(req({...del,phone:"+66812345678",map:'https://maps.app.goo.gl/a"><b>'}),env());assert.ok(!s[0].b.text.includes('"><b>'))});
test("origin/content-type/method/json guards",async()=>{tg();assert.equal((await worker.fetch(req(del,{origin:"https://evil.test"}),env())).status,403);
 assert.equal((await worker.fetch(req(del,{"content-type":"text/plain"}),env())).status,415);
 assert.equal((await worker.fetch(new Request(H+"/api/order"),env())).status,405);assert.equal((await worker.fetch(req("{bad"),env())).status,400)});
test("503 without secrets, 502 on Telegram failure",async()=>{tg();assert.equal((await worker.fetch(req(pick),env({TELEGRAM_BOT_TOKEN:undefined}))).status,503);tg(false,400);assert.equal((await worker.fetch(req(pick),env())).status,502)});
test("static assets pass through",async()=>{assert.equal(await (await worker.fetch(new Request(H+"/"),env())).text(),"asset")});
test("MENU matches CATS in public/index.html",()=>{const s=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
 const C=new Function("return "+s.match(/const CATS=(\[[\s\S]*?\n\]);/)[1])();const ids=[];
 for(const c of C)for(const i of c.items){ids.push(i.id);assert.deepEqual(MENU[i.id],{name:i.n,price:i.p},i.id)}
 assert.equal(ids.length,Object.keys(MENU).length)});
test("secrets are trimmed and Telegram error text is returned",async()=>{
 const sent=[];globalThis.fetch=async(u,o)=>{sent.push(String(u));return new Response(JSON.stringify({ok:false,description:"Bad Request: chat not found"}),{status:400})};
 const r=await worker.fetch(req(pick),env({TELEGRAM_BOT_TOKEN:" bot123:ABC\n",TELEGRAM_CHAT_ID:" 42 "}));
 assert.equal(sent[0],"https://api.telegram.org/bot123:ABC/sendMessage");assert.equal(r.status,502);
 assert.equal((await r.json()).detail,"Bad Request: chat not found")});

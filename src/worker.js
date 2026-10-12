import {validateOrder} from "./order-rules.mjs";
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
export default{
 async fetch(req,env){
  const url=new URL(req.url);
  if(url.pathname!=="/api/order")return env.ASSETS.fetch(req);
  if(req.method!=="POST")return json({ok:false},405);
  const origin=req.headers.get("Origin");
  if(!origin||new URL(origin).host!==url.host)return json({ok:false},403);
  if(!(req.headers.get("content-type")||"").includes("application/json"))return json({ok:false},415);
  let d;try{d=await req.json()}catch{return json({ok:false},400)}
  const o=validateOrder(d);
  if(!o)return json({ok:false,error:"data"},422);
  const time=new Date().toLocaleString("ru-RU",{timeZone:"Asia/Bangkok",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  const text=[
   "🆕 <b>Afterwave Moonshine — новый заказ</b>",
   o.mode==="delivery"?"🛵 <b>Доставка</b> (Най Янг)":"🏠 <b>Самовывоз</b>",
   "",
   ...o.items.map(i=>`• ${esc(i.name)} × ${i.qty} — ฿${i.sum}`),
   "",
   `💰 Итого: <b>฿${o.total}</b>`,
   o.mode==="delivery"?`📞 ${esc(o.phone)}`:`⏰ ${o.when==="ASAP"?"Как можно скорее":"К "+esc(o.when)}`,
   o.mode==="delivery"?`📍 <a href="${esc(o.map)}">Google Maps</a>`:null,
   `🕒 ${time}`
  ].filter(l=>l!==null).join("\n");
  const token=String(env.TELEGRAM_BOT_TOKEN||"").trim().replace(/^bot/i,""),chat=String(env.TELEGRAM_CHAT_ID||"").trim();
  if(!token||!chat)return json({ok:false,error:"not_configured"},503);
  try{
   const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chat,text,parse_mode:"HTML",disable_web_page_preview:true}),signal:AbortSignal.timeout(8000)});
   const result=await r.json();
   if(r.ok&&result.ok===true)return json({ok:true});
   console.error("telegram",r.status,result.description);
   return json({ok:false,error:"telegram",detail:result.description||String(r.status)},502);
  }catch(e){
   console.error("telegram fetch",String(e));
   return json({ok:false,error:"telegram",detail:"network"},502);
  }
 }
};

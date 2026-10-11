import {MENU} from "./menu-data.mjs";
// Prices come ONLY from MENU on the server; the client sends just item ids and quantities.
export const MAP_RE=/^https?:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+\/)/i;
export function validateOrder(d){
 if(!d||typeof d!=="object"||!["delivery","pickup"].includes(d.mode))return null;
 if(!Array.isArray(d.items)||d.items.length<1||d.items.length>40)return null;
 const merged=new Map();
 for(const it of d.items){
  if(!it||typeof it.id!=="string"||!Object.hasOwn(MENU,it.id)||!Number.isInteger(it.qty)||it.qty<1||it.qty>50)return null;
  merged.set(it.id,(merged.get(it.id)||0)+it.qty);
 }
 const items=[...merged].map(([id,qty])=>({id,name:MENU[id].name,qty,price:MENU[id].price,sum:MENU[id].price*qty}));
 if(items.some(i=>i.qty>50))return null;
 const total=items.reduce((a,i)=>a+i.sum,0);
 let phone=null,map=null,when=null;
 if(d.mode==="delivery"){
  phone=typeof d.phone==="string"?d.phone.trim():"";
  const n=phone.replace(/\D/g,"").length;
  if(!/^[+\d\s()-]{8,25}$/.test(phone)||n<8||n>15)return null;
  map=typeof d.map==="string"?d.map.trim():"";
  if(map.length>400||!MAP_RE.test(map))return null;
  try{new URL(map)}catch{return null}
 }else{
  if(d.when==="ASAP")when="ASAP";
  else if(typeof d.when==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(d.when))when=d.when;
  else return null;
 }
 return {mode:d.mode,items,total,phone,map,when};
}

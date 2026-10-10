import express from 'express'; import multer from 'multer'; import os from 'os'; import http from 'http';
process.env.MATRIMONY_JATHAGAM_CREDITS = '2'; // exercise the paid path (default is 0 = free)
const { registerMatrimonyRoutes, sanitizeJathagam } = await import('../../matrimony-api.js');
let ok=0,bad=0; const eq=(a,b,m)=>{ if(JSON.stringify(a)===JSON.stringify(b)) ok++; else {bad++;console.log('FAIL',m,JSON.stringify(a),JSON.stringify(b));} };
eq(sanitizeJathagam({name:'Kavya',gender:'F',dob:'1999-04-12',star:'rohini',raasi:'rishabam'}),{name:'Kavya',gender:'F',dob:'1999-04-12',star:'rohini',raasi:'rishabam'},'good');
eq(sanitizeJathagam({name:'x 9876543210',gender:'X',dob:'2999-01-01',star:'foo',raasi:'bar'}),{},'bad dropped');
eq(sanitizeJathagam({dob:'1999-02-31'}),{},'bad date');
let credits=2, refunds=0, geminiBody=null;
process.env.GEMINI_API_KEY='k';
const realFetch=global.fetch;
global.fetch=async(u,o)=>{ if(String(u).includes('generativelanguage')){ if(geminiBody==='fail') return {ok:false,json:async()=>({error:{message:'boom'}})}; return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"name":"Anu","dob":"1998-01-05","star":"magam","raasi":"simmam"}'}]}}]})}; } return realFetch(u,o); };
const app=express(); const noop=(q,r,n)=>n();
registerMatrimonyRoutes(app,{db:{},razorpay:{},requireAuth:(q,r,n)=>{q.user={id:'u1'};n();},limiter:noop,upload:multer({dest:os.tmpdir()}),deductCredits:async()=>{ if(credits>=2){credits-=2;return true;} return false;},refundCredits:()=>{refunds++;credits+=2;}});
const srv=http.createServer(app).listen(0); const port=srv.address().port;
const post=async()=>{ const fd=new FormData(); fd.append('file',new Blob([Buffer.from('x')],{type:'image/png'}),'a.png'); const r=await realFetch(`http://127.0.0.1:${port}/api/matrimony/jathagam-extract`,{method:'POST',body:fd}); return [r.status,await r.json()]; };
let [s,j]=await post(); eq(s,200,'200'); eq(j.fields,{name:'Anu',dob:'1998-01-05',star:'magam',raasi:'simmam'},'fields'); eq(credits,0,'charged');
[s]=await post(); eq(s,402,'402 no credits');
credits=2; geminiBody='fail'; [s]=await post(); eq(s,500,'500'); eq(credits,2,'refunded'); eq(refunds,1,'refund once');
srv.close(); console.log(ok,'pass',bad,'fail'); process.exit(bad?1:0);

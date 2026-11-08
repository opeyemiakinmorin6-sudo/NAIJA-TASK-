(() => {
"use strict";
const url = "https://jwakveeiynpakunwjzkj.supabase.co";
const anon = "sb_publishable_iT-y7ZOr_7g_SOx6ZPzR2A_ZjjnLZ6D";
const moduleName = document.body.dataset.module || "more";
const titles = {
support:"Support Centre",notifications:"Notifications","applied-jobs":"My Task Activity",approved:"Approved Tasks",retry:"Needs Attention",cancelled:"Cancelled Tasks","airtime-data":"Airtime & Data",more:"More Services",promote:"Promote Your Business",announcements:"Platform Announcements",community:"Community","ai-assistant":"Help Assistant","ai-care":"AI Care Inbox",arena:"Games Arena",security:"Account Security",appeals:"Appeals Centre"
};
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = v => "₦" + Number(v || 0).toLocaleString("en-NG");
const date = v => v ? new Date(v).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"}) : "—";
const pill = s => /approved|complete|paid|success/i.test(s||"") ? "good" : /reject|cancel|fail/i.test(s||"") ? "bad" : "wait";
const css = ":root{--g:#087f36;--d:#064d25;--bg:#f2f7f3;--ink:#173326;--muted:#708176;--line:#e0eae3}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#eaf4ed,#f7f9f7 360px);color:var(--ink);font:15px/1.5 system-ui,Arial,sans-serif}.top{background:linear-gradient(110deg,#063f22,#087f36);color:white;padding:15px max(16px,calc((100vw - 900px)/2));display:flex;justify-content:space-between;align-items:center;position:sticky;top:0}.top b{font-weight:900}.back{color:white;text-decoration:none;background:#ffffff20;padding:9px 13px;border-radius:10px;font-size:12px;font-weight:800}main{max-width:900px;margin:auto;padding:20px 15px}.hero{padding:23px;border-radius:22px;background:linear-gradient(120deg,#064322,#087f36 70%,#0b9b45);color:white;margin-bottom:16px}.hero small{font-size:10px;letter-spacing:1.5px;font-weight:900;color:#d9f5b9}.hero h1{margin:8px 0;font-size:clamp(23px,5vw,31px)}.hero p{margin:0;color:#e1f2e6;font-size:13px}.panel{background:white;border:1px solid var(--line);border-radius:17px;padding:17px;margin:13px 0;box-shadow:0 8px 24px #12351b0a}.panel h2{font-size:17px;margin:0 0 12px}.muted,small{color:var(--muted)}.muted{font-size:13px}.item{border:1px solid var(--line);border-radius:13px;padding:12px;margin:9px 0;display:flex;justify-content:space-between;gap:10px}.item strong{display:block;font-size:13px}.item small{display:block;font-size:11px;margin-top:5px}.pill{padding:5px 9px;border-radius:20px;font-size:10px;font-weight:900;background:#fff4dc;color:#805900;white-space:nowrap}.pill.good{background:#e5f7e9;color:#087f36}.pill.bad{background:#ffeded;color:#a12828}.empty{text-align:center;padding:24px 10px;color:var(--muted);font-size:13px}.note{padding:12px;border-radius:11px;background:#eef7f0;color:#365b40;font-size:12px;margin:10px 0}.error{background:#fff0f0;color:#9d2828}label{display:block;font-size:12px;font-weight:800;margin:12px 0 6px}input,textarea{width:100%;border:1px solid #d8e4db;border-radius:11px;padding:13px;font:inherit;font-size:14px}textarea{min-height:100px}.btn{display:inline-block;border:0;border-radius:11px;background:var(--g);color:white;padding:12px 16px;font-weight:850;font-size:13px;margin-top:12px;cursor:pointer}.btn.alt{background:#eaf5ec;color:var(--d)}.links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.link{padding:13px;border:1px solid var(--line);border-radius:13px;background:white;font-size:12px;font-weight:850;text-decoration:none;color:var(--ink)}@media(max-width:430px){main{padding:15px 12px}.links{grid-template-columns:1fr}}";
const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
const names={support:"🎧",notifications:"🔔","applied-jobs":"📋",approved:"✅",retry:"🔁",cancelled:"✖️","airtime-data":"📱",more:"▦",promote:"📣",announcements:"📢",community:"👥","ai-assistant":"✨","ai-care":"💚",arena:"🎮",security:"🔐",appeals:"⚖️"};
const descriptions={"applied-jobs":"Track every task you have submitted and its review status.","airtime-data":"Review your airtime and data orders. Purchases remain disabled until the live catalogue and payment service are connected.","ai-care":"Start a care conversation. Messages are stored for review; automated AI replies are not enabled here.","security":"Protect your account and change your password securely."};
document.title=(titles[moduleName]||titles.more)+" — NAIJA TASK";
document.body.innerHTML='<header class="top"><b>NAIJA TASK</b><a class="back" href="dashboard.html">← Dashboard</a></header><main><section class="hero"><small>MEMBER CENTRE</small><h1>'+(names[moduleName]||"")+' '+esc(titles[moduleName]||titles.more)+'</h1><p>'+esc(descriptions[moduleName]||"Your account services and updates in one place.")+'</p></section><div id="app"><section class="panel muted">Loading…</section></div></main>';
const app=document.getElementById("app");
const sb=window.supabase.createClient(url,anon);
const note=(s,bad)=>'<div class="note '+(bad?"error":"")+'">'+esc(s)+'</div>';
const list=(rows,fn,empty)=>rows&&rows.length?rows.map(fn).join(""):'<div class="empty">'+esc(empty||"Nothing here yet.")+'</div>';
const row=(title,sub,status,tail)=>'<article class="item"><div><strong>'+esc(title)+'</strong><small>'+esc(sub)+'</small></div><div><span class="pill '+pill(status)+'">'+esc(status||"Info")+'</span><small>'+esc(tail||"")+'</small></div></article>';
const linkList=items=>'<div class="links">'+items.map(x=>'<a class="link" href="'+x[1]+'">'+x[0]+' '+esc(x[0]&&x[2]||"")+'</a>').join("")+'</div>';
async function start(){
 const auth=await sb.auth.getUser();const user=auth.data&&auth.data.user;if(!user){location.href="login.html";return}
 if(moduleName==="support"||moduleName==="appeals"){
 const isAppeal=moduleName==="appeals", table=isAppeal?"appeals":"support", title=isAppeal?"Submit an appeal":"Contact support";
 const q=await sb.from(table).select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30);
 app.innerHTML='<section class="panel"><h2>'+title+'</h2><p class="muted">Do not include your password, PIN, OTP or full bank details.</p><form id="sendForm"><label>Subject</label><input name="subject" required maxlength="120"><label>Message</label><textarea name="message" required maxlength="3000"></textarea><button class="btn">Submit</button></form><div id="result"></div></section><section class="panel"><h2>Your requests</h2>'+(q.error?note(q.error.message,true):list(q.data,x=>row(x.subject,x.message+" · "+date(x.created_at),x.status,x.admin_reply||"")))+'</section>';
 document.getElementById("sendForm").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f),b=f.querySelector("button");b.disabled=true;const {error}=await sb.from(table).insert({user_id:user.id,subject:String(fd.get("subject")).trim(),message:String(fd.get("message")).trim()});document.getElementById("result").innerHTML=error?note(error.message,true):note("Your request has been submitted.");if(!error){f.reset();start()}else b.disabled=false};return;
 }
 if(["applied-jobs","approved","retry","cancelled"].includes(moduleName)){
 const q=await sb.from("task_submissions").select("id,task_id,status,created_at,rejection_reason").eq("user_id",user.id).order("created_at",{ascending:false}).limit(250);
 if(q.error){app.innerHTML='<section class="panel">'+note(q.error.message,true)+'</section>';return}
 let rows=q.data||[];if(moduleName==="approved")rows=rows.filter(x=>/approved|complete|paid/i.test(x.status||""));if(moduleName==="retry")rows=rows.filter(x=>/reject|retry|revision/i.test(x.status||""));if(moduleName==="cancelled")rows=rows.filter(x=>/cancel/i.test(x.status||""));
 const ids=[...new Set(rows.map(x=>x.task_id))], tq=ids.length?await sb.from("tasks").select("id,title,reward,reward_per_worker").in("id",ids):{data:[]};const tasks={};(tq.data||[]).forEach(x=>tasks[x.id]=x);
 app.innerHTML='<section class="panel"><h2>'+esc(titles[moduleName])+'</h2><p class="muted">'+(q.data||[]).length+' total submissions in your account.</p>'+list(rows,x=>row((tasks[x.task_id]||{}).title||("Task #"+x.task_id),date(x.created_at)+(x.rejection_reason?" · "+x.rejection_reason:""),x.status,money((tasks[x.task_id]||{}).reward_per_worker||(tasks[x.task_id]||{}).reward)),moduleName==="approved"?"No approved submissions yet.":moduleName==="retry"?"No submissions need attention.":moduleName==="cancelled"?"No cancelled submissions.":"You have not submitted a task yet.")+'</section>';return;
 }
 if(moduleName==="notifications"){
 const q=await sb.from("notifications").select("id,title,message,type,is_read,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(60);
 app.innerHTML='<section class="panel"><h2>Your notifications</h2>'+(q.error?note(q.error.message,true):list(q.data,x=>row(x.title,x.message+" · "+date(x.created_at),x.is_read?"Read":"New")))+'</section>';return;
 }
 if(moduleName==="announcements"){
 const q=await sb.from("announcements").select("id,title,message,created_at").eq("is_published",true).order("created_at",{ascending:false}).limit(50);
 app.innerHTML='<section class="panel"><h2>Latest updates</h2>'+(q.error?note(q.error.message,true):list(q.data,x=>'<article class="item"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.message)+'</small><small>'+date(x.created_at)+'</small></div></article>'))+'</section>';return;
 }
 if(moduleName==="airtime-data"){
 const q=await sb.from("airtime_data_orders").select("id,phone_number,network,amount,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(40);
 app.innerHTML='<section class="panel"><h2>Your orders</h2><p class="muted">Order history only. New purchases are not enabled until the product catalogue and verified VTpass payment flow are connected.</p>'+(q.error?note(q.error.message,true):list(q.data,x=>row((x.network||"Service")+" · "+x.phone_number,date(x.created_at),x.status,money(x.amount))))+'</section>';return;
 }
 if(moduleName==="ai-care"){
 const q=await sb.from("ai_care_threads").select("id,title,status,created_at,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(30);
 app.innerHTML='<section class="panel"><h2>Start a care conversation</h2><p class="muted">Your message is saved for review. This page does not generate an automated AI response.</p><form id="care"><label>Topic</label><input name="title" required maxlength="120"><label>Message</label><textarea name="message" required maxlength="3000"></textarea><button class="btn">Send message</button></form><div id="result"></div></section><section class="panel"><h2>Your conversations</h2>'+(q.error?note(q.error.message,true):list(q.data,x=>row(x.title||"Care request",date(x.updated_at),x.status)))+'</section>';
 document.getElementById("care").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f),b=f.querySelector("button");b.disabled=true;const a=await sb.from("ai_care_threads").insert({user_id:user.id,title:String(fd.get("title")).trim()}).select("id").single();if(a.error){document.getElementById("result").innerHTML=note(a.error.message,true);b.disabled=false;return}const z=await sb.from("ai_care_messages").insert({thread_id:a.data.id,user_id:user.id,sender_type:"user",message:String(fd.get("message")).trim()});document.getElementById("result").innerHTML=z.error?note(z.error.message,true):note("Your message has been sent.");if(!z.error){f.reset();start()}else b.disabled=false};return;
 }
 if(moduleName==="security"){
 app.innerHTML='<section class="panel"><h2>Change password</h2><p class="muted">Use a unique password with at least 8 characters. Never share it or your one-time code.</p><form id="pw"><label>New password</label><input type="password" name="p" minlength="8" required><label>Confirm password</label><input type="password" name="c" minlength="8" required><button class="btn">Update password</button></form><div id="result"></div></section><section class="panel"><h2>Safety checklist</h2><p>• Use a unique password.</p><p>• Sign out on shared devices.</p><p>• Never share OTPs or PINs.</p><a class="btn alt" href="profile.html">Open profile</a> <a class="btn alt" href="support.html">Report a concern</a></section>';
 document.getElementById("pw").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,fd=new FormData(f),p=String(fd.get("p")),b=f.querySelector("button");if(p!==String(fd.get("c"))){document.getElementById("result").innerHTML=note("Passwords do not match.",true);return}b.disabled=true;const {error}=await sb.auth.updateUser({password:p});document.getElementById("result").innerHTML=error?note(error.message,true):note("Password updated successfully.");if(!error)f.reset();b.disabled=false};return;
 }
 const pages={
 more:[["📋","Find tasks","task.html"],["💼","Wallet","wallet.html"],["🛍️","Marketplace","marketplace.html"],["📣","Advertising","ads.html"],["🤝","Referrals","referrals.html"],["🎮","Naija Games","naija-games.html"],["🌟","Naija Star Life","starlife.html"],["💬","Private Chat","private-chat.html"],["📱","Airtime & Data history","airtime-data.html"],["🎧","Support Centre","support.html"]],
 promote:[["📣","Advertising centre","ads.html"],["🧾","Transactions","transactions.html"],["🎧","Contact support","support.html"]],
 arena:[["🏃","Naija Dash / Match / Fighter","naija-games.html"]],
 community:[["💬","Private Chat","private-chat.html"],["📢","Announcements","announcements.html"],["🎧","Community support","support.html"]],
 "ai-assistant":[["💚","AI Care inbox","ai-care.html"],["🎧","Support Centre","support.html"],["📋","My task activity","applied-jobs.html"]]
 };
 const items=pages[moduleName]||pages.more;
 app.innerHTML='<section class="panel"><h2>'+esc(titles[moduleName]||titles.more)+'</h2><p class="muted">Open an available service below. Unavailable integrations are not presented as working purchase or AI features.</p><div class="links">'+items.map(x=>'<a class="link" href="'+x[2]+'">'+x[0]+' '+esc(x[1])+'</a>').join("")+'</div></section>';
}
start().catch(e=>{app.innerHTML='<section class="panel">'+note(e.message||String(e),true)+'</section>'});
})();
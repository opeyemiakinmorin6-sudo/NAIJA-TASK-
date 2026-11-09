(() => {
"use strict";
const url = "https://jwakveeiynpakunwjzkj.supabase.co";
const anon = "sb_publishable_iT-y7ZOr_7g_SOx6ZPzR2A_ZjjnLZ6D";
const moduleName = document.body.dataset.module || "more";
const titles = {
support:"Support Centre",notifications:"Notifications","applied-jobs":"My Task Activity",approved:"Approved Tasks",retry:"Needs Attention",cancelled:"Cancelled Tasks","airtime-data":"Airtime & Data",more:"More Services",promote:"Promote Your Business",announcements:"Platform Announcements",community:"Community","ai-assistant":"Help Assistant","ai-care":"Member Care Inbox",arena:"Games Arena",security:"Account Security",appeals:"Appeals Centre"
};
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = v => "₦" + Number(v || 0).toLocaleString("en-NG");
const date = v => v ? new Date(v).toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"}) : "—";
const pill = s => /approved|complete|paid|success|answered|resolved|active/i.test(s||"") ? "good" : /reject|cancel|fail/i.test(s||"") ? "bad" : "wait";
const css = ":root{--g:#087f36;--d:#064d25;--bg:#f2f7f3;--ink:#173326;--muted:#708176;--line:#e0eae3}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#eaf4ed,#f7f9f7 360px);color:var(--ink);font:15px/1.5 system-ui,Arial,sans-serif}.top{background:linear-gradient(110deg,#063f22,#087f36);color:white;padding:15px max(16px,calc((100vw - 900px)/2));display:flex;justify-content:space-between;align-items:center;position:sticky;top:0}.top b{font-weight:900}.back{color:white;text-decoration:none;background:#ffffff20;padding:9px 13px;border-radius:10px;font-size:12px;font-weight:800}main{max-width:900px;margin:auto;padding:20px 15px}.hero{padding:23px;border-radius:22px;background:linear-gradient(120deg,#064322,#087f36 70%,#0b9b45);color:white;margin-bottom:16px}.hero small{font-size:10px;letter-spacing:1.5px;font-weight:900;color:#d9f5b9}.hero h1{margin:8px 0;font-size:clamp(23px,5vw,31px)}.hero p{margin:0;color:#e1f2e6;font-size:13px}.panel{background:white;border:1px solid var(--line);border-radius:17px;padding:17px;margin:13px 0;box-shadow:0 8px 24px #12351b0a}.panel h2{font-size:17px;margin:0 0 12px}.muted,small{color:var(--muted)}.muted{font-size:13px}.item{border:1px solid var(--line);border-radius:13px;padding:12px;margin:9px 0;display:flex;justify-content:space-between;gap:10px}.item strong{display:block;font-size:13px}.item small{display:block;font-size:11px;margin-top:5px}.pill{padding:5px 9px;border-radius:20px;font-size:10px;font-weight:900;background:#fff4dc;color:#805900;white-space:nowrap}.pill.good{background:#e5f7e9;color:#087f36}.pill.bad{background:#ffeded;color:#a12828}.empty{text-align:center;padding:24px 10px;color:var(--muted);font-size:13px}.note{padding:12px;border-radius:11px;background:#eef7f0;color:#365b40;font-size:12px;margin:10px 0}.error{background:#fff0f0;color:#9d2828}label{display:block;font-size:12px;font-weight:800;margin:12px 0 6px}input,textarea{width:100%;border:1px solid #d8e4db;border-radius:11px;padding:13px;font:inherit;font-size:14px}textarea{min-height:100px}.btn{display:inline-block;border:0;border-radius:11px;background:var(--g);color:white;padding:12px 16px;font-weight:850;font-size:13px;margin-top:12px;cursor:pointer}.btn.alt{background:#eaf5ec;color:var(--d)}.links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.link{padding:13px;border:1px solid var(--line);border-radius:13px;background:white;font-size:12px;font-weight:850;text-decoration:none;color:var(--ink)}@media(max-width:430px){main{padding:15px 12px}.links{grid-template-columns:1fr}}";
const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
const names={support:"🎧",notifications:"🔔","applied-jobs":"📋",approved:"✅",retry:"🔁",cancelled:"✖️","airtime-data":"📱",more:"▦",promote:"📣",announcements:"📢",community:"👥","ai-assistant":"✨","ai-care":"💚",arena:"🎮",security:"🔐",appeals:"⚖️"};
const descriptions={"applied-jobs":"Track every task you have submitted and its review status.","airtime-data":"Buy airtime and data from supported Nigerian networks, track delivery and check pending transactions.","ai-care":"Start a care conversation. Messages are stored for review; automated AI replies are not enabled here.","security":"Protect your account and change your password securely."};
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
 const isAppeal=moduleName==="appeals",table=isAppeal?"appeals":"support_tickets",title=isAppeal?"Submit an appeal":"Contact support";
 const q=await sb.from(table).select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(40);
 let referenceOptions='<option value="">General account appeal (optional)</option>';
 let referenceNotice="";
 if(isAppeal){
   const [submissionsResult,withdrawalsResult]=await Promise.all([
     sb.from("task_submissions").select("id,task_id,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(60),
     sb.from("withdrawals").select("id,amount,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(60)
   ]);
   const submissions=submissionsResult.error?[]:(submissionsResult.data||[]);
   const withdrawals=withdrawalsResult.error?[]:(withdrawalsResult.data||[]);
   referenceOptions+='<optgroup label="Task submissions">'+submissions.map(x=>'<option value="submission:'+esc(x.id)+'">Task submission #'+esc(x.id)+' · '+esc(x.status||"Submitted")+'</option>').join("")+'</optgroup>';
   referenceOptions+='<optgroup label="Withdrawals">'+withdrawals.map(x=>'<option value="withdrawal:'+esc(x.id)+'">Withdrawal #'+esc(x.id)+' · '+money(x.amount)+' · '+esc(x.status||"Pending")+'</option>').join("")+'</optgroup>';
   if(submissionsResult.error||withdrawalsResult.error)referenceNotice=note("Some reference records could not be loaded. You can still submit a general appeal.",true);
 }
 app.innerHTML='<section class="panel"><h2>'+title+'</h2><p class="muted">'+(isAppeal?"Choose the task or withdrawal if your appeal concerns a specific record. Include the facts and why you believe the decision should be reviewed.":"Describe the issue clearly. Never include your password, PIN, OTP or full bank details.")+'</p>'+(isAppeal?referenceNotice:"")+'<form id="sendForm">'+(isAppeal?'<label>Related record</label><select name="reference">'+referenceOptions+'</select>':"")+'<label>Subject</label><input name="subject" required maxlength="120"><label>Message</label><textarea name="message" required maxlength="3000"></textarea><button class="btn">Submit</button></form><div id="result"></div></section><section class="panel"><h2>Your '+(isAppeal?"appeals":"requests")+'</h2>'+(q.error?note(q.error.message,true):list(q.data,x=>row(x.subject,x.message+" · "+date(x.created_at),x.status,(isAppeal?x.admin_response:x.admin_reply)||"")))+'</section>';
 document.getElementById("sendForm").onsubmit=async e=>{
   e.preventDefault();
   const f=e.currentTarget,fd=new FormData(f),b=f.querySelector("button");
   b.disabled=true;
   const payload={user_id:user.id,subject:String(fd.get("subject")).trim(),message:String(fd.get("message")).trim()};
   if(isAppeal){
     const ref=String(fd.get("reference")||"");
     let label="";
     if(ref.startsWith("submission:"))label="Task submission #"+ref.slice(11);
     else if(ref.startsWith("withdrawal:"))label="Withdrawal #"+ref.slice(11);
     if(label)payload.message="Related record: "+label+"\n\n"+payload.message;
     // The legacy appeal reference columns are UUIDs, while current submission/withdrawal IDs are numeric.
     // Keep the reference in the message until a compatible relationship is deliberately migrated.
   }
   const {error}=await sb.from(table).insert(payload);
   document.getElementById("result").innerHTML=error?note(error.message,true):note(isAppeal?"Your appeal has been submitted for review.":"Your support request has been submitted.");
   if(!error){f.reset();start()}else b.disabled=false;
 };
 return;
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
 const rows=q.data||[],unread=rows.filter(x=>!x.is_read).length;
 app.innerHTML='<section class="panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2>Your notifications</h2><button class="btn alt" id="markAllRead" '+(unread?'':'disabled')+'>Mark all as read</button></div><p class="muted">'+unread+' unread · '+rows.length+' total</p>'+(q.error?note(q.error.message,true):list(rows,x=>'<article class="item"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.message)+' · '+date(x.created_at)+'</small></div><div><span class="pill '+(x.is_read?'good':'wait')+'">'+(x.is_read?'Read':'New')+'</span>'+(x.is_read?'':'<button class="btn alt mark-read" data-id="'+esc(x.id)+'">Mark read</button>')+'</div></article>'))+'</section>';
 document.getElementById("markAllRead").addEventListener("click",async b=>{const button=b.currentTarget;button.disabled=true;const {error}=await sb.from("notifications").update({is_read:true}).eq("user_id",user.id).eq("is_read",false);if(error){button.disabled=false;alert("Could not update notifications: "+error.message)}else start()});
 document.querySelectorAll(".mark-read").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;const {error}=await sb.from("notifications").update({is_read:true}).eq("id",b.dataset.id).eq("user_id",user.id);if(error){b.disabled=false;alert("Could not mark as read: "+error.message)}else start()}));return;
 }
 if(moduleName==="announcements"){
 const q=await sb.from("announcements").select("id,title,message,created_at").eq("is_published",true).order("created_at",{ascending:false}).limit(50);
 app.innerHTML='<section class="panel"><h2>Latest updates</h2>'+(q.error?note(q.error.message,true):list(q.data,x=>'<article class="item"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.message)+'</small><small>'+date(x.created_at)+'</small></div></article>'))+'</section>';return;
 }
 if(moduleName==="community"){
 const feature=await sb.from("platform_settings").select("community_chat_enabled,private_chat_enabled").eq("id",1).maybeSingle();
 if(feature.error){app.innerHTML='<section class="panel">'+note(feature.error.message,true)+'</section>';return}
 if(!feature.data||feature.data.community_chat_enabled!==true){
   app.innerHTML='<section class="panel"><h2>Community is currently unavailable</h2>'+note("Community access is temporarily disabled by NAIJA TASK administrators.")+(feature.data?.private_chat_enabled===true?'<a class="btn" href="private-chat.html">Open Private Chat</a>':"")+'</section>';
   return;
 }
 const groups=await sb.from("community_groups").select("id,name,description,created_at").eq("active",true).order("created_at",{ascending:false}).limit(60);
 const memberships=await sb.from("community_group_members").select("group_id,role").eq("user_id",user.id);
 const mine=new Map((memberships.data||[]).map(x=>[x.group_id,x.role]));
 app.innerHTML='<section class="panel"><h2>Active community groups</h2><p class="muted">Browse groups and check your membership. Group joining is currently managed by the platform team.</p>'+(groups.error?note(groups.error.message,true):list(groups.data,x=>row(x.name,x.description||"NAIJA TASK member group",mine.has(x.id)?"Member":"Available",mine.has(x.id)?(mine.get(x.id)||"Member"):"Membership managed by admins")))+'</section><section class="panel"><h2>Connect with members</h2><a class="btn" href="private-chat.html">Open Private Chat</a></section>';return;
 }
 if(moduleName==="airtime-data"){
   app.innerHTML='<section class="panel"><h2>Airtime & Data</h2><p class="muted">Buy data bundles or airtime for Nigerian networks using your NAIJA TASK wallet. Provider confirmation may take a little time.</p><div id="vtCatalog">'+note("Loading live VTpass catalogue…")+'</div></section><section class="panel"><h2>Your recent orders</h2><div id="vtOrders">'+note("Loading order history…")+'</div></section>';
   const catalogBox=document.getElementById("vtCatalog"),ordersBox=document.getElementById("vtOrders");
   let products=[];
   let purchasesEnabled=false;
   const invoke=async payload=>sb.functions.invoke("vtpass-services",{body:payload});
   const loadOrders=async()=>{
     const q=await sb.from("airtime_data_orders").select("id,phone_number,network,amount,status,created_at,order_type,product_name,request_id,wallet_refunded_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30);
     if(q.error){ordersBox.innerHTML=note(q.error.message,true);return}
     ordersBox.innerHTML=list(q.data,x=>{
       const pending=/pending|processing/i.test(x.status||"")&&!x.wallet_refunded_at;
       return '<article class="item"><div><strong>'+esc(x.network||"Service")+' '+esc(x.order_type||"")+' · '+esc(x.phone_number)+'</strong><small>'+esc(x.product_name||"Airtime/Data")+' · '+date(x.created_at)+'</small></div><div><span class="pill '+pill(x.status)+'">'+esc(x.status)+'</span><small>'+money(x.amount)+'</small>'+(pending?'<button class="btn alt vt-requery" data-id="'+esc(x.id)+'">Check status</button>':x.wallet_refunded_at?'<small>Refunded</small>':"")+'</div></article>';
     },"No airtime or data orders yet.");
     ordersBox.querySelectorAll(".vt-requery").forEach(button=>button.addEventListener("click",async()=>{
       button.disabled=true;button.textContent="Checking…";
       const {data,error}=await invoke({action:"requery",order_id:button.dataset.id});
       if(error){button.disabled=false;button.textContent="Try again";alert(error.message);return}
       alert(data?.message||"Status updated.");loadOrders();
     }));
   };
   const renderForm=()=>{
     const kind=document.getElementById("vtKind")?.value||"data";
     const networks=[...new Set(products.filter(p=>p.product_type===kind).map(p=>p.network))];
     const network=document.getElementById("vtNetwork")?.value||networks[0]||"";
     const matching=products.filter(p=>p.product_type===kind&&p.network===network);
     const selected=document.getElementById("vtPlan")?.value||matching[0]?.id||"";
     const selectedProduct=matching.find(p=>String(p.id)===String(selected))||matching[0];
     const networkOptions=networks.map(n=>'<option value="'+esc(n)+'" '+(n===network?'selected':'')+'>'+esc(n)+'</option>').join("");
     const planOptions=matching.filter(p=>kind==="data").map(p=>'<option value="'+esc(p.id)+'" '+(p.id===selectedProduct?.id?'selected':'')+'>'+esc(p.name)+' — '+money(p.selling_price)+'</option>').join("");
     catalogBox.innerHTML='<form id="vtPurchase"><label>Service</label><select id="vtKind" name="kind"><option value="data" '+(kind==="data"?'selected':'')+'>Data bundle</option><option value="airtime" '+(kind==="airtime"?'selected':'')+'>Airtime</option></select><label>Network</label><select id="vtNetwork" name="network">'+networkOptions+'</select>'+(kind==="data"?'<label>Choose data plan</label><select id="vtPlan" name="product_id">'+planOptions+'</select><p class="muted">Price: '+money(selectedProduct?.selling_price||0)+'</p>':'<label>Airtime amount (₦50 – ₦50,000)</label><input name="amount" type="number" min="50" max="50000" step="1" required placeholder="Enter amount">')+'<label>Recipient phone number</label><input name="phone" type="tel" inputmode="numeric" pattern="[0-9]{10,14}" minlength="10" maxlength="14" required placeholder="e.g. 08012345678"><div class="note">Please confirm the network and phone number before buying. Successful provider purchases cannot be reversed.</div><button class="btn" id="vtBuy" '+(purchasesEnabled?'':'disabled')+'>'+(purchasesEnabled?'Continue to purchase':'Purchases temporarily disabled')+'</button>'+(purchasesEnabled?'':note("The catalogue can be viewed. Purchases will be enabled after VTpass credentials and environment are verified."))+'<div id="vtResult"></div></form>';
     document.getElementById("vtKind").addEventListener("change",renderForm);
     document.getElementById("vtNetwork").addEventListener("change",renderForm);
     document.getElementById("vtPlan")?.addEventListener("change",renderForm);
     document.getElementById("vtPurchase").onsubmit=async e=>{
       e.preventDefault();
       const form=e.currentTarget,fd=new FormData(form),button=document.getElementById("vtBuy");
       const orderKind=String(fd.get("kind")),phone=String(fd.get("phone")).replace(/\D/g,"");
       const chosen=products.find(p=>String(p.id)===String(fd.get("product_id")));
       if(orderKind==="data"&&!chosen){document.getElementById("vtResult").innerHTML=note("Please choose a valid data plan.",true);return}
       if(!confirm("Confirm "+orderKind+" purchase on "+String(fd.get("network"))+" for "+phone+"? The wallet will be debited only when the order is reserved."))return;
       button.disabled=true;button.textContent="Processing…";
       const payload={action:"purchase",order_type:orderKind,product_id:orderKind==="data"?chosen.id:products.find(p=>p.product_type==="airtime"&&p.network===String(fd.get("network")) )?.id,phone};
       if(orderKind==="airtime")payload.amount=Number(fd.get("amount"));
       const {data,error}=await invoke(payload);
       const result=document.getElementById("vtResult");
       if(error){result.innerHTML=note(error.message,true);button.disabled=false;button.textContent="Try again";return}
       result.innerHTML=note(data?.message||"Purchase request received.",!data?.ok);
       button.textContent="Purchase request sent";
       await loadOrders();
     };
   };
   const {data,error}=await invoke({action:"catalog"});
   if(error){catalogBox.innerHTML=note("Could not load VTpass catalogue: "+error.message,true);await loadOrders();return}
   if(!data?.ok){catalogBox.innerHTML=note(data?.message||"VTpass catalogue is not available.",true);await loadOrders();return}
   products=data.products||[];
   purchasesEnabled=data.purchases_enabled===true;
   if(!products.length){catalogBox.innerHTML=note("No products are currently available from VTpass.",true)}
   else renderForm();
   if(data.warnings?.length)catalogBox.insertAdjacentHTML("beforeend",note("Some network catalogues could not refresh: "+data.warnings.join(", ")));
   await loadOrders();
   return;
 }

 if(moduleName==="ai-care"){
 const feature=await sb.from("platform_settings").select("ai_care_enabled").eq("id",1).maybeSingle();
 if(feature.error){app.innerHTML='<section class="panel">'+note(feature.error.message,true)+'</section>';return}
 if(!feature.data||feature.data.ai_care_enabled!==true){
   app.innerHTML='<section class="panel"><h2>Care inbox unavailable</h2>'+note("The Care Inbox is currently disabled by NAIJA TASK administrators.")+'<a class="btn alt" href="support.html">Contact Support</a></section>';
   return;
 }
 const q=await sb.from("ai_care_threads").select("id,title,status,created_at,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(30);
 if(q.error){app.innerHTML='<section class="panel">'+note(q.error.message,true)+'</section>';return}
 let activeThread=(q.data||[])[0]?.id||null;
 const threadRows=(q.data||[]).map(x=>'<button type="button" class="item care-thread" data-id="'+esc(x.id)+'" style="width:100%;text-align:left;background:white"><span><strong>'+esc(x.title||"Care request")+'</strong><small>'+date(x.updated_at||x.created_at)+'</small></span><span class="pill '+pill(x.status)+'">'+esc(x.status||"OPEN")+'</span></button>').join("")||'<div class="empty">No conversations yet. Start one when you need help.</div>';
 app.innerHTML='<section class="panel"><h2>NAIJA TASK Care Inbox</h2><p class="muted">Send a message to the support team and continue the conversation here. This is a human-reviewed inbox, not an automated AI diagnosis or emergency service.</p><form id="care"><label>Topic</label><input name="title" required maxlength="120" placeholder="What do you need help with?"><label>Message</label><textarea name="message" required maxlength="3000" placeholder="Explain what happened. Do not share passwords, PINs or OTPs."></textarea><button class="btn">Start conversation</button></form><div id="result"></div></section><section class="panel"><h2>Your conversations</h2><div id="careThreads">'+threadRows+'</div></section><section class="panel" id="careConversation"><h2 id="careTitle">Select a conversation</h2><div id="careMessages" class="muted">Your messages and support replies will appear here.</div><form id="careReply" hidden><label>Reply</label><textarea name="message" required maxlength="3000" placeholder="Write a follow-up message"></textarea><button class="btn">Send reply</button></form><div id="replyResult"></div></section>';
 const threadsBox=document.getElementById("careThreads");
 async function openThread(id){
   activeThread=id;
   const thread=(q.data||[]).find(x=>String(x.id)===String(id));
   document.getElementById("careTitle").textContent=thread?.title||"Care conversation";
   const box=document.getElementById("careMessages");
   box.textContent="Loading conversation…";
   const r=await sb.from("ai_care_messages").select("id,sender_type,message,created_at").eq("thread_id",id).order("created_at",{ascending:true}).limit(100);
   if(r.error){box.innerHTML=note(r.error.message,true);return}
   box.innerHTML=(r.data||[]).map(x=>'<article class="item"><div><strong>'+esc(String(x.sender_type||"support").toLowerCase()==="user"?"You":"NAIJA TASK Support")+'</strong><small>'+esc(x.message)+'</small><small>'+date(x.created_at)+'</small></div></article>').join("")||'<div class="empty">No messages in this conversation yet.</div>';
   const status=String(thread?.status||"OPEN").toUpperCase();
   document.getElementById("careReply").hidden=/CLOSED|RESOLVED|REJECTED/.test(status);
   threadsBox.querySelectorAll(".care-thread").forEach(b=>b.classList.toggle("active",String(b.dataset.id)===String(id)));
 }
 threadsBox.addEventListener("click",e=>{
   const b=e.target.closest(".care-thread");
   if(b)openThread(b.dataset.id);
 });
 document.getElementById("care").onsubmit=async e=>{
   e.preventDefault();
   const form=e.currentTarget,fd=new FormData(form),button=form.querySelector("button");
   button.disabled=true;
   const title=String(fd.get("title")).trim(),message=String(fd.get("message")).trim();
   const a=await sb.from("ai_care_threads").insert({user_id:user.id,title}).select("id").single();
   if(a.error){document.getElementById("result").innerHTML=note(a.error.message,true);button.disabled=false;return}
   const z=await sb.from("ai_care_messages").insert({thread_id:a.data.id,user_id:user.id,sender_type:"user",message});
   if(z.error){document.getElementById("result").innerHTML=note(z.error.message,true);button.disabled=false;return}
   form.reset();document.getElementById("result").innerHTML=note("Conversation created. You can continue it below.");
   start();
 };
 document.getElementById("careReply").onsubmit=async e=>{
   e.preventDefault();
   if(!activeThread)return;
   const form=e.currentTarget,fd=new FormData(form),button=form.querySelector("button");
   button.disabled=true;
   const {error}=await sb.from("ai_care_messages").insert({thread_id:activeThread,user_id:user.id,sender_type:"user",message:String(fd.get("message")).trim()});
   if(error){document.getElementById("replyResult").innerHTML=note(error.message,true);button.disabled=false;return}
   form.reset();document.getElementById("replyResult").innerHTML=note("Reply sent.");button.disabled=false;openThread(activeThread);
 };
 if(activeThread)await openThread(activeThread);
 return;
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
 if(moduleName==="ai-assistant"){
 const faq=[
 ["How do I earn on NAIJA TASK?","Open Find Tasks, read the task instructions, complete the task and submit genuine proof."],
 ["When is a task reward credited?","A task reward is credited after the submission has been reviewed and approved."],
 ["How do I withdraw money?","Open Wallet, choose Withdraw, verify your bank account and submit an amount within your available balance."],
 ["Why did my withdrawal fail?","Check that your available balance covers the amount and that your bank account was verified. Contact Support if the dashboard balance looks incorrect."],
 ["How do I track submitted tasks?","Open My Task Activity to see submission status, review dates and any rejection reason."],
 ["How do I contact support?","Open Support Centre and submit a request. Never send your password, PIN or OTP."],
 ["Can I buy airtime or data now?","Open Airtime & Data to load the VTpass catalogue, select a network and plan, and pay from your wallet. If a transaction is pending, use Check status instead of buying again."]
 ];
 app.innerHTML='<section class="panel"><h2>Search help articles</h2><p class="muted">Find quick answers about earning, withdrawals and your account.</p><input id="helpSearch" type="search" placeholder="Search wallet, task, withdrawal…"><div id="helpResults"></div></section><section class="panel"><h2>Need more help?</h2><div class="links"><a class="link" href="support.html">🎧 Contact support</a><a class="link" href="ai-care.html">💚 Care inbox</a></div></section>';
 const drawHelp=term=>{const matches=faq.filter(x=>(x[0]+" "+x[1]).toLowerCase().includes(term.toLowerCase()));document.getElementById("helpResults").innerHTML=matches.length?matches.map(x=>'<article class="item"><div><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small></div></article>').join(""):'<div class="empty">No matching help article. Try another word.</div>'};
 document.getElementById("helpSearch").addEventListener("input",e=>drawHelp(e.target.value));drawHelp("");return;
 }
 const items=pages[moduleName]||pages.more;
 app.innerHTML='<section class="panel"><h2>'+esc(titles[moduleName]||titles.more)+'</h2><p class="muted">Open an available service below. Unavailable integrations are not presented as working purchase or AI features.</p><div class="links">'+items.map(x=>'<a class="link" href="'+x[2]+'">'+x[0]+' '+esc(x[1])+'</a>').join("")+'</div></section>';
}
start().catch(e=>{app.innerHTML='<section class="panel">'+note(e.message||String(e),true)+'</section>'});
})();
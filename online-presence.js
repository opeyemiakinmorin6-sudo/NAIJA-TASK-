(() => {
"use strict";
(async()=>{
  if(!window.supabase?.createClient)return;
  const db=window.supabase.createClient("https://jwakveeiynpakunwjzkj.supabase.co","sb_publishable_iT-y7ZOr_7g_SOx6ZPzR2A_ZjjnLZ6D");
  const auth=await db.auth.getUser();
  const user=auth.data?.user;
  if(auth.error||!user)return;
  const profile=await db.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
  const name=profile.data?.full_name||user.user_metadata?.full_name||"NAIJA TASK member";
  const channel=db.channel("nt-global-online",{config:{presence:{key:user.id+":"+Math.random().toString(36).slice(2,8)}}});
  const track=()=>channel.track({user_id:user.id,name,active_area:document.title||"NAIJA TASK",active_room:null,online_at:new Date().toISOString()});
  channel.subscribe(async status=>{if(status==="SUBSCRIBED"&&document.visibilityState==="visible")await track();});
  document.addEventListener("visibilitychange",async()=>{
    if(document.visibilityState==="visible"){if(channel.state==="joined")await track();}
    else await channel.untrack();
  });
  window.addEventListener("beforeunload",()=>channel.untrack());
  window.addEventListener("pagehide",()=>channel.untrack());
})().catch(error=>console.warn("NAIJA TASK online presence unavailable:",error));
})();
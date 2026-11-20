'use strict';
window.addEventListener('DOMContentLoaded',()=>{
  const button=document.getElementById('btn-publish-life'),status=document.getElementById('publish-status');
  if(!button)return;
  button.onclick=async()=>{
    const snap=window.game?.state.firstLifeSnapshot;
    if(!snap){status.textContent='请先完成这一局。';return;}
    button.disabled=true;status.textContent='正在发布游戏人生……';
    try{
      const signature=JSON.stringify([snap.name,snap.birthYear,snap.timeline]);
      let pending=JSON.parse(localStorage.getItem('yancheng80s_pending_public')||'null');
      if(!pending||pending.signature!==signature){
        const bytes=crypto.getRandomValues(new Uint8Array(32));
        pending={signature,token:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};
        localStorage.setItem('yancheng80s_pending_public',JSON.stringify(pending));
      }
      const record=Object.fromEntries(['name','region','birthYear','title','wealth','epitaph','timeline'].map(k=>[k,snap[k]]));
      const r=await fetch('api/lives',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({record,ownerToken:pending.token})});
      let data;try{data=await r.json();}catch{throw Error('公共长卷服务暂时不可用，本地记录不受影响。');}
      if(!r.ok)throw Error(data.error||'发布失败');
      const owned=JSON.parse(localStorage.getItem('yancheng80s_owned')||'{}');owned[data.id]=pending.token;localStorage.setItem('yancheng80s_owned',JSON.stringify(owned));
      const url=new URL('gallery.html?id='+data.id,location.href);
      status.replaceChildren(document.createTextNode('已公开。复制下方网址即可分享：'));
      const link=document.createElement('a');link.href=url.href;link.textContent=url.href;link.className='share-link';status.append(link);
      const copy=document.createElement('button');copy.textContent='复制分享链接';copy.className='share-button';copy.onclick=()=>navigator.clipboard.writeText(url.href).then(()=>{copy.textContent='已复制';}).catch(()=>{copy.textContent='请选中网址复制';});status.append(copy);
    }catch(e){status.textContent=e.message||'发布失败，请稍后重试。';}finally{button.disabled=false;}
  };
});

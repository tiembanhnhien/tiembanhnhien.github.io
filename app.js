(function(){
'use strict';
var $app = document.getElementById('app');

/* ---------- helpers ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){n=Math.round(Number(n)||0);var neg=n<0;n=Math.abs(n);return (neg?'−':'')+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'đ';}
function num(v){var n=Number(String(v).replace(/[^\d-]/g,''));return isFinite(n)?n:0;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function uid8(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function code(){return 'N'+Date.now().toString(36).slice(-5).toUpperCase();}
function pad(n){return String(n).padStart(2,'0');}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function today(){return ymd(new Date());}
function addDays(s,n){var p=s.split('-');var d=new Date(+p[0],+p[1]-1,+p[2]);d.setDate(d.getDate()+n);return ymd(d);}
var WD=['CN','T2','T3','T4','T5','T6','T7'];
function dshow(s){if(!s)return '';var p=s.split('-');var d=new Date(+p[0],+p[1]-1,+p[2]);var t=today();var lab=s===t?'Hôm nay':(s===addDays(t,1)?'Ngày mai':WD[d.getDay()]);return lab+', '+p[2]+'/'+p[1];}
function tshow(ms){var d=new Date(ms);return pad(d.getHours())+':'+pad(d.getMinutes())+' '+pad(d.getDate())+'/'+pad(d.getMonth()+1);}
var FB={};var IMGC={},IMGP={};var BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
function img(id){if(!id)return '';if(IMGC[id])return IMGC[id];if(!IMGP[id]&&FB.db){IMGP[id]=1;FB.getDoc(FB.doc(FB.db,'images',id)).then(function(s){IMGC[id]=s.exists()?s.data().data:BLANK;S.keepScroll=true;draw();},function(){IMGC[id]=BLANK;});}return BLANK;}
function phoneOk(p){return /^0\d{9}$/.test(String(p||'').replace(/[\s.\-]/g,''));}
function phoneClean(p){return String(p||'').replace(/[\s.\-]/g,'');}
function phoneShow(p){p=phoneClean(p);return p.length===10?p.slice(0,4)+' '+p.slice(4,7)+' '+p.slice(7):p;}
function getPath(o,path){return path.split('.').reduce(function(a,k){return a==null?a:a[k];},o);}
function setPath(o,path,v){var ks=path.split('.');var last=ks.pop();var t=ks.reduce(function(a,k){if(a[k]==null)a[k]={};return a[k];},o);t[last]=v;}

var SLOTS=['08:00 – 10:00','10:00 – 12:00','13:00 – 15:00','15:00 – 17:00','17:00 – 19:00','19:00 – 21:00'];
var STATUS={moi:['Mới','#FDEBD8','#8A4510'],xac_nhan:['Đã xác nhận','#F1E6F7','#5E3A78'],dang_giao:['Đang giao','#E3ECF7','#244E7D'],da_giao:['Đã giao','#E4F0E6','#2E5E3B'],huy:['Đã hủy','#EEEAE8','#5E5450']};
var STEPS=['moi','xac_nhan','dang_giao','da_giao'];
function stOf(o){return o.status==='dang_lam'?'xac_nhan':(o.status||'moi');}
var BANKS=[['970436','Vietcombank'],['970415','VietinBank'],['970418','BIDV'],['970405','Agribank'],['970407','Techcombank'],['970422','MB Bank'],['970416','ACB'],['970432','VPBank'],['970423','TPBank'],['970403','Sacombank'],['970441','VIB'],['970437','HDBank'],['970443','SHB'],['970426','MSB'],['970448','OCB'],['970440','SeABank'],['970431','Eximbank'],['970428','Nam A Bank']];
function stPill(s){var x=STATUS[s==='dang_lam'?'xac_nhan':s]||STATUS.moi;return '<span class="st" style="background:'+x[1]+';color:'+x[2]+'">'+x[0]+'</span>';}

/* ---------- VietQR ---------- */
function crc16(s){var c=0xFFFF;for(var i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(var j=0;j<8;j++){c=(c&0x8000)?((c<<1)^0x1021):(c<<1);c&=0xFFFF;}}return c.toString(16).toUpperCase().padStart(4,'0');}
function tlv(id,v){return id+pad(v.length)+v;}
function vietqr(bin,acc,amount,info){var mi=tlv('00','A000000727')+tlv('01',tlv('00',bin)+tlv('01',acc))+tlv('02','QRIBFTTA');var p=tlv('00','01')+tlv('01','12')+tlv('38',mi)+tlv('53','704')+(amount>0?tlv('54',String(Math.round(amount))):'')+tlv('58','VN')+(info?tlv('62',tlv('08',info)):'')+'6304';return p+crc16(p);}

/* ---------- state ---------- */
var S={db:null,user:null,uid:null,isAdmin:false,assets:null,mode:'khach',ready:false,err:'',noDb:false,
  catalog:null,myDoc:null,myDocLoaded:false,docs:[],view:'menu',cat:'tuoi',occ:'',cart:[],sheet:null,addTo:null,
  co:{},coErr:'',done:null,toast:'',busy:false,
  aview:'orders',afilter:'moi',edit:null,editOrig:'',pedit:null,peditDel:false,newOrd:null,known:null,setForm:null,readOnly:false,copyText:''};
var toastTimer=null,pending=false;
function toast(t){S.toast=t;if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(function(){S.toast='';draw();},2600);draw();}
function cat(){return S.catalog||{products:[],cakes:[],options:{},settings:{}};}
function opts(){return cat().options||{};}
function sets(){return cat().settings||{};}

/* ---------- money ---------- */
function sub(o){return (o.items||[]).reduce(function(a,it){return a+(Number(it.price)||0)*(Number(it.qty)||0);},0);}
function total(o){return sub(o)+(Number(o.shipFee)||0)-(Number(o.discount)||0);}
function due(o){return total(o)-(Number(o.prepaid)||0);}
function needQuote(o){return (o.items||[]).some(function(it){return it.price==null||it.price==='';});}
function hasCake(o){return (o.items||[]).some(function(it){return it.kind==='cake';});}

/* ---------- rendering ---------- */
function draw(){var a=document.activeElement;if(a&&$app.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){pending=true;return;}paint();}
function paint(){pending=false;var n0=S.isAdmin?unseen():0;document.title=(S.mode==='admin'?(n0?'('+n0+') ':'')+'Nhiên – Quản lý':'Nhiên – Đặt bánh');var y=window.scrollY;var html=S.mode==='admin'?adminView():customerView();$app.innerHTML=html+(S.toast?'<div class="toast" role="status">'+esc(S.toast)+'</div>':'');post();if(S.keepScroll){window.scrollTo(0,y);}S.keepScroll=false;}
function go(fn){S.keepScroll=false;fn();paint();window.scrollTo(0,0);}
function stay(fn){fn();S.keepScroll=true;paint();}

function photo(id,tone){return id?'<img class="photo" src="'+img(id)+'" alt="">':'<img class="mas" src="mascot.png" alt="">';}
function sizesLabel(p){var ps=(p.sizes||[]).map(function(z){return Number(z.price)||0;}).filter(function(x){return x>0;});if(!ps.length)return 'Báo giá';var m=Math.min.apply(null,ps);return (p.sizes.length>1?'từ ':'')+fmt(m);}

/* ===== CUSTOMER ===== */
function cHeader(title,subt){
  var tabs=[['menu','Thực đơn'],['cakes','Bánh kem'],['orders','Đơn của tôi']].map(function(t){var on=S.view===t[0]||(t[0]==='menu'&&(S.view==='checkout'||S.view==='done'));return '<button class="tab'+(on?' on':'')+'" data-a="view" data-v="'+t[0]+'">'+t[1]+'</button>';}).join('');
  return '<header class="hd"><div class="tabs">'+tabs+'</div><div class="brand"><img class="logo" src="logo.png" alt="Logo Nhiên"><div style="flex:1;min-width:0"><span class="ttl">'+esc(title)+'</span><span class="sub">'+esc(subt)+'</span></div>'+(S.isAdmin&&S.lock!=='khach'?'<button class="pill" data-a="mode" data-v="admin">Quản lý</button>':'')+'</div></header>';
}
function customerView(){
  if(S.noDb)return noDbView();
  if(!S.ready)return '<div class="empty" style="padding-top:120px"><img src="mascot.png" alt=""><span>'+(S.err?esc(S.err):'Đang mở tiệm bánh Nhiên…')+'</span></div>';
  var v=S.view,h='';
  if(v==='menu')h=menuView();else if(v==='cakes')h=cakesView();else if(v==='orders')h=myOrdersView();else if(v==='checkout')h=checkoutView();else if(v==='done')h=doneView();
  h+=cartBar();
  if(S.sheet){if(S.sheet.type==='product')h+=productSheet();else if(S.sheet.type==='cake')h+=cakeSheet();else if(S.sheet.type==='cart')h+=cartSheet();}
  return h;
}
function noDbView(){return '<div class="empty" style="padding-top:100px"><img src="mascot.png" alt=""><b style="color:var(--red);font-size:17px">Chưa mở được dữ liệu của tiệm</b><span>Kiểm tra mạng rồi tải lại trang nhé.</span></div>';}
function noAdminBanner(){return S.err?'<div class="err">'+esc(S.err)+'</div>':'';}
function addToBanner(){if(!S.addTo)return '';var o=findMyOrder(S.addTo);if(!o)return '';return '<div class="info row"><span>Đang đặt thêm vào đơn <b>#'+esc(o.code)+'</b></span><button class="btn o s" data-a="cancelAddTo">Bỏ</button></div>';}
function menuView(){
  var ps=(cat().products||[]).filter(function(p){return p.cat===S.cat;});
  var h=cHeader('Hôm nay ăn bánh gì?','Bánh Nhiên làm mới mỗi ngày')+'<div class="wrap">'+noAdminBanner()+addToBanner();
  h+='<div class="chips"><button class="chip'+(S.cat==='tuoi'?' on':'')+'" data-a="cat" data-v="tuoi">Bánh tươi</button><button class="chip'+(S.cat==='hop'?' on':'')+'" data-a="cat" data-v="hop">Bánh hộp</button></div>';
  h+='<p class="note">'+(S.cat==='tuoi'?'Bánh tươi: ngon nhất khi ăn trong ngày.':'Bánh hộp: để được lâu, hợp làm quà.')+'</p>';
  if(!ps.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>Nhiên đang cập nhật thực đơn.</span></div>';
  h+='<div class="grid">'+ps.map(function(p){
    var off=p.available===false;var n=S.cart.filter(function(l){return l.pid===p.id;}).reduce(function(a,l){return a+l.qty;},0);
    return '<button class="pc'+(off?' off':'')+'" '+(off?'disabled':'data-a="openP" data-id="'+esc(p.id)+'"')+' aria-label="'+esc(p.name)+'"><span class="ph">'+photo(p.img)+((p.sizes||[]).length>1?'<span class="tag">'+p.sizes.length+' size</span>':'')+(off?'<span class="tag g">Hết hàng</span>':'')+(n?'<span class="tag r">Trong giỏ: '+n+'</span>':'')+'</span><span class="pi"><span class="pn">'+esc(p.name)+'</span><span class="sub" style="font-size:12px">'+esc(p.note||'')+'</span><span class="pp"><span class="price">'+sizesLabel(p)+'</span>'+(off?'':'<span class="plus" aria-hidden="true">+</span>')+'</span></span></button>';
  }).join('')+'</div></div>';
  return h;
}
function cartCount(){return S.cart.reduce(function(a,l){return a+l.qty;},0);}
function cartSub(){return S.cart.reduce(function(a,l){return a+(Number(l.price)||0)*l.qty;},0);}
function cartBar(){
  if(!S.cart.length||S.sheet||S.view==='checkout'||S.view==='done')return '';
  return '<div class="bar"><button class="btn sp" data-a="openCart"><span>Xem giỏ hàng · '+cartCount()+' món</span><span>'+fmt(cartSub())+(S.cart.some(function(l){return l.price==null;})?' +':'')+'</span></button></div>';
}
function productSheet(){
  var sh=S.sheet;var p=(cat().products||[]).find(function(x){return x.id===sh.id;});if(!p)return '';
  var psz=p.sizes||[];var z=psz[sh.size]||{};var showSz=psz.length>1||(psz[0]&&psz[0].label);
  var h='<div class="ov"><button class="bg" data-a="closeSheet" aria-label="Đóng"></button><div class="sheet" role="dialog" aria-label="'+esc(p.name)+'"><span class="grab"></span><button class="qb" data-a="closeSheet" aria-label="Đóng" style="position:absolute;top:12px;right:12px">✕</button>';
  h+='<div style="display:flex;gap:12px;align-items:center"><div class="thumb" style="width:96px;height:96px;border-radius:16px">'+(p.img?'<img src="'+img(p.img)+'" alt="">':'<img src="mascot.png" alt="" style="width:60%;height:auto;opacity:.35">')+'</div><div style="flex:1"><div class="bl" style="font-size:22px;font-weight:800;color:var(--red);line-height:1.15">'+esc(p.name)+'</div><div class="sub">'+esc(p.note||'')+'</div><div style="font-size:18px;font-weight:700;margin-top:2px">'+fmt(z.price)+'</div></div></div>';
  if(p.desc)h+='<p class="note" style="font-size:13.5px">'+esc(p.desc)+'</p>';
  if(showSz){h+='<div><div class="h3" style="margin-bottom:8px">Chọn size</div><div style="display:flex;gap:8px;flex-wrap:wrap">'+p.sizes.map(function(s,i){return '<button class="sz'+(i===sh.size?' on':'')+'" data-a="pSize" data-i="'+i+'"><b style="font-size:14px">'+esc(s.label||'Mặc định')+'</b><span style="font-size:13px">'+fmt(s.price)+'</span></button>';}).join('')+'</div></div>';}
  h+='<div class="row"><span class="h3">Số lượng</span><span class="qty"><button class="qb" data-a="pQty" data-d="-1" aria-label="Bớt">−</button><b style="font-size:18px;min-width:22px;text-align:center">'+sh.qty+'</b><button class="qb f" data-a="pQty" data-d="1" aria-label="Thêm">+</button></span></div>';
  h+='<button class="btn sp" data-a="pAdd"><span>Thêm vào giỏ</span><span>'+fmt((Number(z.price)||0)*sh.qty)+'</span></button></div></div>';
  return h;
}
function cakeBadge(c){if(c.badge==='moi')return '<span class="tag" style="background:#A33127;color:#FFFBEE">Mới</span>';if(c.badge==='banchay')return '<span class="tag">Bán chạy</span>';if(c.pinned)return '<span class="tag">Nổi bật</span>';return '';}
function cakesView(){
  var all=(cat().cakes||[]).filter(function(c){return c.visible!==false;}).sort(function(a,b){return (b.pinned?1:0)-(a.pinned?1:0);});
  var occs=[];all.forEach(function(c){if(c.occasion&&occs.indexOf(c.occasion)<0)occs.push(c.occasion);});
  var list=S.occ?all.filter(function(c){return c.occasion===S.occ;}):all;
  var h=cHeader('Bánh kem Nhiên','Chọn mẫu có sẵn hoặc thiết kế riêng')+'<div class="wrap">'+noAdminBanner()+addToBanner();
  if(occs.length)h+='<div class="chips"><button class="chip'+(!S.occ?' on':'')+'" data-a="occ" data-v="">Tất cả</button>'+occs.map(function(o){return '<button class="chip'+(S.occ===o?' on':'')+'" data-a="occ" data-v="'+esc(o)+'">'+esc(o)+'</button>';}).join('')+'</div>';
  h+='<p class="note">Bánh kem cần đặt trước 1–2 ngày. Mẫu có sẵn vẫn đổi được size và màu.</p>';
  if(!list.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>Nhiên đang cập nhật mẫu bánh kem. Bạn có thể chọn "Thiết kế theo ý tôi" ở dưới.</span></div>';
  else h+='<div class="grid">'+list.map(function(c){var szs=(c.sizes||[]).map(function(z){return z.label;}).filter(Boolean).join(' · ');return '<button class="pc" data-a="openCake" data-id="'+esc(c.id)+'" aria-label="'+esc(c.name)+'"><span class="ph">'+photo(c.img)+cakeBadge(c)+'</span><span class="pi"><span class="pn">'+esc(c.name)+'</span><span class="sub" style="font-size:12px">'+esc(szs||c.occasion||'')+'</span><span class="pp"><span class="price">'+sizesLabel(c)+'</span><span class="plus" aria-hidden="true">+</span></span></span></button>';}).join('')+'</div>';
  h+='<button class="card" data-a="openCake" data-id="" style="display:flex;align-items:center;gap:12px;border:1.5px dashed var(--line2);text-align:left"><span style="width:46px;height:46px;border-radius:999px;background:var(--pink3);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A33127" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></span><span style="flex:1"><span class="bl" style="font-size:17px;font-weight:700;color:var(--red);display:block">Thiết kế theo ý tôi</span><span class="sub">Gửi ảnh và mô tả, Nhiên báo giá cho bạn</span></span><span style="font-size:22px;color:var(--red)">›</span></button>';
  return h+'</div>';
}
function choiceRow(label,key,list,multi){
  if(!list||!list.length)return '';var sh=S.sheet;var cur=sh[key];
  return '<div><div class="h3" style="margin-bottom:8px">'+label+'</div><div class="chips">'+list.map(function(x){var on=multi?(cur||[]).indexOf(x)>=0:cur===x;return '<button class="opt'+(on?' on':'')+'" data-a="cOpt" data-k="'+key+'" data-v="'+esc(x)+'" data-m="'+(multi?1:0)+'">'+esc(x)+'</button>';}).join('')+'</div></div>';
}
function nhanRow(){var o=opts();var list=o.nhan||[];var sh=S.sheet;
  return '<div><div class="h3" style="margin-bottom:8px">Nhân bánh</div><div class="chips">'+list.map(function(x){return '<button class="opt'+(!sh.nhanKhac&&sh.nhan===x?' on':'')+'" data-a="cOpt" data-k="nhan" data-v="'+esc(x)+'" data-m="0">'+esc(x)+'</button>';}).join('')+'<button class="opt'+(sh.nhanKhac?' on':'')+'" data-a="nhanKhac">Theo yêu cầu…</button></div>'+(sh.nhanKhac?'<label class="lbl" style="margin-top:8px">Nhân bạn muốn<input class="in" data-f="sheet.nhanText" value="'+esc(sh.nhanText||'')+'" placeholder="Ví dụ: mứt xoài"></label>':'')+'</div>';}
function mauRow(){var o=opts();var sh=S.sheet;if(!o.mau||!o.mau.length)return '';return '<div><div class="h3" style="margin-bottom:8px">Màu chủ đạo'+(sh.mau?' · <span style="font-family:Be Vietnam Pro;font-size:13px;font-weight:500;color:var(--mute)">'+esc(sh.mau)+'</span>':'')+'</div><div class="chips">'+o.mau.map(function(m){return '<button class="sw'+(sh.mau===m.name?' on':'')+'" style="background:'+esc(m.hex)+'" data-a="cOpt" data-k="mau" data-v="'+esc(m.name)+'" data-m="0" aria-label="'+esc(m.name)+'"></button>';}).join('')+'</div></div>';}
function cakeSheet(){
  var sh=S.sheet;var c=sh.id?(cat().cakes||[]).find(function(x){return x.id===sh.id;}):null;var o=opts();
  var h='<div class="ov"><button class="bg" data-a="closeSheet" aria-label="Đóng"></button><div class="sheet" role="dialog"><span class="grab"></span><button class="qb" data-a="closeSheet" aria-label="Đóng" style="position:absolute;top:12px;right:12px;z-index:2">✕</button>';
  if(c){
    h+='<div style="flex-shrink:0;width:100%;aspect-ratio:4/3;max-height:260px;border-radius:16px;overflow:hidden;background:#FBE3DF;display:flex;align-items:center;justify-content:center">'+(c.img?'<img src="'+img(c.img)+'" alt="'+esc(c.name)+'" style="width:100%;height:100%;object-fit:cover">':'<img src="mascot.png" alt="" style="width:34%;opacity:.35">')+'</div>';
    h+='<div><div class="bl" style="font-size:22px;font-weight:800;color:var(--red);line-height:1.15">'+esc(c.name)+'</div>'+(c.desc?'<div class="sub">'+esc(c.desc)+'</div>':(c.occasion?'<div class="sub">'+esc(c.occasion)+'</div>':''))+'</div>';
    if((c.sizes||[]).length)h+='<div><div class="h3" style="margin-bottom:8px">Chọn size</div><div style="display:flex;gap:8px;flex-wrap:wrap">'+c.sizes.map(function(s,i){return '<button class="sz'+(i===sh.size?' on':'')+'" data-a="cSize" data-i="'+i+'"><b style="font-size:14px">'+esc(s.label||'Mặc định')+'</b><span style="font-size:12.5px">'+(Number(s.price)>0?fmt(s.price):'Báo giá')+'</span></button>';}).join('')+'</div></div>';
    h+=mauRow()+nhanRow();
    h+='<label class="lbl">Chữ trên bánh (không bắt buộc)<input class="in" data-f="sheet.chu" value="'+esc(sh.chu||'')+'" placeholder="Happy Birthday Mẹ"></label>';
    h+='<label class="lbl">Ghi chú thêm (không bắt buộc)<textarea class="in" data-f="sheet.desc" placeholder="Ví dụ: ít ngọt">'+esc(sh.desc||'')+'</textarea></label>';
    h+='<div class="row"><span class="h3">Số lượng</span><span class="qty"><button class="qb" data-a="cQty" data-d="-1" aria-label="Bớt">−</button><b style="font-size:18px;min-width:22px;text-align:center">'+(sh.qty||1)+'</b><button class="qb f" data-a="cQty" data-d="1" aria-label="Thêm">+</button></span></div>';
  } else {
    h+='<div class="bl" style="font-size:22px;font-weight:800;color:var(--red)">Thiết kế theo ý bạn</div><label class="lbl">Mô tả chiếc bánh bạn muốn<textarea class="in" data-f="sheet.desc" placeholder="Bánh 2 tầng tông xanh mint, có tên bé An">'+esc(sh.desc||'')+'</textarea></label>';
    h+='<div class="lbl">Ảnh tham khảo'+(S.assets?'<label class="btn o" style="cursor:pointer">'+(sh.uploading?'Đang tải ảnh…':(sh.ref?'Đổi ảnh':'Tải ảnh lên'))+'<input type="file" accept="image/*" class="sr" data-up="ref"></label>'+(sh.ref?'<img src="'+img(sh.ref)+'" alt="Ảnh tham khảo" style="width:120px;border-radius:12px">':''):'<span class="note">Bạn chưa tải ảnh được lúc này. Hãy gửi ảnh qua Zalo cho Nhiên nhé.</span>')+'</div>';
    h+=nhanRow()+choiceRow('Kem','kem',o.kem,false)+mauRow()+choiceRow('Trang trí thêm','tt',o.trangtri,true);
    h+='<label class="lbl">Chữ trên bánh<input class="in" data-f="sheet.chu" value="'+esc(sh.chu||'')+'" placeholder="Mừng bé An 1 tuổi"></label>';
    h+='<div class="info">Nhiên sẽ xem mô tả và báo giá cho bạn trong mục "Đơn của tôi".</div>';
  }
  if(sh.err)h+='<div class="err">'+esc(sh.err)+'</div>';
  var price=c&&c.sizes&&c.sizes[sh.size]?Number(c.sizes[sh.size].price)||0:0;var q=c?(sh.qty||1):1;
  h+='<button class="btn sp" data-a="cAdd"><span>'+(c?'Thêm vào giỏ':'Thêm yêu cầu vào giỏ')+'</span><span>'+(price?fmt(price*q):'Nhiên báo giá')+'</span></button></div></div>';
  return h;
}
function lineDetail(l){if(l.kind!=='cake')return esc(l.size?l.size+' · ':'')+fmt(l.price);var c=l.cake||{};var bits=[l.size,c.nhan?'Nhân '+c.nhan:'',c.cot,c.kem,c.mau,(c.tt||[]).join(', ')].filter(Boolean);var s=esc(bits.join(' · '));if(c.chu)s+='<br>Chữ: "'+esc(c.chu)+'"';if(c.desc)s+='<br>'+esc(c.desc);return s;}
function cartSheet(){
  var h='<div class="ov"><button class="bg" data-a="closeSheet" aria-label="Đóng"></button><div class="sheet" role="dialog" aria-label="Giỏ hàng"><span class="grab"></span><button class="qb" data-a="closeSheet" aria-label="Đóng" style="position:absolute;top:12px;right:12px">✕</button><div class="bl" style="font-size:22px;font-weight:800;color:var(--red)">Giỏ hàng</div>';
  if(!S.cart.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>Giỏ hàng đang trống.</span></div>';
  h+=S.cart.map(function(l,i){return '<div class="card" style="padding:10px 12px;display:flex;gap:10px;align-items:center"><div style="flex:1;min-width:0"><div style="font-weight:600">'+esc(l.name)+'</div><div class="sub" style="font-size:12.5px">'+lineDetail(l)+'</div></div><span class="qty"><button class="qb" data-a="lQty" data-i="'+i+'" data-d="-1" aria-label="Bớt">−</button><b>'+l.qty+'</b><button class="qb f" data-a="lQty" data-i="'+i+'" data-d="1" aria-label="Thêm">+</button></span><b style="min-width:78px;text-align:right;color:var(--red)">'+(l.price==null?'Báo giá':fmt(l.price*l.qty))+'</b></div>';}).join('');
  if(S.cart.length){h+='<div class="row line" style="font-size:17px;font-weight:700"><span>Tạm tính</span><span style="color:var(--red)">'+fmt(cartSub())+'</span></div>';if(S.cart.some(function(l){return l.price==null;}))h+='<p class="note">Bánh thiết kế riêng: Nhiên sẽ báo giá sau khi nhận đơn.</p>';
  h+=S.addTo?'<button class="btn" data-a="confirmAdd"'+(S.busy?' disabled':'')+'>'+(S.busy?'Đang gửi…':'Thêm vào đơn #'+esc((findMyOrder(S.addTo)||{}).code||''))+'</button>':'<button class="btn" data-a="checkout">Tiếp tục đặt hàng</button>';}
  return h+'</div></div>';
}
function checkoutView(){
  var co=S.co,st=sets();var cake=S.cart.some(function(l){return l.kind==='cake';});var minD=cake?addDays(today(),1):today();
  var ship=co.delivery==='lay'?0:(st.shipFee>0?Number(st.shipFee):null);
  var h='<header class="ahd" style="background:var(--pink2);border-bottom:3px solid var(--pink)"><button class="qb" data-a="view" data-v="menu" aria-label="Quay lại" style="width:44px;height:44px">‹</button><span class="ttl" style="flex:1">Thông tin nhận hàng</span></header><div class="wrap">';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:8px">'+S.cart.map(function(l){return '<div class="row" style="font-size:14px;align-items:flex-start"><span style="flex:1">'+esc(l.name)+' × '+l.qty+'<br><span class="sub" style="font-size:12px">'+lineDetail(l)+'</span></span><b>'+(l.price==null?'Báo giá':fmt(l.price*l.qty))+'</b></div>';}).join('')+'<button class="btn o s" data-a="openCart" style="align-self:flex-start">Sửa giỏ hàng</button></div>';
  h+='<label class="lbl">Số điện thoại<input class="in" type="tel" inputmode="tel" data-f="co.phone" value="'+esc(co.phone||'')+'" placeholder="0909 123 456"></label>';
  h+='<label class="lbl">Họ tên<input class="in" data-f="co.name" value="'+esc(co.name||'')+'" placeholder="Tên của bạn"></label>';
  h+='<div class="grid"><button class="opt'+(co.delivery!=='lay'?' on':'')+'" data-a="coDel" data-v="giao">Giao tận nơi</button><button class="opt'+(co.delivery==='lay'?' on':'')+'" data-a="coDel" data-v="lay">Tự đến lấy</button></div>';
  if(co.delivery!=='lay')h+='<label class="lbl">Địa chỉ giao<textarea class="in" data-f="co.address" placeholder="Số nhà, đường, phường/xã, quận/huyện">'+esc(co.address||'')+'</textarea></label>';
  h+='<div class="grid"><label class="lbl">Ngày nhận<input class="in" type="date" min="'+minD+'" data-f="co.date" value="'+esc(co.date||'')+'"></label><label class="lbl">Giờ nhận<select class="in" data-f="co.slot">'+SLOTS.map(function(s){return '<option'+(co.slot===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select></label></div>';
  if(cake)h+='<p class="note">Đơn có bánh kem nên ngày nhận sớm nhất là '+esc(dshow(minD))+'.</p>';
  h+='<label class="lbl">Ghi chú cho Nhiên<textarea class="in" data-f="co.note" placeholder="Ví dụ: gọi trước khi giao">'+esc(co.note||'')+'</textarea></label>';
  var s=cartSub();
  h+='<div class="card" style="display:flex;flex-direction:column;gap:8px"><div class="row"><span class="sub">Tạm tính</span><span>'+fmt(s)+'</span></div><div class="row"><span class="sub">Phí ship</span><span>'+(co.delivery==='lay'?'0đ':(ship==null?'Nhiên báo khi xác nhận':fmt(ship)))+'</span></div><div class="row line" style="font-size:17px;font-weight:700"><span>Tổng cộng</span><span style="color:var(--red)">'+fmt(s+(ship||0))+(ship==null&&co.delivery!=='lay'?' + ship':'')+'</span></div></div>';
  if(S.coErr)h+='<div class="err">'+esc(S.coErr)+'</div>';
  h+='<button class="btn sp" data-a="placeOrder"'+(S.busy?' disabled':'')+'><span>'+(S.busy?'Đang gửi đơn…':'Đặt hàng')+'</span><span>'+fmt(s+(ship||0))+'</span></button></div>';
  return h;
}
function bankOk(){var st=sets();return st.bankBin&&st.accountNo;}
function doneView(){
  var o=S.done?findMyOrder(S.done):null;if(!o)return cHeader('Đặt hàng xong','')+'<div class="wrap"><button class="btn" data-a="view" data-v="orders">Xem đơn của tôi</button></div>';
  var st=sets();var amt=due(o);var q=needQuote(o);var shipUnknown=o.customer&&o.customer.delivery!=='lay'&&(o.shipFee==null);
  var h='<div class="wrap" style="align-items:center;padding-top:30px"><img src="mascot.png" alt="Chú thỏ Nhiên" style="height:96px"><div class="center"><div class="ttl" style="font-size:28px">Đặt hàng xong rồi!</div><div class="sub" style="font-size:14px">Mã đơn <b style="color:var(--ink)">#'+esc(o.code)+'</b> · Nhiên đã nhận được đơn</div></div>';
  if(q||shipUnknown){h+='<div class="info" style="width:100%">'+(q?'Đơn có bánh thiết kế riêng: ':'')+'Nhiên sẽ xác nhận '+(q?'giá':'phí ship')+' rồi bạn thanh toán sau nhé. Theo dõi trong mục "Đơn của tôi".</div>';}
  if(bankOk()){
    h+='<div class="card" style="width:100%;display:flex;flex-direction:column;gap:12px;align-items:center"><div class="h3">'+(q||shipUnknown?'Thông tin chuyển khoản':'Quét mã để chuyển khoản')+'</div>';
    if(!q&&!shipUnknown)h+='<div class="qrbox" id="qr" data-qr="'+esc(vietqr(st.bankBin,st.accountNo,amt,o.code))+'"></div>';
    h+='<div style="width:100%;display:flex;flex-direction:column;gap:6px;font-size:14px">'+(!q&&!shipUnknown?'<div class="row"><span class="sub">Số tiền</span><b style="color:var(--red)">'+fmt(amt)+'</b></div>':'')+'<div class="row"><span class="sub">Nội dung</span><b>'+esc(o.code)+'</b></div><div class="row"><span class="sub">Ngân hàng</span><span>'+esc(st.bankName||'')+'</span></div><div class="row"><span class="sub">Số tài khoản</span><b>'+esc(st.accountNo)+'</b></div><div class="row"><span class="sub">Chủ tài khoản</span><span>'+esc(st.accountName||'')+'</span></div></div></div>';
  }
  h+='<button class="btn" data-a="view" data-v="orders">Xem đơn của tôi</button><button class="btn o" data-a="view" data-v="menu">Tiếp tục xem bánh</button>';
  if(!bankOk())h+='<p class="note center">Thanh toán khi nhận hàng, hoặc chuyển khoản theo hướng dẫn của Nhiên.</p>';
  return h+'</div>';
}
function myOrders(){var m=(S.myDoc&&S.myDoc.orders)||{};return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});}
function findMyOrder(id){var m=(S.myDoc&&S.myDoc.orders)||{};return m[id];}
function progress(o){if(o.status==='huy')return '';var idx=STEPS.indexOf(stOf(o));return '<div class="prog">'+[['moi','Đã nhận'],['xac_nhan','Đã xác nhận'],['dang_giao','Đang giao'],['da_giao','Đã giao']].map(function(s,i){return '<div class="'+(i<=idx?'on':'')+'"><i></i>'+s[1]+'</div>';}).join('')+'</div>';}
function myOrdersView(){
  var h=cHeader('Đơn của tôi','Theo dõi đơn và đặt thêm')+'<div class="wrap">';
  if(!S.uid){return h+'<div class="info">'+(S.err?esc(S.err):'Đang kết nối với tiệm…')+'</div></div>';}
  var os=myOrders();var st=sets();
  if(!os.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>Bạn chưa có đơn nào.</span><button class="btn s" data-a="view" data-v="menu">Xem thực đơn</button></div>';
  os.forEach(function(o){
    var last=(o.history||[])[(o.history||[]).length-1];var canAdd=(o.status==='moi'||o.status==='xac_nhan');
    h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="row"><b style="font-size:15px">Đơn #'+esc(o.code)+'</b>'+stPill(o.status)+'</div>'+progress(o);
    if(last&&last.by==='nhien')h+='<div class="info"><b>Nhiên đã cập nhật:</b> '+esc(last.text)+'</div>';
    h+='<div style="font-size:13.5px;line-height:1.7;color:var(--soft)">'+(o.items||[]).map(function(it){return esc(it.name)+(it.size?' ('+esc(it.size)+')':'')+' × '+it.qty;}).join('<br>')+'<br>'+(o.customer&&o.customer.delivery==='lay'?'Tự đến lấy':'Giao')+' · '+esc(dshow(o.when&&o.when.date))+' · '+esc(o.when&&o.when.slot||'')+'</div>';
    h+='<div class="row line" style="font-size:15px;font-weight:700"><span>'+(needQuote(o)?'Đang chờ báo giá':'Tổng cộng')+'</span><span style="color:var(--red)">'+fmt(total(o))+(o.shipFee==null&&o.customer&&o.customer.delivery!=='lay'?' + ship':'')+'</span></div>';
    if(Number(o.prepaid)>0)h+='<div class="row" style="font-size:13.5px"><span class="sub">Đã trả trước</span><span>'+fmt(o.prepaid)+'</span></div><div class="row" style="font-size:14px;font-weight:700"><span>Còn phải trả</span><span>'+fmt(due(o))+'</span></div>';
    h+='<div class="grid">'+(canAdd?'<button class="btn s" data-a="addTo" data-id="'+esc(o.id)+'">Đặt thêm món</button>':'<button class="btn o s" data-a="reorder" data-id="'+esc(o.id)+'">Đặt lại đơn này</button>')+(st.phone?'<a class="btn o s" href="tel:'+esc(phoneClean(st.phone))+'" style="text-decoration:none">Gọi Nhiên · '+esc(phoneShow(st.phone))+'</a>':'')+'</div></div>';
  });
  return h+'</div>';
}

/* ===== ADMIN ===== */
function allOrders(){var out=[];S.docs.forEach(function(d){var m=d.orders||{};Object.keys(m).forEach(function(k){var o=m[k];if(o&&o.id)out.push({doc:d.id,o:o});});});return out.sort(function(a,b){return (b.o.createdAt||0)-(a.o.createdAt||0);});}
function unseen(){return allOrders().filter(function(x){return x.o.seenByAdmin===false;}).length;}
function aHeader(title,subt){var n=unseen();return '<header class="ahd"><img src="mascot.png" alt="Logo Nhiên" style="height:42px"><div style="flex:1;min-width:0"><span class="ttl" style="font-size:21px">'+esc(title)+'</span><span class="sub" style="font-size:12px">'+esc(subt)+'</span></div><a class="pill" href="./" target="_blank" rel="noopener" style="text-decoration:none">App khách</a></header>';}
function aNav(){var n=unseen();var items=[['orders','Đơn hàng','<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'],['hist','Lịch sử','<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],['cal','Lịch','<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'],['menu','Thực đơn','<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'],['cakes','Mẫu bánh','<path d="M4 20h16v-7H4z"/><path d="M4 16c2 1 4 1 6 0s4-1 6 0 3 1 4 0"/><path d="M12 13V9"/><circle cx="12" cy="7" r="1.5"/>'],['settings','Cài đặt','<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>']];
  return '<nav class="nav">'+items.map(function(it){var on=S.aview===it[0];return '<button class="nv'+(on?' on':'')+'" data-a="aview" data-v="'+it[0]+'"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="'+(on?'#A33127':'#7A5A52')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+it[2]+'</svg>'+it[1]+(it[0]==='orders'&&n?'<b>'+n+'</b>':'')+'</button>';}).join('')+'</nav>';}
function loginView(){var l=S.login||(S.login={email:'',pass:''});
  if(!S.authChecked)return '<div class="empty" style="padding-top:120px"><img src="mascot.png" alt=""><span>'+(S.err?esc(S.err):'Đang mở…')+'</span></div>';
  return '<div class="wrap" style="padding-top:50px;align-items:center"><img src="logo.png" alt="Logo Nhiên" style="height:110px"><div class="ttl center" style="font-size:26px">Quản lý tiệm Nhiên</div><div class="card" style="width:100%;display:flex;flex-direction:column;gap:12px"><label class="lbl">Email<input class="in" type="email" autocomplete="username" data-f="login.email" value="'+esc(l.email)+'"></label><label class="lbl">Mật khẩu<input class="in" type="password" autocomplete="current-password" data-f="login.pass" data-enter="login"></label>'+(l.err?'<div class="err">'+esc(l.err)+'</div>':'')+(l.msg?'<div class="info">'+esc(l.msg)+'</div>':'')+'<button class="btn" data-a="login"'+(S.busy?' disabled':'')+'>'+(S.busy?'Đang đăng nhập…':'Đăng nhập')+'</button><button class="btn o s" data-a="forgot" style="align-self:center">Quên mật khẩu</button></div><a class="note" href="./">Mở app đặt bánh của khách</a></div>';}
function deniedView(){return '<div class="empty" style="padding-top:100px"><img src="mascot.png" alt=""><b style="color:var(--red);font-size:17px">Tài khoản này chưa có quyền quản lý</b><span>'+esc(S.adminEmail||'')+'</span><span>Kiểm tra lại email trong phần Rules của Firestore.</span><button class="btn s" data-a="logout">Đăng xuất</button></div>';}
function adminView(){
  if(!S.authed)return loginView();
  if(S.denied)return deniedView();
  if(!S.ready)return '<div class="empty" style="padding-top:120px"><img src="mascot.png" alt=""><span>'+(S.err?esc(S.err):'Đang tải…')+'</span></div>';
  if(S.edit)return orderEditView();
  if(S.newOrd)return newOrderView();
  var h='';
  if(S.aview==='orders')h=aOrdersView();else if(S.aview==='hist')h=aHistView();else if(S.aview==='cal')h=aCalView();else if(S.aview==='menu')h=aMenuView();else if(S.aview==='cakes')h=aCakesView();else h=aSettingsView();
  h+=aNav();
  if(S.pedit)h+=peditSheet();
  return h;
}
var FILTERS=[['moi','Mới'],['xac_nhan','Đã xác nhận'],['dang_giao','Đang giao']];
function aOrdersView(){
  var all=allOrders();
  var h=aHeader('Đơn hàng',dshow(today()))+'<div class="wrap">';
  if(!S.catalog)h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Chưa có thực đơn</div><p class="note">Bấm nút dưới để tạo thực đơn ban đầu: 12 món và giá hiện tại của Nhiên, cùng danh sách nhân bánh. Chỉ cần làm 1 lần.</p><button class="btn" data-a="seed"'+(S.busy?' disabled':'')+'>Tạo thực đơn ban đầu</button></div>';
  h+='<button class="btn" data-a="newOrd">+ Tạo đơn cho khách</button>';
  h+='<div class="chips">'+FILTERS.map(function(f){var n=all.filter(function(x){return stOf(x.o)===f[0];}).length;return '<button class="chip'+(S.afilter===f[0]?' on':'')+'" data-a="afilter" data-v="'+f[0]+'">'+f[1]+' · '+n+'</button>';}).join('')+'</div>';
  var list=all.filter(function(x){return stOf(x.o)===S.afilter;});
  if(!list.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>Chưa có đơn ở mục này.</span></div>';
  list.forEach(function(x){var o=x.o;var c=o.customer||{};
    h+='<button class="oc'+(o.seenByAdmin===false?' new':'')+'" data-a="openOrd" data-doc="'+esc(x.doc)+'" data-id="'+esc(o.id)+'"><span class="row" style="width:100%"><b style="font-size:15px">'+esc(c.name||'Khách')+' <span style="font-weight:500;color:var(--mute);font-size:13px">#'+esc(o.code)+'</span></b>'+(o.seenByAdmin===false?'<span class="st" style="background:var(--red);color:#FFFBEE">Mới cập nhật</span>':stPill(o.status))+'</span>';
    h+='<span style="font-size:13px;color:var(--soft)">'+(o.items||[]).reduce(function(a,it){return a+Number(it.qty||0);},0)+' món'+(hasCake(o)?' · có bánh kem':'')+' · '+esc(dshow(o.when&&o.when.date))+' '+esc(o.when&&o.when.slot||'')+'</span>';
    h+='<span class="row" style="width:100%;font-size:13.5px"><span class="sub">'+(o.source==='nhien'?'Nhiên tạo':'Khách đặt')+' · '+(c.delivery==='lay'?'tự lấy':'giao')+'</span><span>'+(needQuote(o)?'<b style="color:#8A4510">Chờ báo giá</b>':'Thu <b style="color:var(--red)">'+fmt(due(o))+'</b>')+'</span></span></button>';
  });
  return h+'</div>';
}
function orderEditView(){
  var e=S.edit,o=e.o,c=o.customer||{};var dirty=JSON.stringify(o)!==S.editOrig;
  var h='<header class="ahd"><button class="qb" data-a="closeOrd" aria-label="Quay lại" style="width:44px;height:44px">‹</button><div style="flex:1"><span class="ttl" style="font-size:21px">Đơn #'+esc(o.code)+'</span><span class="sub" style="font-size:12px">'+(o.source==='nhien'?'Nhiên tạo':'Khách đặt')+' · '+esc(tshow(o.createdAt))+'</span></div>'+stPill(o.status)+'</header><div class="wrap">';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Khách hàng</div><div class="row"><div><div style="font-weight:700;font-size:15px">'+esc(c.name)+'</div><div style="font-size:14px">'+esc(phoneShow(c.phone))+'</div></div><span style="display:flex;gap:6px"><a class="btn s" href="tel:'+esc(phoneClean(c.phone))+'" style="text-decoration:none">Gọi</a><button class="btn o s" data-a="copy" data-t="'+esc(phoneClean(c.phone))+'">Copy SĐT</button></span></div>';
  h+='<div class="line" style="font-size:13.5px;color:var(--soft);line-height:1.55">'+(c.delivery==='lay'?'<b>Khách tự đến lấy</b>':esc(c.address||'(chưa có địa chỉ)'))+'<br><b style="color:var(--ink)">Nhận '+esc(dshow(o.when&&o.when.date))+' · '+esc(o.when&&o.when.slot||'')+'</b></div>';
  if(c.delivery!=='lay'&&c.address)h+='<a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(c.address)+'" target="_blank" rel="noopener" class="btn o s" style="text-decoration:none;align-self:flex-start">Mở Google Maps</a>';
  if(o.note)h+='<div class="info">Ghi chú của khách: '+esc(o.note)+'</div>';
  h+='</div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="row"><span class="h3">Món trong đơn</span><span class="sub" style="font-size:12px">sửa giá trực tiếp</span></div>';
  (o.items||[]).forEach(function(it,i){
    h+='<div style="display:flex;flex-direction:column;gap:6px"'+(i?' class="line"':'')+'><div class="row"><b style="font-size:14px">'+esc(it.name)+(it.size?' · '+esc(it.size):'')+(it.addedLater?' <span class="st" style="background:var(--pink2);color:var(--red2)">khách đặt thêm</span>':'')+'</b><button class="qb" data-a="eDel" data-i="'+i+'" aria-label="Xóa món" style="border:none">✕</button></div>';
    if(it.kind==='cake')h+='<div class="sub" style="font-size:12.5px;line-height:1.5">'+lineDetail(it)+'</div>'+(it.cake&&it.cake.ref?'<img src="'+img(it.cake.ref)+'" alt="Ảnh khách gửi" style="width:110px;border-radius:10px">':'');
    h+='<div class="row"><label class="sub" style="display:flex;align-items:center;gap:6px;font-size:12.5px">Giá<input class="pr" inputmode="numeric" data-f="edit.o.items.'+i+'.price" data-num="1" data-rr="1" value="'+(it.price==null?'':it.price)+'" placeholder="báo giá"></label><span class="qty"><button class="qb" data-a="eQty" data-i="'+i+'" data-d="-1" aria-label="Bớt">−</button><b>'+it.qty+'</b><button class="qb f" data-a="eQty" data-i="'+i+'" data-d="1" aria-label="Thêm">+</button></span><b style="min-width:80px;text-align:right">'+(it.price==null||it.price===''?'—':fmt(it.price*it.qty))+'</b></div></div>';
  });
  var ps=(cat().products||[]);var optsHtml='<option value="">Chọn món để thêm…</option>'+ps.map(function(p){return (p.sizes||[]).map(function(z,zi){return '<option value="'+esc(p.id)+'|'+zi+'">'+esc(p.name)+(z.label?' · '+esc(z.label):'')+' – '+fmt(z.price)+'</option>';}).join('');}).join('');
  h+='<div class="line" style="display:flex;gap:8px"><select class="in" data-f="edit.pick" style="flex:1">'+optsHtml+'</select><button class="btn s" data-a="eAdd">Thêm</button></div></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:9px"><div class="h3">Tiền</div><div class="row"><span class="sub">Tạm tính</span><span>'+fmt(sub(o))+'</span></div>';
  h+='<div class="row"><span class="sub">Phí ship</span><input class="pr" inputmode="numeric" data-f="edit.o.shipFee" data-num="1" data-rr="1" value="'+(o.shipFee==null?'':o.shipFee)+'" placeholder="chưa có"></div>';
  h+='<div class="row"><span class="sub">Giảm giá</span><input class="pr" inputmode="numeric" data-f="edit.o.discount" data-num="1" data-rr="1" value="'+(o.discount||0)+'"></div>';
  h+='<div class="row line" style="font-weight:700"><span>Tổng đơn</span><span>'+fmt(total(o))+'</span></div>';
  h+='<div class="row"><span class="sub">Khách đã trả trước / cọc</span><input class="pr" inputmode="numeric" data-f="edit.o.prepaid" data-num="1" data-rr="1" value="'+(o.prepaid||0)+'"></div>';
  h+='<div class="row" style="background:var(--red);color:#FFFBEE;border-radius:12px;padding:11px 12px;font-size:16px;font-weight:700"><span>'+(c.delivery==='lay'?'Thu khi khách lấy':'Shipper thu hộ')+'</span><span>'+(needQuote(o)?'chờ báo giá':fmt(due(o)))+'</span></div></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Trạng thái</div><div class="chips">'+Object.keys(STATUS).map(function(k){return '<button class="opt'+(stOf(o)===k?' on':'')+'" data-a="eStatus" data-v="'+k+'">'+STATUS[k][0]+'</button>';}).join('')+'</div>';
  h+='<label class="lbl">Ghi chú nội bộ (khách không thấy)<textarea class="in" data-f="edit.o.adminNote">'+esc(o.adminNote||'')+'</textarea></label></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:6px"><div class="h3">Lịch sử</div>'+((o.history||[]).slice().reverse().map(function(x){return '<div style="font-size:13px;color:var(--soft);line-height:1.5"><b style="color:var(--ink)">'+esc(tshow(x.at))+'</b> · '+(x.by==='nhien'?'Nhiên: ':'Khách: ')+esc(x.text)+'</div>';}).join('')||'<span class="note">Chưa có.</span>')+'</div>';
  h+='<button class="btn o" data-a="copyShip">Copy tin nhắn gửi shipper</button>';
  if(S.copyText)h+='<label class="lbl">Nếu chưa copy được, giữ để chọn và copy:<textarea class="in" readonly style="min-height:140px">'+esc(S.copyText)+'</textarea></label>';
  h+='<div style="height:70px"></div></div>';
  h+='<div class="bar"><button class="btn sp" data-a="eSave"'+(!dirty||S.busy?' disabled':'')+'><span>'+(S.busy?'Đang lưu…':(dirty?'Lưu thay đổi':'Chưa có thay đổi'))+'</span><span>'+fmt(total(o))+'</span></button></div>';
  return h;
}
function newOrderView(){
  var n=S.newOrd;var o=n.o;var ps=(cat().products||[]);
  var h='<header class="ahd"><button class="qb" data-a="closeNew" aria-label="Quay lại" style="width:44px;height:44px">‹</button><span class="ttl" style="flex:1;font-size:21px">Tạo đơn cho khách</span></header><div class="wrap">';
  h+='<label class="lbl">Số điện thoại<input class="in" type="tel" data-f="newOrd.o.customer.phone" value="'+esc(o.customer.phone||'')+'"></label><label class="lbl">Họ tên<input class="in" data-f="newOrd.o.customer.name" value="'+esc(o.customer.name||'')+'"></label>';
  h+='<div class="grid"><button class="opt'+(o.customer.delivery!=='lay'?' on':'')+'" data-a="nDel" data-v="giao">Giao tận nơi</button><button class="opt'+(o.customer.delivery==='lay'?' on':'')+'" data-a="nDel" data-v="lay">Tự đến lấy</button></div>';
  if(o.customer.delivery!=='lay')h+='<label class="lbl">Địa chỉ<textarea class="in" data-f="newOrd.o.customer.address">'+esc(o.customer.address||'')+'</textarea></label>';
  h+='<div class="grid"><label class="lbl">Ngày nhận<input class="in" type="date" data-f="newOrd.o.when.date" value="'+esc(o.when.date||'')+'"></label><label class="lbl">Giờ nhận<select class="in" data-f="newOrd.o.when.slot">'+SLOTS.map(function(s){return '<option'+(o.when.slot===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select></label></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Món</div>'+(o.items.length?o.items.map(function(it,i){return '<div class="row" style="font-size:14px"><span style="flex:1">'+esc(it.name)+(it.size?' · '+esc(it.size):'')+'</span><span class="qty"><button class="qb" data-a="nQty" data-i="'+i+'" data-d="-1" aria-label="Bớt">−</button><b>'+it.qty+'</b><button class="qb f" data-a="nQty" data-i="'+i+'" data-d="1" aria-label="Thêm">+</button></span><b style="min-width:76px;text-align:right">'+fmt(it.price*it.qty)+'</b></div>';}).join(''):'<span class="note">Chưa có món.</span>');
  h+='<div class="line" style="display:flex;gap:8px"><select class="in" data-f="newOrd.pick" style="flex:1"><option value="">Chọn món…</option>'+ps.map(function(p){return (p.sizes||[]).map(function(z,zi){return '<option value="'+esc(p.id)+'|'+zi+'">'+esc(p.name)+(z.label?' · '+esc(z.label):'')+' – '+fmt(z.price)+'</option>';}).join('');}).join('')+'</select><button class="btn s" data-a="nAdd">Thêm</button></div></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:9px"><div class="row"><span class="sub">Tạm tính</span><span>'+fmt(sub(o))+'</span></div><div class="row"><span class="sub">Phí ship</span><input class="pr" inputmode="numeric" data-f="newOrd.o.shipFee" data-num="1" data-rr="1" value="'+(o.shipFee==null?'':o.shipFee)+'"></div><div class="row"><span class="sub">Đã trả trước</span><input class="pr" inputmode="numeric" data-f="newOrd.o.prepaid" data-num="1" data-rr="1" value="'+(o.prepaid||0)+'"></div><div class="row line" style="font-weight:700"><span>Thu hộ</span><span style="color:var(--red)">'+fmt(due(o))+'</span></div></div>';
  h+='<label class="lbl">Ghi chú<textarea class="in" data-f="newOrd.o.note">'+esc(o.note||'')+'</textarea></label>';
  if(n.err)h+='<div class="err">'+esc(n.err)+'</div>';
  h+='<button class="btn" data-a="nSave"'+(S.busy?' disabled':'')+'>'+(S.busy?'Đang lưu…':'Lưu đơn')+'</button></div>';
  return h;
}
function aHistView(){
  var q=String(S.hq||'').trim().toLowerCase();var f=S.hfilter||'da_giao';
  var list=allOrders().filter(function(x){var st=stOf(x.o);if(st!=='da_giao'&&st!=='huy')return false;if(f!=='all'&&st!==f)return false;if(!q)return true;var c=x.o.customer||{};return (String(c.name||'').toLowerCase().indexOf(q)>=0)||(phoneClean(c.phone).indexOf(q.replace(/[\s.\-]/g,''))>=0)||(String(x.o.code||'').toLowerCase().indexOf(q.replace('#',''))>=0);});
  var by={};list.forEach(function(x){var d=(x.o.when&&x.o.when.date)||ymd(new Date(x.o.updatedAt||x.o.createdAt||Date.now()));(by[d]=by[d]||[]).push(x);});
  var h=aHeader('Lịch sử đơn hàng','Đơn đã giao và đã hủy')+'<div class="wrap">';
  h+='<div class="chips">'+[['da_giao','Đã giao'],['huy','Đã hủy'],['all','Cả hai']].map(function(t){return '<button class="chip'+(f===t[0]?' on':'')+'" data-a="hfilter" data-v="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>';
  h+='<div style="display:flex;gap:8px"><input class="in" data-f="hq" data-rr="1" value="'+esc(S.hq||'')+'" placeholder="Tìm tên khách, SĐT hoặc mã đơn" style="flex:1"><button class="btn s" data-a="hSearch">Tìm</button></div>';
  var keys=Object.keys(by).sort().reverse();
  if(!keys.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>'+(q?'Không tìm thấy đơn phù hợp.':'Chưa có đơn nào ở đây.')+'</span></div>';
  keys.forEach(function(d){var arr=by[d];var rev=arr.filter(function(x){return stOf(x.o)==='da_giao';}).reduce(function(a,x){return a+total(x.o);},0);
    h+='<div class="row" style="margin-top:6px"><span class="h3">'+esc(dshow(d))+'</span><span class="sub" style="font-size:12.5px">'+arr.length+' đơn'+(rev?' · thu '+fmt(rev):'')+'</span></div>';
    arr.forEach(function(x){var o=x.o,c=o.customer||{};h+='<button class="oc" data-a="openOrd" data-doc="'+esc(x.doc)+'" data-id="'+esc(o.id)+'"><span class="row" style="width:100%"><b style="font-size:15px">'+esc(c.name||'Khách')+' <span style="font-weight:500;color:var(--mute);font-size:13px">#'+esc(o.code)+'</span></b>'+stPill(o.status)+'</span><span style="font-size:13px;color:var(--soft)">'+(o.items||[]).map(function(it){return esc(it.name)+(it.size?' ('+esc(it.size)+')':'')+' × '+it.qty;}).join(', ')+'</span><span class="row" style="width:100%;font-size:13.5px"><span class="sub">'+esc(phoneShow(c.phone))+'</span><b>'+fmt(total(o))+'</b></span></button>';});
  });
  return h+'</div>';
}
function aCalView(){
  var t=today();var st=sets();var closed=st.closedDates||[];
  var list=allOrders().filter(function(x){return x.o.status!=='huy'&&x.o.status!=='da_giao'&&x.o.when&&x.o.when.date>=t;});
  var by={};list.forEach(function(x){(by[x.o.when.date]=by[x.o.when.date]||[]).push(x);});
  var days=[];for(var i=0;i<7;i++)days.push(addDays(t,i));
  var h=aHeader('Lịch làm bánh','7 ngày tới')+'<div class="wrap"><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">'+days.map(function(d){var n=(by[d]||[]).length;var cl=closed.indexOf(d)>=0;return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;border-radius:12px;border:1.5px solid var(--line);background:'+(cl?'#EDE3DA':'var(--card)')+'"><span style="font-size:11px;color:var(--mute)">'+WD[new Date(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8)).getDay()]+'</span><b>'+d.slice(8)+'</b><span style="font-size:10.5px;color:'+(n?'var(--red)':'var(--mute)')+'">'+(cl?'nghỉ':n+' đơn')+'</span></div>';}).join('')+'</div>';
  var keys=Object.keys(by).sort();
  if(!keys.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>Chưa có đơn sắp tới.</span></div>';
  keys.forEach(function(d){
    h+='<div class="h3" style="margin-top:6px">'+esc(dshow(d))+(closed.indexOf(d)>=0?' · đang ngừng nhận':'')+'</div>';
    by[d].sort(function(a,b){return (a.o.when.slot||'').localeCompare(b.o.when.slot||'');}).forEach(function(x){var o=x.o;
      h+='<button class="oc" data-a="openOrd" data-doc="'+esc(x.doc)+'" data-id="'+esc(o.id)+'"><span class="row" style="width:100%"><b style="color:var(--red)">'+esc((o.when.slot||'').split(' ')[0])+'</b>'+stPill(o.status)+'</span><span style="font-size:14px;font-weight:600">'+esc((o.customer||{}).name||'')+'</span><span style="font-size:13px;color:var(--soft);line-height:1.5">'+(o.items||[]).map(function(it){return (it.kind==='cake'?'<b style="color:var(--red)">Bánh kem:</b> ':'')+esc(it.name)+(it.size?' ('+esc(it.size)+')':'')+' × '+it.qty;}).join('<br>')+'</span></button>';});
  });
  return h+'</div>';
}
function aMenuView(){
  var ps=cat().products||[];
  var h=aHeader('Thực đơn','Sửa ở đây, khách thấy ngay')+'<div class="wrap"><button class="btn" data-a="pNew" data-k="products">+ Thêm món</button>';
  [['tuoi','Bánh tươi'],['hop','Bánh hộp']].forEach(function(g){var l=ps.filter(function(p){return p.cat===g[0];});h+='<div class="h3" style="margin-top:4px">'+g[1]+' · '+l.length+'</div>';l.forEach(function(p){h+=pRow(p,'products');});});
  var other=ps.filter(function(p){return p.cat!=='tuoi'&&p.cat!=='hop';});other.forEach(function(p){h+=pRow(p,'products');});
  return h+'</div>';
}
function pRow(p,kind){var on=kind==='products'?p.available!==false:p.visible!==false;return '<div class="card" style="padding:10px;display:flex;gap:10px;align-items:center'+(on?'':';opacity:.7')+'"><button data-a="pEdit" data-k="'+kind+'" data-id="'+esc(p.id)+'" style="display:flex;gap:10px;align-items:center;flex:1;min-width:0;background:none;border:none;padding:0;text-align:left"><span class="thumb">'+(p.img?'<img src="'+img(p.img)+'" alt="">':'<img src="mascot.png" alt="" style="width:60%;height:auto;opacity:.35">')+'</span><span style="min-width:0"><span style="display:block;font-weight:600">'+esc(p.name)+(p.pinned?' <span class="st" style="background:var(--pink);color:var(--red2)">Nổi bật</span>':'')+(p.badge==='moi'?' <span class="st" style="background:#A33127;color:#FFFBEE">Mới</span>':(p.badge==='banchay'?' <span class="st" style="background:var(--pink);color:var(--red2)">Bán chạy</span>':''))+'</span><span class="sub" style="font-size:12.5px">'+(p.sizes||[]).map(function(z){return (z.label?esc(z.label)+' ':'')+(Number(z.price)>0?fmt(z.price):'báo giá');}).join(' · ')+'</span></span></button><button class="tg'+(on?' on':'')+'" data-a="pToggle" data-k="'+kind+'" data-id="'+esc(p.id)+'" aria-label="'+(kind==='products'?(on?'Còn hàng':'Hết hàng'):(on?'Đang hiện':'Đang ẩn'))+'"></button></div>';}
function aCakesView(){
  var cs=cat().cakes||[];
  var h=aHeader('Mẫu bánh kem','Đăng mẫu mới, khách thấy ngay')+'<div class="wrap"><button class="btn" data-a="pNew" data-k="cakes">+ Đăng mẫu bánh kem mới</button>';
  if(!cs.length)h+='<div class="empty"><img src="mascot.png" alt=""><span>Chưa có mẫu nào. Bấm nút trên để chụp ảnh và đăng mẫu đầu tiên.</span></div>';
  cs.forEach(function(c){h+=pRow(c,'cakes');});
  h+='<p class="note">Nút gạt bên phải: hiện / ẩn mẫu với khách.</p>';
  return h+'</div>';
}
function peditSheet(){
  var pe=S.pedit,p=pe.p,isP=pe.kind==='products';
  var h='<div class="ov"><button class="bg" data-a="pClose" aria-label="Đóng"></button><div class="sheet" role="dialog"><span class="grab"></span><button class="qb" data-a="pClose" aria-label="Đóng" style="position:absolute;top:12px;right:12px">✕</button><div class="bl" style="font-size:22px;font-weight:800;color:var(--red)">'+(pe.isNew?(isP?'Thêm món mới':'Đăng mẫu mới'):'Sửa '+esc(p.name))+'</div>';
  h+='<div class="lbl">Ảnh'+(S.assets?'<div style="display:flex;gap:10px;align-items:center"><span class="thumb" style="width:84px;height:84px">'+(p.img?'<img src="'+img(p.img)+'" alt="">':'<img src="mascot.png" alt="" style="width:60%;height:auto;opacity:.35">')+'</span><label class="btn o s" style="cursor:pointer">'+(pe.uploading?'Đang tải…':(p.img?'Đổi ảnh':'Chụp / chọn ảnh'))+'<input type="file" accept="image/*" class="sr" data-up="pimg"></label></div>':'<span class="note">Cần quyền Editor để tải ảnh.</span>')+'</div>';
  h+='<label class="lbl">Tên<input class="in" data-f="pedit.p.name" value="'+esc(p.name||'')+'"></label>';
  if(isP)h+='<label class="lbl">Danh mục<select class="in" data-f="pedit.p.cat"><option value="tuoi"'+(p.cat==='tuoi'?' selected':'')+'>Bánh tươi</option><option value="hop"'+(p.cat==='hop'?' selected':'')+'>Bánh hộp</option></select></label><label class="lbl">Quy cách<input class="in" data-f="pedit.p.note" value="'+esc(p.note||'')+'" placeholder="Hộp 4 cái"></label>';
  else h+='<label class="lbl">Dịp<input class="in" data-f="pedit.p.occasion" value="'+esc(p.occasion||'')+'" placeholder="Sinh nhật"></label>';
  h+='<label class="lbl">Mô tả ngắn<textarea class="in" data-f="pedit.p.desc" placeholder="'+(isP?'Bảo quản lạnh, ngon nhất trong 2 ngày':'Kem tươi, trang trí cherry')+'">'+esc(p.desc||'')+'</textarea></label>';
  h+='<div class="lbl">Size và giá'+(p.sizes||[]).map(function(z,i){return '<div style="display:flex;gap:6px;align-items:center"><input class="in" style="flex:1" data-f="pedit.p.sizes.'+i+'.label" value="'+esc(z.label||'')+'" placeholder="'+(isP?'Để trống nếu chỉ 1 loại':'18cm')+'"><input class="pr" style="width:120px" inputmode="numeric" data-f="pedit.p.sizes.'+i+'.price" data-num="1" value="'+(z.price||'')+'" placeholder="giá"><button class="qb" data-a="szDel" data-i="'+i+'" aria-label="Xóa size" style="border:none">✕</button></div>';}).join('')+'<button class="btn o s" data-a="szAdd" style="align-self:flex-start">+ Thêm size</button></div>';
  if(!isP)h+='<label class="lbl">Nhãn trên ảnh<select class="in" data-f="pedit.p.badge"><option value=""'+(!p.badge?' selected':'')+'>Không có</option><option value="moi"'+(p.badge==='moi'?' selected':'')+'>Mới</option><option value="banchay"'+(p.badge==='banchay'?' selected':'')+'>Bán chạy</option></select></label>';
  if(!isP)h+='<label class="row" style="font-size:14px">Ghim lên đầu (nổi bật)<input type="checkbox" data-f="pedit.p.pinned" '+(p.pinned?'checked':'')+' style="width:22px;height:22px"></label>';
  if(pe.err)h+='<div class="err">'+esc(pe.err)+'</div>';
  h+='<button class="btn" data-a="pSave"'+(S.busy?' disabled':'')+'>'+(S.busy?'Đang lưu…':'Lưu')+'</button>';
  if(!pe.isNew)h+='<button class="btn o" data-a="pDelete">'+(S.peditDel?'Bấm lần nữa để xóa hẳn':'Xóa '+(isP?'món':'mẫu')+' này')+'</button>';
  return h+'</div></div>';
}
function aSettingsView(){
  if(!S.setForm){var st=sets(),o=opts();S.setForm={shipFee:st.shipFee||'',phone:st.phone||'',bankBin:st.bankBin||'',accountNo:st.accountNo||'',accountName:st.accountName||'',closedDates:(st.closedDates||[]).slice(),newClosed:'',nhan:(o.nhan||[]).slice(),newNhan:'',kem:(o.kem||[]).join(', '),trangtri:(o.trangtri||[]).join(', '),mau:(o.mau||[]).map(function(m){return m.name+' '+m.hex;}).join(', ')};}
  var f=S.setForm;
  var h=aHeader('Cài đặt','Thông tin tiệm')+'<div class="wrap">';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Giao hàng</div><label class="lbl">Phí ship mặc định (để trống = báo khi xác nhận)<input class="in" inputmode="numeric" data-f="setForm.shipFee" value="'+esc(f.shipFee)+'"></label><label class="lbl">SĐT của tiệm (hiện cho khách)<input class="in" type="tel" data-f="setForm.phone" value="'+esc(f.phone)+'"></label></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Chuyển khoản (mã QR)</div><label class="lbl">Ngân hàng<select class="in" data-f="setForm.bankBin"><option value="">Chưa chọn</option>'+BANKS.map(function(b){return '<option value="'+b[0]+'"'+(f.bankBin===b[0]?' selected':'')+'>'+b[1]+'</option>';}).join('')+'</select></label><label class="lbl">Số tài khoản<input class="in" inputmode="numeric" data-f="setForm.accountNo" value="'+esc(f.accountNo)+'"></label><label class="lbl">Tên chủ tài khoản<input class="in" data-f="setForm.accountName" value="'+esc(f.accountName)+'"></label><p class="note">Khách quét mã sẽ tự điền số tiền và mã đơn. Nên chuyển thử 1 đơn nhỏ để kiểm tra.</p></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Ngày nghỉ / ngừng nhận đơn</div><div class="chips">'+(f.closedDates.length?f.closedDates.map(function(d,i){return '<button class="opt" data-a="cdDel" data-i="'+i+'">'+esc(dshow(d))+' ✕</button>';}).join(''):'<span class="note">Chưa có ngày nghỉ.</span>')+'</div><div style="display:flex;gap:8px"><input class="in" type="date" min="'+today()+'" data-f="setForm.newClosed" value="'+esc(f.newClosed)+'" style="flex:1"><button class="btn s" data-a="cdAdd">Thêm</button></div></div>';
  h+='<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="h3">Tùy chọn bánh kem</div><div class="lbl">Nhân bánh (bấm ✕ để bỏ)<div class="chips">'+(f.nhan.length?f.nhan.map(function(x,i){return '<button class="opt" data-a="nhDel" data-i="'+i+'">'+esc(x)+' ✕</button>';}).join(''):'<span class="note">Chưa có nhân nào.</span>')+'</div><div style="display:flex;gap:8px"><input class="in" data-f="setForm.newNhan" value="'+esc(f.newNhan)+'" placeholder="Thêm nhân mới, ví dụ: Mứt xoài" style="flex:1"><button class="btn s" data-a="nhAdd">Thêm</button></div></div><p class="note">Kem, trang trí, màu: viết cách nhau bằng dấu phẩy.</p><label class="lbl">Kem<input class="in" data-f="setForm.kem" value="'+esc(f.kem)+'"></label><label class="lbl">Trang trí<input class="in" data-f="setForm.trangtri" value="'+esc(f.trangtri)+'"></label><label class="lbl">Màu (tên + mã màu)<input class="in" data-f="setForm.mau" value="'+esc(f.mau)+'" placeholder="Hồng #F5B4AE, Kem #FFF1D6"></label></div>';
  if(f.err)h+='<div class="err">'+esc(f.err)+'</div>';
  h+='<button class="btn" data-a="setSave"'+(S.busy?' disabled':'')+'>'+(S.busy?'Đang lưu…':'Lưu cài đặt')+'</button>';
  h+='<div class="card row" style="margin-top:10px"><span class="sub">Đang đăng nhập: <b style="color:var(--ink)">'+esc(S.adminEmail||'')+'</b></span><button class="btn o s" data-a="logout">Đăng xuất</button></div></div>';
  return h;
}

/* ---------- after paint ---------- */
function post(){var q=document.getElementById('qr');if(q&&window.QRCode){q.innerHTML='';try{new QRCode(q,{text:q.getAttribute('data-qr'),width:400,height:400,correctLevel:QRCode.CorrectLevel.M});}catch(e){q.textContent='Không tạo được mã QR';}}}

/* ---------- writes ---------- */
var writing=Promise.resolve();
function queue(fn){writing=writing.then(fn,fn);return writing;}
function saveCatalog(next){S.busy=true;draw();return queue(function(){return S.db.doc('shop/catalog').set(next);}).then(function(){S.busy=false;S.catalog=next;},function(e){S.busy=false;throw e;});}
function errMsg(e){var c=e&&e.code;if(c==='permission-denied'||c==='invalid_argument')return 'Bạn chưa có quyền lưu. Nhờ chủ app chia sẻ quyền phù hợp cho bạn.';if(c==='quota_exceeded')return 'Bộ nhớ dữ liệu đã đầy.';if(c==='resource_exhausted')return 'Thao tác hơi nhanh, thử lại sau vài giây nhé.';return 'Chưa lưu được, thử lại nhé.';}
function myRef(){return S.db.doc('orders/'+S.uid);}
function writeMine(patch){return queue(function(){if(S.myDocExists)return myRef().update(patch);return myRef().update(patch).catch(function(e){if(e&&e.code==='invalid_argument'&&!S.myDocExists)return myRef().set(patch);throw e;});});}

/* ---------- actions ---------- */
var A={
  view:function(d){go(function(){S.view=d.v;S.sheet=null;});},
  mode:function(d){go(function(){S.mode=d.v;S.sheet=null;S.edit=null;S.pedit=null;S.newOrd=null;});},
  cat:function(d){stay(function(){S.cat=d.v;});},
  occ:function(d){stay(function(){S.occ=d.v;});},
  openP:function(d){stay(function(){S.sheet={type:'product',id:d.id,size:0,qty:1};});},
  closeSheet:function(){stay(function(){S.sheet=null;});},
  pSize:function(d){stay(function(){S.sheet.size=+d.i;});},
  pQty:function(d){stay(function(){S.sheet.qty=Math.max(1,S.sheet.qty+(+d.d));});},
  pAdd:function(){var sh=S.sheet;var p=(cat().products||[]).find(function(x){return x.id===sh.id;});if(!p)return;var z=p.sizes[sh.size]||{};var key=p.id+'|'+sh.size;var ex=S.cart.find(function(l){return l.key===key;});
    if(ex)ex.qty+=sh.qty;else S.cart.push({key:key,kind:'sp',pid:p.id,name:p.name,size:z.label||'',price:Number(z.price)||0,qty:sh.qty});
    S.sheet=null;S.keepScroll=true;toast('Đã thêm '+sh.qty+' '+p.name+(z.label?' ('+z.label.toLowerCase()+')':''));},
  nhanKhac:function(){stay(function(){var sh=S.sheet;sh.nhanKhac=!sh.nhanKhac;if(sh.nhanKhac)sh.nhan='';});},
  cQty:function(d){stay(function(){S.sheet.qty=Math.max(1,(S.sheet.qty||1)+(+d.d));});},
  openCake:function(d){stay(function(){S.sheet={type:'cake',id:d.id||'',size:0,qty:1,nhan:'',nhanKhac:false,nhanText:'',kem:'',mau:'',tt:[],chu:'',desc:'',ref:''};});},
  cSize:function(d){stay(function(){S.sheet.size=+d.i;});},
  cOpt:function(d){stay(function(){var sh=S.sheet;if(d.m==='1'){var a=sh[d.k]||[];var i=a.indexOf(d.v);if(i>=0)a.splice(i,1);else a.push(d.v);sh[d.k]=a;}else{sh[d.k]=sh[d.k]===d.v?'':d.v;if(d.k==='nhan')sh.nhanKhac=false;}});},
  cAdd:function(){var sh=S.sheet;var c=sh.id?(cat().cakes||[]).find(function(x){return x.id===sh.id;}):null;
    if(!c&&!String(sh.desc||'').trim()){stay(function(){sh.err='Bạn mô tả giúp Nhiên chiếc bánh mong muốn nhé.';});return;}
    if(sh.nhanKhac&&!String(sh.nhanText||'').trim()){stay(function(){sh.err='Bạn ghi nhân bánh mong muốn nhé.';});return;}
    var nhan=sh.nhanKhac?String(sh.nhanText).trim()+' (theo yêu cầu)':sh.nhan;
    var z=c&&c.sizes?c.sizes[sh.size]:null;var price=z&&Number(z.price)>0?Number(z.price):null;
    S.cart.push({key:'cake-'+uid8(),kind:'cake',pid:c?c.id:'custom',name:c?'Bánh kem '+c.name:'Bánh kem thiết kế riêng',size:z?z.label:'',price:price,qty:c?(sh.qty||1):1,cake:{nhan:nhan,kem:sh.kem,mau:sh.mau,tt:sh.tt,chu:sh.chu,desc:sh.desc,ref:sh.ref||''}});
    S.sheet=null;S.keepScroll=true;toast('Đã thêm bánh kem vào giỏ');},
  openCart:function(){go(function(){if(S.view==='checkout'||S.view==='done')S.view='menu';S.sheet={type:'cart'};});},
  lQty:function(d){stay(function(){var l=S.cart[+d.i];l.qty+=(+d.d);if(l.qty<=0)S.cart.splice(+d.i,1);if(!S.cart.length)S.sheet=null;});},
  checkout:function(){go(function(){S.sheet=null;S.view='checkout';S.coErr='';var pf=(S.myDoc&&S.myDoc.profile)||{};var co=S.co;['name','phone','address'].forEach(function(k){if(!co[k]&&pf[k])co[k]=pf[k];});if(!co.delivery)co.delivery='giao';if(!co.slot)co.slot=SLOTS[3];var cake=S.cart.some(function(l){return l.kind==='cake';});var minD=cake?addDays(today(),1):today();if(!co.date||co.date<minD)co.date=minD;});},
  coDel:function(d){stay(function(){S.co.delivery=d.v;});},
  placeOrder:function(){
    var co=S.co,st=sets();var err='';var cake=S.cart.some(function(l){return l.kind==='cake';});var minD=cake?addDays(today(),1):today();
    if(!S.uid)err='Đang kết nối với tiệm, thử lại sau vài giây nhé.';
    else if(!S.myDocLoaded)err='Đang tải dữ liệu của bạn, thử lại sau vài giây nhé.';
    else if(!phoneOk(co.phone))err='Số điện thoại cần đủ 10 số, bắt đầu bằng số 0.';
    else if(!String(co.name||'').trim())err='Bạn nhập tên giúp Nhiên nhé.';
    else if(co.delivery!=='lay'&&!String(co.address||'').trim())err='Bạn nhập địa chỉ giao hàng nhé.';
    else if(!co.date||co.date<minD)err=cake?'Bánh kem cần đặt trước ít nhất 1 ngày. Chọn từ '+dshow(minD)+' nhé.':'Bạn chọn ngày nhận nhé.';
    else if((st.closedDates||[]).indexOf(co.date)>=0)err='Ngày '+dshow(co.date)+' Nhiên nghỉ / không nhận đơn. Bạn chọn ngày khác nhé.';
    if(err){stay(function(){S.coErr=err;});return;}
    var id=uid8();var now=Date.now();
    var o={id:id,code:code(),createdAt:now,updatedAt:now,source:'khach',status:'moi',seenByAdmin:false,
      customer:{name:co.name.trim(),phone:phoneClean(co.phone),address:co.delivery==='lay'?'':co.address.trim(),delivery:co.delivery},
      when:{date:co.date,slot:co.slot},note:(co.note||'').trim(),
      items:S.cart.map(function(l){return {name:l.name,size:l.size,price:l.price,qty:l.qty,kind:l.kind,pid:l.pid,cake:l.cake||null};}),
      shipFee:co.delivery==='lay'?0:(st.shipFee>0?Number(st.shipFee):null),discount:0,prepaid:0,
      history:[{at:now,by:'khach',text:'Khách đặt đơn'}]};
    var patch={profile:{name:o.customer.name,phone:o.customer.phone,address:co.address||''},orders:{}};patch.orders[id]=o;
    S.busy=true;S.coErr='';stay(function(){});
    writeMine(patch).then(function(){S.busy=false;S.cart=[];S.co.note='';S.done=id;S.myDocExists=true;var m=S.myDoc?clone(S.myDoc):{orders:{}};m.orders=m.orders||{};m.orders[id]=o;S.myDoc=m;go(function(){S.view='done';});},
      function(e){S.busy=false;stay(function(){S.coErr=errMsg(e);});});
  },
  addTo:function(d){go(function(){S.addTo=d.id;S.view='menu';S.cart=[];});toast('Chọn món muốn đặt thêm rồi bấm giỏ hàng');},
  cancelAddTo:function(){stay(function(){S.addTo=null;});},
  confirmAdd:function(){var o=findMyOrder(S.addTo);if(!o)return;o=clone(o);var now=Date.now();
    S.cart.forEach(function(l){o.items.push({name:l.name,size:l.size,price:l.price,qty:l.qty,kind:l.kind,pid:l.pid,cake:l.cake||null,addedLater:true});});
    var txt='Khách đặt thêm: '+S.cart.map(function(l){return l.name+(l.size?' ('+l.size+')':'')+' × '+l.qty;}).join(', ');
    o.history=(o.history||[]).concat([{at:now,by:'khach',text:txt}]);o.updatedAt=now;o.seenByAdmin=false;
    var patch={orders:{}};patch.orders[o.id]=o;S.busy=true;stay(function(){});
    writeMine(patch).then(function(){S.busy=false;S.cart=[];S.addTo=null;go(function(){S.sheet=null;S.view='orders';});toast('Đã gửi phần đặt thêm cho Nhiên');},function(e){S.busy=false;toast(errMsg(e));});},
  reorder:function(d){var o=findMyOrder(d.id);if(!o)return;S.cart=(o.items||[]).filter(function(it){return it.kind!=='cake'||it.price!=null;}).map(function(it){return {key:(it.pid||'x')+'|'+uid8(),kind:it.kind,pid:it.pid,name:it.name,size:it.size,price:it.price,qty:it.qty,cake:it.cake||null};});go(function(){S.view='menu';S.sheet={type:'cart'};});},

  /* admin */
  login:function(){var l=S.login;l.err='';l.msg='';if(!String(l.email||'').trim()||!l.pass){stay(function(){l.err='Nhập email và mật khẩu.';});return;}S.busy=true;stay(function(){});
    try{if(window.Notification&&Notification.permission==='default')Notification.requestPermission();}catch(e){}primeSound();
    FB.au.signInWithEmailAndPassword(FB.auth,l.email.trim(),l.pass).then(function(){S.busy=false;l.pass='';},function(e){S.busy=false;var c=(e&&e.code)||'';l.err=(c.indexOf('invalid')>=0||c.indexOf('wrong')>=0||c.indexOf('not-found')>=0)?'Email hoặc mật khẩu chưa đúng.':(c.indexOf('too-many')>=0?'Thử sai nhiều lần, đợi một lúc rồi thử lại nhé.':'Chưa đăng nhập được ('+c+').');stay(function(){});});},
  forgot:function(){var l=S.login;if(!String(l.email||'').trim()){stay(function(){l.err='Nhập email trước rồi bấm Quên mật khẩu.';});return;}FB.au.sendPasswordResetEmail(FB.auth,l.email.trim()).then(function(){stay(function(){l.err='';l.msg='Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư nhé.';});},function(){stay(function(){l.err='Chưa gửi được email đặt lại mật khẩu.';});});},
  logout:function(){FB.au.signOut(FB.auth).then(function(){location.reload();});},
  seed:function(){saveCatalog(clone(SEED)).then(function(){toast('Đã tạo thực đơn ban đầu');},function(e){toast(errMsg(e));});},
  aview:function(d){go(function(){S.aview=d.v;S.pedit=null;if(d.v==='settings')S.setForm=null;});},
  afilter:function(d){stay(function(){S.afilter=d.v;});},
  openOrd:function(d){var x=allOrders().find(function(y){return y.doc===d.doc&&y.o.id===d.id;});if(!x)return;
    go(function(){var oc=clone(x.o);oc.seenByAdmin=true;S.edit={doc:x.doc,o:oc,pick:''};S.editOrig=JSON.stringify(oc);S.copyText='';});
    if(x.o.seenByAdmin===false){var p={orders:{}};p.orders[x.o.id]={seenByAdmin:true};queue(function(){return S.db.doc('orders/'+x.doc).update(p);}).then(function(){},function(){});}
  },
  closeOrd:function(){go(function(){S.edit=null;});},
  eQty:function(d){stay(function(){var it=S.edit.o.items[+d.i];it.qty=Math.max(1,it.qty+(+d.d));});},
  eDel:function(d){stay(function(){S.edit.o.items.splice(+d.i,1);});},
  eAdd:function(){var v=S.edit.pick;if(!v)return;var a=v.split('|');var p=(cat().products||[]).find(function(x){return x.id===a[0];});if(!p)return;var z=p.sizes[+a[1]]||{};stay(function(){S.edit.o.items.push({name:p.name,size:z.label||'',price:Number(z.price)||0,qty:1,kind:'sp',pid:p.id,cake:null});S.edit.pick='';});},
  eStatus:function(d){stay(function(){S.edit.o.status=d.v;});},
  eSave:function(){var e=S.edit;var o=e.o;var before=JSON.parse(S.editOrig);var now=Date.now();var bits=[];
    if(before.status!==o.status)bits.push('trạng thái: '+(STATUS[stOf(o)]||STATUS.moi)[0]);
    if(total(before)!==total(o)||needQuote(before)!==needQuote(o))bits.push('tổng '+(needQuote(before)?'chờ báo giá':fmt(total(before)))+' → '+(needQuote(o)?'chờ báo giá':fmt(total(o))));
    if(JSON.stringify(before.items)!==JSON.stringify(o.items)&&!bits.some(function(b){return b.indexOf('tổng')===0;}))bits.push('cập nhật món');
    if((before.prepaid||0)!==(o.prepaid||0))bits.push('đã nhận trước '+fmt(o.prepaid||0));
    if(bits.length)o.history=(o.history||[]).concat([{at:now,by:'nhien',text:bits.join(', ')}]);
    o.updatedAt=now;o.seenByAdmin=true;
    var p={orders:{}};p.orders[o.id]=o;S.busy=true;stay(function(){});
    queue(function(){return S.db.doc('orders/'+e.doc).update(p);}).then(function(){S.busy=false;S.editOrig=JSON.stringify(o);toast('Đã lưu đơn #'+o.code);},function(err){S.busy=false;toast(errMsg(err));});},
  copy:function(d){copyText(d.t);},
  copyShip:function(){var o=S.edit.o,c=o.customer||{};var t='Đơn #'+o.code+'\nKhách: '+c.name+' - '+phoneShow(c.phone)+'\n'+(c.delivery==='lay'?'Khách tự đến lấy':'Địa chỉ: '+c.address)+'\nGiao: '+dshow(o.when&&o.when.date)+' '+(o.when&&o.when.slot||'')+'\nMón: '+(o.items||[]).map(function(it){return it.name+(it.size?' ('+it.size+')':'')+' x'+it.qty;}).join(', ')+(o.note?'\nGhi chú: '+o.note:'')+'\nThu hộ: '+(needQuote(o)?'(chờ báo giá)':fmt(due(o)));copyText(t,true);},
  newOrd:function(){go(function(){S.newOrd={o:{customer:{name:'',phone:'',address:'',delivery:'giao'},when:{date:today(),slot:SLOTS[3]},items:[],shipFee:null,discount:0,prepaid:0,note:''},pick:''};});},
  closeNew:function(){go(function(){S.newOrd=null;});},
  nDel:function(d){stay(function(){S.newOrd.o.customer.delivery=d.v;});},
  nQty:function(d){stay(function(){var a=S.newOrd.o.items;var it=a[+d.i];it.qty+=(+d.d);if(it.qty<=0)a.splice(+d.i,1);});},
  nAdd:function(){var v=S.newOrd.pick;if(!v)return;var a=v.split('|');var p=(cat().products||[]).find(function(x){return x.id===a[0];});if(!p)return;var z=p.sizes[+a[1]]||{};stay(function(){var items=S.newOrd.o.items;var ex=items.find(function(it){return it.pid===p.id&&it.size===(z.label||'');});if(ex)ex.qty++;else items.push({name:p.name,size:z.label||'',price:Number(z.price)||0,qty:1,kind:'sp',pid:p.id,cake:null});S.newOrd.pick='';});},
  nSave:function(){var n=S.newOrd,o=n.o;var err='';if(!String(o.customer.name).trim())err='Nhập tên khách.';else if(o.customer.phone&&!phoneOk(o.customer.phone))err='SĐT cần đủ 10 số, bắt đầu bằng 0.';else if(!o.items.length)err='Thêm ít nhất 1 món.';
    if(err){stay(function(){n.err=err;});return;}
    var id=uid8(),now=Date.now();var ord=clone(o);ord.id=id;ord.code=code();ord.createdAt=now;ord.updatedAt=now;ord.source='nhien';ord.status='xac_nhan';ord.seenByAdmin=true;ord.customer.phone=phoneClean(ord.customer.phone);if(ord.customer.delivery==='lay'){ord.shipFee=0;ord.customer.address='';}ord.history=[{at:now,by:'nhien',text:'Nhiên tạo đơn'}];
    var doc={profile:{name:ord.customer.name,phone:ord.customer.phone,address:ord.customer.address},manual:true,orders:{}};doc.orders[id]=ord;S.busy=true;stay(function(){});
    queue(function(){return S.db.doc('orders/m-'+id).set(doc);}).then(function(){S.busy=false;S.known&&S.known.add('m-'+id+'/'+id);go(function(){S.newOrd=null;S.afilter='xac_nhan';});toast('Đã tạo đơn #'+ord.code);},function(e){S.busy=false;stay(function(){n.err=errMsg(e);});});},
  pNew:function(d){stay(function(){S.peditDel=false;S.pedit={kind:d.k,isNew:true,p:d.k==='products'?{id:'p-'+uid8(),name:'',cat:S.cat||'tuoi',note:'',desc:'',sizes:[{label:'',price:''}],img:'',available:true}:{id:'c-'+uid8(),name:'',occasion:'',desc:'',sizes:[{label:'16cm',price:''},{label:'18cm',price:''},{label:'20cm',price:''}],img:'',visible:true,pinned:false}};});},
  pEdit:function(d){var l=cat()[d.k]||[];var p=l.find(function(x){return x.id===d.id;});if(!p)return;stay(function(){S.peditDel=false;S.pedit={kind:d.k,isNew:false,p:clone(p)};});},
  pClose:function(){stay(function(){S.pedit=null;});},
  szAdd:function(){stay(function(){S.pedit.p.sizes.push({label:'',price:''});});},
  szDel:function(d){stay(function(){S.pedit.p.sizes.splice(+d.i,1);});},
  pToggle:function(d){var next=clone(cat());var l=next[d.k]||[];var p=l.find(function(x){return x.id===d.id;});if(!p)return;if(d.k==='products')p.available=p.available===false;else p.visible=p.visible===false;
    S.catalog=next;S.keepScroll=true;paint();saveCatalog(next).then(function(){toast(d.k==='products'?(p.available?p.name+': còn hàng':p.name+': hết hàng'):(p.visible?'Đang hiện '+p.name:'Đã ẩn '+p.name));},function(e){toast(errMsg(e));});},
  pSave:function(){var pe=S.pedit,p=pe.p;if(!String(p.name||'').trim()){stay(function(){pe.err='Nhập tên giúp mình nhé.';});return;}
    p.name=p.name.trim();p.sizes=(p.sizes||[]).map(function(z){return {label:String(z.label||'').trim(),price:Number(z.price)||0};}).filter(function(z,i,a){return a.length===1||z.label||z.price;});
    if(pe.kind==='products'&&(!p.sizes.length||p.sizes.some(function(z){return !(z.price>0);}))){stay(function(){pe.err='Món cần có giá (mỗi size một giá).';});return;}
    if(pe.kind==='products'&&p.sizes.length>1&&p.sizes.some(function(z){return !z.label;})){stay(function(){pe.err='Có nhiều size thì đặt tên cho từng size (ví dụ Hộp nhỏ, Hộp to).';});return;}
    var next=clone(cat());next[pe.kind]=next[pe.kind]||[];var i=next[pe.kind].findIndex(function(x){return x.id===p.id;});if(i>=0)next[pe.kind][i]=p;else next[pe.kind].push(p);
    saveCatalog(next).then(function(){stay(function(){S.pedit=null;});toast('Đã lưu '+p.name);},function(e){stay(function(){pe.err=errMsg(e);});});},
  pDelete:function(){if(!S.peditDel){stay(function(){S.peditDel=true;});return;}var pe=S.pedit;var next=clone(cat());next[pe.kind]=(next[pe.kind]||[]).filter(function(x){return x.id!==pe.p.id;});
    saveCatalog(next).then(function(){stay(function(){S.pedit=null;S.peditDel=false;});toast('Đã xóa '+pe.p.name);},function(e){stay(function(){pe.err=errMsg(e);});});},
  cdAdd:function(){var f=S.setForm;if(!f.newClosed)return;stay(function(){if(f.closedDates.indexOf(f.newClosed)<0)f.closedDates.push(f.newClosed);f.closedDates.sort();f.newClosed='';});},
  nhAdd:function(){var f=S.setForm;var v=String(f.newNhan||'').trim();if(!v)return;stay(function(){if(f.nhan.indexOf(v)<0)f.nhan.push(v);f.newNhan='';});},
  nhDel:function(d){stay(function(){S.setForm.nhan.splice(+d.i,1);});},
  hfilter:function(d){stay(function(){S.hfilter=d.v;});},
  hSearch:function(){stay(function(){});},
  cdDel:function(d){stay(function(){S.setForm.closedDates.splice(+d.i,1);});},
  setSave:function(){var f=S.setForm;var next=clone(cat());next.settings=next.settings||{};next.options=next.options||{};
    var split=function(s){return String(s||'').split(',').map(function(x){return x.trim();}).filter(Boolean);};
    var bank=BANKS.find(function(b){return b[0]===f.bankBin;});
    next.settings.shipFee=num(f.shipFee)>0?num(f.shipFee):null;next.settings.phone=phoneClean(f.phone);next.settings.bankBin=f.bankBin||'';next.settings.bankName=bank?bank[1]:'';next.settings.accountNo=String(f.accountNo||'').replace(/\s/g,'');next.settings.accountName=String(f.accountName||'').trim().toUpperCase();
    next.settings.closedDates=f.closedDates.filter(function(d){return d>=today();});
    var nh=f.nhan.slice();if(String(f.newNhan||'').trim()&&nh.indexOf(f.newNhan.trim())<0)nh.push(f.newNhan.trim());next.options.nhan=nh;delete next.options.cot;next.options.kem=split(f.kem);next.options.trangtri=split(f.trangtri);
    next.options.mau=split(f.mau).map(function(x){var m=x.match(/^(.*?)\s*(#[0-9a-fA-F]{6})$/);return m?{name:m[1].trim()||m[2],hex:m[2]}:{name:x,hex:'#EEEEEE'};});
    f.err='';saveCatalog(next).then(function(){S.setForm=null;stay(function(){});toast('Đã lưu cài đặt');},function(e){stay(function(){f.err=errMsg(e);});});}
};
function copyText(t,showBox){var done=function(){toast('Đã copy');};try{navigator.clipboard.writeText(t).then(done,function(){if(showBox)stay(function(){S.copyText=t;});else toast('Không copy được, hãy giữ để chọn số');});}catch(e){if(showBox)stay(function(){S.copyText=t;});}}

/* ---------- events ---------- */
document.addEventListener('keydown',function(ev){if(ev.key==='Enter'&&ev.target.getAttribute&&ev.target.getAttribute('data-enter')){var a=A[ev.target.getAttribute('data-enter')];if(a){ev.preventDefault();onField({target:ev.target},false);a({},ev.target);}}});
document.addEventListener('click',function(ev){if(S.mode==='admin')primeSound();var t=ev.target.closest('[data-a]');if(!t||!$app.contains(t))return;var a=A[t.getAttribute('data-a')];if(!a)return;ev.preventDefault();a(t.dataset,t);});
function onField(ev,isChange){var t=ev.target;var f=t.getAttribute&&t.getAttribute('data-f');if(!f)return;var v=t.type==='checkbox'?t.checked:t.value;if(t.getAttribute('data-num')){v=String(v).trim()===''?(f.indexOf('price')>=0&&f.indexOf('edit.')===0?null:(f.indexOf('shipFee')>=0?null:0)):num(v);}setPath(S,f,v);if(isChange&&t.getAttribute('data-rr')){S.keepScroll=true;setTimeout(draw,0);}}
document.addEventListener('input',function(e){onField(e,false);});
document.addEventListener('change',function(e){if(e.target.getAttribute&&e.target.getAttribute('data-up'))return upload(e.target);onField(e,true);});
document.addEventListener('focusout',function(){if(pending)setTimeout(function(){var a=document.activeElement;if(pending&&!(a&&$app.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))){S.keepScroll=true;paint();}},250);});
function upload(inp){var f=inp.files&&inp.files[0];if(!f||!S.assets)return;var which=inp.getAttribute('data-up');var holder=which==='ref'?S.sheet:S.pedit;if(!holder)return;
  if(f.size>15*1024*1024){toast('Ảnh lớn quá, chọn ảnh nhỏ hơn 15MB nhé');return;}
  holder.uploading=true;S.keepScroll=true;paint();
  S.assets.upload(f).then(function(r){holder.uploading=false;if(which==='ref')holder.ref=r.id;else holder.p.img=r.id;S.keepScroll=true;paint();},function(){holder.uploading=false;S.keepScroll=true;paint();toast('Chưa tải được ảnh, thử lại nhé');});}

/* ---------- sound + notifications ---------- */
var AC=null;function primeSound(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.resume)AC.resume();}catch(e){}}
function ding(){try{if(!AC)return;var t=AC.currentTime;[880,1320].forEach(function(f,i){var o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.connect(g);g.connect(AC.destination);var s=t+i*0.18;g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(0.3,s+0.02);g.gain.exponentialRampToValueAtTime(0.0001,s+0.35);o.start(s);o.stop(s+0.4);});}catch(e){}}
function notifyNew(o,isAdd){ding();try{if(document.hidden&&window.Notification&&Notification.permission==='granted')new Notification((isAdd?'Khách đặt thêm #':'Đơn mới #')+o.code,{body:((o.customer||{}).name||'Khách')+' · '+fmt(total(o)),icon:'icon-192.png'});}catch(e){}}

/* ---------- Firebase ---------- */
var SEED={"products": [{"id": "su-kem", "name": "Su kem", "cat": "tuoi", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 45000}], "img": "", "available": true}, {"id": "su-sing", "name": "Su Sing", "cat": "tuoi", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 55000}], "img": "", "available": true}, {"id": "bong-lan", "name": "Bông lan trứng muối", "cat": "tuoi", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 44000}], "img": "", "available": true}, {"id": "tart-trung", "name": "Tart trứng", "cat": "tuoi", "note": "Hộp 4 cái", "desc": "", "sizes": [{"label": "", "price": 50000}], "img": "", "available": true}, {"id": "khoai-lang", "name": "Khoai lang phô mai", "cat": "tuoi", "note": "Hộp 2 củ", "desc": "", "sizes": [{"label": "", "price": 45000}], "img": "", "available": true}, {"id": "banh-bo", "name": "Bánh bò thốt nốt", "cat": "tuoi", "note": "1 cái", "desc": "", "sizes": [{"label": "Size nhỏ", "price": 39000}], "img": "", "available": true}, {"id": "tiramisu", "name": "Tiramisu", "cat": "tuoi", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 65000}], "img": "", "available": true}, {"id": "banh-dua", "name": "Bánh dứa", "cat": "hop", "note": "Hộp nhỏ hoặc hộp to", "desc": "", "sizes": [{"label": "Hộp nhỏ", "price": 99000}, {"label": "Hộp to", "price": 119000}], "img": "", "available": true}, {"id": "kep-pho-mai", "name": "Bánh kẹp phô mai", "cat": "hop", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 89000}], "img": "", "available": true}, {"id": "quy-cha-bong", "name": "Bánh quy chà bông trứng muối", "cat": "hop", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 109000}], "img": "", "available": true}, {"id": "luoi-meo", "name": "Bánh lưỡi mèo", "cat": "hop", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 89000}], "img": "", "available": true}, {"id": "cookie-caramel", "name": "Cookie hạt caramel", "cat": "hop", "note": "1 hộp", "desc": "", "sizes": [{"label": "", "price": 119000}], "img": "", "available": true}], "cakes": [], "options": {"nhan": ["Mứt dâu", "Mứt việt quất", "Chanh dây", "Thơm (dứa)"], "kem": ["Kem tươi", "Kem bơ"], "trangtri": ["Cherry", "Hoa kem", "Nến"], "mau": [{"name": "Hồng", "hex": "#F5B4AE"}, {"name": "Kem", "hex": "#FFF1D6"}, {"name": "Xanh mint", "hex": "#CFEBDD"}, {"name": "Tím nhạt", "hex": "#DCD3F0"}]}, "settings": {"shipFee": null, "phone": "0333155000", "bankBin": "", "bankName": "", "accountNo": "", "accountName": "", "closedDates": []}};
var MODE=window.APP_MODE==='admin'?'admin':'khach';
function mkDb(){var f=FB;return {
  doc:function(path){var ref=f.doc(f.db,path);return {
    onSnapshot:function(next,err){return f.onSnapshot(ref,function(s){next({exists:s.exists(),data:function(){return s.data();},metadata:{fromCache:s.metadata.fromCache}});},err);},
    set:function(d){return f.setDoc(ref,d);},
    update:function(d){return f.setDoc(ref,d,{merge:true});}};},
  collection:function(path){var ref=f.collection(f.db,path);return {onSnapshot:function(next,err){return f.onSnapshot(ref,function(q){next({docs:q.docs.map(function(d){return {id:d.id,exists:true,data:function(){return d.data();}};})});},err);}};}};}
function compress(file){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var max=900,w=im.width,h=im.height,k=Math.min(1,max/Math.max(w,h));var c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);var q=0.8,d=c.toDataURL('image/jpeg',q);while(d.length>380000&&q>0.35){q-=0.1;d=c.toDataURL('image/jpeg',q);}res(d);};im.onerror=rej;im.src=r.result;};r.onerror=rej;r.readAsDataURL(file);});}
var assetsApi={upload:function(file){return compress(file).then(function(d){var id='i'+uid8();return FB.setDoc(FB.doc(FB.db,'images',id),{data:d,at:Date.now()}).then(function(){IMGC[id]=d;return {id:id};});});}};
function startAdminData(){if(S.adminStarted)return;S.adminStarted=true;var prevUnseen=null;
  S.db.collection('orders').onSnapshot(function(snap){
    S.denied=false;
    S.docs=snap.docs.map(function(d){var o=d.data()||{};return {id:d.id,orders:o.orders||{},profile:o.profile||{}};});
    var un=new Set();allOrders().forEach(function(x){if(x.o.seenByAdmin===false)un.add(x.doc+'/'+x.o.id+'/'+(x.o.updatedAt||0));});
    if(prevUnseen){var fresh=allOrders().filter(function(x){return x.o.seenByAdmin===false&&!prevUnseen.has(x.doc+'/'+x.o.id+'/'+(x.o.updatedAt||0));});
      if(fresh.length){var f=fresh[0].o;var isAdd=(f.history||[]).length>1;notifyNew(f,isAdd);toast((isAdd?'Khách đặt thêm vào đơn #':'Đơn mới #')+f.code+' · '+((f.customer||{}).name||'khách'));}}
    prevUnseen=un;
    if(S.edit){var cur=allOrders().find(function(y){return y.doc===S.edit.doc&&y.o.id===S.edit.o.id;});if(cur&&JSON.stringify(S.edit.o)===S.editOrig){var oc=clone(cur.o);oc.seenByAdmin=true;S.edit.o=oc;S.editOrig=JSON.stringify(oc);}}
    draw();},function(e){if(e&&e.code==='permission-denied'){S.denied=true;S.adminStarted=false;draw();}});}
function start(){
  S.mode=MODE;
  var timer=setTimeout(function(){if(!S.ready){S.err='Chưa kết nối được. Kiểm tra mạng rồi tải lại trang nhé.';S.authChecked=true;draw();}},15000);
  var B='https://www.gstatic.com/firebasejs/13.3.0/';
  Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]).then(function(m){
    var app=m[0].initializeApp(window.FIREBASE_CONFIG);var fs=m[2],au=m[1];
    var db;try{db=fs.initializeFirestore(app,{ignoreUndefinedProperties:true});}catch(e){db=fs.getFirestore(app);}
    FB={db:db,doc:fs.doc,collection:fs.collection,onSnapshot:fs.onSnapshot,setDoc:fs.setDoc,getDoc:fs.getDoc,auth:au.getAuth(app),au:au};
    S.db=mkDb();S.assets=assetsApi;
    S.db.doc('shop/catalog').onSnapshot(function(s){S.catalog=s.exists?s.data():null;S.ready=true;clearTimeout(timer);draw();},function(e){S.err='Không đọc được thực đơn ('+((e&&e.code)||'lỗi')+').';S.ready=true;clearTimeout(timer);draw();});
    au.onAuthStateChanged(FB.auth,function(u){
      if(MODE==='khach'){
        if(!u){au.signInAnonymously(FB.auth).catch(function(e){S.err='Chưa vào được tiệm ('+((e&&e.code)||'lỗi')+').';S.ready=true;draw();});return;}
        if(S.uid===u.uid)return;S.uid=u.uid;
        myRef().onSnapshot(function(s){S.myDoc=s.exists?s.data():null;S.myDocExists=s.exists;S.myDocLoaded=true;draw();},function(){S.myDocLoaded=true;});
      }else{
        S.authChecked=true;
        if(u&&!u.isAnonymous){S.authed=true;S.isAdmin=true;S.adminEmail=u.email||'';startAdminData();}
        else{S.authed=false;S.isAdmin=false;}
        draw();
      }
    });
  }).catch(function(){S.err='Không tải được app. Kiểm tra mạng rồi tải lại trang nhé.';S.ready=true;S.authChecked=true;clearTimeout(timer);draw();});
}
start();
})();

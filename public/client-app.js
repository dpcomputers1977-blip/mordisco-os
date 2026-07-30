
const SUPABASE_URL="https://nmmjthqflxwucpmmmrks.supabase.co";
const SUPABASE_KEY="sb_publishable_izCztp4wZ0MzKOHjT2KGYA_ot_3pgb0";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let products=[],categories=[],settings={},cart=[],selectedCategory='all',deferredPrompt=null,lastOrder=null;
const money=n=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(n||0));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
async function init(){
 const [p,c,s]=await Promise.all([
  db.from('products').select('*,categories(name)').eq('active',true).order('name'),
  db.from('categories').select('*').eq('active',true).order('sort_order'),
  db.from('business_settings').select('*').limit(1).maybeSingle()
 ]);
 if(p.error)toast('No se pudo cargar el menú');
 products=p.data||[];categories=c.data||[];settings=s.data||{};
 hydrateSettings();renderCategories();renderProducts();restoreCustomer();registerPwa();
}
function hydrateSettings(){
 $('#businessDescription').textContent=settings.description||'El mejor sabor para compartir.';
 $('#businessHours').textContent=settings.schedule||settings.hours||'Horario por confirmar';
 $('#deliveryInfo').textContent=Number(settings.delivery_cost||0)>0?`Delivery ${money(settings.delivery_cost)}`:'Delivery disponible';
}
function renderCategories(){
 $('#categoryChips').innerHTML='<button class="active" data-cat="all">Todos</button>'+categories.map(c=>`<button data-cat="${c.id}">${esc(c.name)}</button>`).join('');
 $$('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;$$('[data-cat]').forEach(x=>x.classList.toggle('active',x===b));renderProducts()});
}
function filteredProducts(){
 const q=$('#productSearch').value.trim().toLowerCase();
 return products.filter(p=>(selectedCategory==='all'||String(p.category_id)===selectedCategory)&&(`${p.name} ${p.description||''}`).toLowerCase().includes(q));
}
function renderProducts(){
 const list=filteredProducts();
 $('#productGrid').innerHTML=list.length?list.map(p=>`<article class="productCard">
 ${p.image_url?`<img class="productImage" src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="productNoImage">Sin imagen</div>'}
 <div class="productBody"><small>${esc(p.categories?.name||'Mordisco')}</small><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p>
 <div class="productBottom"><strong>${money(p.price)}</strong><button class="addBtn" data-add="${p.id}">Agregar</button></div></div></article>`).join(''):'<div class="emptyState">No encontramos productos.</div>';
 $$('[data-add]').forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
}
function addToCart(id){
 const row=cart.find(x=>String(x.id)===String(id));if(row)row.qty++;else cart.push({id,qty:1});
 renderCart();toast('Producto agregado');
}
function changeQty(id,d){const r=cart.find(x=>String(x.id)===String(id));if(!r)return;r.qty+=d;cart=cart.filter(x=>x.qty>0);renderCart()}
function cartTotals(){
 const subtotal=cart.reduce((sum,r)=>{const p=products.find(x=>String(x.id)===String(r.id));return sum+(p?Number(p.price)*r.qty:0)},0);
 const type=document.querySelector('input[name="orderType"]:checked')?.value||'delivery';
 const delivery=type==='delivery'?Number(settings.delivery_cost||0):0;
 return {subtotal,delivery,total:subtotal+delivery};
}
function renderCart(){
 const count=cart.reduce((s,r)=>s+r.qty,0),tot=cartTotals();
 $('#cartCount').textContent=count;$('#floatingCount').textContent=count;$('#floatingTotal').textContent=money(tot.total);
 $('#floatingCart').classList.toggle('hidden',!count);
 $('#cartItems').innerHTML=cart.length?cart.map(r=>{const p=products.find(x=>String(x.id)===String(r.id));if(!p)return'';return `<div class="cartItem"><div><h4>${esc(p.name)}</h4><small>${money(p.price)} c/u</small><div class="qtyControls"><button data-minus="${p.id}">−</button><b>${r.qty}</b><button data-plus="${p.id}">+</button></div></div><div><b>${money(Number(p.price)*r.qty)}</b><button class="removeItem" data-remove="${p.id}">Eliminar</button></div></div>`}).join(''):'<div class="emptyState">Tu carrito está vacío.</div>';
 $$('[data-minus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));$$('[data-plus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));$$('[data-remove]').forEach(b=>b.onclick=()=>{cart=cart.filter(x=>String(x.id)!==String(b.dataset.remove));renderCart()});
 $('#cartSubtotal').textContent=money(tot.subtotal);$('#cartDelivery').textContent=money(tot.delivery);$('#cartTotal').textContent=money(tot.total);$('#checkoutTotal').textContent=money(tot.total);
}
function openCart(){$('#cartDrawer').classList.remove('hidden')} function closeCart(){$('#cartDrawer').classList.add('hidden')}
$('#cartOpen').onclick=openCart;$('#floatingCart').onclick=openCart;$$('[data-close-drawer]').forEach(x=>x.onclick=closeCart);
$('#productSearch').oninput=renderProducts;
$('#checkoutBtn').onclick=()=>{if(!cart.length)return toast('Agrega productos');closeCart();$('#checkoutModal').classList.remove('hidden');renderCart()};
$$('[data-close-checkout]').forEach(x=>x.onclick=()=>$('#checkoutModal').classList.add('hidden'));
$$('input[name="orderType"]').forEach(r=>r.onchange=()=>{$('#addressWrap').classList.toggle('hidden',r.checked&&r.value==='pickup');renderCart()});
function restoreCustomer(){try{const c=JSON.parse(localStorage.getItem('mordisco_customer')||'{}');$('#customerName').value=c.name||'';$('#customerPhone').value=c.phone||'';$('#customerAddress').value=c.address||''}catch{}}
$('#checkoutForm').onsubmit=async e=>{
 e.preventDefault();if(!cart.length)return toast('Tu carrito está vacío');
 const type=document.querySelector('input[name="orderType"]:checked').value;
 const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim(),address=$('#customerAddress').value.trim();
 if(type==='delivery'&&!address)return toast('Ingresa la dirección');
 const totals=cartTotals(),btn=$('#placeOrderBtn');btn.disabled=true;btn.textContent='Enviando...';
 const order={customer_name:name,customer_phone:phone,customer_address:type==='delivery'?address:'',order_type:type,payment_method:$('#paymentMethod').value,notes:$('#orderNotes').value.trim(),subtotal:totals.subtotal,delivery_cost:totals.delivery,total:totals.total,status:'pending'};
 const {data,error}=await db.from('orders').insert(order).select().single();
 if(error){btn.disabled=false;btn.textContent='Confirmar pedido';return toast('No se pudo crear el pedido')}
 const items=cart.map(r=>{const p=products.find(x=>String(x.id)===String(r.id));return{order_id:data.id,product_id:p.id,product_name:p.name,unit_price:p.price,quantity:r.qty,subtotal:Number(p.price)*r.qty}});
 const {error:itemError}=await db.from('order_items').insert(items);
 btn.disabled=false;btn.textContent='Confirmar pedido';
 if(itemError)return toast('Pedido creado, pero hubo un error con los productos');
 localStorage.setItem('mordisco_customer',JSON.stringify({name,phone,address}));localStorage.setItem('mordisco_last_order',JSON.stringify({number:data.order_number,phone}));
 lastOrder={number:data.order_number,phone};cart=[];renderCart();$('#checkoutModal').classList.add('hidden');$('#successOrderNumber').textContent=data.order_number;$('#successModal').classList.remove('hidden');
};
function openTracking(){$('#trackingModal').classList.remove('hidden');try{const o=JSON.parse(localStorage.getItem('mordisco_last_order')||'{}');$('#trackingNumber').value=o.number||'';$('#trackingPhone').value=o.phone||''}catch{}}
$('#trackOpen').onclick=openTracking;$('#heroTrack').onclick=openTracking;$$('[data-close-tracking]').forEach(x=>x.onclick=()=>$('#trackingModal').classList.add('hidden'));
$('#trackingForm').onsubmit=async e=>{e.preventDefault();await trackOrder($('#trackingNumber').value.trim(),$('#trackingPhone').value.trim())};
async function trackOrder(number,phone){
 const {data,error}=await db.from('orders').select('order_number,status,total,created_at,order_type').eq('order_number',number).eq('customer_phone',phone).maybeSingle();
 if(error||!data){$('#trackingResult').innerHTML='<div class="emptyState">No encontramos ese pedido. Revisa el número y teléfono.</div>';return}
 const order=['pending','confirmed','preparing','ready','delivered'],idx=order.indexOf(data.status);const labels=['Recibido','Confirmado','Preparando','Listo','Entregado'];
 $('#trackingResult').innerHTML=`<div class="trackingStatus"><h3>Pedido #${esc(data.order_number)}</h3><p>Total: <b>${money(data.total)}</b></p><div class="trackSteps">${labels.map((l,i)=>`<div class="trackStep ${i<=idx?'done':''}"><i>${i<=idx?'✓':i+1}</i><span>${l}</span></div>`).join('')}</div></div>`;
 localStorage.setItem('mordisco_last_order',JSON.stringify({number,phone}));
}
$('#trackCreatedOrder').onclick=()=>{$('#successModal').classList.add('hidden');openTracking();if(lastOrder)trackOrder(lastOrder.number,lastOrder.phone)};
$('#closeSuccess').onclick=()=>$('#successModal').classList.add('hidden');
function registerPwa(){
 if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js');
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBanner').classList.remove('hidden')});
 $('#installApp').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBanner').classList.add('hidden')};
 $('#dismissInstall').onclick=()=>$('#installBanner').classList.add('hidden');
}
init();

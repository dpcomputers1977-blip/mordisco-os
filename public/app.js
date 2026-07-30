
const SUPABASE_URL='https://nmmjthqflxwucpmmmrks.supabase.co';
const SUPABASE_KEY='sb_publishable_izCztp4wZ0MzKOHjT2KGYA_ot_3pgb0';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let products=[],categories=[],settings={},orders=[],cart=[],selectedCategory='Todos',editingImage='',adminProductQuery='',adminProductFilter='all',orderStatusFilter='all';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(n||0));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function init(){await Promise.all([loadCategories(),loadProducts(),loadSettings()]);renderAll();const {data:{session}}=await db.auth.getSession();if(session) await verifyAdmin(false)}
async function loadCategories(){const {data,error}=await db.from('categories').select('*').order('sort_order');if(error) return toast('Error cargando categorías');categories=data||[]}
async function loadProducts(){const {data,error}=await db.from('products').select('*,categories(name)').order('sort_order');$('#loadingProducts').classList.add('hidden');if(error)return toast('Error cargando productos');products=data||[]}
async function loadSettings(){const {data}=await db.from('business_settings').select('*').eq('id',1).maybeSingle();settings=data||{};applySettings()}
function applySettings(){$('#businessDescription').textContent=settings.description||'El mejor sabor para compartir.';$('#businessAddress').textContent=settings.address||'Dirección por configurar';$('#businessSchedule').textContent=settings.schedule||'Horario por configurar'}
function renderAll(){renderFilters();renderProducts();renderCart();renderAdminProducts();renderAdminCategories();fillCategorySelect();fillSettings()}
function renderFilters(){const names=['Todos',...categories.filter(c=>c.active).map(c=>c.name)];$('#categoryFilters').innerHTML=names.map(n=>`<button class="${n===selectedCategory?'active':''}" data-cat="${esc(n)}">${esc(n)}</button>`).join('');$$('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderFilters();renderProducts()})}
function filteredProducts(){const q=$('#searchInput').value.toLowerCase();return products.filter(p=>p.active&&(selectedCategory==='Todos'||p.categories?.name===selectedCategory)&&(`${p.name} ${p.description||''}`).toLowerCase().includes(q))}
function renderProducts(){const list=filteredProducts();$('#productGrid').innerHTML=list.length?list.map(p=>`<article class="productCard">${p.featured?'<span class="featured">Favorito</span>':''}<div class="productImage">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'<div class="noImage">Sin imagen</div>'}</div><div class="productBody"><small>${esc(p.categories?.name||'Sin categoría')}</small><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><div class="productFoot"><strong>${money(p.price)}</strong><button data-add="${p.id}">+ Agregar</button></div></div></article>`).join(''):'<div class="notice">No hay productos disponibles.</div>';$$('[data-add]').forEach(b=>b.onclick=()=>addCart(b.dataset.add))}
$('#searchInput').oninput=renderProducts;
function addCart(id){const f=cart.find(x=>x.id===id);if(f)f.qty++;else cart.push({id,qty:1});renderCart();openCart()}
function changeQty(id,d){const f=cart.find(x=>x.id===id);if(!f)return;f.qty+=d;cart=cart.filter(x=>x.qty>0);renderCart()}
function totals(){const subtotal=cart.reduce((s,x)=>{const p=products.find(y=>y.id===x.id);return s+(p?Number(p.price)*x.qty:0)},0);const delivery=$('#orderType').value==='delivery'?Number(settings.delivery_cost||0):0;return{subtotal,delivery,total:subtotal+delivery}}
function renderCart(){$('#cartCount').textContent=cart.reduce((s,x)=>s+x.qty,0);$('#cartItems').innerHTML=cart.length?cart.map(x=>{const p=products.find(y=>y.id===x.id);if(!p)return'';return`<div class="cartItem">${p.image_url?`<img src="${esc(p.image_url)}">`:'<div></div>'}<div><b>${esc(p.name)}</b><small>${money(p.price)}</small><div class="qty"><button data-minus="${p.id}">−</button><span>${x.qty}</span><button data-plus="${p.id}">+</button></div></div><b>${money(Number(p.price)*x.qty)}</b></div>`}).join(''):'<p class="notice">Tu carrito está vacío.</p>';$$('[data-minus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));$$('[data-plus]').forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));const t=totals();$('#subtotal').textContent=money(t.subtotal);$('#deliveryTotal').textContent=money(t.delivery);$('#grandTotal').textContent=money(t.total)}
function openCart(){$('#cartDrawer').classList.add('open')} $('#cartBtn').onclick=openCart;$('#orderNowBtn').onclick=openCart;$('#closeCart').onclick=()=>$('#cartDrawer').classList.remove('open');$('#orderType').onchange=()=>{renderCart();$('#customerAddress').classList.toggle('hidden',$('#orderType').value!=='delivery')};
$('#orderForm').onsubmit=async e=>{e.preventDefault();if(!cart.length)return toast('Agrega productos al pedido');if(settings.accepting_orders===false)return toast('Temporalmente no recibimos pedidos');const t=totals();if(t.subtotal<Number(settings.minimum_order||0))return toast(`Pedido mínimo: ${money(settings.minimum_order)}`);const order={customer_name:$('#customerName').value.trim(),customer_phone:$('#customerPhone').value.trim(),customer_address:$('#customerAddress').value.trim(),order_type:$('#orderType').value,payment_method:$('#paymentMethod').value,notes:$('#orderNotes').value.trim(),subtotal:t.subtotal,delivery_cost:t.delivery,total:t.total,status:'pending'};const {data,error}=await db.from('orders').insert(order).select().single();if(error)return toast('No se pudo guardar el pedido: '+error.message);const items=cart.map(x=>{const p=products.find(y=>y.id===x.id);return{order_id:data.id,product_id:p.id,product_name:p.name,unit_price:p.price,quantity:x.qty,subtotal:Number(p.price)*x.qty}});const {error:itemError}=await db.from('order_items').insert(items);if(itemError)return toast('Pedido creado, pero faltaron detalles');const msg=`🍔 *PEDIDO #${data.order_number} — MORDISCO*
Cliente: ${order.customer_name}
${items.map(i=>`${i.quantity} x ${i.product_name} — ${money(i.subtotal)}`).join('\n')}
TOTAL: ${money(t.total)}`;cart=[];renderCart();$('#orderForm').reset();toast('Pedido guardado en la nube');if(settings.whatsapp)window.open(`https://wa.me/${String(settings.whatsapp).replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank')};
$('#adminBtn').onclick=()=>$('#loginModal').classList.remove('hidden');$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.add('hidden'));
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginMessage').textContent='Ingresando…';const {error}=await db.auth.signInWithPassword({email:$('#loginEmail').value,password:$('#loginPassword').value});if(error){$('#loginMessage').textContent='No se pudo ingresar: '+error.message;return}await verifyAdmin(true)};
async function verifyAdmin(showError=true){const {data:{user}}=await db.auth.getUser();if(!user)return;const {data,error}=await db.from('admin_users').select('active').eq('user_id',user.id).maybeSingle();if(error||!data?.active){await db.auth.signOut();if(showError)$('#loginMessage').textContent='Este usuario no está autorizado como administrador.';return}$('#loginModal').classList.add('hidden');showAdmin();await Promise.all([loadOrders(),loadProducts(),loadCategories(),loadSettings()]);renderAll()}
function showAdmin(){$('#publicView').classList.add('hidden');$('.topbar').classList.add('hidden');$('#adminView').classList.remove('hidden')}
function showStore(){$('#adminView').classList.add('hidden');$('#publicView').classList.remove('hidden');$('.topbar').classList.remove('hidden')}
$('#backToStore').onclick=showStore;$('#logoutBtn').onclick=async()=>{await db.auth.signOut();showStore();toast('Sesión cerrada')};
$$('.sidebar [data-tab]').forEach(b=>b.onclick=async()=>{const tab=b.dataset.tab;$$('.sidebar [data-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('.tab').forEach(x=>x.classList.add('hidden'));$('#tab-'+tab).classList.remove('hidden');$('#adminTitle').textContent={dashboard:'Resumen',products:'Productos',categories:'Categorías',orders:'Pedidos',settings:'Negocio'}[tab];if(tab==='orders')await loadOrders();if(tab==='dashboard'){await loadOrders();renderMetrics()}});
function fillCategorySelect(){$('#pCategory').innerHTML=categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
function resetProduct(){$('#productForm').reset();$('#pId').value='';$('#pActive').checked=true;$('#pSort').value=0;editingImage='';updatePreview('')}
function updatePreview(src){$('#pPreview').src=src||'';$('#pPreview').classList.toggle('hidden',!src);$('#pNoImage').classList.toggle('hidden',!!src);$('#removeProductImage').classList.toggle('hidden',!src)}
$('#clearProduct').onclick=resetProduct;$('#removeProductImage').onclick=()=>{editingImage='';$('#pImageFile').value='';updatePreview('')};
$('#pImageFile').onchange=e=>{const f=e.target.files[0];if(f)updatePreview(URL.createObjectURL(f))};
async function uploadImage(file){if(!file)return editingImage||'';const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`products/${crypto.randomUUID()}.${ext}`;const {error}=await db.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;return db.storage.from('product-images').getPublicUrl(path).data.publicUrl}
$('#productForm').onsubmit=async e=>{e.preventDefault();try{const id=$('#pId').value;const image=await uploadImage($('#pImageFile').files[0]);const row={name:$('#pName').value.trim(),category_id:$('#pCategory').value||null,price:Number($('#pPrice').value),description:$('#pDescription').value.trim(),image_url:image,featured:$('#pFeatured').checked,active:$('#pActive').checked,sort_order:Number($('#pSort').value||0)};const q=id?db.from('products').update(row).eq('id',id):db.from('products').insert(row);const {error}=await q;if(error)throw error;toast('Producto guardado en la nube');resetProduct();await loadProducts();renderAll()}catch(err){toast('Error: '+err.message)}};
function getAdminProducts(){
  return products.filter(p=>{
    const text=`${p.name} ${p.description||''} ${p.categories?.name||''}`.toLowerCase();
    const matchesText=text.includes(adminProductQuery.toLowerCase());
    const matchesFilter=adminProductFilter==='all'
      ||(adminProductFilter==='visible'&&p.active)
      ||(adminProductFilter==='hidden'&&!p.active)
      ||(adminProductFilter==='featured'&&p.featured);
    return matchesText&&matchesFilter;
  });
}
function renderAdminProducts(){
  const list=getAdminProducts();
  $('#adminProductCount').textContent=`${list.length} producto${list.length===1?'':'s'}`;
  $('#adminProducts').innerHTML=list.length?list.map(p=>`<article class="adminRow">${p.image_url?`<img src="${esc(p.image_url)}">`:'<div></div>'}<div><b>${esc(p.name)}</b><small>${esc(p.categories?.name||'Sin categoría')} · ${money(p.price)} · ${p.active?'Visible':'Oculto'}${p.featured?' · Destacado':''}</small></div><div class="adminRowActions"><button data-edit-product="${p.id}">Editar</button><button class="dark" data-duplicate-product="${p.id}">Duplicar</button><button class="${p.active?'warning':'success'}" data-toggle-product="${p.id}">${p.active?'Ocultar':'Mostrar'}</button><button class="danger" data-delete-product="${p.id}">Eliminar</button></div></article>`).join(''):'<div class="notice">No hay productos que coincidan con el filtro.</div>';
  $$('[data-edit-product]').forEach(b=>b.onclick=()=>editProduct(b.dataset.editProduct));
  $$('[data-delete-product]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.deleteProduct));
  $$('[data-duplicate-product]').forEach(b=>b.onclick=()=>duplicateProduct(b.dataset.duplicateProduct));
  $$('[data-toggle-product]').forEach(b=>b.onclick=()=>toggleProduct(b.dataset.toggleProduct));
}
async function duplicateProduct(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const row={name:`${p.name} (copia)`,category_id:p.category_id,price:p.price,description:p.description||'',image_url:p.image_url||'',featured:false,active:false,sort_order:Number(p.sort_order||0)+1};
  const {error}=await db.from('products').insert(row);
  if(error)return toast(error.message);
  await loadProducts(); renderAll(); toast('Producto duplicado como oculto');
}
async function toggleProduct(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const {error}=await db.from('products').update({active:!p.active}).eq('id',id);
  if(error)return toast(error.message);
  await loadProducts(); renderAll(); toast(p.active?'Producto ocultado':'Producto publicado');
}
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;$('#pId').value=p.id;$('#pName').value=p.name;$('#pCategory').value=p.category_id||'';$('#pPrice').value=p.price;$('#pSort').value=p.sort_order||0;$('#pDescription').value=p.description||'';$('#pFeatured').checked=p.featured;$('#pActive').checked=p.active;editingImage=p.image_url||'';updatePreview(editingImage);scrollTo({top:0,behavior:'smooth'})}
async function deleteProduct(id){if(!confirm('¿Eliminar este producto?'))return;const {error}=await db.from('products').delete().eq('id',id);if(error)return toast(error.message);await loadProducts();renderAll();toast('Producto eliminado')}
function resetCategory(){$('#categoryForm').reset();$('#cId').value='';$('#cSort').value=0;$('#cActive').checked=true} $('#clearCategory').onclick=resetCategory;
$('#categoryForm').onsubmit=async e=>{e.preventDefault();const id=$('#cId').value,row={name:$('#cName').value.trim(),sort_order:Number($('#cSort').value||0),active:$('#cActive').checked};const {error}=await(id?db.from('categories').update(row).eq('id',id):db.from('categories').insert(row));if(error)return toast(error.message);resetCategory();await loadCategories();renderAll();toast('Categoría guardada')};
function renderAdminCategories(){$('#adminCategories').innerHTML=categories.map(c=>`<article class="adminRow"><div></div><div><b>${esc(c.name)}</b><small>Orden ${c.sort_order} · ${c.active?'Activa':'Oculta'}</small></div><button data-edit-cat="${c.id}">Editar</button><button class="danger" data-delete-cat="${c.id}">Eliminar</button></article>`).join('');$$('[data-edit-cat]').forEach(b=>b.onclick=()=>{const c=categories.find(x=>x.id===b.dataset.editCat);$('#cId').value=c.id;$('#cName').value=c.name;$('#cSort').value=c.sort_order;$('#cActive').checked=c.active});$$('[data-delete-cat]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Eliminar categoría? Los productos quedarán sin categoría.'))return;const {error}=await db.from('categories').delete().eq('id',b.dataset.deleteCat);if(error)return toast(error.message);await loadCategories();await loadProducts();renderAll()})}
async function loadOrders(){const {data,error}=await db.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}).limit(100);if(error)return toast('Error cargando pedidos');orders=data||[];renderOrders();renderMetrics()}
const statusLabels={pending:'Pendiente',confirmed:'Confirmado',preparing:'Preparando',ready:'Listo',delivered:'Entregado',cancelled:'Cancelado'};
function getFilteredOrders(){return orderStatusFilter==='all'?orders:orders.filter(o=>o.status===orderStatusFilter)}
function renderOrders(){
  const list=getFilteredOrders();
  $('#adminOrders').innerHTML=list.length?list.map(o=>`<article class="orderCard"><small>Pedido #${o.order_number}</small><h3>${esc(o.customer_name)}</h3><p>${o.order_items?.map(i=>`${i.quantity}× ${esc(i.product_name)}`).join(', ')||''}</p><p>${esc(o.customer_phone)} · ${esc(o.order_type)}</p><strong>${money(o.total)}</strong><p>${new Date(o.created_at).toLocaleString('es-EC')}</p><select data-status="${o.id}">${Object.entries(statusLabels).map(([value,label])=>`<option ${value===o.status?'selected':''} value="${value}">${label}</option>`).join('')}</select></article>`).join(''):'<div class="notice">No hay pedidos con ese estado.</div>';
  $$('[data-status]').forEach(s=>s.onchange=async()=>{
    const {error}=await db.from('orders').update({status:s.value}).eq('id',s.dataset.status);
    if(error)toast(error.message);else{toast('Estado actualizado');await loadOrders()}
  });
}
function renderMetrics(){
  const valid=orders.filter(o=>o.status!=='cancelled');
  const today=new Date().toISOString().slice(0,10);
  const todaySales=valid.filter(o=>String(o.created_at).slice(0,10)===today).reduce((s,o)=>s+Number(o.total),0);
  $('#metricOrders').textContent=orders.length;
  $('#metricSales').textContent=money(valid.reduce((s,o)=>s+Number(o.total),0));
  $('#metricToday').textContent=money(todaySales);
  $('#metricPending').textContent=orders.filter(o=>['pending','confirmed','preparing'].includes(o.status)).length;
  $('#metricProducts').textContent=products.filter(p=>p.active).length;
  $('#metricCategories').textContent=categories.length;
  renderDashboardExtras();
}
function renderDashboardExtras(){
  const recent=orders.slice(0,5);
  $('#recentOrders').innerHTML=recent.length?recent.map(o=>`<div class="miniOrder"><div><b>#${o.order_number} · ${esc(o.customer_name)}</b><small>${new Date(o.created_at).toLocaleString('es-EC')}</small></div><div><span class="statusBadge status-${o.status}">${statusLabels[o.status]||o.status}</span><strong>${money(o.total)}</strong></div></div>`).join(''):'<p class="emptySmall">Todavía no hay pedidos.</p>';
  const featured=products.filter(p=>p.featured&&p.active).slice(0,6);
  $('#featuredSummary').innerHTML=featured.length?featured.map(p=>`<div class="miniProduct"><span>${esc(p.name)}</span><strong>${money(p.price)}</strong></div>`).join(''):'<p class="emptySmall">No hay productos destacados.</p>';
}
$('#refreshOrders').onclick=loadOrders;
$('#dashboardRefresh').onclick=loadOrders;
$('#adminProductSearch').oninput=e=>{adminProductQuery=e.target.value;renderAdminProducts()};
$('#adminProductFilter').onchange=e=>{adminProductFilter=e.target.value;renderAdminProducts()};
$('#orderStatusFilter').onchange=e=>{orderStatusFilter=e.target.value;renderOrders()};
function fillSettings(){$('#sName').value=settings.business_name||'';$('#sWhatsapp').value=settings.whatsapp||'';$('#sDescription').value=settings.description||'';$('#sAddress').value=settings.address||'';$('#sSchedule').value=settings.schedule||'';$('#sDelivery').value=settings.delivery_cost||0;$('#sMinimum').value=settings.minimum_order||0;$('#sAccepting').checked=settings.accepting_orders!==false}
$('#settingsForm').onsubmit=async e=>{e.preventDefault();const row={id:1,business_name:$('#sName').value,whatsapp:$('#sWhatsapp').value,description:$('#sDescription').value,address:$('#sAddress').value,schedule:$('#sSchedule').value,delivery_cost:Number($('#sDelivery').value||0),minimum_order:Number($('#sMinimum').value||0),accepting_orders:$('#sAccepting').checked};const {error}=await db.from('business_settings').upsert(row);if(error)return toast(error.message);settings=row;applySettings();toast('Configuración guardada en la nube')};
init();

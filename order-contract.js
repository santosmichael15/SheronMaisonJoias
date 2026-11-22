(function(root){
 'use strict';
 const paid=new Set(['pago','em_separacao','enviado','entregue']);
 function rows(order){
  if(!Array.isArray(order.itens)||!order.itens.length)throw Error('Pedido sem itens.');
  return order.itens.map(item=>{
   const quantity=item.quantidade==null?1:Number(item.quantidade),price=Number(item.preco??item.precoUnitario);
   if(typeof item.produtoId!=='string'||!item.produtoId||!Number.isSafeInteger(quantity)||quantity<1||!Number.isFinite(price)||price<0)throw Error('Item de pedido inválido.');
   const cents=Math.round(price*100);if(!Number.isSafeInteger(cents*quantity))throw Error('Valor do pedido inválido.');
   return {...item,quantidade:quantity,preco:cents/100,subtotal:cents*quantity/100};
  });
 }
 function state(order){
  const items=rows(order),withQuantity=order.itens.filter(i=>i.quantidade!=null).length;
  if(withQuantity&&withQuantity!==items.length)throw Error('Pedido com formatos misturados. Revise antes de atualizar.');
  // API v1 reserved stock and counted sales on creation; legacy web orders did neither.
  const legacyReservation=order.schemaVersion==null&&withQuantity===items.length;
  return {items,reserved:order.estoqueReservado??(legacyReservation||paid.has(order.status)),counted:order.vendasContabilizadas??(legacyReservation||paid.has(order.status)),revenue:order.receitaContabilizada??(!legacyReservation&&paid.has(order.status))};
 }
 function effect(order,target){
  if(order.status===target)return null;
  const allowed={aguardando_pix:['pago','cancelado'],pago:['em_separacao','cancelado'],em_separacao:['enviado'],enviado:['entregue']};
  if(!allowed[order.status]?.includes(target))throw Error('O pedido já foi atualizado. Confira o status atual antes de continuar.');
  const current=state(order),payment=target==='pago',cancel=target==='cancelado',groups=new Map();
  if(payment||cancel)for(const item of current.items){const value=groups.get(item.produtoId)||{quantity:0,cents:0};value.quantity+=item.quantidade;value.cents+=Math.round(item.subtotal*100);groups.set(item.produtoId,value);}
  const changes=[...groups].map(([id,item])=>({id,stock:payment?(current.reserved?0:-item.quantity):(current.reserved?item.quantity:0),sales:payment?(current.counted?0:item.quantity):(current.counted?-item.quantity:0),revenue:payment?(current.revenue?0:item.cents/100):(current.revenue?-item.cents/100:0)}));
  return {changes,flags:{schemaVersion:2,estoqueReservado:cancel?false:payment?true:current.reserved,vendasContabilizadas:cancel?false:payment?true:current.counted,receitaContabilizada:cancel?false:payment?true:current.revenue}};
 }
 function date(value){if(value?.toDate)return value.toDate();if(value?.seconds!=null)return new Date(value.seconds*1000);return new Date(value);}
 function statistics(orders,year=new Date().getFullYear()){
  const products=new Map(),monthly=Array(12).fill(0);let units=0,revenue=0;
  for(const order of orders){if(!paid.has(order.status))continue;for(const item of rows(order)){
   const data=products.get(item.produtoId)||{units:0,revenue:0};data.units+=item.quantidade;data.revenue+=item.subtotal;products.set(item.produtoId,data);units+=item.quantidade;revenue+=item.subtotal;
   const when=date(order.pagoEm||order.criadoEm);if(when.getFullYear()===year)monthly[when.getMonth()]+=item.quantidade;
  }}return {products,monthly,units,revenue:Math.round(revenue*100)/100};
 }
 const api={rows,state,effect,statistics};root.OrderContract=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

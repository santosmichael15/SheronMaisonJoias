(function(root){
 'use strict';
 const contract=typeof module!=='undefined'?require('./order-contract.js'):root.OrderContract;
 async function change(db,id,target,stamp){
  return db.runTransaction(async tx=>{
   const ref=db.collection('pedidos').doc(id),snapshot=await tx.get(ref);
   if(!snapshot.exists)throw Error('Pedido não encontrado.');
   const order=snapshot.data(),effect=contract.effect(order,target);if(!effect)return false;
   if(!order.clienteId)throw Error('Pedido sem identificação do cliente.');
   const updates=[];
   for(const item of effect.changes){
    if(!item.stock&&!item.sales&&!item.revenue)continue;
    const productRef=db.collection('produtos').doc(item.id),doc=await tx.get(productRef);
    if(!doc.exists)throw Error('Um produto do pedido não existe mais.');
    const p=doc.data(),stock=Number(p.estoque),sales=Number(p.vendas||0),revenue=Number(p.lucro||0);
    if(!Number.isSafeInteger(stock)||stock+item.stock<0)throw Error('Estoque insuficiente para confirmar este pedido.');
    if(!Number.isFinite(sales)||!Number.isFinite(revenue))throw Error('Indicadores do produto inválidos.');
    updates.push([productRef,{estoque:stock+item.stock,vendas:Math.max(0,sales+item.sales),lucro:Math.round(Math.max(0,revenue+item.revenue)*100)/100,atualizadoEm:stamp()}]);
   }
   const field={pago:'pagoEm',cancelado:'canceladoEm',em_separacao:'separacaoEm',enviado:'enviadoEm',entregue:'entregueEm'}[target];
   const data={...effect.flags,status:target,atualizadoEm:stamp(),[field]:stamp()};
   tx.update(ref,data);tx.set(db.collection('clientes').doc(order.clienteId).collection('pedidos').doc(id),{...order,...data},{merge:true});
   for(const [productRef,product] of updates)tx.update(productRef,product);
   return true;
  });
 }
 root.OrderWorkflow={change};if(typeof module!=='undefined')module.exports={change};
})(typeof window==='undefined'?globalThis:window);

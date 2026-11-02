(function(root){
 'use strict';
 const next={pago:'em_separacao',em_separacao:'enviado',enviado:'entregue'};
 async function change(db,id,target,stamp){
  return db.runTransaction(async tx=>{
   const ref=db.collection('pedidos').doc(id),snapshot=await tx.get(ref);
   if(!snapshot.exists)throw Error('Pedido não encontrado.');
   const order=snapshot.data();if(order.status===target)return false;
   const payment=target==='pago',cancel=target==='cancelado';
   if((payment||cancel)?order.status!=='aguardando_pix':next[order.status]!==target)throw Error('O pedido já foi atualizado. Confira o status atual antes de continuar.');
   const totals=new Map();
   if(payment){
    if((order.itens||[]).some(item=>item.quantidade!=null))throw Error('Este pedido utiliza o formato da API com quantidade/reserva. É necessário conciliar esse fluxo antes de confirmar por este painel.');
    for(const item of order.itens||[]){if(!item.produtoId)throw Error('Pedido com produto sem identificação. Revise antes de confirmar.');const row=totals.get(item.produtoId)||{quantity:0,amount:0};if(!Number.isFinite(Number(item.preco))||Number(item.preco)<0)throw Error('Pedido com preço inválido.');row.quantity++;row.amount+=Number(item.preco);totals.set(item.produtoId,row);}
   }
   const updates=[];
   for(const [productId,total] of totals){const productRef=db.collection('produtos').doc(productId),productDoc=await tx.get(productRef);if(!productDoc.exists)throw Error('Um produto do pedido não existe mais.');const p=productDoc.data();if(!Number.isFinite(Number(p.estoque))||Number(p.estoque)<total.quantity)throw Error('Estoque insuficiente para confirmar este pedido.');updates.push([productRef,{estoque:Number(p.estoque)-total.quantity,vendas:Number(p.vendas||0)+total.quantity,lucro:Number(p.lucro||0)+total.amount,atualizadoEm:stamp()}]);}
   const field={pago:'pagoEm',cancelado:'canceladoEm',em_separacao:'separacaoEm',enviado:'enviadoEm',entregue:'entregueEm'}[target];
   const data={status:target,atualizadoEm:stamp(),[field]:stamp()};
   tx.update(ref,data);if(order.clienteId)tx.set(db.collection('clientes').doc(order.clienteId).collection('pedidos').doc(id),data,{merge:true});
   for(const [productRef,data] of updates)tx.update(productRef,data);
   return true;
  });
 }
 root.OrderWorkflow={change};if(typeof module!=='undefined')module.exports={change};
})(typeof window==='undefined'?globalThis:window);

const {test}=require('node:test'),assert=require('node:assert/strict');
const contract=require('../order-contract.js'),{change}=require('../order-workflow.js');
const old={clienteId:'cliente',status:'aguardando_pix',itens:[{produtoId:'anel',nome:'Anel',preco:10},{produtoId:'anel',nome:'Anel',preco:10}]};
const api={...old,itens:[{produtoId:'anel',nome:'Anel',preco:10,quantidade:2}]};
function database(order,product={estoque:5,vendas:0,lucro:0}){
 const data={'pedidos/p':structuredClone(order),'produtos/anel':product};
 const ref=path=>({path,doc:id=>ref(path+'/'+id),collection:id=>ref(path+'/'+id)});
 let queue=Promise.resolve();
 return {data,collection:ref,runTransaction(fn){const run=queue.then(async()=>{let writing=false;const writes=[];const result=await fn({get:async r=>{assert.equal(writing,false,'leituras antes das escritas');return {exists:!!data[r.path],data:()=>structuredClone(data[r.path])}},update:(r,d)=>{writing=true;writes.push([r.path,d])},set:(r,d)=>{writing=true;writes.push([r.path,d])}});for(const [path,value]of writes)data[path]={...data[path],...value};return result});queue=run.catch(()=>{});return run;}};
}
test('pedido antigo do site: confirma uma vez e espelha todos os dados',async()=>{
 const db=database(old);await Promise.all([change(db,'p','pago',()=>1),change(db,'p','pago',()=>1)]);
 assert.deepEqual(db.data['produtos/anel'],{estoque:3,vendas:2,lucro:20,atualizadoEm:1});
 assert.deepEqual(db.data['pedidos/p'],db.data['clientes/cliente/pedidos/p']);
});
test('pedido antigo da API: não desconta nem contabiliza unidades novamente',async()=>{
 const db=database(api,{estoque:3,vendas:2,lucro:0});await change(db,'p','pago',()=>1);
 assert.equal(db.data['produtos/anel'].estoque,3);assert.equal(db.data['produtos/anel'].vendas,2);assert.equal(db.data['produtos/anel'].lucro,20);
 await change(db,'p','cancelado',()=>2);await change(db,'p','cancelado',()=>3);
 assert.equal(db.data['produtos/anel'].estoque,5);assert.equal(db.data['produtos/anel'].vendas,0);assert.equal(db.data['produtos/anel'].lucro,0);
});
test('cancelar reserva antiga sem pagamento restitui estoque e não receita',async()=>{
 const db=database(api,{estoque:3,vendas:2,lucro:0});await change(db,'p','cancelado',()=>1);
 assert.equal(db.data['produtos/anel'].estoque,5);assert.equal(db.data['produtos/anel'].vendas,0);assert.equal(db.data['produtos/anel'].lucro,0);
});
test('novo contrato com quantidade não implica reserva',async()=>{
 const db=database({...api,schemaVersion:2,estoqueReservado:false,vendasContabilizadas:false,receitaContabilizada:false});await change(db,'p','pago',()=>1);assert.equal(db.data['produtos/anel'].estoque,3);assert.equal(db.data['produtos/anel'].vendas,2);
});
test('cancelamento sem reserva não aumenta estoque',async()=>{const db=database(old);await change(db,'p','cancelado',()=>1);assert.equal(db.data['produtos/anel'].estoque,5);});
test('estoque insuficiente não altera pedido nem cópia',async()=>{const db=database(old,{estoque:1,vendas:0,lucro:0});await assert.rejects(change(db,'p','pago',()=>1),/Estoque/);assert.equal(db.data['pedidos/p'].status,'aguardando_pix');assert.equal(db.data['clientes/cliente/pedidos/p'],undefined);});
test('sequência operacional só avança a partir de pago',async()=>{const db=database(old);await assert.rejects(change(db,'p','enviado',()=>1));await change(db,'p','pago',()=>1);for(const target of ['em_separacao','enviado','entregue'])await change(db,'p',target,()=>1);await assert.rejects(change(db,'p','pago',()=>1));assert.equal(db.data['produtos/anel'].estoque,3);});
test('quantidades e faturamento vêm de pedidos pagos, não do preço atual',()=>{const result=contract.statistics([{...api,status:'pago',criadoEm:'2026-04-10T12:00:00Z'},old,{...api,status:'cancelado'}],2026);assert.equal(result.units,2);assert.equal(result.revenue,20);assert.equal(result.monthly[3],2);assert.equal(contract.rows(api)[0].subtotal,20);});
test('formatos misturados e quantidade inválida são recusados',()=>{assert.throws(()=>contract.effect({...old,itens:[old.itens[0],api.itens[0]]},'pago'),/misturados/);assert.throws(()=>contract.rows({...api,itens:[{...api.itens[0],quantidade:0}]}));});
test('HTML e scripts preparados carregam contrato antes do workflow',()=>{
 const fs=require('fs'),vm=require('vm');const prefixes=[''];if(fs.existsSync('integracao-api/app/admin.html'))prefixes.push('integracao-api/app/');for(const prefix of prefixes)for(const file of ['admin.html','vendas.html','meus-pedidos.html']){
  const s=fs.readFileSync(prefix+file,'utf8');assert.ok(s.includes('order-contract.js'));
  if(s.includes('order-workflow.js'))assert.ok(s.indexOf('order-contract.js')<s.indexOf('order-workflow.js'));
  for(const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!m[1].includes('src=')&&!m[1].includes('application/'))new vm.Script(m[2],{filename:prefix+file});
  if(file==='admin.html'){assert.ok(!s.includes('Math.max(vendasReais, 8)'));assert.ok(s.includes('OrderContract.statistics(pedidosAdmin)'));}
 }
});

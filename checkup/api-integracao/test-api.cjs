const {test}=require('node:test'),assert=require('node:assert/strict');
const {createClient,BASE_URL}=require('../../sheron-api.js');
const p={id:'anel',nome:'Anel',ativo:true,preco:10,estoque:2};
const ok=data=>({ok:true,status:200,json:async()=>data});
test('paginação, deduplicação e produtos ativos',async()=>{
 const urls=[]; const api=createClient(async(url,options)=>{urls.push(url);assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');return ok(urls.length===1?{items:[p],hasNext:true,nextCursor:'a b'}:{items:[p,{...p,id:'inativo',ativo:false}],hasNext:false});});
 assert.deepEqual(await api.listProducts(),[p]);assert.match(urls[1],/cursor=a%20b/);assert.ok(urls[0].startsWith(BASE_URL));
});
test('cursor repetido não trava nem retorna catálogo incompleto',async()=>{await assert.rejects(createClient(async()=>ok({items:[p],hasNext:true,nextCursor:'a'})).listProducts(),/Paginação/);});
test('404 é produto ausente; falhas de rede e HTTP não viram ausência',async()=>{
 assert.equal(await createClient(async()=>({status:404})).getProduct('anel'),null);
 await assert.rejects(createClient(async()=>({status:500,ok:false})).getProduct('anel'),/HTTP 500/);
 await assert.rejects(createClient(async()=>{throw Error('rede');}).getProduct('anel'),/rede/);
});
test('contrato inválido, ID divergente e caminhos inválidos são recusados',async()=>{
 await assert.rejects(createClient(async()=>ok({...p,estoque:'2'})).getProduct('anel'),/inválida/);
 await assert.rejects(createClient(async()=>ok(p)).getProduct('colar'),/diferente/);
 await assert.rejects(createClient(async()=>ok(p)).getProduct('a/b'),/inválido/);
 assert.equal(await createClient(async()=>ok({...p,ativo:false})).getProduct('anel'),null);
});
test('tempo limite aborta a requisição',async()=>{
 const api=createClient((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('abortado')))),5);
 await assert.rejects(api.getProduct('anel'),/abortado/);
});
test('site e app carregam o mesmo cliente antes de usá-lo',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 for(const file of ['index.html','produto.html','checkup/api-integracao/app/index.html'].filter(file=>fs.existsSync(file))){
  const html=fs.readFileSync(file,'utf8'); assert.ok(html.includes('sheron-api.js'));
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!match[1].includes('src=')&&!match[1].includes('application/'))new vm.Script(match[2]);
 }
 for(const file of ['produto.js','checkup/api-integracao/app/app.js','checkup/api-integracao/app/cart.js','checkup/api-integracao/app/product-details.js'].filter(file=>fs.existsSync(file)))new vm.Script(fs.readFileSync(file,'utf8'));
 if(fs.existsSync('checkup/api-integracao/app/sheron-api.js'))assert.equal(fs.readFileSync('sheron-api.js','utf8'),fs.readFileSync('checkup/api-integracao/app/sheron-api.js','utf8'));
});

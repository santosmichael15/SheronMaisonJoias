(function(root){
 'use strict';
 const slug=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 function validate(p){
  if(!p.nome||p.nome.length>160)throw Error('Informe um nome de até 160 caracteres.');
  if(!p.categoria||p.categoria.length>60)throw Error('Informe uma categoria de até 60 caracteres.');
  if(!Number.isFinite(p.preco)||p.preco<=0)throw Error('Informe um preço maior que zero.');
  if(!Number.isInteger(p.estoque)||p.estoque<0||!Number.isInteger(p.ordem)||p.ordem<0)throw Error('Estoque e ordem devem ser números inteiros não negativos.');
  if(p.descricao.length>1500)throw Error('A descrição deve ter até 1500 caracteres.');
  if(!/^https:\/\//i.test(p.imagem)&&!/^(\.\/)?Imagens utilizadas\//.test(p.imagem)&&!/^\/?images\//.test(p.imagem))throw Error('Use uma URL HTTPS ou um caminho dentro de Imagens utilizadas/ ou images/.');
  return {...p,categoriaSlug:slug(p.categoria)};
 }
 function editPayload(data,current,baseline){
  const payload={...data};
  if(baseline){
   if(!current)throw Error('O produto não existe mais. Recarregue o painel.');
   if(Number(baseline.estoque||0)===data.estoque)delete payload.estoque;
   else if(Number(current.estoque||0)!==Number(baseline.estoque||0))throw Error('O estoque mudou enquanto você editava. Reabra o produto antes de ajustar a quantidade.');
  }else{
   if(current)throw Error('Já existe um produto com este nome. Edite o existente ou escolha outro nome.');
   payload.vendas=0;payload.lucro=0;
  }
  return payload;
 }
 function checkImage(src){return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>reject(Error('A imagem demorou para carregar. Confirme o endereço e tente novamente.')),10000);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(Error('A imagem não está acessível no site. Selecionar um arquivo não faz upload: publique a imagem ou informe uma URL HTTPS válida.'));};img.src=src;});}
 const api={slug,validate,editPayload,checkImage};root.CatalogContract=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

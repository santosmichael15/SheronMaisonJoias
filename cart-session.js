(function(){
 'use strict';
 const key='sheron_site_cart_v1';
 function valid(item){return item&&typeof item.nome==='string'&&Number.isFinite(item.preco)&&item.preco>0&&(item.produtoId==null||typeof item.produtoId==='string');}
 window.SheronCart={
  read(){try{const data=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(valid):[];}catch{return [];}},
  write(items){sessionStorage.setItem(key,JSON.stringify(items.filter(valid)));}
 };
})();

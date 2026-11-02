(function(){
 'use strict';
 const $=id=>document.getElementById(id),id=new URLSearchParams(location.search).get('id');
 const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 let product=null,limit=0,busy=false;
 function description(name){
  const n=name.toLowerCase();
  if(n.includes('conjunto'))return 'Uma combinação delicada para deixar o seu visual ainda mais especial. Use as peças juntas para um toque harmonioso ou separadas para criar novas formas de brilhar.';
  if(n.includes('anel'))return 'Um toque de brilho para acompanhar seus gestos e valorizar a beleza das suas mãos. Delicado e cheio de charme, combina com momentos especiais e com a vontade de se sentir linda todos os dias.';
  if(n.includes('brinco'))return 'Um detalhe luminoso que emoldura o rosto e deixa a produção mais encantadora. Uma escolha para realçar o seu estilo com delicadeza, do encontro casual à ocasião especial.';
  if(n.includes('colar'))return 'Um ponto de destaque que valoriza o colo e dá um toque delicado à produção. Combine com o seu decote favorito e deixe a sua beleza aparecer nos pequenos detalhes.';
  return 'Uma peça cheia de charme para dar um toque especial ao seu estilo. Combine do seu jeito e transforme os pequenos detalhes em uma expressão da sua beleza.';
 }
 function update(){const q=Number($('quantity').value);$('subtotal').textContent=Number.isInteger(q)&&q>0&&product?money(q*product.preco):'—';$('decrease').disabled=busy||limit===0||q<=1;$('increase').disabled=busy||limit===0||q>=limit;}
 function showError(message,retry=false){$('loading').hidden=true;$('product-content').hidden=true;$('error').hidden=false;$('error-message').textContent=message;$('retry').hidden=!retry;}
 function showReviews(){const texts=['Uma delicadeza que deixa o visual ainda mais lindo!','O toque de brilho perfeito para completar a produção.','Uma peça encantadora, cheia de charme e personalidade.','Linda para dar um destaque especial aos meus looks.'];$('review-list').replaceChildren();texts.forEach((text,i)=>{const card=document.createElement('article');card.className='review';const stars=document.createElement('div');stars.className='stars';stars.textContent='★★★★★';stars.setAttribute('aria-label','5 de 5 estrelas');const label=document.createElement('small');label.textContent='AVALIAÇÃO ILUSTRATIVA '+(i+1);const p=document.createElement('p');p.textContent=text;card.append(stars,label,p);$('review-list').appendChild(card);});}
 async function load(){
  $('loading').hidden=false;$('error').hidden=true;$('product-content').hidden=true;
  if(!id||id.includes('/')||id.length>1500){showError('Escolha uma peça na coleção para visualizar seus detalhes.');return;}
  try{
   const doc=await db.collection('produtos').doc(id).get();
   if(!doc.exists||doc.data().ativo!==true){showError('Esta peça não está disponível na coleção. Explore os outros produtos da loja.');return;}
   const data=doc.data();product={...data,id:doc.id,preco:Number(data.preco),nome:String(data.nome||'Peça Sheron Maison')};
   const inCart=SheronCart.read().filter(item=>item.produtoId===id).length;
   const stock=product.estoque==null?99:Math.max(0,Math.floor(Number(product.estoque)||0));
   limit=Number.isFinite(product.preco)&&product.preco>0?Math.max(0,Math.min(99,stock-inCart)):0;
   document.title=product.nome+' | Sheron Maison';$('product-name').textContent=product.nome;$('breadcrumb-name').textContent=product.nome;
   $('product-price').textContent=product.preco>0&&Number.isFinite(product.preco)?money(product.preco):'Preço sob consulta';
   $('product-description').textContent=typeof data.descricao==='string'&&data.descricao.trim()?data.descricao.trim():description(product.nome);
   $('availability').textContent=limit?'Disponível para adicionar à sacola':stock===0?'Produto esgotado':inCart>=stock?'As unidades disponíveis já estão na sua sacola.':'Produto indisponível';
   $('quantity').max=String(Math.max(1,limit));$('quantity').value='1';$('quantity').disabled=!limit;$('add-button').disabled=!limit;$('add-button').textContent=limit?'Adicionar à sacola':'Indisponível';
   const img=$('product-image');img.alt=product.alt||product.nome;img.hidden=false;$('image-fallback').hidden=true;
   img.onerror=()=>{img.hidden=true;$('image-fallback').hidden=false;};
   const src=String(product.imagem||'');if(/^https:\/\//i.test(src)||/^(\.\/)?Imagens utilizadas\//.test(src)||/^\/?images\//.test(src))img.src=src;else img.onerror();
   showReviews();update();$('loading').hidden=true;$('product-content').hidden=false;
  }catch{showError('Não conseguimos carregar os detalhes agora. Verifique sua conexão e tente novamente.',true);}
 }
 $('bag-count').textContent=SheronCart.read().length;
 $('decrease').onclick=()=>{$('quantity').value=String(Math.max(1,(Number($('quantity').value)||1)-1));update();};
 $('increase').onclick=()=>{$('quantity').value=String(Math.min(limit,(Number($('quantity').value)||0)+1));update();};
 $('quantity').addEventListener('input',()=>{$('quantity').setCustomValidity('');update();});$('retry').onclick=load;
 $('add-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!product||!limit)return;const q=Number($('quantity').value);
  if(!Number.isInteger(q)||q<1||q>limit){$('quantity').setCustomValidity('Escolha uma quantidade entre 1 e '+limit+'.');$('quantity').reportValidity();return;}
  busy=true;$('add-button').disabled=true;$('feedback').textContent='Conferindo a disponibilidade…';update();
  try{
   const snapshot=await db.collection('produtos').doc(id).get(),fresh=snapshot.data();
   const cart=SheronCart.read(),already=cart.filter(item=>item.produtoId===id).length;
   if(!snapshot.exists||fresh.ativo!==true||!Number.isFinite(Number(fresh.preco))||Number(fresh.preco)<=0)throw Error('Esta peça não está mais disponível.');
   if(fresh.estoque!=null&&already+q>Number(fresh.estoque))throw Error('O estoque mudou. Atualize a página para conferir a quantidade disponível.');
   for(let i=0;i<q;i++)cart.push({nome:String(fresh.nome||product.nome),preco:Number(fresh.preco),produtoId:id});
   SheronCart.write(cart);location.href='index.html#sacola';
  }catch(error){$('feedback').textContent=error.message?.includes('peça')||error.message?.includes('estoque')?error.message:'Não foi possível adicionar agora. Verifique a conexão e tente novamente.';busy=false;$('add-button').disabled=false;update();}
 });
 load();
})();

window.addEventListener('pageshow', function(event) { if(event.persisted) document.getElementById('bag-count').textContent = SheronCart.read().length; });

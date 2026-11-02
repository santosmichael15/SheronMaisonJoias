(function(){'use strict';window.SheronProducts={attach(card,product){for(const element of [card.querySelector('.img-container'),card.querySelector('h3')]){if(!element)continue;const link=document.createElement('a');link.className='product-detail-trigger';link.href='produto.html?id='+encodeURIComponent(product.id);link.setAttribute('aria-label','Ver detalhes de '+product.nome);element.replaceWith(link);link.appendChild(element);}}};})();

(function(){
 'use strict';
 const search=document.getElementById('product-search'),filters=document.getElementById('category-filters'),result=document.getElementById('catalog-result');
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 let category='';
 const cards=()=>[...document.querySelectorAll('#grid-produtos .produto-card')];
 function filter(){let count=0;for(const card of cards()){const show=(!category||card.dataset.category===category)&&normalize(card.querySelector('h3')?.textContent).includes(normalize(search.value));card.hidden=!show;if(show)count++;}result.textContent=count?`${count} peça${count===1?'':'s'} encontrada${count===1?'':'s'}`:'Nenhuma peça encontrada. Tente outra busca ou categoria.';}
 window.refreshCatalogFilters=()=>{const categories=[...new Set(cards().map(c=>c.dataset.category).filter(Boolean))].sort();if(!categories.includes(category))category='';filters.replaceChildren();for(const value of ['',...categories]){const button=document.createElement('button');button.type='button';button.textContent=value||'Todas';button.setAttribute('aria-pressed',String(category===value));button.onclick=()=>{category=value;for(const item of filters.children)item.setAttribute('aria-pressed',String(item===button));filter();};filters.appendChild(button);}filter();};
 search.addEventListener('input',filter);window.refreshCatalogFilters();
 const carousel=document.querySelector('.diversity-carousel'),images=[...carousel.querySelectorAll('.diversity-slide')],position=document.getElementById('diversity-position'),pause=carousel.querySelector('[data-diversity=pause]');
 let active=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function show(){images.forEach((img,i)=>{img.classList.toggle('is-active',i===active);img.inert=i!==active;img.setAttribute('aria-hidden',String(i!==active));});position.textContent=`${active+1} / ${images.length}`;pause.textContent=paused?'Retomar':'Pausar';pause.setAttribute('aria-pressed',String(paused));}
 function move(n){active=(active+n+images.length)%images.length;show();}
 carousel.querySelector('[data-diversity=previous]').onclick=()=>move(-1);
 carousel.querySelector('[data-diversity=next]').onclick=()=>move(1);
 pause.onclick=()=>{paused=!paused;show();};
 setInterval(()=>{if(!paused&&!document.hidden&&!carousel.matches(':hover')&&!carousel.contains(document.activeElement))move(1);},5000);
 show();
})();

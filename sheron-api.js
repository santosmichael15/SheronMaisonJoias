(function (root) {
  'use strict';
  const BASE_URL = 'https://sheronmaison-api-pim-accbdaend7fmgbdt.centralus-01.azurewebsites.net';
  function createClient(fetcher = root.fetch.bind(root), timeout = 15000) {
    async function get(path) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetcher(BASE_URL + path, {
          method: 'GET', headers: { Accept: 'application/json' },
          credentials: 'omit', cache: 'no-store', signal: controller.signal
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Serviço indisponível (HTTP ' + response.status + ').');
        return await response.json();
      } finally { clearTimeout(timer); }
    }
    function product(value) {
      if (!value || typeof value.id !== 'string' || !value.id ||
          typeof value.nome !== 'string' || typeof value.ativo !== 'boolean' ||
          !Number.isFinite(value.preco) || !Number.isInteger(value.estoque) || value.estoque < 0) {
        throw new Error('Resposta de produto inválida.');
      }
      return value;
    }
    async function listProducts() {
      const items = new Map(), cursors = new Set();
      let cursor = '';
      for (let page = 0; page < 100; page++) {
        const result = await get('/api/v1/produtos?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
        if (!result || !Array.isArray(result.items) || typeof result.hasNext !== 'boolean') throw new Error('Resposta do catálogo inválida.');
        for (const value of result.items) {
          const item = product(value);
          if (item.ativo) items.set(item.id, item);
        }
        if (!result.hasNext) return Array.from(items.values());
        if (typeof result.nextCursor !== 'string' || !result.nextCursor || cursors.has(result.nextCursor)) throw new Error('Paginação do catálogo inválida.');
        cursor = result.nextCursor; cursors.add(cursor);
      }
      throw new Error('O catálogo excedeu o limite de páginas.');
    }
    async function getProduct(id) {
      if (typeof id !== 'string' || !id || id.includes('/') || id.length > 1500) throw new Error('Identificador de produto inválido.');
      const result = await get('/api/v1/produtos/' + encodeURIComponent(id));
      if (result === null) return null;
      const item = product(result);
      if (item.id !== id) throw new Error('Produto diferente do solicitado.');
      return item.ativo ? item : null;
    }
    return Object.freeze({ listProducts, getProduct });
  }
  root.SheronApi = createClient();
  if (typeof module !== 'undefined' && module.exports) module.exports = { createClient, BASE_URL };
})(globalThis);

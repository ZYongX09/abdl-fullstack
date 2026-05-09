// api/lib/router.js — 简易 URL 路由器（path + method → handler）
function router() {
  const routes = [];
  return {
    get(p, h) { routes.push({method:'GET',pattern:new URLPattern({pathname:p}),handler:h}); return this; },
    post(p, h) { routes.push({method:'POST',pattern:new URLPattern({pathname:p}),handler:h}); return this; },
    patch(p, h) { routes.push({method:'PATCH',pattern:new URLPattern({pathname:p}),handler:h}); return this; },
    del(p, h) { routes.push({method:'DELETE',pattern:new URLPattern({pathname:p}),handler:h}); return this; },
    async handle(req, res) {
      const url = new URL(req.url, 'http://localhost');
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.pattern.exec(url);
        if (m) {
          req.params = m.pathname.groups;
          req.query = Object.fromEntries(url.searchParams);
          try { return await r.handler(req, res); }
          catch(e) { return res.status(500).json({error:e.message}); }
        }
      }
      res.status(404).json({error:'Not found'});
    }
  };
}
module.exports = { router };

//NOTE(@jimmylee)
//Public names for the routes in three-isometric-engine/web/routes.js. A .md path serves the same relative path
//as the repository, so a link in SKILL.md works in a checkout and on the site. `/` answers an agent that asks
//for markdown with llms.txt: it runs before the page, and every other rule runs after it.
const SITE_FILES = ['llms.txt', 'llms-full.txt', 'index.md', 'index.html.md', 'robots.txt', 'sitemap.xml', 'openapi.json'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},
  // AGENTS.md is written by hand; next dev would otherwise add its own block to it.
  agentRules: false,
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }], destination: '/index.md' }],
      afterFiles: [...SITE_FILES.map((file) => ({ source: `/${file}`, destination: `/api/site/${file}` })), { source: '/.well-known/agent-skills/:file*', destination: '/api/site/.well-known/agent-skills/:file*' }, { source: '/assets/:file*', destination: '/api/site/assets/:file*' }, { source: '/:path*/:file([^/]+\\.md)', destination: '/api/site/:path*/:file' }],
      fallback: [],
    };
  },
  async headers() {
    return [{ source: '/', headers: [{ key: 'Link', value: '</index.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"' }, { key: 'Vary', value: 'Accept' }] }];
  },
};

module.exports = nextConfig;

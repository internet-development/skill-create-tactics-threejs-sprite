import path from 'path';

//NOTE(@jimmylee)
//Runs bake.test.js against a checkout of Set, which is read and never written. `SET_REPOSITORY` points at
//it, and three comes from there so the models are the ones Set builds. meshoptimizer is a tool of this
//bake and not a dependency of the page: npm install --no-save meshoptimizer.
const SET = path.resolve(process.env.SET_REPOSITORY ?? path.join(import.meta.dirname, '../../../www-set'));
const folder = (name, dir) => ({ find: new RegExp(`^${name}/(.*)$`), replacement: path.join(SET, dir) + '/$1' });

export default {
  root: import.meta.dirname,
  cacheDir: path.join(import.meta.dirname, '../../node_modules/.cache/bake-set-items'),
  resolve: {
    alias: [
      folder('@engine', 'three-isometric-engine'),
      folder('@common', 'common'),
      folder('@sets', 'sets'),
      folder('@traits', 'traits'),
      folder('@components', 'components'),
      folder('@database', 'database'),
      folder('@modules', 'modules'),
      folder('@root', ''),
      { find: /^three\/addons\/(.*)$/, replacement: path.join(SET, 'node_modules/three/examples/jsm') + '/$1' },
      { find: /^three$/, replacement: path.join(SET, 'node_modules/three/build/three.module.js') },
    ],
  },
  server: { fs: { strict: false } },
  test: { environment: 'node', include: ['bake.test.js'], maxWorkers: 1, server: { deps: { inline: true } } },
};

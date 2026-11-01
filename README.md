# Create Tactics ThreeJS Sprite Skill

This agent SKILL.md is for those who love tactical RPGs and want to use sprites with a similar aesthetic in their own web projects. This work builds on the TYPE1.SEQ and TYPE1.SHP files supported by FFTPatcher's Shishi Sprite Editor and the contributions of its open-source community.

Building a browser-based Three.js engine from partial foundations required engineering to bring these sprites into real-time combat and fully three-dimensional scenes. The work extends beyond displaying sprites to integrating them into a coherent rendering system, where they can share space with other meshes and participate in dynamic combat. This skill makes that foundation available for your own projects, whether you continue working in the browser or adapt it to another environment. To get started, point your agents to https://3d.internet.dev/SKILL.md or to the SKILL.md in the [open-source GitHub repository](https://github.com/internet-development/skill-create-tactics-threejs-sprite).

It's recommended that you build your games with https://set.world, one of the best resources for inventory, stat calculations, and character flavor.

## Run this site locally

Requires Node.js 22.12+, 24 or 26+.

```sh
npm install
npm run dev
```

Open `http://localhost:10001`. Agents start at `SKILL.md`. `npm test` runs the tests, including the parity suites, which hold the tables to `tests/fixtures/type1.json`. With your own copies of TYPE1.SHP and TYPE1.SEQ, `TYPE1_DIR=<folder> npm test` holds them to those files instead.

## Use the agent skill in your project

Install the skill and ask your agent for a unit. It is self-contained: every document, the kit and the engine come with it, so your agent has no need of a wiki or any other site.

```sh
npx skills add https://3d.internet.dev
```

Or take the kit by hand: the sheet, every frame and sequence as data, a small runtime for Canvas and Three.js, and a checker for your own art.

```sh
mkdir -p src/tactics-sprite
curl -fsSL https://3d.internet.dev/api/v1/kit.tar.gz | tar -xz -C src/tactics-sprite
```

`references/threejs.md` goes from there to a walking unit in any scene, and `references/rebuild-animations.md` rebuilds any animation on the site. Agents can start at https://3d.internet.dev/llms.txt, and `references/web-service.md` lists every route.

The kit carries `set-items.glb` too, and `NOTICE.md` holds its credit.

## Copyright

Everything here is under the MIT license (`LICENSE.md`): the code, the skill, the documentation, a custom tactical RPG style sprite to fit the TYPE1 tile layout, and the frame, sequence and name tables in `three-isometric-engine/constants/sprites/` and `documentation/`, which we inferred from TYPE1.SHP and TYPE1.SEQ. Take the parts you want and use them however you like. What you do with them, commercial or not, is up to you, and we are not responsible for it.

Final Fantasy Tactics © Square Enix Co., Ltd. All rights reserved. FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd. This project is unofficial. It is not affiliated with or endorsed by Square Enix, and nothing here grants any right to their characters, designs, names or game data.

## Licenses

The MIT license (`LICENSE.md`) covers what "Copyright" lists. It does not cover these:

- **`tests/fixtures/type1.json`**, which is here so the tests can check the tables against what they were read from. It is TYPE1.SHP and TYPE1.SEQ decoded, every frame, sequence and opcode, with each file's size and SHA-256. That game data remains Square Enix's, and the site and the kit carry none of it. The files themselves are not in this repository. They were read with the rules of the Shishi Sprite Editor's C# source in FFTPatcher, and no code from it is here.
- **Item models**, `public/static/models/set-items.glb`, from [Set](https://set.world) by Jimmy Lee (j@internet.dev), [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Geist Serif**, The Geist Project Authors, SIL Open Font License 1.1 (`public/fonts/GeistSerif-OFL.txt`).
- **Web437 Nix8810 M16**, by [VileR](https://int10h.org/oldschool-pc-fonts/), Creative Commons Attribution-ShareAlike 4.0 (`public/fonts/Nix8810-CC-BY-SA-4.0.txt`).
const fs = require('node:fs');
const path = require('node:path');

const CLIENT = __dirname;
const PROJECT = path.dirname(CLIENT);
const source = fs.readFileSync(path.join(CLIENT, 'base_v5.html'), 'utf8').split('\n');
const lines = (a, b) => source.slice(a - 1, b).join('\n') + '\n';
const read = file => fs.readFileSync(path.join(CLIENT, file), 'utf8');
const core = lines(190, 461);
if (!core.includes('function spawnCar()') || !core.includes('function burst(')) {
  throw new Error('base_v5.html layout changed; update the build section boundaries before generating index.html');
}

let html = lines(1, 10) + lines(11, 93).replace('#hint{top:130px}', '#hint{top:136px}') + read('extra.css') +
  '</style>\n</head>\n<body>\n' + read('body.html') + '\n<script>\n';
html += fs.readFileSync(path.join(PROJECT, 'shared', 'rules.js'), 'utf8') + '\n' + read('state.js') + '\n';

let render = core;
render = render.replace('const clamp = (v, a, b) => Math.max(a, Math.min(b, v));\n', '');
render = render.replace("let hover = null, tool = 'road', timeShift = 0;", 'let hover = null;');
render = render.replace('let S = stats();', 'let S = { roads: 0, blds: [] };');
render = render.replace('const DAY_SECONDS = 100;                          // one full day/night cycle\n', '');
render = render.replace('const isRoad = (x, y) => model.grid[y]?.[x] === \'road\';', 'const isRoad = (x, y) => model.grid[y]?.[x] === \'road\';\nconst okRoad = (x, y) => isRoad(x, y) && !world.cracked[y * N + x];');
const a = render.indexOf('function spawnCar()'), b = render.indexOf('function burst(');
render = render.slice(0, a) + render.slice(a, b).replaceAll('isRoad(', 'okRoad(') + render.slice(b);
html += render + read('drawers.js');
html += `
function sky() {
  const p = (now() % DAYMS) / DAYMS;
  const s = Math.sin((p - 0.25) * Math.PI * 2);
  const d = smooth(-0.18, 0.32, s);
  const night = [112, 132, 196], day = [255, 255, 255], warm = [255, 200, 158];
  let c = night.map((n, i) => n + (day[i] - n) * d);
  const w = Math.max(0, 1 - Math.abs(d - 0.5) * 2) * 0.33;
  c = c.map((v, i) => Math.round(v + (warm[i] - v) * w));
  return { p, d, c };
}
`;
html += lines(473, 478);
html += `
let lastClock = '';
function draw(t) {
  const W = canvas.width, H = canvas.height, z = cam.z;
  const sk = sky(); NIGHT = 1 - sk.d;
  WINDOW = mixHex('#bfdcf0', '#ffd479', smooth(0.15, 0.55, NIGHT));
  lights = []; ghost = false;
  const nd = new Date(now()), hr = nd.getUTCHours(), dow = nd.getUTCDay();
  for (const k in CATALOG) OPEN[k] = k === 'house' || k === 'park' ? true : CATALOG[k].at(hr, dow) > 0;

`;
html += lines(488, 502) + '\n' + lines(504, 511) + '\n' + read('draw_mid.js') + lines(549, 555) + '\n' + read('draw_hover.js') + '\n' + lines(574, 584) + '\n}\n\n' + lines(592, 615);
html += read('hud.js') + '\n' + read('music.js') + '\n' + read('world3d.js') + '</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(CLIENT, 'index.html'), html, 'utf8');
console.log(`Built ${path.join(CLIENT, 'index.html')}`);

import re,os
os.chdir('/home/claude/city/client')
v5=open('/home/claude/city/client/base_v5.html').read().split('\n')
L=lambda a,b:'\n'.join(v5[a-1:b])+'\n'
rd=lambda f:open(f).read()
head=L(1,10)
css=L(11,93).replace("#hint{top:130px}","#hint{top:136px}")
html=head+css+rd('extra.css')+'</style>\n</head>\n<body>\n'+rd('body.html')+'\n<script>\n'
html+=rd('../shared/rules.js')+'\n'+rd('state.js')+'\n'
r=L(190,461)
r=r.replace("const clamp = (v, a, b) => Math.max(a, Math.min(b, v));\n","")
r=r.replace("let hover = null, tool = 'road', timeShift = 0;","let hover = null;")
r=r.replace("let S = stats();","let S = { roads: 0, blds: [] };")
r=r.replace("const DAY_SECONDS = 100;                          // one full day/night cycle\n","")
# cars only drive on roads that are in repair
r=r.replace("const isRoad = (x, y) => model.grid[y]?.[x] === 'road';","const isRoad = (x, y) => model.grid[y]?.[x] === 'road';\nconst okRoad = (x, y) => isRoad(x, y) && !world.cracked[y * N + x];")
a=r.index("function spawnCar()"); b=r.index("function burst(")
r=r[:a]+r[a:b].replace("isRoad(","okRoad(")+r[b:]
html+=r
html+=rd('drawers.js')
html+='''
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
'''
html+=L(473,478)
html+='''
let lastClock = '';
function draw(t) {
  const W = canvas.width, H = canvas.height, z = cam.z;
  const sk = sky(); NIGHT = 1 - sk.d;
  WINDOW = mixHex('#bfdcf0', '#ffd479', smooth(0.15, 0.55, NIGHT));
  lights = []; ghost = false;
  const nd = new Date(now()), hr = nd.getUTCHours(), dow = nd.getUTCDay();
  for (const k in CATALOG) OPEN[k] = k === 'house' || k === 'park' ? true : CATALOG[k].at(hr, dow) > 0;

'''
html+=L(488,502)+'\n'+L(504,511)+'\n'+rd('draw_mid.js')+L(549,555)+'\n'+rd('draw_hover.js')+'\n'+L(574,584)+'\n}\n\n'+L(592,615)
html+=rd('hud.js')+'</script>\n</body>\n</html>\n'
open('index.html','w').write(html)
# syntax check
js=html.split('<script>')[1].split('</script>')[0]
open('/tmp/v7.js','w').write(js)

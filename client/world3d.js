/* Accrawedey 3D Life World — lightweight WebGL, no external engine. */
(() => {
  const canvas=document.getElementById('world3d'); if(!canvas) return;
  const hud=document.getElementById('life3d'), districtEl=document.getElementById('lifeDistrict'), promptEl=document.getElementById('lifePrompt');
  const modeBtn=document.getElementById('worldMode'), mapBtn=document.getElementById('worldMap');
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false}); if(!gl){return;}
  const vs=`attribute vec3 p;uniform mat4 mvp;void main(){gl_Position=mvp*vec4(p,1.0);}`;
  const fs=`precision mediump float;uniform vec3 c;void main(){gl_FragColor=vec4(c,1.0);}`;
  const prog=gl.createProgram(), sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;};
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);
  const locP=gl.getAttribLocation(prog,'p'), locM=gl.getUniformLocation(prog,'mvp'), locC=gl.getUniformLocation(prog,'c');
  const cube=new Float32Array([-1,-1,-1,1,-1,-1,1,1,-1,-1,1,-1,-1,-1,1,1,-1,1,1,1,1,-1,1,1]);
  const idx=new Uint16Array([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4]);
  const vb=gl.createBuffer(), ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,cube,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);gl.enableVertexAttribArray(locP);gl.vertexAttribPointer(locP,3,gl.FLOAT,false,0,0);
  const mat=(a)=>{const [sx,sy,sz,tx,ty,tz]=a;return new Float32Array([sx,0,0,0,0,sy,0,0,0,0,sz,0,tx,ty,tz,1]);};
  // Named Greater Accra locations. These are gameplay districts/landmarks, not generic blocks.
  const sites=[
    {id:'jamestown',name:'Jamestown',type:'Culture',x:-16,z:14,color:[.58,.34,.18],act:'culture'},
    {id:'makola',name:'Makola Market',type:'Food & Market',x:-10,z:12,color:[.72,.33,.18],act:'eat'},
    {id:'adabraka',name:'Adabraka',type:'Residential',x:-5,z:11,color:[.30,.38,.55],act:'social'},
    {id:'ridge',name:'Ridge',type:'Civic & Business',x:1,z:12,color:[.24,.39,.58],act:'work'},
    {id:'osu',name:'Osu · Oxford Street',type:'Social & Nightlife',x:8,z:10,color:[.18,.42,.72],act:'social'},
    {id:'labone',name:'Labone',type:'Lifestyle',x:14,z:7,color:[.43,.30,.57],act:'relax'},
    {id:'cantonments',name:'Cantonments',type:'Residential',x:19,z:11,color:[.35,.43,.62],act:'sleep'},
    {id:'airport',name:'Airport City',type:'Work & Business',x:14,z:1,color:[.22,.38,.62],act:'work'},
    {id:'airportres',name:'Airport Residential Area',type:'Residential',x:9,z:-3,color:[.37,.31,.56],act:'sleep'},
    {id:'romanridge',name:'Roman Ridge',type:'Residential',x:3,z:-3,color:[.34,.39,.54],act:'sleep'},
    {id:'ach',name:'Achimota',type:'Education & Residential',x:-7,z:-2,color:[.25,.48,.38],act:'culture'},
    {id:'circle',name:'Circle · Kwame Nkrumah Circle',type:'Transport',x:-16,z:3,color:[.75,.55,.12],act:'travel'},
    {id:'kaneshie',name:'Kaneshie',type:'Market & Transport',x:-22,z:-2,color:[.62,.38,.19],act:'eat'},
    {id:'dansoman',name:'Dansoman',type:'Residential',x:-25,z:-10,color:[.34,.47,.37],act:'social'},
    {id:'labadi',name:'Labadi Beach',type:'Leisure',x:15,z:-11,color:[.10,.48,.46],act:'relax'},
    {id:'la',name:'La',type:'Coastal Community',x:9,z:-9,color:[.38,.43,.31],act:'social'},
    {id:'teshie',name:'Teshie',type:'Residential',x:23,z:-12,color:[.39,.35,.50],act:'social'},
    {id:'nungua',name:'Nungua',type:'Market & Residential',x:28,z:-7,color:[.62,.40,.20],act:'eat'},
    {id:'spintex',name:'Spintex',type:'Commerce & Industry',x:25,z:2,color:[.35,.42,.48],act:'work'},
    {id:'eastlegon',name:'East Legon',type:'Home & Lifestyle',x:-1,z:-11,color:[.42,.28,.58],act:'sleep'},
    {id:'shiashie',name:'Shiashie',type:'Business & Lifestyle',x:-7,z:-14,color:[.26,.45,.56],act:'work'},
    {id:'madina',name:'Madina',type:'Market & Transport',x:-14,z:-16,color:[.65,.38,.18],act:'eat'},
    {id:'legon',name:'Legon · University Area',type:'Education',x:-2,z:-19,color:[.22,.48,.35],act:'culture'},
    {id:'northlegon',name:'North Legon',type:'Residential',x:7,z:-18,color:[.34,.30,.55],act:'sleep'},
    {id:'hisa',name:'Haatso',type:'Residential',x:-21,z:-20,color:[.31,.44,.35],act:'social'},
    {id:'westlands',name:'Westlands',type:'Business & Lifestyle',x:8,z:17,color:[.27,.39,.58],act:'work'},
    {id:'kokomlemle',name:'Kokomlemle',type:'Residential & Social',x:-9,z:18,color:[.44,.35,.49],act:'social'},
    {id:'tesano',name:'Tesano',type:'Residential',x:-19,z:18,color:[.31,.43,.48],act:'sleep'},
    {id:'abeka',name:'Abeka',type:'Residential',x:-25,z:13,color:[.31,.48,.36],act:'social'},
    {id:'tema',name:'Tema',type:'Port & Industrial City',x:29,z:16,color:[.32,.40,.46],act:'work'},
    {id:'tema_comm',name:'Tema Community 1',type:'Residential & Market',x:25,z:21,color:[.50,.40,.26],act:'eat'},
    {id:'prampram',name:'Prampram',type:'Coastal Leisure',x:29,z:-21,color:[.14,.46,.42],act:'relax'},
    {id:'trotro',name:'Trotro Interchange',type:'Transport',x:0,z:2,color:[.75,.55,.12],act:'travel'}
  ];
  const pos={x:0,z:0}, keys={}, others=new Map(); let yaw=.55,pitch=.62,dist=14,dragging=false,lx=0,ly=0,lastSend=0,lastAct=0,active=true,clock={};
  const life=()=>window.lifeState||{hunger:72,energy:70,fun:55,social:45,hygiene:65,bladder:40};
  const act=(a)=>{if(window.doLifeAction)window.doLifeAction(a);};
  function toast(t){if(!promptEl)return;promptEl.textContent=t;promptEl.classList.add('show');clearTimeout(promptEl._t);promptEl._t=setTimeout(()=>promptEl.classList.remove('show'),2400);}
  function resize(){const d=Math.min(2,devicePixelRatio||1),w=Math.floor(innerWidth*d),h=Math.floor(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}}
  function proj(){const a=canvas.width/canvas.height,f=1/Math.tan(.55),n=.1,far=60;const p=new Float32Array(16);p[0]=f/a;p[5]=f;p[10]=(far+n)/(n-far);p[11]=-1;p[14]=2*far*n/(n-far);const cx=pos.x+Math.sin(yaw)*Math.cos(pitch)*dist,cy=Math.sin(pitch)*dist+4,cz=pos.z+Math.cos(yaw)*Math.cos(pitch)*dist;const tx=pos.x,ty=.7,tz=pos.z;let zx=cx-tx,zy=cy-ty,zz=cz-tz,l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=zz,xy=0,xz=-zx,l2=Math.hypot(xx,xz);xx/=l2;xz/=l2;const yx=xy*zz-xz*zy,yy=xz*zx-xx*zz,yz=xx*zy-xy*zx;const v=new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*tx+xy*ty+xz*tz),-(yx*tx+yy*ty+yz*tz),-(zx*tx+zy*ty+zz*tz),1]);const m=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)m[c*4+r]=v[r]*p[c*4]+v[4+r]*p[c*4+1]+v[8+r]*p[c*4+2]+v[12+r]*p[c*4+3];return m;}
  function draw(x,y,z,sx,sy,sz,c){gl.uniformMatrix4fv(locM,false,mat([sx,sy,sz,x,y,z]));gl.uniform3fv(locC,new Float32Array(c));gl.drawElements(gl.TRIANGLES,36,gl.UNSIGNED_SHORT,0)}
  function nearest(){let best=null,bd=3.1;for(const s of sites){const d=Math.hypot(s.x-pos.x,s.z-pos.z);if(d<bd){bd=d;best=s}}return best}
  function update(dt,t){let dx=0,dz=0;if(keys.w||keys.arrowup)dz-=1;if(keys.s||keys.arrowdown)dz+=1;if(keys.a||keys.arrowleft)dx-=1;if(keys.d||keys.arrowright)dx+=1;if(dx||dz){const l=Math.hypot(dx,dz);dx/=l;dz/=l;const c=Math.cos(yaw),s=Math.sin(yaw);pos.x+=(dx*c-dz*s)*dt*4.4;pos.z+=(dx*s+dz*c)*dt*4.4;pos.x=Math.max(-31,Math.min(31,pos.x));pos.z=Math.max(-24,Math.min(24,pos.z));if(t-lastSend>120&&window.sendLifePosition){window.sendLifePosition(pos.x,pos.z);lastSend=t;}}}
  function render(t){resize();update(Math.min(.04,(t-(clock.t||t))/1000),t);clock.t=t;gl.clearColor(.025,.055,.095,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.uniformMatrix4fv(locM,false,proj());
    draw(0,-.35,0,33,.35,26,[.08,.20,.18]);
    draw(0,.02,0,32,.05,2,[.07,.09,.12]);draw(0,.03,0,2,.05,25,[.07,.09,.12]);
    for(let i=-30;i<=30;i+=4){draw(i,.05,0,.035,.02,1.3,[.75,.62,.25]);} for(let i=-23;i<=23;i+=4){draw(0,.05,i,1.3,.02,.035,[.75,.62,.25]);}
    for(let i=0;i<sites.length;i++){const s=sites[i],h=1.4+(i%3)*.6;draw(s.x,h/2,s.z,1.7,h,1.7,s.color);draw(s.x,h+.13,s.z,1.02,.08,1.02,[.96,.74,.25]);}
    for(let i=-30;i<=30;i+=3){const h=1.4+(Math.abs(i)%7)*.38;draw(i,h/2,-23,1.05,h,1.05,[.12,.23,.35]);}
    // coastal strip and denser Accra skyline/buildings
    for(let i=-28;i<=28;i+=4){draw(i,.12,-22,.9,.08,1.6,[.10,.30,.32]);}
    for(let i=0;i<sites.length;i++){const s=sites[i]; for(let j=0;j<2;j++){const ox=(j?-.0:.0)+(i%3-1)*1.8, oz=(j?2.2:-2.0); const h=1.1+((i*3+j)%5)*.55; draw(s.x+ox,h/2,s.z+oz,.62,h,.62,[.16,.25,.34]);}}
    for(let i=0;i<20;i++){const x=((i*7)%25)-12,z=((i*11)%23)-11;draw(x,.5,z,.18,.8,.18,[.25,.14,.07]);draw(x,1.25,z,.62,.62,.62,[.08,.35,.18]);}
    // other players
    for(const p of others.values()){draw(p.x,.52,p.z,.32,.9,.32,[.56,.22,.38]);draw(p.x,1.55,p.z,.4,.4,.4,[.55,.32,.2]);}
    const bob=Math.sin(t*.006)*.025;draw(pos.x,.52+bob,pos.z,.34,.92,.34,[.10,.30,.62]);draw(pos.x,1.52+bob,pos.z,.42,.42,.42,[.48,.29,.18]);draw(pos.x,1.78+bob,pos.z-.02,.46,.25,.46,[.03,.025,.02]);
    const n=nearest();districtEl.textContent=n?n.name:'Accra · Free roam';const L=life();const q=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};q('needH','Hunger '+Math.round(L.hunger));q('needE','Energy '+Math.round(L.energy));q('needF','Fun '+Math.round(L.fun));q('needS','Social '+Math.round(L.social));requestAnimationFrame(render);
  }
  function onKey(e){const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){keys[k]=e.type==='keydown';e.preventDefault();}if(k==='e'&&e.type==='keydown'){const n=nearest();if(n&&Date.now()-lastAct>500){lastAct=Date.now();act(n.act);toast(`${n.name} · ${n.type}`)}}}
  addEventListener('keydown',onKey);addEventListener('keyup',onKey);
  canvas.addEventListener('pointerdown',e=>{dragging=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lx)*.008;pitch-=(e.clientY-ly)*.006;pitch=Math.max(.28,Math.min(1.22,pitch));lx=e.clientX;ly=e.clientY});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('wheel',e=>{dist=Math.max(8,Math.min(26,dist+e.deltaY*.01));e.preventDefault()},{passive:false});
  modeBtn?.addEventListener('click',()=>{active=!active;canvas.classList.toggle('off',!active);modeBtn.textContent=active?'City Builder':'3D Life';});
  let exploreIndex=-1;
  mapBtn?.addEventListener('click',()=>{exploreIndex=(exploreIndex+1)%sites.length;const n=sites[exploreIndex];pos.x=n.x;pos.z=n.z+2;toast(`Arrived at ${n.name} · ${n.type}`)});
  window.addEventListener('lifePlayers',e=>{for(const p of (e.detail||[]))if(p.id!==window.meId)others.set(p.id,p)});
  window.addEventListener('lifePlayer',e=>{const p=e.detail;if(p&&p.id!==window.meId)others.set(p.id,p)});
  window.addEventListener('lifeGone',e=>others.delete(e.detail));window.addEventListener('resize',resize);resize();requestAnimationFrame(render);
})();

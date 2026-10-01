'use client';
import {useEffect,useRef,RefObject} from 'react';
import * as THREE from 'three';
import {BattleEvent} from './battle';
import {HEROES,FACTION_COLOR} from './data';
import {actionTiming,poseFor,deformVertex,worldPosition,weaponStyle,clamp,smooth,motionTime} from './choreography';
import {ELEMENT_COLORS} from './effects';
interface Props{event:BattleEvent;index:number;clock:RefObject<number>;paused:boolean;reduced:boolean;cinematic:boolean;overlay:RefObject<HTMLDivElement|null>;onReady:(ready:boolean)=>void;onError:()=>void}
type Actor={group:THREE.Group;body:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;base:Float32Array;shadow:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;ring:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;shield:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>};
export default function BattleStage(props:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef(props);live.current=props;
 useEffect(()=>{
  const root=host.current;if(!root)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{live.current.onError();return;}
  let disposed=false,raf=0,width=1,height=1,lastFrame=0,lastIndex=-1;
  renderer.setClearColor(0x061a22,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.35:1.8));root.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',lost);
  function lost(e:Event){e.preventDefault();live.current.onReady(false);live.current.onError();cancelAnimationFrame(raf);}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,80);scene.fog=new THREE.FogExp2(0x0a2128,.026);
  scene.add(new THREE.HemisphereLight(0xc6e8df,0x14202c,2));const light=new THREE.DirectionalLight(0xffe9bb,3.2);light.position.set(-5,12,8);scene.add(light);const rim=new THREE.DirectionalLight(0x64c9d6,1.8);rim.position.set(7,4,-5);scene.add(rim);
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[],textures:THREE.Texture[]=[];
  const keepG=<T extends THREE.BufferGeometry>(g:T)=>{geometries.push(g);return g;},keepM=<T extends THREE.Material>(m:T)=>{materials.push(m);return m;};
  // A real lit, raised 3D battle platform; original city artwork remains the distant backdrop.
  const floor=new THREE.Mesh(keepG(new THREE.CylinderGeometry(7.45,7.7,.45,72)),[keepM(new THREE.MeshStandardMaterial({color:0x122b32,roughness:.72,metalness:.3})),keepM(new THREE.MeshStandardMaterial({color:0x203a3d,roughness:.8})),keepM(new THREE.MeshStandardMaterial({color:0x081d25}))]);floor.position.y=-.29;scene.add(floor);
  for(const r of [6.7,7.38]){const ring=new THREE.Mesh(keepG(new THREE.RingGeometry(r-.025,r+.025,80)),keepM(new THREE.MeshBasicMaterial({color:r>7?0xc7aa71:0x729b92,transparent:true,opacity:r>7?.64:.28,side:THREE.DoubleSide})));ring.rotation.x=-Math.PI/2;ring.position.y=-.049;scene.add(ring);}
  const grid=new THREE.GridHelper(14,14,0x8b9c87,0x405e5d);grid.position.y=-.055;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.17;scene.add(grid);geometries.push(grid.geometry);materials.push(grid.material as THREE.Material);
  const lineG=keepG(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.048,-6),new THREE.Vector3(0,-.048,6)]));scene.add(new THREE.Line(lineG,keepM(new THREE.LineDashedMaterial({color:0xadb891,transparent:true,opacity:.3,dashSize:.25,gapSize:.3}))).computeLineDistances());
  const loader=new THREE.TextureLoader(),actors=new Map<string,Actor>(),cache=new Map<number,THREE.Texture>();
  for(const u of props.event.units){
   let map=cache.get(u.hero);if(!map){map=loader.load(`/art/characters/hero-${u.hero}.webp`,()=>{if(!disposed)renderer.render(scene,camera);},undefined,()=>{if(!disposed){live.current.onReady(false);live.current.onError();}});map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.push(map);cache.set(u.hero,map);}
   const group=new THREE.Group(),geo=keepG(new THREE.PlaneGeometry(2.25,3,12,18));geo.translate(0,1.35,0);const base=new Float32Array(geo.attributes.position.array);
   const body=new THREE.Mesh(geo,keepM(new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.035,depthWrite:true,side:THREE.DoubleSide,color:0xffffff})));body.scale.x=u.side===0?1:-1;body.rotation.x=-.12;group.add(body);scene.add(group);
   const shadow=new THREE.Mesh(keepG(new THREE.CircleGeometry(.63,32)),keepM(new THREE.MeshBasicMaterial({color:0x000a0d,transparent:true,opacity:.42,depthWrite:false})));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.57,1);scene.add(shadow);
   const ring=new THREE.Mesh(keepG(new THREE.RingGeometry(.61,.66,40)),keepM(new THREE.MeshBasicMaterial({color:FACTION_COLOR[HEROES[u.hero].faction],transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false})));ring.rotation.x=-Math.PI/2;scene.add(ring);
   const shield=new THREE.Mesh(keepG(new THREE.SphereGeometry(1.05,16,12)),keepM(new THREE.MeshBasicMaterial({color:0x98efff,transparent:true,opacity:.1,wireframe:true,depthWrite:false})));shield.scale.set(.85,1.45,.55);shield.position.y=1.2;group.add(shield);
   actors.set(u.uid,{group,body,base,shadow,ring,shield});
  }
  const fx=new THREE.Group();scene.add(fx);
  const slash=new THREE.Mesh(keepG(new THREE.RingGeometry(.85,1.18,40,1,-.6,2.5)),keepM(new THREE.MeshBasicMaterial({color:0xe6fff0,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(slash);
  const slash2=new THREE.Mesh(keepG(new THREE.RingGeometry(1.14,1.18,40,1,-.6,2.5)),keepM(new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(slash2);
  const thrust=new THREE.Mesh(keepG(new THREE.ConeGeometry(.095,2.2,10)),keepM(new THREE.MeshBasicMaterial({color:0xd7fff8,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(thrust);
  const wave=new THREE.Mesh(keepG(new THREE.RingGeometry(.75,.9,50)),keepM(new THREE.MeshBasicMaterial({color:0xf3cb85,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})));wave.rotation.x=-Math.PI/2;fx.add(wave);
  const sparkCount=innerWidth<700?18:32,sparkG=keepG(new THREE.BufferGeometry()),sparkPositions=new Float32Array(sparkCount*3);sparkG.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));const sparks=new THREE.Points(sparkG,keepM(new THREE.PointsMaterial({color:0xffdea0,size:.045,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})));fx.add(sparks);
  const projectile=new THREE.Mesh(keepG(new THREE.SphereGeometry(.12,8,8)),keepM(new THREE.MeshBasicMaterial({color:0xaaffee,transparent:true,opacity:0,blending:THREE.AdditiveBlending})));fx.add(projectile);
  const screen=new THREE.Vector3();
  const resize=()=>{lastIndex=-1;width=root.clientWidth||1;height=root.clientHeight||1;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);};const observer=new ResizeObserver(resize);observer.observe(root);resize();
  live.current.onReady(true);
  function frame(now:number){
   if(disposed)return;raf=requestAnimationFrame(frame);const p=live.current;if(document.hidden||p.paused&&lastIndex===p.index)return;
   // Cap on phones and reduced-motion while preserving the shared contact clock.
   const interval=p.reduced?100:width<700?1000/40:1000/60;if(now-lastFrame<interval)return;lastFrame=now;
   const e=p.event,elapsed=p.clock.current,timing=actionTiming(e,p.cinematic,p.reduced),action=motionTime(elapsed,timing.contact,timing.stop),post=action-timing.contact;
   const actor=e.units.find(u=>u.uid===e.actor),target=e.units.find(u=>e.targets.includes(u.uid)&&u.side!==actor?.side),big=['combo','boss'].includes(e.kind),damaging=e.hits.some(h=>h.kind==='damage'||h.kind==='critical');
   const inStop=!p.reduced&&elapsed>=timing.contact&&elapsed<timing.contact+timing.stop;
   const shake=!p.reduced&&damaging&&post>=0&&post<260?Math.exp(-post/80)*(big?.12:.065):0;
   const distance=Math.max(15.2,14.8/(2*Math.tan(21*Math.PI/180)*camera.aspect));
   const focus=actor&&target?worldPosition(target):{x:0,z:0},dolly=!p.reduced&&big?Math.sin(clamp(elapsed/timing.duration)*Math.PI)*.04:0;
   camera.position.set(Math.sin(post*.12)*shake,distance*.55+Math.cos(post*.1)*shake,distance*.84*(1-dolly));camera.lookAt(focus.x*dolly,.55,focus.z*dolly);camera.updateMatrixWorld();
   for(const u of e.units){const a=actors.get(u.uid)!;const pose=poseFor(u,e,elapsed,p.cinematic,p.reduced),standing=u.hp>0||pose.fall<1;
    a.group.position.set(pose.x,pose.y,pose.z);a.group.rotation.z=(u.side===0?-1:1)*pose.fall*1.35;a.group.position.y-=pose.fall*.12;
    a.body.material.opacity=pose.fall>0?.68:1;a.body.material.color.setRGB(1,1-pose.flash*.25,1-pose.flash*.48);if(e.hits.some(h=>h.uid===u.uid&&h.kind==='heal')&&elapsed>=timing.contact&&post<350)a.body.material.color.setRGB(.72,1,.82);a.body.visible=standing||pose.fall===1;
    const pos=a.body.geometry.attributes.position as THREE.BufferAttribute;const idle=p.reduced||p.paused||inStop?0:now/900+u.hero;
    for(let i=0;i<pos.count;i++){const v=deformVertex(a.base[i*3],a.base[i*3+1],pose,idle);pos.setXYZ(i,v.x,v.y,v.z);}pos.needsUpdate=true;
    a.shadow.position.set(pose.x+.12,-.042,pose.z+.07);a.shadow.material.opacity=u.hp<=0?.16:.45;a.shadow.scale.set(1+pose.recoil*.25,.58,1);
    a.ring.position.set(pose.x,-.04,pose.z);a.ring.visible=pose.fall===0;a.ring.material.opacity=e.actor===u.uid?.95:u.rage>=100?.8:.48;const affected=e.hits.some(h=>h.uid===u.uid);a.ring.scale.setScalar(affected&&post>=0&&post<400&&!p.reduced?1+Math.sin(post/400*Math.PI)*.6:1);if(affected&&post>=0&&post<400)a.ring.material.opacity=.95;
    a.shield.visible=u.shield>0&&u.hp>0;
    const label=p.overlay.current?.querySelector<HTMLElement>(`[data-uid="${u.uid}"]`);if(label){screen.set(pose.x,.04,pose.z).project(camera);const x=(screen.x*.5+.5)*width,y=(-screen.y*.5+.5)*height;label.style.left=`${x}px`;label.style.top=`${y}px`;label.style.zIndex=String(Math.round(100-y/height*20));label.style.setProperty('--depth-scale',String(clamp(1+(pose.z/20),.82,1.15)));}
   }
   slash.material.opacity=slash2.material.opacity=thrust.material.opacity=wave.material.opacity=projectile.material.opacity=sparks.material.opacity=0;
   if(!p.reduced&&actor&&target&&['attack','skill','combo','boss'].includes(e.kind)){
    const pos=worldPosition(target),origin=poseFor(actor,e,elapsed,p.cinematic,p.reduced),style=weaponStyle(actor.hero),col=ELEMENT_COLORS[e.element]||'#ffe4b0';slash.material.color.set(col);thrust.material.color.set(col);wave.material.color.set(col);projectile.material.color.set(col);sparks.material.color.set(col);
    const contactApproach=clamp((action-timing.intro-170)/(timing.contact-timing.intro-170));
    if(style==='bow'||style==='spell'){projectile.position.set(origin.x+(pos.x-origin.x)*contactApproach,1.65+Math.sin(contactApproach*Math.PI)*.55,pos.z);projectile.material.opacity=action>=timing.intro+170&&post<0?1:0;}
    if(post>=-55&&post<310){const fade=1-clamp(post/310),sweep=smooth((post+55)/180),side=actor.side===0?1:-1;
     slash.position.set(pos.x,1.5,pos.z+.13);slash.quaternion.copy(camera.quaternion);slash.rotateZ((style==='heavy'?-1.3:-.6)+side*sweep*1.35);slash.scale.set(side*(big?1.7:1.15),style==='heavy'?1.55:.78,1);slash.material.opacity=fade*.85;
     slash2.position.copy(slash.position);slash2.quaternion.copy(slash.quaternion);slash2.scale.copy(slash.scale);slash2.material.opacity=fade;
     if(style==='spear'){slash.material.opacity*=.25;thrust.position.set(pos.x-side*.5,1.4,pos.z+.1);thrust.rotation.z=-side*Math.PI/2-.2;thrust.material.opacity=fade;thrust.scale.set(1,1+sweep*.5,1);}
     const progress=Math.max(0,post)/1000;wave.position.set(pos.x,-.018,pos.z);wave.scale.setScalar(.4+progress*(big?9:4));wave.material.opacity=fade*(big||style==='heavy'?.7:.25);
     for(let i=0;i<sparkCount;i++){const angle=i*2.39996,spread=progress*(1+i%4);sparkPositions[i*3]=pos.x+Math.cos(angle)*spread;sparkPositions[i*3+1]=1.35+Math.sin(angle)*spread-progress*progress*4;sparkPositions[i*3+2]=pos.z+Math.sin(i*1.1)*spread*.5;}sparkG.attributes.position.needsUpdate=true;sparks.material.opacity=fade;
    }
   }
   renderer.render(scene,camera);lastIndex=p.index;
  }
  raf=requestAnimationFrame(frame);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="battle-stage-webgl" aria-hidden="true"/>;
}

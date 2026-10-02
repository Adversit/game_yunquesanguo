import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {HEROES} from './data';
import {weaponStyle,clamp} from './choreography';

// Original, genuinely volumetric low-poly warriors. Every limb and weapon has a pivot.
// No billboards, photo planes, image textures or remote model downloads are used.
const PROFILES=[
 ['#b9d9e5','#167e85','#d7c080','spear','crest'],['#244f37','#15382a','#dbb977','glaive','guan'],['#533237','#a33428','#b99757','spear','beard'],['#e0e2de','#385f81','#bda66e','fan','scholar'],
 ['#58486f','#b393d0','#d7b46e','staff','bun'],['#dae5e9','#5d7597','#d9c58b','spear','plume'],['#293c69','#382a50','#d1ad60','sword','crown'],['#3f557c','#243752','#b6beca','sword','patch'],
 ['#866742','#423425','#c7aa60','hammer','topknot'],['#713933','#342328','#c4a165','axes','bald'],['#476888','#152e44','#b6c8d1','glaive','crest'],['#60728a','#293957','#c8c0a5','scroll','scholar'],
 ['#8c363a','#3f202e','#dbb36e','sword','topknot'],['#d995ac','#954b81','#e8cb9b','fan','twin'],['#a64432','#3e2630','#c6a46c','spear','headband'],['#4e815d','#9e3938','#d6b471','bow','ponytail'],
 ['#366c67','#713e34','#d7b677','fan','scholar'],['#6cafc5','#315f8c','#d0dab5','staff','twin'],['#613038','#27232e','#d6b66c','halberd','horn'],['#9867b0','#533a79','#d5bc94','fan','bun'],
 ['#bca357','#e1d0a5','#d3b85c','staff','taoist'],['#a98c52','#4a4238','#e7d09a','sword','crown'],['#446987','#263c56','#b5b3a0','glaive','beard'],['#675559','#3e303a','#bbaa85','axe','beard'],
] as const;
export interface HeroRig{root:THREE.Group;hips:THREE.Group;torso:THREE.Group;head:THREE.Group;leftArm:THREE.Group;rightArm:THREE.Group;leftElbow:THREE.Group;rightElbow:THREE.Group;leftLeg:THREE.Group;rightLeg:THREE.Group;leftKnee:THREE.Group;rightKnee:THREE.Group;weapon:THREE.Group;weaponTip:THREE.Object3D;cape:THREE.Group;meshes:THREE.Mesh[];material:THREE.MeshStandardMaterial;hero:number;dispose:()=>void}
const color=(hex:string)=>new THREE.Color(hex);
export function createHeroRig(id:number):HeroRig{
 const [armor,cloth,gold,weaponType,hairType]=PROFILES[id],female=[4,13,15,17,19].includes(id),bulky=[2,8,9,22,23].includes(id),scholar=[3,6,11,12,16,20,21].includes(id),scale=bulky?1.12:female?.94:1;
 const root=new THREE.Group();root.name=`hero-${id}-${HEROES[id].name}`;root.userData={heroId:id,representation:'volumetric-articulated-mesh',weaponType};
 const material=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.64,metalness:.18});
 const joint=(name:string,parent:THREE.Object3D,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
 const add=(parent:THREE.Group,geometry:THREE.BufferGeometry,tint:string,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:tint}));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);parent.add(m);return m;};
 const box=(p:THREE.Group,c:string,x:number,y:number,z:number,w:number,h:number,d:number,rz=0)=>add(p,new THREE.BoxGeometry(w,h,d),c,x,y,z,1,1,1,0,0,rz);
 const cone=(p:THREE.Group,c:string,x:number,y:number,z:number,r:number,h:number,sx=1,sz=1,rz=0)=>add(p,new THREE.ConeGeometry(r,h,6),c,x,y,z,sx,1,sz,0,0,rz);
 const ball=(p:THREE.Group,c:string,x:number,y:number,z:number,r:number,sx=1,sy=1,sz=1)=>add(p,new THREE.SphereGeometry(r,8,6),c,x,y,z,sx,sy,sz);
 const cyl=(p:THREE.Group,c:string,x:number,y:number,z:number,r1:number,r2:number,h:number)=>add(p,new THREE.CylinderGeometry(r1,r2,h,8),c,x,y,z);
 const hips=joint('hips',root,0,1.04,0);box(hips,cloth,0,.05,0,.55,.35,.4);box(hips,gold,0,.2,.015,.61,.12,.45);box(hips,gold,0,.2,.255,.15,.18,.07);
 const torso=joint('spine',hips,0,.23,0);add(torso,new THREE.CylinderGeometry(.3,.24,.77,6),armor,0,.35,0,1.24,1,.75);
 box(torso,cloth,0,.29,.205,.14,.72,.06);box(torso,gold,-.17,.58,.215,.3,.05,.045,-.35);box(torso,gold,.17,.58,.215,.3,.05,.045,.35);
 if(!scholar&&!female){for(let r=0;r<3;r++)for(let c=0;c<3;c++)box(torso,r%2?armor:gold,(c-1)*.16,.15+r*.14,.24,.13,.1,.045);}
 const skirt=joint('lamellar-skirt',hips,0,0,0);if(scholar||female){add(skirt,new THREE.CylinderGeometry(.28,.48,.85,8),cloth,0,-.23,0,1,1,.8);box(skirt,gold,0,-.24,.37,.08,.72,.045);}else{for(const x of [-1,0,1])box(skirt,armor,x*.19,-.16,.23,.19,.49,.07,x*.12);box(skirt,cloth,0,-.15,-.23,.6,.47,.06);}
 const cape=joint('cape',torso,0,.62,-.21);add(cape,new THREE.CylinderGeometry(.24,.43,1.24,5,1,true),cloth,0,-.55,-.11,1,1,.13,.12);box(cape,gold,0,.01,-.03,.57,.06,.09);
 const head=joint('neck-head',torso,0,.88,0);cyl(head,'#d8aa85',0,-.1,0,.09,.1,.2);ball(head,'#ddb390',0,.13,.015,.265,.9,1.16,.88);ball(head,'#29242d',0,.27,-.035,.264,.94,.82,.86);
 box(head,'#d8aa85',0,.075,.221,.075,.13,.067);for(const x of [-.093,.093]){box(head,'#ecead8',x,.16,.215,.087,.045,.024);box(head,'#22232b',x,.16,.232,.035,.043,.017);box(head,'#2e252b',x,.21,.222,.095,.025,.028,x<0?.08:-.08);}box(head,'#8c594f',0,.009,.227,.075,.025,.019);
 if(hairType==='patch')box(head,'#171b24',-.09,.16,.246,.11,.084,.02,-.15);
 if(['beard','guan','taoist'].includes(hairType)){const bc=hairType==='taoist'?'#ddd7c7':'#25242a';cone(head,bc,0,-.21,.165,.18,hairType==='guan'?.67:.48,1,.45,Math.PI);box(head,bc,0,-.015,.21,.25,.11,.035);}
 if(hairType==='bald'){head.children.filter(c=>c instanceof THREE.Mesh&&c.position.y===.27).forEach(m=>{const mesh=m as THREE.Mesh;const mat=mesh.material as THREE.MeshBasicMaterial;mat.color.set('#bfa083');});}
 else if(hairType==='scholar'||hairType==='taoist'||hairType==='crown'||hairType==='guan'){cyl(head,hairType==='guan'?cloth:armor,0,.44,0,.16,.23,.25);box(head,gold,0,.39,.21,.08,.29,.055);if(hairType==='crown'){for(const x of [-.14,0,.14])box(head,gold,x,.64,.0,.045,.32,.06);}}
 else if(hairType==='twin'){for(const x of [-.23,.23]){ball(head,'#282330',x,.3,-.01,.13);ball(head,gold,x,.37,.04,.047);}}
 else if(hairType==='bun'||hairType==='topknot'||hairType==='ponytail'){ball(head,'#25232c',0,.49,-.1,.13,.9,1.2,.8);box(head,gold,0,.47,-.08,.28,.055,.06);if(hairType==='ponytail'||female)cone(head,'#28232c',0,.08,-.26,.18,.76,.6,1,Math.PI-.15);}
 else{add(head,new THREE.SphereGeometry(.277,8,5,0,Math.PI*2,0,Math.PI/2),armor,0,.25,0,1,1,.94);box(head,gold,0,.36,.22,.08,.25,.06);}
 if(hairType==='horn'||hairType==='plume'||hairType==='crest'){const n=hairType==='horn'?2:1;for(let i=0;i<n;i++){const x=n===2?(i?-.18:.18):0;cone(head,hairType==='horn'?'#c14c49':cloth,x,.7,-.02,.09,.8,.55,1,(i?1:-1)*.25);ball(head,gold,x,.4,.03,.075);}}
 if(hairType==='headband')box(head,cloth,0,.31,.15,.54,.095,.16);
 const arm=(sign:number)=>{const shoulder=joint(sign<0?'left-shoulder':'right-shoulder',torso,sign*.41,.61,0);ball(shoulder,armor,sign*.025,-.02,0,.23,1.15,.78,1);box(shoulder,gold,sign*.03,.07,.15,.27,.045,.11);add(shoulder,new THREE.CylinderGeometry(.13,.11,.4,6),cloth,0,-.25,0);const elbow=joint(sign<0?'left-elbow':'right-elbow',shoulder,0,-.46,0);add(elbow,new THREE.CylinderGeometry(.115,.13,.36,6),armor,0,-.17,0);box(elbow,gold,0,-.29,.11,.19,.055,.08);const hand=joint(sign<0?'left-hand':'right-hand',elbow,0,-.39,0);ball(hand,'#cfa17b',0,0,0,.125,.85,1.08,1);return {shoulder,elbow,hand};};
 const left=arm(-1),right=arm(1);
 const leg=(sign:number)=>{const hip=joint(sign<0?'left-hip':'right-hip',hips,sign*.19,-.13,0);add(hip,new THREE.CylinderGeometry(.16,.13,.42,6),cloth,0,-.21,0);const knee=joint(sign<0?'left-knee':'right-knee',hip,0,-.43,0);add(knee,new THREE.CylinderGeometry(.12,.14,.39,6),armor,0,-.18,.01);box(knee,gold,0,-.035,.13,.16,.1,.04);box(knee,'#283139',0,-.42,.09,.25,.19,.43);return {hip,knee};};const ll=leg(-1),rl=leg(1);
 const weapon=joint('weapon-grip',right.hand,0,0,.035),weaponTip=new THREE.Object3D();weaponTip.name='weapon-contact-tip';weapon.add(weaponTip);
 const edge='#dce8df',steel='#91a9b7',wood='#544138';
 const blade=(p:THREE.Group,length=1.15)=>{const shape=new THREE.Shape();shape.moveTo(-.1,0);shape.lineTo(.1,0);shape.lineTo(.09,length-.2);shape.lineTo(0,length);shape.lineTo(-.08,length-.2);shape.closePath();add(p,new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),edge,0,.15,-.03);box(p,gold,0,.14,0,.38,.07,.13);cyl(p,wood,0,-.02,0,.055,.055,.3);};
 if(['spear','glaive','halberd'].includes(weaponType)){cyl(weapon,wood,0,.25,0,.037,.045,2.5);for(const y of [-.7,1.15])cyl(weapon,gold,0,y,0,.063,.063,.1);if(weaponType==='spear'){cone(weapon,edge,0,1.68,0,.14,.61,.62,.42);weaponTip.position.y=1.98;}else{const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.55,.03,.6,.65,.14,.98);shape.bezierCurveTo(.2,.47,-.12,.43,0,0);add(weapon,new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false}),edge,-.03,1.05,-.035);weaponTip.position.set(.23,1.97,0);if(weaponType==='halberd'){cone(weapon,edge,0,1.72,0,.1,.6,1,.45);box(weapon,gold,-.2,1.36,0,.39,.075,.1);cone(weapon,edge,-.38,1.43,0,.17,.39,.55,.4);}}
  box(weapon,cloth,.13,1.02,.02,.25,.13,.03,-.4);
 }else if(weaponType==='sword'){blade(weapon);weaponTip.position.y=1.32;}else if(['axe','axes','hammer'].includes(weaponType)){cyl(weapon,wood,0,.28,0,.055,.05,1.35);if(weaponType==='hammer'){box(weapon,gold,0,.9,0,.62,.37,.34);box(weapon,steel,0,.9,.015,.65,.22,.37);}else{box(weapon,gold,0,.86,0,.16,.22,.17);add(weapon,new THREE.CylinderGeometry(.32,.28,.09,5),edge,.18,.88,0,1,1,1,Math.PI/2);if(weaponType==='axes'){const second=joint('offhand-axe',left.hand);cyl(second,wood,0,.18,0,.05,.05,.9);add(second,new THREE.CylinderGeometry(.24,.27,.085,5),edge,-.15,.55,0,1,1,1,Math.PI/2);}}weaponTip.position.y=1.1;
 }else if(weaponType==='bow'){add(weapon,new THREE.TorusGeometry(.68,.055,5,18,Math.PI),gold,0,.38,0,1,1,1,0,0,-Math.PI/2);box(weapon,'#d4d7c1',0,.38,0,.018,1.35,.018);weaponTip.position.set(0,.4,.4);}else if(weaponType==='fan'){for(let i=0;i<7;i++){const feather=joint('feather-'+i,weapon,0,.07,0);feather.rotation.z=(i-3)*.22;cone(feather,id===16?'#dfb15e':id===19?'#c6a3dd':'#e4dfc7',0,.32,0,.125,.65,.7,.18);box(feather,gold,0,.24,0,.024,.45,.04);}weaponTip.position.y=.78;}else if(weaponType==='scroll'){box(weapon,'#dfd4b7',0,.3,0,.43,.64,.12);for(const y of [0,.63])add(weapon,new THREE.CylinderGeometry(.09,.09,.59,8),gold,0,y,0,1,1,1,0,0,Math.PI/2);weaponTip.position.y=.7;}else{cyl(weapon,wood,0,.3,0,.048,.053,2);add(weapon,new THREE.TorusGeometry(.23,.045,6,12),gold,0,1.44,0);ball(weapon,id===20?'#ffe075':armor,0,1.44,0,.15);weaponTip.position.y=1.73;}
 root.scale.set(scale,scale,scale);const meshes:THREE.Mesh[]=[];
 // Merge static adornments per articulated joint, preserving vertex colors: ~15 draw calls per hero.
 const groups:THREE.Group[]=[];root.traverse(o=>{if(o instanceof THREE.Group)groups.push(o);});
 for(const group of groups){const direct=group.children.filter(o=>o instanceof THREE.Mesh) as THREE.Mesh[];if(!direct.length)continue;const geometries=direct.map(m=>{m.updateMatrix();let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);g.deleteAttribute('uv');g.deleteAttribute('uv1');const c=(m.material as THREE.MeshBasicMaterial).color,colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));m.geometry.dispose();(m.material as THREE.Material).dispose();group.remove(m);return g;});const merged=mergeGeometries(geometries,false)!;geometries.forEach(g=>g.dispose());merged.computeBoundingSphere();const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);meshes.push(mesh);}
 const rig:HeroRig={root,hips,torso,head,leftArm:left.shoulder,rightArm:right.shoulder,leftElbow:left.elbow,rightElbow:right.elbow,leftLeg:ll.hip,rightLeg:rl.hip,leftKnee:ll.knee,rightKnee:rl.knee,weapon,weaponTip,cape,meshes,material,hero:id,dispose:()=>{meshes.forEach(m=>m.geometry.dispose());material.dispose();}};animateHeroRig(rig,{time:0});return rig;
}
export interface RigMotion{time:number;windup?:number;strike?:number;recovery?:number;run?:number;hit?:number;fallen?:number;cast?:boolean;ultimate?:boolean;reduced?:boolean}
export function animateHeroRig(r:HeroRig,m:RigMotion){
 const idle=m.reduced?0:Math.sin(m.time*.002+r.hero),wind=m.reduced?0:m.windup||0,strike=m.reduced?0:m.strike||0,recovery=m.recovery||0,active=1-recovery,run=m.reduced?0:m.run||0,hit=m.reduced?0:m.hit||0,fall=m.fallen||0,style=weaponStyle(r.hero);
 r.hips.position.y=1.04+(m.reduced?0:idle*.018)+Math.abs(run)*.035;r.torso.rotation.set(hit*-.18+(m.cast?-wind*.08:wind*.12-strike*.22)*active,(strike*.5-wind*.22)*active,0);r.head.rotation.set(idle*.02,(-strike*.23+wind*.08)*active,idle*.016);
 r.leftArm.rotation.set(-.12+run*.45,0,-.13);r.rightArm.rotation.set(-.25-run*.45,0,.15);r.leftElbow.rotation.set(-.28,0,0);r.rightElbow.rotation.set(-.35,0,0);r.weapon.rotation.set(0,0,-.1);r.cape.rotation.x=.13+Math.abs(run)*.25+idle*.025;
 r.leftLeg.rotation.x=run*.55;r.rightLeg.rotation.x=-run*.55;r.leftKnee.rotation.x=Math.max(0,-run)*.6;r.rightKnee.rotation.x=Math.max(0,run)*.6;
 if(wind||strike){if(m.cast||style==='spell'){r.rightArm.rotation.x=(-1.6*wind+.5*strike)*active;r.leftArm.rotation.x=-1.4*wind*active;r.rightArm.rotation.z=.4*wind*active;r.leftArm.rotation.z=-.5*wind*active;r.rightElbow.rotation.x=-.6*wind*active;r.leftElbow.rotation.x=-.6*wind*active;}
 else if(style==='spear'){r.rightArm.rotation.x=(-1.05*wind-.45*strike)*active;r.rightElbow.rotation.x=(-1.15*wind+1.1*strike)*active;r.leftArm.rotation.x=(-1.3*wind-.1*strike)*active;r.weapon.rotation.x=(2.6*wind+.4*strike)*active;r.weapon.rotation.z=-.2;}
 else if(style==='bow'){r.leftArm.rotation.x=-1.5*wind*active;r.rightArm.rotation.x=-1.3*wind*active;r.rightElbow.rotation.y=-1.1*wind*(1-strike)*active;r.weapon.rotation.x=1.3*wind*active;}
 else{r.rightArm.rotation.x=(-2.65*wind+2.1*strike)*active;r.rightArm.rotation.z=(.25*wind-.6*strike)*active;r.rightElbow.rotation.x=(-.6*wind+.45*strike)*active;r.leftArm.rotation.x=(-.5*wind-.8*strike)*active;r.weapon.rotation.x=(.4*wind+1.45*strike)*active;}}
 if(m.ultimate&&!m.reduced){r.torso.rotation.y+=strike*Math.PI*.45*active;r.cape.rotation.x+=.2*wind;}
 r.hips.rotation.z=fall*1.48;r.hips.position.y-=fall*.62;
}

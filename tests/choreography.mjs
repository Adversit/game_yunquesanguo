import * as THREE from 'three';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yunque-test-'));
try {
for(const name of ['data','state','battle','choreography']){
 const source=fs.readFileSync(new URL(`../game/${name}.ts`,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll("'./data'","'./data.mjs'").replaceAll("'./state'","'./state.mjs'").replaceAll("'./battle'","'./battle.mjs'");
 fs.writeFileSync(path.join(temp,`${name}.mjs`),js);
}
const {fresh}=await import(path.join(temp,'state.mjs'));
const {simulate}=await import(path.join(temp,'battle.mjs'));
const {actionTiming,poseFor,deformVertex,worldPosition,motionTime}=await import(path.join(temp,'choreography.mjs'));
const r=simulate(fresh(),0,123);let checks=0;
for(const e of r.events){for(const reduced of [true,false]){const t=actionTiming(e,true,reduced);assert.ok(t.contact+t.stop<=t.duration||e.kind==='end');for(const ms of [0,t.contact-1,t.contact,t.contact+t.stop/2,t.duration]){for(const u of e.units){const p=poseFor(u,e,ms,true,reduced);Object.values(p).forEach(v=>assert.ok(Number.isFinite(v)));for(const x of [-1.125,0,1.125])for(const y of [-.15,1.35,2.85])Object.values(deformVertex(x,y,p,0)).forEach(v=>assert.ok(Number.isFinite(v)));checks++;}}if(!reduced&&t.stop>0)assert.equal(motionTime(t.contact+t.stop/2,t.contact,t.stop),t.contact);}}
const frames=[];
for(const [w,h] of [[1440,659],[1280,479],[768,771],[390,591],[375,414]]){const aspect=w/h,c=new THREE.PerspectiveCamera(42,aspect,.1,80),d=Math.max(15.2,14.8/(2*Math.tan(21*Math.PI/180)*aspect));c.position.set(0,d*.55,d*.84);c.lookAt(0,.55,0);c.updateMatrixWorld();let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;for(const u of r.units){const p=worldPosition(u);for(const x of [-1.125,1.125])for(const y of [-.15,2.85]){const v=new THREE.Vector3(p.x+x,y,p.z).project(c);minx=Math.min(minx,v.x);maxx=Math.max(maxx,v.x);miny=Math.min(miny,v.y);maxy=Math.max(maxy,v.y);}}frames.push({w,h,minx,maxx,miny,maxy});assert.ok(minx>-.99&&maxx<.99,'horizontal fit');assert.ok(miny>-.99&&maxy<.99,'vertical fit');}
console.log(JSON.stringify({passed:true,poseChecks:checks,contactFreeze:true,viewports:frames},null,2));

} finally {fs.rmSync(temp,{recursive:true,force:true});}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'yunque-test-'));
try {
for(const name of ['data','state','battle']){
 const source=fs.readFileSync(new URL(`../game/${name}.ts`,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll("'./data'","'./data.mjs'").replaceAll("'./state'","'./state.mjs'");
 fs.writeFileSync(path.join(temp,`${name}.mjs`),js);
}
const {fresh,recruit,upgrade,teamPower,clearStage,own}=await import(path.join(temp,'state.mjs'));
const {simulate}=await import(path.join(temp,'battle.mjs'));
const {HEROES,BONDS,STAGES}=await import(path.join(temp,'data.mjs'));
assert.equal(HEROES.length,24);assert.equal(STAGES.length,30);assert.equal(BONDS.length,14);
const s=fresh();s.pity=20;const pity=recruit(s,10,'premium',()=>.99);
assert.equal(pity.pulls[9].rarity,'SSR');assert.equal(pity.save.pity,0);assert.equal(pity.save.tickets,s.tickets-10);
let draw=0;assert.equal(recruit(fresh(),10,'premium',()=>++draw===19?.001:.99).pulls[9].rarity,'UR');
assert.equal(recruit(fresh(),10,'normal',()=>.99).pulls[9].rarity,'SR');
const grown=upgrade(fresh(),0,'level',5);assert.equal(grown.save.roster[0].level,6);assert.ok(teamPower(grown.save)>teamPower(fresh()));assert.ok(grown.save.gold<fresh().gold);
let run=fresh();for(let stage=0;stage<30;stage++){
 let battle=simulate(run,stage,42+stage),attempts=0;
 while(battle.winner===1&&attempts++<100){const before=teamPower(run);for(const id of run.formation)run=upgrade(run,id,'level').save;if(before===teamPower(run)){assert.ok(stage>0);const farm=simulate(run,stage-1,42);assert.equal(farm.winner,0);run=clearStage(run,stage-1,farm.stars).save;}battle=simulate(run,stage,42+stage);}
 assert.equal(battle.winner,0,`progression blocked at ${stage+1}`);assert.equal(battle.events.at(-1).round,battle.rounds);run=clearStage(run,stage,battle.stars).save;
 for(const e of battle.events)for(const u of e.units){assert.ok(Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp);assert.ok(u.rage>=0&&u.rage<=100);}
}
const combos=[];for(const b of BONDS.filter(b=>b.combo)){
 const test=fresh();HEROES.forEach(h=>test.roster[h.id]={...own(h.id),level:20,stars:2,ascend:1});
 test.formation=[...b.heroes,6,10,15,21].filter((id,i,a)=>a.indexOf(id)===i).slice(0,6);if(test.formation.length<6)test.formation.push(16);
 const r=simulate(test,20,15);assert.ok(r.events.some(e=>e.comboId===b.id),`combo never triggered: ${b.id}`);combos.push(b.id);
 if(b.id==='north')for(const e of r.events.filter(e=>e.comboId===b.id))assert.ok(e.targets.every(uid=>Number(uid.split('-')[1])<3));
}
const first=clearStage(fresh(),0,3),repeat=clearStage(first.save,0,3);assert.equal(first.rewards.tickets,3);assert.equal(repeat.rewards.tickets,0);
assert.equal(simulate(fresh(),29,1).winner,1,'growth must matter for the final stage');
console.log(JSON.stringify({result:'PASS',progression:'30 stages without developer resources',gacha:'SR/SSR/UR guarantee boundaries',combos:combos.length,state:'growth, rewards, finite HP/rage, battle termination'}));
} finally {fs.rmSync(temp,{recursive:true,force:true});}

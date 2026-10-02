import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
const temp=fs.mkdtempSync(path.resolve('.sites-runtime/audio-test-'));
try{
 for(const name of ['data','state','battle','choreography','audio']){const js=ts.transpileModule(fs.readFileSync(`game/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${p}.mjs'`);fs.writeFileSync(path.join(temp,name+'.mjs'),js);}
 const listeners=new Map(),audios=[],frames=new Map();let fid=0;
 globalThis.window={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 globalThis.document={hidden:false,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 globalThis.requestAnimationFrame=f=>{frames.set(++fid,f);return fid;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 class Audio{constructor(src){this.src=src;this.volume=1;this.paused=true;this.events={};audios.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(n,f){this.events[n]=f;}removeAttribute(){this.src='';}load(){}}
 globalThis.Audio=Audio;
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;}});const node=()=>({gain:param(),connect(){},disconnect(){}});
 class AudioContext{constructor(){this.state='suspended';this.currentTime=0;}resume(){this.state='running';return Promise.resolve();}createGain(){return node();}createMediaElementSource(el){return{connect(n){el.volumeNode=n;},disconnect(){}};}createDynamicsCompressor(){return{...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}}
 globalThis.AudioContext=AudioContext;
 const engine=await import(path.join(temp,'audio.mjs'));const detach=engine.attachAudioLifecycle();
 engine.setMusicScene('city');assert.equal(audios.length,0,'no download/autoplay before a gesture');listeners.get('pointerdown')();assert.equal(audios.length,1);assert.equal(audios[0].loop,false);assert.equal(audios[0].paused,false);
 function finishFades(){for(const [id,f]of [...frames]){frames.delete(id);f(performance.now()+2500);}}
 finishFades();assert.equal(audios[0].volumeNode.gain.value,.42);
 engine.setMusicScene('battle');assert.equal(audios.length,2);assert.equal(audios[0].paused,false,'crossfade retains outgoing track');finishFades();assert.ok(audios[0].paused);assert.equal(audios[1].volumeNode.gain.value,.42);
 engine.configureAudio({enabled:true,music:.2,effects:.8});assert.equal(audios[1].volumeNode.gain.value,.2,'independent music gain');assert.equal(audios.length,2);
 engine.setMusicPaused(true);assert.ok(audios[1].paused);engine.setMusicPaused(false);assert.equal(audios[1].paused,false);
 document.hidden=true;listeners.get('visibilitychange')();assert.ok(audios[1].paused);document.hidden=false;listeners.get('visibilitychange')();assert.equal(audios[1].paused,false);
 engine.configureAudio({enabled:false,music:.2,effects:.8});engine.setMusicScene('victory');assert.equal(audios.length,2,'muted scene does not download new music');assert.ok(audios[1].paused);
 engine.configureAudio({enabled:true,music:.2,effects:.8});assert.equal(audios.length,3);assert.equal(audios[2].loop,false);audios[2].events.ended();assert.ok(audios.at(-1).src.endsWith('/city.mp3'));
 const looping=audios.at(-1);looping.duration=100;looping.currentTime=99;const oldCount=audios.length;looping.events.timeupdate();assert.equal(audios.length,oldCount+1,'overlapped same-track loop');assert.equal(looping.paused,false,'loop crossfade retains the tail');finishFades();assert.ok(looping.paused);
 detach();assert.ok(audios.every(a=>a.paused));assert.equal(listeners.size,0);
 assert.ok(!fs.readFileSync('game/audio.ts','utf8').includes('createOscillator'));
 console.log(JSON.stringify({result:'PASS',gestureGating:true,lazyMusic:true,crossfade:true,overlappedMusicLoop:true,independentVolume:true,mute:true,pauseAndVisibility:true,stingerReturn:true,cleanup:true,noSynthesizedDings:true}));
}finally{fs.rmSync(temp,{recursive:true,force:true});}

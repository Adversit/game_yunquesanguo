import {weaponStyle} from './choreography';
let ctx:AudioContext|undefined,master:DynamicsCompressorNode|undefined;
const playing=new Set<AudioBufferSourceNode>();
export function stopCombatAudio(){for(const source of playing){try{source.stop();}catch{}}playing.clear();}
const buffers=new Map<string,AudioBuffer>(),pending=new Map<string,Promise<void>>();
const clips=['sword-swing','spear-whoosh','metal-impact','heavy-thud','magic-charge','energy-strike','ultimate-crack','ultimate-bass'];
function context(){if(typeof window==='undefined')return;try{ctx??=new AudioContext();if(!master){master=ctx.createDynamicsCompressor();master.threshold.value=-16;master.knee.value=18;master.ratio.value=5;master.attack.value=.004;master.release.value=.12;master.connect(ctx.destination);}if(ctx.state==='suspended')void ctx.resume();return ctx;}catch{return;}}
async function load(id:string){const c=context();if(!c||buffers.has(id))return;if(!pending.has(id))pending.set(id,fetch(`/audio/kenney/${id}.mp3`,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('audio');return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)).then(b=>{buffers.set(id,b);}).catch(()=>{}));await pending.get(id);}
export function prepareCombatAudio(enabled=true){if(!enabled)return;context();for(const id of clips)void load(id);}
function play(id:string,gain=.3,rate=1){const c=context(),b=buffers.get(id);if(!c)return;if(!b){const started=Date.now();void load(id).then(()=>{if(buffers.has(id)&&Date.now()-started<120)play(id,gain,rate);});return;}const source=c.createBufferSource(),volume=c.createGain();source.buffer=b;source.playbackRate.value=rate;volume.gain.value=gain;source.connect(volume);volume.connect(master!);playing.add(source);source.start();source.onended=()=>{playing.delete(source);source.disconnect();volume.disconnect();};}
export function combatSound(kind:'swing'|'impact'|'critical'|'heal',element:string,enabled=true,hero=0,ultimate=false){
 if(!enabled)return;const style=weaponStyle(hero);
 if(kind==='swing'){play(style==='spell'?'magic-charge':style==='spear'||style==='bow'?'spear-whoosh':'sword-swing',style==='spell'?.14:.22,ultimate?.88:1);return;}
 if(kind==='heal'){play('magic-charge',.13,1.25);play('energy-strike',.08,1.4);return;}
 if(ultimate){play('ultimate-crack',.22);play('ultimate-bass',.24);return;}
 if(style==='spell'){play('energy-strike',.2,element==='ice'?1.15:.96);return;}
 play(style==='heavy'?'heavy-thud':'metal-impact',kind==='critical'?.35:.24,kind==='critical'?.9:1.05);
 if(kind==='critical')play('heavy-thud',.18,.86);
}
export function sound(kind:'click'|'attack'|'skill'|'combo'|'pull'|'rare'|'win'|'lose',enabled=true){
 if(!enabled)return;const c=context();if(!c)return;
 if(kind==='click'){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(500,c.currentTime);g.gain.setValueAtTime(.012,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.035);o.connect(g);g.connect(master!);o.start();o.stop(c.currentTime+.04);return;}
 if(kind==='attack'){combatSound('impact','wind',true);return;}
 if(kind==='lose'){play('heavy-thud',.17,.7);return;}
 if(kind==='win'||kind==='rare'){play('energy-strike',.12,1.3);play('magic-charge',.15,1.1);return;}
 if(kind==='combo'){play('ultimate-crack',.23);play('ultimate-bass',.2);return;}
 play('magic-charge',.14,1);
}

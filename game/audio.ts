let ctx:AudioContext|undefined;
export function sound(kind:'click'|'attack'|'skill'|'combo'|'pull'|'rare'|'win'|'lose',enabled=true){if(!enabled||typeof window==='undefined')return;try{ctx??=new AudioContext();if(ctx.state==='suspended')void ctx.resume();const t=ctx.currentTime;const notes=kind==='win'?[523,659,784,1046]:kind==='rare'?[330,440,660,880,1320]:kind==='combo'?[110,220,440,880]:kind==='lose'?[330,277,220]:kind==='skill'?[220,440,660]:kind==='pull'?[220,330,440]:kind==='attack'?[160,70]:[700];notes.forEach((hz,i)=>{const osc=ctx!.createOscillator(),gain=ctx!.createGain();osc.type=kind==='attack'?'sawtooth':kind==='combo'?'triangle':'sine';osc.frequency.setValueAtTime(hz,t+i*.07);gain.gain.setValueAtTime(0,t+i*.07);gain.gain.linearRampToValueAtTime(kind==='attack'?.055:.07,t+i*.07+.012);gain.gain.exponentialRampToValueAtTime(.001,t+i*.07+.25);osc.connect(gain);gain.connect(ctx!.destination);osc.start(t+i*.07);osc.stop(t+i*.07+.28);});}catch{}}

/** Short synthesized foley, timed to contact rather than the beginning of a turn. */
export function combatSound(kind:'swing'|'impact'|'critical'|'heal',element:string,enabled=true){
 if(!enabled||typeof window==='undefined')return;
 try{
  ctx??=new AudioContext();if(ctx.state==='suspended')void ctx.resume();const t=ctx.currentTime;
  if(kind==='heal'){sound('skill',enabled);return;}
  const duration=kind==='swing'?.13:kind==='critical'?.27:.19;
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type=kind==='swing'?'bandpass':'lowpass';filter.frequency.setValueAtTime(kind==='swing'?1800:element==='ice'?2900:1400,t);filter.frequency.exponentialRampToValueAtTime(kind==='swing'?600:180,t+duration);gain.gain.setValueAtTime(kind==='swing'?.028:kind==='critical'?.12:.075,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(t);source.stop(t+duration);
  if(kind!=='swing'){const osc=ctx.createOscillator(),bass=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(kind==='critical'?105:150,t);osc.frequency.exponentialRampToValueAtTime(42,t+.14);bass.gain.setValueAtTime(kind==='critical'?.09:.06,t);bass.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(bass);bass.connect(ctx.destination);osc.start(t);osc.stop(t+.22);}
 }catch{}
}

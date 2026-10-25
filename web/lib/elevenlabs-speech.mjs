import {resolveEmotion} from '../gearwell/emotions.js';
export const VOICE_ID='Veg2qijYoJAS8VPKOOmi';
export const DEFAULT_SPEECH_MODEL='eleven_flash_v2_5';
const noStore={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
const json=(status,message)=>Response.json({error:message},{status,headers:noStore});
export async function createSpeechResponse(request, env, fetcher=fetch) {
  if(request.method!=='POST')return json(405,'Use POST to generate speech.');
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)return json(403,'Speech requests must come from this site.');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return json(415,'Send a JSON object containing text.');
  if(Number(request.headers.get('content-length'))>20000)return json(413,'The speech request is too large.');
  let body;
  try {
    const reader=request.body?.getReader();const chunks=[];let size=0;
    if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();return json(413,'The speech request is too large.');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    body=JSON.parse(new TextDecoder().decode(bytes));
  }catch{return json(400,'Send a valid JSON object containing text.');}
  if(!body || typeof body.text!=='string' || !body.text.trim())return json(400,'Provide text for Gearwell to read.');
  if(body.speechConsent!==true)return json(403,'Agree to send interviewer text to ElevenLabs before generating speech.');
  const text=body.text.trim();
  if(text.length>3000)return json(400,'Use at most 3,000 characters per spoken line.');
  if(!env.ELEVENLABS_API_KEY)return json(503,'Gearwell’s ElevenLabs voice is awaiting its API key.');
  const model=env.ELEVENLABS_MODEL||DEFAULT_SPEECH_MODEL;
  if(!['eleven_flash_v2_5','eleven_multilingual_v2'].includes(model))return json(503,'The speech model setting needs correction.');
  const emotion=resolveEmotion(text,body.emotion);
  const controller=new AbortController();
  const abort=()=>controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});
  if(request.signal.aborted)controller.abort();
  const timeout=setTimeout(abort,45000);
  try {
    // Only the server sends this key to the fixed ElevenLabs host and voice.
    // Preserve owner-private hosting access; origin checks are not authentication.
    const response=await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,{
      method:'POST',headers:{'xi-api-key':env.ELEVENLABS_API_KEY,'Content-Type':'application/json','Accept':'audio/mpeg'},
      body:JSON.stringify({text,model_id:model}),signal:controller.signal
    });
    if(!response.ok) {
      if(response.status===429)return json(429,'ElevenLabs is busy or the account has reached its speech allowance. Please try again later.');
      if([401,403].includes(response.status))return json(502,'ElevenLabs could not authorize this voice. Check the API key, voice access, and account allowance.');
      if(response.status===404)return json(502,'The configured ElevenLabs voice is unavailable to this account.');
      return json(502,'ElevenLabs could not generate this line. Please try again.');
    }
    if(!response.headers.get('content-type')?.startsWith('audio/'))return json(502,'ElevenLabs did not return playable audio. Please try again.');
    const audio=await response.arrayBuffer();
    if(!audio.byteLength)return json(502,'ElevenLabs returned an empty audio file. Please try again.');
    return new Response(audio,{headers:{...noStore,'Content-Type':'audio/mpeg','Content-Disposition':'inline; filename="gearwell.mp3"','X-Gearwell-Voice':VOICE_ID,'X-Gearwell-Model':model,'X-Gearwell-Emotion':emotion}});
  } catch {return json(504,controller.signal.aborted ? 'Speech generation was cancelled or timed out.' : 'ElevenLabs could not be reached. Please try again.');}
  finally {clearTimeout(timeout);request.signal.removeEventListener('abort',abort);}
}

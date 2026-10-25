export const EMOTION_ANIMATIONS = Object.freeze({
  listening:['Relax','LookAround','Thinking'],
  neutral:['Relax','LookAround'],
  thinking:['Thinking','LookAround'],
  happy:['Clapping','Relax'],
  excited:['Clapping','Jump','Relax'],
  sad:['Sad','Relax'],
  surprised:['Surprised','Thinking'],
  angry:['Angry','Thinking'],
  shy:['Blush','Relax'],
  sleepy:['Sleepy','Relax'],
  greeting:['Goodbye','Relax'],
  goodbye:['Goodbye','Relax']
});
const aliases = {calm:'neutral',confident:'neutral',curious:'thinking',thoughtful:'thinking',encouraging:'happy',positive:'happy',celebratory:'excited',empathetic:'sad',concerned:'thinking',tired:'sleepy',blushing:'shy',farewell:'goodbye',hello:'greeting'};
export function resolveEmotion(text = '', supplied) {
  const tag=typeof supplied === 'string' ? supplied.trim().toLowerCase() : '';
  const normalized=aliases[tag] || tag;
  if(Object.hasOwn(EMOTION_ANIMATIONS,normalized)) return normalized;
  const words=String(text).toLowerCase();
  if(/\b(goodbye|farewell|see you|thank you for your time|concludes our interview)\b/.test(words))return 'goodbye';
  if(/\b(congratulations|celebrate|fantastic news)\b/.test(words))return 'excited';
  if(/\b(great answer|well done|excellent|nicely done|impressive|good job)\b/.test(words))return 'happy';
  if(/\b(sorry to hear|that sounds difficult|unfortunately|my condolences)\b/.test(words))return 'sad';
  if(/\b(wow|surprising|unexpected|amazed)\b/.test(words))return 'surprised';
  if(/\b(hello|welcome|my name is gearwell|nice to meet you)\b/.test(words))return 'greeting';
  if(/\b(let me think|consider|tell me|could you|can you|how did|why did|what would|walk me through)\b/.test(words)||words.includes('?'))return 'thinking';
  return 'neutral';
}

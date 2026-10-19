export default async function handler(req,res){
res.setHeader("Cache-Control","no-store");
if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Metodo non consentito."});}
const key=process.env.OPENAI_API_KEY, model=process.env.OPENAI_MODEL||"gpt-4o-mini";
if(!key)return res.status(503).json({error:"Nova non è collegata: configura OPENAI_API_KEY nelle variabili d'ambiente di Vercel."});
try{const ms=Array.isArray(req.body?.messages)?req.body.messages:[];if(!ms.length||ms.length>30)return res.status(400).json({error:"Conversazione non valida."});
const messages=[{role:"system",content:"Sei Nova AI, un assistente utile, chiaro, creativo e onesto. Rispondi nella lingua dell'utente. Aiuta con studio, scrittura, programmazione, idee e pianificazione. Non dichiarare funzioni non disponibili: questa versione non ha ricerca web, allegati o generazione immagini."},...ms.filter(m=>["user","assistant"].includes(m.role)&&typeof m.content==="string").map(m=>({role:m.role,content:m.content.slice(0,12000)}))];
const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages,max_tokens:1200,temperature:.7})});const d=await r.json().catch(()=>({}));
if(!r.ok)return res.status(r.status===429?429:502).json({error:r.status===401?"Chiave API non valida.":r.status===429?"Limite o credito API raggiunto.":"Il servizio IA non ha risposto."});
return res.status(200).json({reply:d.choices?.[0]?.message?.content||"Nessuna risposta dal modello."});
}catch{return res.status(500).json({error:"Errore temporaneo del server."});}}
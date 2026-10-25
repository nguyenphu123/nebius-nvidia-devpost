// Small reproducible live probe, not a statistically meaningful benchmark.
// Calls the running local API; consumes provider credits. No key is read here.
import { initialState } from './planner.mjs';
const cases = [
  { name:'unseen multi-field update', message:'We expect 95 guests. Three volunteers can come. Our purchasing budget is 24 dollars. Leave everything else as it is.', expected:{guests:95,volunteers:3,budget:24} },
  { name:'exact unit conversion', message:'We received another 750 grams of dry rice. Add it to our Rice (dry) stock and change nothing else.', expected:{inventory:[{id:'rice',quantity:7.75}]} },
  { name:'unknown package weight', message:'We received two bags of dry rice. Please add them to the rice stock. We do not know how heavy the bags are.', clarify:true }
];
let failures=0;
for(const item of cases) {
  const started=Date.now();
  try {
    const response=await fetch('http://127.0.0.1:3000/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:initialState,message:item.message}),signal:AbortSignal.timeout(65000)});
    const data=await response.json();
    const passed=response.ok && (item.clarify ? Boolean(data.question)&&Object.keys(data.changes).length===0 : Object.keys(data.changes).length===Object.keys(item.expected).length && Object.entries(item.expected).every(([key,value])=>JSON.stringify(data.changes[key])===JSON.stringify(value)));
    if(!passed)failures++;
    console.log(JSON.stringify({case:item.name,passed,ms:Date.now()-started,changes:data.changes,question:data.question,error:data.error}));
  } catch(error) { failures++; console.log(JSON.stringify({case:item.name,passed:false,error:error.message})); }
}
process.exitCode=failures?1:0;

import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { openStore } from './storage.mjs';
if(!process.stdin.isTTY)throw new Error('Run setup-admin.mjs in an interactive terminal.');
const store=await openStore();
try {
if(await store.configured())throw new Error('Admin already configured. No account was changed.');
const rl=createInterface({input:process.stdin,output:process.stdout});
const username=await rl.question('Admin username: ');rl.close();
async function password(prompt){process.stdout.write(prompt);emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();return new Promise((resolve,reject)=>{let value='';function done(){process.stdin.off('keypress',key);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');}function key(text,k={}){if(k.ctrl&&k.name==='c'){done();reject(new Error('Cancelled.'));}else if(k.name==='return'){done();resolve(value);}else if(k.name==='backspace'){value=value.slice(0,-1);}else if(text&&!k.ctrl&&!k.meta&&value.length<200){value+=text;}}process.stdin.on('keypress',key);});}
const first=await password('Password (12+ characters, hidden): ');
if(first!==await password('Confirm password (hidden): '))throw new Error('Passwords do not match. No account was created.');
await store.setup(username,first);
console.log(store.backend==='postgres'?'Admin created in PostgreSQL. Open /login.':'Admin created. Restart the JSON server, then open /login.');
} finally { await store.close(); }

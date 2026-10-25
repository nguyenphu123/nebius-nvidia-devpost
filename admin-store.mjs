import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes, randomUUID, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { migrateOperations, applyOperation, operationsSnapshot, recovery, scope } from './operations.mjs';
const scrypt = promisify(derive);
const clean = (v, label, max, optional=false) => {
  if (typeof v !== 'string' || (!optional && !v.trim()) || v.length > max) throw new Error(`${label}: enter ${optional?'up to':'1–'}${max} characters.`);
  return v.trim();
};
export function validateItem(kind, raw, data) {
  const name=clean(raw.name,'Name',100), description=clean(raw.description??'','Description',500,true);
  if(typeof raw.active!=='boolean')throw new Error('Active must be true or false.');
  if(kind==='dishes') {
    const price=Number(raw.price);
    if(raw.price===''||!Number.isInteger(price)||price<0||price>1000000)throw new Error('Price must be whole JPY from 0 to 1,000,000.');
    return {name,description,active:raw.active,price,category:clean(raw.category,'Category',60),allergens:clean(raw.allergens??'','Allergen notes',300,true)};
  }
  if(kind!=='branches')throw new Error('Unknown catalog.');
  if(!Array.isArray(raw.dishIds)||raw.dishIds.length>500||raw.dishIds.some(id=>!data.dishes.some(d=>d.id===id)))throw new Error('Select existing menu items.');
  return {name,description,active:raw.active,address:clean(raw.address,'Address / area',250),equipment:clean(raw.equipment??'','Equipment notes',300,true),dishIds:[...new Set(raw.dishIds)]};
}
export async function openAdminStore(file) {
  let data;
  try {data=JSON.parse(await readFile(file,'utf8'));if(data.version!==1||!Array.isArray(data.users)||!Array.isArray(data.dishes)||!Array.isArray(data.branches))throw new Error('Invalid admin data. Restore a valid backup; data was not overwritten.');}
  catch(e){if(e.code!=='ENOENT')throw e;data={version:1,users:[],dishes:[],branches:[]};}
  return createAdminStore(data,async next=>{await mkdir(dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});await rename(file+'.tmp',file);});
}

// Business rules shared by the legacy JSON adapter and transactional PostgreSQL adapter.
export function createAdminStore(initial,commit){
  let data=structuredClone(initial);
  migrateOperations(data);
  const publicUser=u=>u&&u.active!==false?(({hash,salt,...safe})=>safe)(u):null;
  let queue=Promise.resolve();
  function mutate(fn){const work=queue.then(async()=>{const next=structuredClone(data);const result=await fn(next);await commit(next);data=next;return structuredClone(result);});queue=work.catch(()=>{});return work;}
  return {
    configured:()=>data.users.length>0,
    user:id=>publicUser(data.users.find(u=>u.id===id)),
    operations:user=>operationsSnapshot(data,user),
    operate:(user,action,p)=>mutate(next=>applyOperation(next,user,action,p)),
    recovery(user,id){const incident=data.incidents.find(i=>i.id===id);if(!incident)throw Error('Incident not found.');scope(user,incident.branchId);return recovery(data,id);},
    manageUser(user,p){return mutate(async next=>{if(user.role!=='admin')throw Error('Administrator access required.');const username=clean(p.username,'Username',80).toLowerCase();if(!['admin','manager'].includes(p.role)||typeof p.active!=='boolean'||!Array.isArray(p.branchIds)||p.branchIds.some(id=>!next.branches.some(b=>b.id===id)))throw Error('Invalid role or branches.');if(next.users.some(u=>u.id!==p.id&&u.username===username))throw Error('Username already exists.');const old=p.id?next.users.find(u=>u.id===p.id):null;if(p.id&&!old)throw Error('User not found.');if(old?.id===user.id&&(!p.active||p.role!=='admin'))throw Error('You cannot disable or demote your own account.');const item={...old,id:old?.id??randomUUID(),username,role:p.role,active:p.active,branchIds:[...new Set(p.branchIds)]};if(p.password||!old){if(typeof p.password!=='string'||p.password.length<12||p.password.length>200)throw Error('Password must be 12–200 characters.');item.salt=randomBytes(16).toString('hex');item.hash=(await scrypt(p.password,item.salt,64)).toString('hex');}if(old)Object.assign(old,item);else next.users.push(item);return publicUser(item);});},
    catalog:()=>structuredClone({dishes:data.dishes,branches:data.branches}),
    async setup(username,password){return mutate(async next=>{if(next.users.length)throw new Error('Admin already exists. Setup will not overwrite an account.');username=clean(username,'Username',80).toLowerCase();if(typeof password!=='string'||password.length<12||password.length>200)throw new Error('Use a password of 12–200 characters.');const salt=randomBytes(16).toString('hex');const hash=(await scrypt(password,salt,64)).toString('hex');next.users.push({id:randomUUID(),username,role:'admin',salt,hash});return {username};});},
    async verify(username,password){if(typeof username!=='string'||typeof password!=='string'||username.length>80||password.length>200)return null;const user=data.users.find(u=>u.username===username.trim().toLowerCase());const hash=await scrypt(password,user?.salt??'dummy-nonexistent-user',64);if(!user||!timingSafeEqual(hash,Buffer.from(user.hash,'hex')))return null;return publicUser(user);},
    save(kind,raw){return mutate(next=>{if(!['dishes','branches'].includes(kind))throw new Error('Unknown catalog.');const item=validateItem(kind,raw,next);const list=next[kind];if(list.some(x=>x.id!==raw.id&&x.name.toLowerCase()===item.name.toLowerCase()))throw new Error('This name already exists. Edit the existing entry instead.');if(raw.id){const i=list.findIndex(x=>x.id===raw.id);if(i<0)throw new Error('Item no longer exists. Refresh and try again.');list[i]={...list[i],...item,id:raw.id};migrateOperations(next);return list[i];}if(list.length>=500)throw new Error('Catalog limit reached (500 entries).');const saved={...item,id:randomUUID()};list.push(saved);migrateOperations(next);return saved;});}
  };
}

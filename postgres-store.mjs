import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createAdminStore } from './admin-store.mjs';
import { migrateOperations } from './operations.mjs';

// Fixed identifiers only; user values always use bound parameters.
export const collections=['users','branches','dishes','ingredients','equipment','movements','incidents','routes','transfers','audit'];
const snapshotSQL=`SELECT revision, ${collections.map(k=>`COALESCE((SELECT jsonb_agg(payload ORDER BY position,id) FROM second_serving.${k}), '[]'::jsonb) AS "${k}"`).join(', ')} FROM second_serving.store_meta WHERE singleton`;
const readMethods=['configured','user','catalog','operations','recovery','verify'];
const writeMethods=['setup','save','operate','manageUser'];
export function createPool(connectionString=process.env.DATABASE_URL){
  if(!connectionString)throw Error('DATABASE_URL is required. See DATABASE.md or use npm run dev:local-db. No JSON fallback was used.');
  const url=new URL(connectionString);if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('DATABASE_URL must be a PostgreSQL URL.');
  const pool=new pg.Pool({connectionString,max:10,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:15000,application_name:'second-serving'});
  // An idle connection can fail without an active caller. Avoid unhandled pool errors or secret-bearing URLs.
  pool.on('error',()=>console.error('PostgreSQL idle connection failed; subsequent requests will reconnect.'));
  return pool;
}
export async function migrateDatabase(pool){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(736329410)');
    await client.query('CREATE SCHEMA IF NOT EXISTS second_serving');
    await client.query('CREATE TABLE IF NOT EXISTS second_serving.schema_migrations(version integer PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const sql=await readFile(new URL('./database/migrations/001_operations.sql',import.meta.url),'utf8');
    const checksum=createHash('sha256').update(sql).digest('hex');
    const existing=await client.query('SELECT checksum FROM second_serving.schema_migrations WHERE version=1');
    if(existing.rowCount){if(existing.rows[0].checksum!==checksum)throw Error('Migration 001 checksum changed. Restore the applied migration; add a new migration for schema changes.');}
    else{await client.query(sql);await client.query('INSERT INTO second_serving.schema_migrations(version,checksum) VALUES(1,$1)',[checksum]);}
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
async function load(client){const {rows}=await client.query(snapshotSQL);if(!rows.length)throw Error('Missing PostgreSQL store metadata.');return migrateOperations({version:1,...rows[0],revision:Number(rows[0].revision)});}
async function persist(client,before,next){
  for(const key of collections){
    const previous=new Map(before[key].map(x=>[x.id,JSON.stringify(x)]));
    if(before[key].some(x=>!next[key].some(n=>n.id===x.id)))throw Error('Destructive record deletion is not supported.');
    for(const [position,item] of next[key].entries()){
      const serialized=JSON.stringify(item);if(previous.get(item.id)===serialized)continue;
      await client.query(`INSERT INTO second_serving.${key}(id,position,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload`,[item.id,position,serialized]);
    }
  }
  await client.query('UPDATE second_serving.store_meta SET revision=$1 WHERE singleton',[next.revision]);
}
function liveActor(data,user){const current=data.users.find(u=>u.id===user?.id);if(!current||current.active===false)throw Error('Account is no longer active. Sign in again.');const {salt,hash,...safe}=current;return safe;}
export async function openPostgresStore({connectionString=process.env.DATABASE_URL,pool:provided}={}){
  const pool=provided??createPool(connectionString);
  try{await pool.query('SELECT revision FROM second_serving.store_meta WHERE singleton');}catch(e){if(!provided)await pool.end();if(e.code==='42P01')throw Error('PostgreSQL schema is not initialized. Run npm run db:migrate.');throw e;}
  const store={backend:'postgres',close:()=>provided?Promise.resolve():pool.end()};
  for(const method of [...readMethods,...writeMethods])store[method]=async(...args)=>{
    const client=await pool.connect(),write=writeMethods.includes(method);
    try{
      await client.query('BEGIN');
      // One chain per database. Serialize cross-branch business mutations before reading stock.
      // Fresh snapshots prevent lost updates across independent Node processes.
      if(write)await client.query('SELECT singleton FROM second_serving.store_meta WHERE singleton FOR UPDATE');
      const data=await load(client);
      if(['operations','recovery','operate','manageUser'].includes(method))args[0]=liveActor(data,args[0]);
      if(method==='save'){const actor=liveActor(data,args[2]);if(actor.role!=='admin')throw Error('Administrator access required.');}
      if(method==='manageUser'&&args[0].role!=='admin')throw Error('Administrator access required.');
      const core=createAdminStore(data,next=>persist(client,data,next));
      const result=await core[method](...args);
      await client.query('COMMIT');return result;
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  };
  return store;
}
export function validateImport(raw){
  if(raw?.version!==1||!['users','branches','dishes'].every(k=>Array.isArray(raw[k])))throw Error('Invalid legacy JSON document.');
  const data=migrateOperations(structuredClone(raw));
  for(const key of collections){if(!Array.isArray(data[key]))throw Error(`Invalid ${key} collection.`);const ids=new Set();for(const item of data[key]){if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error(`Missing or duplicate ID in ${key}.`);ids.add(item.id);}}
  for(const u of data.users)if(!/^[a-f0-9]{128}$/i.test(u.hash)||!/^[a-f0-9]{32}$/i.test(u.salt)||!['admin','manager'].includes(u.role))throw Error('Invalid legacy credential record.');
  const has=(key,id)=>data[key].some(x=>x.id===id);
  for(const b of data.branches)if(!Array.isArray(b.dishIds)||b.dishIds.some(id=>!has('dishes',id)))throw Error('Invalid branch menu reference.');
  for(const d of data.dishes)if(!Array.isArray(d.recipe)||d.recipe.some(r=>!has('ingredients',r.ingredientId)||!Number.isFinite(r.quantity)||r.quantity<=0))throw Error('Invalid recipe reference or quantity.');
  for(const u of data.users)if(u.branchIds?.some(id=>!has('branches',id)))throw Error('Invalid user branch assignment.');
  for(const i of data.incidents){if(i.type==='equipment'&&!data.equipment.some(e=>e.id===i.targetId&&e.branchId===i.branchId))throw Error('Invalid incident equipment.');if(i.type==='stock'&&!has('ingredients',i.targetId))throw Error('Invalid incident ingredient.');}
  if(!Number.isSafeInteger(data.revision)||data.revision<0)throw Error('Invalid revision.');return data;
}
export async function importLegacy(pool,raw,checksum){
  const next=validateImport(raw),client=await pool.connect();
  try{
    await client.query('BEGIN');await client.query('SELECT singleton FROM second_serving.store_meta WHERE singleton FOR UPDATE');
    const before=await load(client);if(collections.some(k=>before[k].length))throw Error('Import refused: target database is not empty. Existing records were not changed.');
    const imported=await client.query('SELECT imported_at FROM second_serving.store_meta WHERE singleton');if(imported.rows[0].imported_at)throw Error('Legacy data has already been imported.');
    await persist(client,before,next);await client.query('UPDATE second_serving.store_meta SET imported_at=now(), imported_sha256=$1 WHERE singleton',[checksum]);
    await client.query('COMMIT');return Object.fromEntries(collections.map(k=>[k,next[k].length]));
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}

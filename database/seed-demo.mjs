import { readFile } from 'node:fs/promises';
import { createPool, seedRecordingDemo } from '../postgres-store.mjs';

let pool;
try {
  if(process.argv.slice(2).some(arg=>arg!=='--local'))throw Error('Usage: seed-demo.mjs [--local]');
  if(process.argv.includes('--local')){
    const config=JSON.parse(await readFile(new URL('../data/local-postgres-credentials.json',import.meta.url),'utf8'));
    if(config.user!=='second_serving'||!Number.isInteger(config.port)||config.port<1024||config.port>65535||!/^[a-f0-9]{64}$/.test(config.password))throw Error('Invalid local database configuration. No records were changed.');
    process.env.DATABASE_URL=`postgresql://${config.user}:${config.password}@127.0.0.1:${config.port}/second_serving`;
  }
  pool=createPool();
  const result=await seedRecordingDemo(pool);
  console.log(result.created?'Added fictional DEMO recording data. Existing records and accounts were preserved.':'DEMO data already exists. No records, stock, incidents or deadlines were reset.');
  console.log(JSON.stringify({scenario:result.scenario,branches:Object.fromEntries(Object.entries(result.branches).map(([key,b])=>[key,b.name])),dish:result.dish.name,expected:result.expected,inMemoryPreflight:result.inMemoryPreflight??'Not rerun: existing demo data is left untouched.'},null,2));
  console.log('The preflight is an in-memory simulation, not a saved delivery. Refresh data in /ops and choose DEMO Shinjuku East.');
  console.log('Create the incident and fresh 60-minute deadline when recording. See DEMO-DATA.md.');
}catch(error){
  console.error(error.code?`Demo setup failed (${error.code}). Check that the intended PostgreSQL database is running and initialized. No partial seed was committed.`:`Demo setup failed: ${error.message}`);
  process.exitCode=1;
}finally{await pool?.end();}

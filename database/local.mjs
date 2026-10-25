// Development convenience only: real PostgreSQL, no Windows service or Docker.
import EmbeddedPostgres from 'embedded-postgres';
import { mkdir,readFile,writeFile,access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes,createHash } from 'node:crypto';
import { createPool,migrateDatabase,importLegacy } from '../postgres-store.mjs';
const credentialsFile=new URL('../data/local-postgres-credentials.json',import.meta.url);
const databaseDir=fileURLToPath(new URL('../data/postgres',import.meta.url));
let config;
try{config=JSON.parse(await readFile(credentialsFile,'utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;if(process.argv[2]==='setup')throw Error('Start npm run dev:local-db first.');await mkdir(new URL('../data/',import.meta.url),{recursive:true});config={user:'second_serving',password:randomBytes(32).toString('hex'),port:55432};await writeFile(credentialsFile,JSON.stringify(config),{mode:0o600,flag:'wx'});}
if(config.user!=='second_serving'||!Number.isInteger(config.port)||config.port<1024||config.port>65535||!/^[a-f0-9]{64}$/.test(config.password))throw Error('Invalid local PostgreSQL configuration. No files were changed.');
process.env.DATABASE_URL=`postgresql://${config.user}:${config.password}@127.0.0.1:${config.port}/second_serving`;
process.env.STORAGE_DRIVER='postgres';
process.env.LOCAL_POSTGRES='1';
if(process.argv[2]==='setup'){await import('../setup-admin.mjs');}
else{
  const database=new EmbeddedPostgres({databaseDir,...config,authMethod:'scram-sha-256',persistent:true,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
  let stopServer,stopping=false;
  async function stop(){if(stopping)return;stopping=true;try{if(stopServer)await stopServer();}finally{await database.stop();}}
  try{
    try{await access(new URL('../data/postgres/PG_VERSION',import.meta.url));}catch(e){if(e.code!=='ENOENT')throw e;await database.initialise();}
    await database.start();
    const client=database.getPgClient('postgres','127.0.0.1');await client.connect();try{const exists=await client.query("SELECT 1 FROM pg_database WHERE datname='second_serving'");if(!exists.rowCount)await client.query('CREATE DATABASE second_serving');}finally{await client.end();}
    const pool=createPool();try{await migrateDatabase(pool);if(process.argv.includes('--import-legacy')){const source=await readFile(new URL('../data/admin.json',import.meta.url),'utf8');console.log('Legacy import:',await importLegacy(pool,JSON.parse(source),createHash('sha256').update(source).digest('hex')));}}finally{await pool.end();}
    console.log(`Local PostgreSQL ready on 127.0.0.1:${config.port}. Data is persistent; credentials are not printed.`);
    ({stopServer}=await import('../server.mjs'));
    process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());
  }catch(e){await stop();throw e;}
}

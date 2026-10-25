import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPool,migrateDatabase,importLegacy } from '../postgres-store.mjs';
const command=process.argv[2],pool=createPool();
try{
  if(command==='migrate'){await migrateDatabase(pool);console.log('PostgreSQL migrations applied.');}
  else if(command==='import'){
    const file=process.argv[3];if(!file)throw Error('Usage: npm run db:import -- path/to/admin.json');
    const source=await readFile(file,'utf8');const counts=await importLegacy(pool,JSON.parse(source),createHash('sha256').update(source).digest('hex'));
    console.log('Import committed. Source JSON was not modified. Counts:',counts);
  }else if(command==='check'){const r=await pool.query('SELECT version FROM second_serving.schema_migrations ORDER BY version');console.log('PostgreSQL connected; migrations:',r.rows.map(x=>x.version).join(', '));}
  else throw Error('Choose migrate, import or check.');
}catch(e){console.error(`Database command failed (${e.code??'validation'}): ${e.code?'Check DATABASE_URL, server availability and schema.':e.message}`);process.exitCode=1;}finally{await pool.end();}

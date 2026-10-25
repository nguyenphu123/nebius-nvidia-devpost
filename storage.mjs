import { fileURLToPath } from 'node:url';
import { openAdminStore } from './admin-store.mjs';
import { openPostgresStore } from './postgres-store.mjs';
export async function openStore(){
  const driver=process.env.STORAGE_DRIVER??'postgres';
  if(driver==='postgres')return openPostgresStore();
  if(driver==='json'){const store=await openAdminStore(process.env.ADMIN_DATA_FILE||fileURLToPath(new URL('./data/admin.json',import.meta.url)));return {...store,backend:'json',close:async()=>{}};}
  throw Error('STORAGE_DRIVER must be postgres or json.');
}

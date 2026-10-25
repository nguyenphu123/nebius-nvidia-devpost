// Isolated disposable UI preview. Never writes the real data/admin.json.
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openAdminStore } from './admin-store.mjs';
const dir=await mkdtemp(join(tmpdir(),'second-serving-preview-'));
process.env.ADMIN_DATA_FILE=join(dir,'admin.json');process.env.PORT='3101';
process.env.STORAGE_DRIVER='json';
const s=await openAdminStore(process.env.ADMIN_DATA_FILE);
await s.setup('preview','preview-only-password');const u=await s.verify('preview','preview-only-password');
const dish=await s.save('dishes',{name:'Chicken Karaage',price:480,category:'Sides',description:'Crisp fried chicken, prepared to order.',allergens:'Wheat, soy — verify recipe and cross-contact',active:true});
const ingredient=await s.operate(u,'ingredient.save',{name:'Chicken thigh',unit:'kg',active:true});
await s.operate(u,'recipe.save',{id:dish.id,recipe:[{ingredientId:ingredient.id,quantity:.2}],requiredEquipment:['fryer'],prepMinutes:8,packMinutes:3,maxTravelMinutes:20});
for(const name of ['Shinjuku East','Yotsuya Kitchen']){const b=await s.save('branches',{name,address:'Tokyo — demonstration location',active:true,dishIds:[dish.id]});await s.operate(u,'equipment.save',{branchId:b.id,name:'Main fryer',type:'fryer',status:'working',notes:'Demo asset'});await s.operate(u,'stock.move',{branchId:b.id,ingredientId:ingredient.id,type:'receive',quantity:8,reason:'Opening demo stock'});}
const [a,b]=s.catalog().branches;await s.operate(u,'route.save',{from:b.id,to:a.id,minutes:12,cost:650,approved:true});
const {server}=await import('./server.mjs');
console.log('Disposable preview: username preview / password preview-only-password');
let closing=false;async function close(){if(closing)return;closing=true;server.closeAllConnections();server.close(async()=>{await rm(dir,{recursive:true,force:true});process.exit(0);});}
process.on('SIGINT',close);process.on('SIGTERM',close);

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openAdminStore } from '../admin-store.mjs';
import { createAuth } from '../admin-auth.mjs';
test('admin setup, credential checks, catalog writes and restart persistence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ss-admin-test-'));try{
 const file=join(dir,'admin.json'),store=await openAdminStore(file);
 await assert.rejects(store.setup('owner','short'));
 await store.setup('Owner','test-only-password-123');
 await assert.rejects(store.setup('other','test-only-password-123'));
 assert.equal(await store.verify('owner','wrong'),null);
 assert.equal((await store.verify('OWNER','test-only-password-123')).role,'admin');
 assert.ok(!(await readFile(file,'utf8')).includes('test-only-password-123'));
 const dish=await store.save('dishes',{name:'Karaage',category:'Side',price:450,active:true});
 await assert.rejects(store.save('dishes',{name:'Karaage',category:'Side',price:450,active:true}));
 await assert.rejects(store.save('branches',{name:'East',address:'Tokyo',active:true,dishIds:['missing']}));
 await store.save('branches',{name:'East',address:'Tokyo',active:true,dishIds:[dish.id]});
 await store.save('dishes',{...dish,active:false});
 const restored=await openAdminStore(file);assert.equal(restored.catalog().dishes[0].active,false);assert.deepEqual(restored.catalog().branches[0].dishIds,[dish.id]);
 const copy=restored.catalog();copy.dishes.length=0;assert.equal(restored.catalog().dishes.length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('sessions rotate, expire, logout and rate limits apply',()=>{
 let time=0;const auth=createAuth({now:()=>time}),headers={},res={setHeader:(k,v)=>headers[k]=v},req={headers:{}};
 assert.equal(auth.user(req),null);auth.login(req,res,{id:'1',role:'admin'});const original=headers['Set-Cookie'];assert.match(original,/HttpOnly; SameSite=Strict/);req.headers.cookie=original.split(';')[0];assert.equal(auth.user(req).id,'1');auth.login(req,res,{id:'1',role:'admin'});assert.equal(auth.user(req),null);req.headers.cookie=headers['Set-Cookie'].split(';')[0];time=8*3600_000+1;assert.equal(auth.user(req),null);auth.login(req,res,{id:'1'});req.headers.cookie=headers['Set-Cookie'].split(';')[0];auth.logout(req,res);assert.equal(auth.user(req),null);for(let i=0;i<10;i++)assert.equal(auth.allowed('local'),true);assert.equal(auth.allowed('local'),false);time+=15*60_000;assert.equal(auth.allowed('local'),true);
});
test('parallel catalog writes do not lose entries',async()=>{const dir=await mkdtemp(join(tmpdir(),'ss-admin-parallel-'));try{const store=await openAdminStore(join(dir,'admin.json'));await Promise.all(['A','B','C'].map(name=>store.save('dishes',{name,price:0,active:true,category:'Test'})));assert.equal(store.catalog().dishes.length,3);}finally{await rm(dir,{recursive:true,force:true});}});

import { randomBytes } from 'node:crypto';
export function createAuth({now=Date.now,secure=false}={}) {
  const sessions=new Map(),attempts=new Map();
  const cookie=(value,age)=>`ss_admin=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`;
  function token(req){return /(?:^|;\s*)ss_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'')?.[1];}
  return {
    allowed(ip){const t=now();for(const [k,v] of attempts)if(v.until<=t)attempts.delete(k);const a=attempts.get(ip)??{count:0,until:t+15*60_000};a.count++;attempts.set(ip,a);return a.count<=10;},
    login(req,res,user){for(const [k,v] of sessions)if(v.expires<=now())sessions.delete(k);sessions.delete(token(req));const key=randomBytes(32).toString('hex');sessions.set(key,{user,expires:now()+8*3600_000});res.setHeader('Set-Cookie',cookie(key,8*3600));},
    user(req){const key=token(req),session=sessions.get(key);if(!session)return null;if(session.expires<=now()){sessions.delete(key);return null;}return session.user;},
    logout(req,res){sessions.delete(token(req));res.setHeader('Set-Cookie',cookie('',0));}
  };
}

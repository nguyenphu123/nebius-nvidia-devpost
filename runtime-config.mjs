import { isIP } from 'node:net';

// Public deployments opt in to one exact HTTPS origin. Local development stays
// on loopback and never trusts forwarded host/origin headers from a request.
export function readRuntimeConfig(env=process.env) {
  const port=Number(env.PORT || 3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from 1 to 65535.');
  let origin;
  if(env.PUBLIC_ORIGIN){
    try{origin=new URL(env.PUBLIC_ORIGIN);}catch{throw Error('PUBLIC_ORIGIN must be an HTTPS origin such as https://your-app.onrender.com.');}
    if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('PUBLIC_ORIGIN must be an HTTPS origin without a path, credentials or query.');
  }
  if(env.NODE_ENV==='production'&&!origin)throw Error('PUBLIC_ORIGIN is required in production.');
  const hosted=Boolean(origin),host=env.HOST || (hosted?'0.0.0.0':'127.0.0.1');
  if(!isIP(host))throw Error('HOST must be an IP address.');
  if(!hosted&&!['127.0.0.1','::1'].includes(host))throw Error('A public listener requires an explicit HTTPS PUBLIC_ORIGIN.');
  return {
    port,host,hosted,secureCookies:hosted,
    publicOrigin:origin?.origin,
    allowedHosts:new Set(hosted?[origin.host]:[`localhost:${port}`,`127.0.0.1:${port}`]),
    allowedOrigins:new Set(hosted?[origin.origin]:[`http://localhost:${port}`,`http://127.0.0.1:${port}`])
  };
}

// Bound both concurrency and the number of paid inference requests. This is a
// single-process pilot limit; run one web-service instance.
export function createAdviceLimits({now=Date.now}={}) {
  let windowStart=now(),total=0,active=0;
  const users=new Map();
  return {
    acquire(userId){
      const time=now();
      if(time-windowStart>=3600_000){windowStart=time;total=0;}
      for(const [id,user] of users)if(time-user.start>=600_000&&!user.active)users.delete(id);
      const user=users.get(userId)??{start:time,count:0,active:false};
      if(user.active||active>=2||total>=60||user.count>=10||(!users.has(userId)&&users.size>=1000))return null;
      user.active=true;user.count++;users.set(userId,user);total++;active++;
      let released=false;
      return ()=>{if(!released){released=true;user.active=false;active--;}};
    }
  };
}

export const branches = [
  { id:'B', name:'B · Station', distance:0.8, travel:5, queue:25, capacity:20, portions:30 },
  { id:'C', name:'C · Riverside', distance:2.1, travel:10, queue:4, capacity:16, portions:24 }
];
export function validateIncident(raw) {
  if (!raw || raw.branch !== 'A' || raw.equipment !== 'fryer') throw new Error('This pilot supports a fryer outage at branch A only.');
  for (const [key,min,max] of [['portions',1,40],['deadline',5,90]]) if (!Number.isInteger(raw[key]) || raw[key]<min || raw[key]>max) throw new Error(`${key} must be an integer from ${min} to ${max}.`);
  return {branch:'A',equipment:'fryer',portions:raw.portions,deadline:raw.deadline};
}
export function assessRescue(raw, reserved = {}) {
  const incident=validateIncident(raw);
  const options=branches.map(b=>{
    const available=Math.max(0,Math.min(b.capacity,b.portions)-(reserved[b.id]||0));
    const eta=b.queue+10+3+b.travel;
    const reasons=[];
    if(b.travel>20)reasons.push('Exceeds the demo policy travel limit of 20 minutes.');
    if(available<incident.portions)reasons.push(`Only ${available} unreserved portions available; ${incident.portions} requested.`);
    if(eta>incident.deadline)reasons.push(`Arrival in ${eta} min exceeds the ${incident.deadline}-minute deadline.`);
    return {...b, available, eta, slack:incident.deadline-eta, eligible:!reasons.length,reasons,transferCost: b.id==='B'?500:900};
  });
  const recommended=options.filter(o=>o.eligible).sort((a,b)=>a.eta-b.eta||a.transferCost-b.transferCost)[0]?.id||null;
  return {incident,options,recommended,affectedMenu:['Karaage'],unaffectedMenu:['Ramen'],policy:'DEMO-P1: cross-branch karaage transfer permitted; maximum travel 20 minutes. Fictional policy, not food-safety guidance.',assumptions:['Preparation 10 min and packing 3 min assume this order fits one batch.','Travel and queues are fixed demo estimates, not live routing.','Deadline starts at assessment; not a live service clock.','Transfer cost excludes food cost and lost sales.']};
}
export function createRescueStore() {
  const jobs=new Map(),reserved={};
  return {
    assess:raw=>assessRescue(raw,reserved),
    create(raw) {
      if(raw.confirmed!==true)throw new Error('Confirm destination acceptance, transport and policy before reserving.');
      if(typeof raw.requestId!=='string'||!/^[\w-]{1,80}$/.test(raw.requestId))throw new Error('Invalid request ID.');
      if(jobs.has(raw.requestId)) {
        const old=jobs.get(raw.requestId);
        if(JSON.stringify(old.incident)!==JSON.stringify(validateIncident(raw.incident))||old.destination!==raw.destination)throw new Error('Request ID already used for a different plan.');
        return old;
      }
      const assessment=assessRescue(raw.incident,reserved);
      const option=assessment.options.find(o=>o.id===raw.destination);
      if(!option?.eligible)throw new Error('Option no longer feasible. Reassess before reserving.');
      reserved[option.id]=(reserved[option.id]||0)+assessment.incident.portions;
      const job={id:raw.requestId,incident:assessment.incident,destination:option.id,status:'accepted',eta:option.eta,transferCost:option.transferCost,events:[{status:'accepted',at:new Date().toISOString()}]};
      jobs.set(job.id,job);return job;
    },
    advance(id,status) {
      const job=jobs.get(id);if(!job)throw new Error('Unknown job; server restarts clear demo jobs.');
      const next={accepted:'preparing',preparing:'in_transit',in_transit:'received'};
      if(status!=='cancelled'&&next[job.status]!==status)throw new Error('Invalid workflow transition.');
      if(status==='cancelled'&&!['accepted','preparing'].includes(job.status))throw new Error('Cannot cancel after dispatch.');
      if(status==='cancelled')reserved[job.destination]-=job.incident.portions;
      job.status=status;job.events.push({status,at:new Date().toISOString()});return job;
    }
  };
}

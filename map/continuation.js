// Compose existing directional venue legs with the shared OSM walking network.
const cached = new Map();
const read = url => {
  if (!cached.has(url)) cached.set(url, fetch(url).then(r => {
    if (!r.ok) throw Error('Route data unavailable');
    return r.json();
  }).catch(error => { cached.delete(url); throw error; }));
  return cached.get(url);
};
const metres = (a,b) => Math.hypot((a[0]-b[0])*84000,(a[1]-b[1])*111000);
const foot = new Set(['footway','path','pedestrian','living_street','steps','corridor']);
const outdoor = n => n?.osm && n.zone==='outdoor' && (n.id.startsWith('osm-') || n.id.startsWith('cpt-G-'));
export async function loadContinuationVenue(id) {
  if (id==='central-park-tower') {
    const {graph,routes:routeData,venue}=await read('data/buildings/cpt-map.json');
    return {id,graph,routeData,venue,nodes:Object.fromEntries(graph.nodes.map(n=>[n.id,n]))};
  }
  const base='data/venues/'+id+'/';
  const [graph,routeData]=await Promise.all([read(base+'graph.json'),read(base+'routes.json')]);
  return {id,graph,routeData,nodes:Object.fromEntries(graph.nodes.map(n=>[n.id,n]))};
}
function cutAtStreet(steps,nodes,leaving) {
  const ordered=leaving?steps:steps.slice().reverse();
  for (const s of ordered) {
    const ids=leaving?s.nodes:s.nodes.slice().reverse();
    const i=ids.findIndex(id=>outdoor(nodes[id]));
    if(i<0)continue;
    const j=steps.indexOf(s),cut=leaving?ids.slice(0,i+1):ids.slice(0,i+1).reverse();
    const partial=cut.length>1?[{...s,nodes:cut,distance_m:cut.slice(1).reduce((m,id,k)=>m+metres(nodes[cut[k]].lonlat,nodes[id].lonlat),0)}]:[];
    return {anchor:nodes[ids[i]],steps:leaving?[...steps.slice(0,j),...partial]:[...partial,...steps.slice(j+1)]};
  }
  return null;
}
export function venueLeg(data,{endpoint,platform,targetId,leaving,stepFree=false,badge=false}) {
  const {graph,routeData,nodes}=data;
  const options=[];
  for (const [key,route] of Object.entries(routeData.routes)) {
    if(!route.steps)continue;
    const [start,target,credential,free,back]=key.split('|');
    if (+free!==+stepFree || (+credential && !badge)) continue;
    if(platform && nodes[start]?.level!==platform)continue;
    if(platform && Boolean(+back)===leaving)continue;
    if(!platform && !leaving && (+back || (targetId||routeData.targets[0]?.id)!==target))continue;
    const end=leaving?route.steps[0].nodes[0]:route.steps.at(-1).nodes.at(-1);
    if(endpoint&&end!==endpoint)continue;
    const leg=cutAtStreet(route.steps,nodes,leaving);
    if(leg)options.push({...leg,id:data.id,graph,nodes,score:leg.steps.length*4+(route.time?.low_s||0)*.01});
  }
  return options.sort((a,b)=>a.score-b.score)[0]||null;
}
export async function streetContinuation(a,b,stepFree) {
  const data=await read('data/continuation-walk.json');
  const candidates = point => {
    if(point.id?.startsWith('osm-') && data.nodes[point.id.slice(4)])return [[point.id.slice(4),0]];
    return Object.entries(data.nodes).map(([id,p])=>[id,metres(p,point.lonlat)])
      .filter(([,d])=>d<=25).sort((a,b)=>a[1]-b[1]).slice(0,12);
  };
  const starts=candidates(a),ends=new Map(candidates(b));
  if(!starts.length||!ends.size)return null;
  const adj=new Map();
  for(const [u,v,kind,name] of data.edges){
    if(stepFree&&kind==='steps')continue;
    const cost=metres(data.nodes[u],data.nodes[v])*(foot.has(kind)?1:3);
    if(!adj.has(u))adj.set(u,[]);
    if(!adj.has(v))adj.set(v,[]);
    adj.get(u).push({id:v,cost,kind,name});
    adj.get(v).push({id:u,cost,kind,name});
  }
  const distance=new Map(starts.map(([id,d])=>[id,d*6])),prev=new Map(),queue=new Set(distance.keys());
  let end=null,best=Infinity;
  while(queue.size){
    let u=null;
    for(const id of queue)if(u===null||distance.get(id)<distance.get(u))u=id;
    queue.delete(u);
    if(distance.get(u)>=best)break;
    if(ends.has(u)&&distance.get(u)+ends.get(u)*6<best){end=u;best=distance.get(u)+ends.get(u)*6;}
    for(const edge of adj.get(u)||[]){
      const d=distance.get(u)+edge.cost;
      if(d>=(distance.get(edge.id)??Infinity))continue;
      distance.set(edge.id,d);prev.set(edge.id,{...edge,from:u});queue.add(edge.id);
    }
  }
  if(end===null)return null;
  const links=[];
  let start=end;
  while(prev.has(start)){const edge=prev.get(start);links.unshift({a:data.nodes[edge.from],b:data.nodes[start],...edge});start=edge.from;}
  if(metres(a.lonlat,data.nodes[start])>.05)links.unshift({a:a.lonlat,b:data.nodes[start],kind:'walk',name:'',snap:true});
  if(metres(b.lonlat,data.nodes[end])>.05)links.push({a:data.nodes[end],b:b.lonlat,kind:'walk',name:'',snap:true});
  return links;
}

export function normalizedLeg(leg){
 const levels=Object.fromEntries(leg.graph.levels.map(l=>[l.id,l]));
 const point=id=>{
  const n=leg.nodes[id],l=levels[n.level];
  return {lonlat:n.lonlat,elev:l.elev_m,owner:leg.id,level:l.id,name:l.name,short:l.short_name,underground:l.underground};
 };
 return {
  steps:leg.steps.filter(s=>s.nodes.length>1).map(s=>({...s,points:s.nodes.map(point)})),
  anchor:leg.anchor,
  start:point(leg.steps[0]?.nodes[0]??leg.anchor.id),
  end:point(leg.steps.at(-1)?.nodes.at(-1)??leg.anchor.id)
 };
}
export async function connectLegs(exit,entry,stepFree){
 if(!exit||!entry)return null;
 const street=await streetContinuation(exit.anchor||exit.end,entry.anchor||entry.start,stepFree);
 if(!street)return null;
 const groups=[];
 for(const edge of street){
  const kind=edge.kind==='steps'?'stairs':'walk';
  const text=edge.snap?'Follow the modelled entrance connection.':kind==='stairs'?'Use the outdoor stairs.':
    edge.name?'Follow '+edge.name+'.':'Follow the mapped pedestrian connection.';
  const point=lonlat=>({lonlat,elev:exit.end.elev,level:'street',name:'Street connection',short:'G'});
  const last=groups.at(-1);
  if(last?.text===text)last.points.push(point(edge.b));
  else groups.push({kind,text,points:[point(edge.a),point(edge.b)]});
 }
 // Preserve the exact terminal heights from each model registration.
 if(groups.length){
  groups[0].points[0]={...exit.end};
  groups.at(-1).points[groups.at(-1).points.length-1]={...entry.start};
 }
 return [...exit.steps,...groups,...entry.steps];
}

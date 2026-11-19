// Additive adapters. Evidence fixes identity/counts; XY, rise and B/A mapping are model hypotheses.
export const entrances=[
{id:'penn32',name:'32 St entrance → Penn B',floor:'B',top:151,bottom:141.3,z:0,y:-5.3,door:[108,-5.3,10],lift:[149,12],landingX:138.3,lanes:[-6,-3,0],stairs:5,source:'Amtrak 2023-11-19：3Escalators, stairs and elevator; photographs 4/6 show adjacent equipment. B-level mapping, coordinates and the 5.6mm rise is a scenario value.'},
{id:'gateway',name:'East End Gateway → Penn A',floor:'A',top:145,bottom:123.6,z:-101,y:-11.3,door:[113,-11.3,-96],lift:[134,-86],landingX:120.6,lanes:[-107,-104,-101],stairs:-96,source:'CSA/WSP：3Escalators and stairs lead to the LIRR 33rd Street Concourse; EL618 photographs identify both landings. A-level mapping, coordinates and the 11.6mm rise is a scenario value.'}
];
export const entranceHoles=entrances.flatMap(e=>[[e.landingX,e.lanes[0]-2,e.top,e.stairs+2],[e.lift[0]-2.2,e.lift[1]-2.2,e.lift[0]+2.2,e.lift[1]+2.2]]);
export function entranceJourney(e,kind='escalator'){
 const z=kind==='stairs'?e.stairs:e.lanes[1],h=.3;
 if(kind==='elevator')return[
 {p:[e.lift[0]+4,h,e.lift[1]],text:'Street elevator lobby · check entrance and elevator signs'},
 {p:[e.lift[0]+1.7,h,e.lift[1]],text:'Wait for doors before boarding · door orientation assumed'},
 {p:[e.lift[0],h,e.lift[1]],text:'Inside the car · illustrative movement only'},
 {p:[e.lift[0],e.y,e.lift[1]],text:'Arrive underground · rise is a scenario value'},
 {p:[e.lift[0]-4,e.y,e.lift[1]],text:'Exit into the separate elevator lobby · through-car doors unverified'},
 {p:[e.landingX,e.y,e.lift[1]],text:'Connecting corridor · adaptation, not confirmed by plans'},
 {p:[e.landingX,e.y,e.door[2]],text:'Turn toward the concourse, around the equipment base'},
 {p:e.door,text:'Enter the fixed '+e.floor+' concourse passage · registration unverified'}];
 const run=e.top-e.bottom,mid=(e.top+e.bottom)/2,ym=(h+e.y)/2;
 return[{p:[e.top+3,h,z],text:'Street landing · no subway fare gate at this station entrance'},
 {p:[e.top,h,z],text:kind==='stairs'?'Enter the stairs through the opening in the upper guardrail':'Board the middle escalator · downward operation assumed'},
 ...(kind==='stairs'?[{p:[mid+.9,ym,z],text:'Finish the first flight and reach the intermediate landing'},{p:[mid-.9,ym,z],text:'Cross the intermediate landing and continue down'}]:[{p:[mid,ym,z],text:'Descend the escalator · both landings shown'}]),
 {p:[e.bottom,e.y,z],text:'Underground exit · keep the landing clear'},
 {p:[e.landingX,e.y,z],text:'Clear the landing, then turn'},
 {p:[e.landingX,e.y,e.door[2]],text:'Connecting passage · coordinates and width assumed'},
 {p:e.door,text:'Enter the fixed '+e.floor+' concourse passage · registration unverified'}];
}

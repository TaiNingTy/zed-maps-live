// Conceptual upper-floor access network in the registered 2024 pixel frame.
// Hall axes follow the public hall arrangement; room access is a design proposal.
import {point} from './penn-interiors.js';
export const upperCorridors=[
 {id:'hall-west',name:'West main corridor',points:[[350,260],[350,710]],width:4,tier:'scenario'},
 {id:'hall-cross',name:'East–west hall connection',points:[[350,430],[1150,430]],width:4,tier:'scenario'},
 {id:'hall-east',name:'East main corridor',points:[[960,430],[960,740]],width:4,tier:'scenario'},
 {id:'room-0',room:0,points:[[192.5,165],[320,165],[320,260],[350,260]]},
 {id:'room-1',room:1,points:[[550,129],[550,180],[420,180],[420,270],[350,270]]},
 {id:'room-2',room:2,points:[[737.5,129],[737.5,180],[550,180]]},
 {id:'room-3',room:3,points:[[615,214.5],[615,270],[420,270]]},
 {id:'room-4',room:4,points:[[190,440],[350,440]]},
 {id:'room-5',room:5,points:[[190,700],[350,700]]},
 {id:'room-6',room:6,points:[[525,670],[525,600],[350,600]]},
 {id:'room-7',room:7,points:[[730,710],[730,590],[650,590],[650,430]]},
 {id:'room-8',room:8,points:[[895,267.5],[970,267.5],[970,430]]},
 {id:'room-9',room:9,points:[[1095,232.5],[1095,320],[970,320]]},
 {id:'room-10',room:10,points:[[1140,687.5],[1030,687.5],[960,687.5]]}
].map(c=>({...c,width:c.width||3.2,tier:'scenario',world:c.points.map(point)}));
export const upperPassageRects=upperCorridors.flatMap(c=>c.world.slice(1).map((b,i)=>{const a=c.world[i],h=c.width/2;return[Math.min(a[0],b[0])-h,-Math.max(a[1],b[1])-h,Math.max(a[0],b[0])+h,-Math.min(a[1],b[1])+h];}));
export function clearOfUpperPassages(x,z,w,d){return !upperPassageRects.some(r=>x+w/2+1>r[0]&&x-w/2-1<r[2]&&-z+d/2+1>r[1]&&-z-d/2-1<r[3]);}

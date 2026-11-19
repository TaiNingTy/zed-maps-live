// Historical FEIS Figures 14-9, 14-10a/b (drawing date 2021-12-01).
// Manual pixel tracing; station-to-Penn assembly and precise stair thresholds remain provisional.
export function stationPoint(t,x,y){const m=t==='irt'?30.48/199:30.48/232;return[(t==='irt'?170:-174)+(y-(t==='irt'?1011:582))*m,-92-(x-(t==='irt'?1163:400))*m];}
export function platformPoint(t,x,y){return t==='irt'?stationPoint(t,x-5.5,y+643):stationPoint(t,x*1.2540540540540541-57.394594594594615,y*1.2540540540540541-161.91351351351352);}
export const stairRecords=[
{id:'IND-M27',t:'ind',platform:[809,591],lower:[982,580],source:'14-10a/b · 34 St · M27',service:'A express',status:'Equipment ID matched across plans; approximate landings'},
{id:'IND-M30',t:'ind',platform:[951,591],lower:[1100,580],source:'14-10a/b · 34 St · M30',service:'A express',status:'Equipment ID matched across plans; approximate landings'},
{id:'IND-M9-M10',t:'ind',platform:[932,495],lower:[1085,478],source:'14-10a/b · 34 St · M9/M10',service:'C/E southbound',status:'Matching stairs; multi-flight connection envelope'},
{id:'IND-M11-M12',t:'ind',platform:[835,700],lower:[944,715],source:'14-10a/b · 34 St · M11/M12',service:'C/E northbound',status:'Matching stairs; switchback details unverified'},
{id:'IND-M24',t:'ind',platform:[425,602],lower:[499,592],source:'14-10a/b · 33 St · M24',service:'A express',status:'Matching stairs; approximate landings'},
{id:'IND-M34',t:'ind',platform:[1380,590],lower:[1620,580],source:'14-10a/b · 35 St · M34',service:'A express',status:'Matching stairs; approximate landings'},
{id:'IRT-ML8',t:'irt',platform:[1102,455],lower:[1090,1138],source:'14-9 · 33 St · ML8',service:'1 northbound',status:'Separate from EL214; not an exit directly behind the elevator'}
];
export const stationStairs=stairRecords.map(s=>({...s,kind:'stairs',a:s.t+'M',b:s.t+'P',from:stationPoint(s.t,...s.lower),to:platformPoint(s.t,...s.platform),oriented:true,tier:'scenario',name:s.source+' · '+s.status}));
// Three uninterrupted boarding bands, with back-of-platform circulation pockets.
// The extension north of the 35 St entrances is drawn context, not claimed usable boarding length.
export const indPlatforms=[
 {name:'C / E · southbound',ring:[[250,518],[250,405],[310,405],[310,350],[370,350],[370,500],[765,500],[765,460],[820,460],[820,405],[905,405],[905,438],[940,438],[940,500],[1335,500],[1335,417],[1445,417],[1445,500],[1520,500],[1520,508],[1620,508],[1620,518],[2100,518],[2100,527],[250,527]]},
 {name:'A · express',ring:[[355,565],[1620,565],[1620,573],[1740,573],[1740,610],[355,610]]},
 {name:'C / E · northbound',ring:[[250,655],[2100,655],[2100,665],[1620,665],[1620,678],[1445,678],[1445,752],[1335,752],[1335,680],[940,680],[940,780],[820,780],[820,760],[765,760],[765,680],[370,680],[370,780],[250,780]]}
];
export const indTrackY=[540,552,626,641];
export const irtPockets=[[[1040,443],[1166,443],[1166,479],[1124,479],[1124,463],[1115,463],[1115,505],[1040,505]],[[1075,220],[1152,220],[1152,280],[1075,280]]];

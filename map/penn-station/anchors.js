// Pixel candidates read from 2024 Existing lower and aligned upper plans.
// Footprint correspondence is evidence; device type and threshold positions are not verified.
export const abAnchors=[
{id:'AB-stairs',kind:'stairs',lowerPixel:[379,360],upperPixel:[381,405],footprints:{A:[367,365,390,391],B:[372,370,392,409]},opening:[-65,-14.5,6,15]},
{id:'AB-escalator',kind:'escalator',lowerPixel:[379,499],upperPixel:[381,454],footprints:{A:[369,466,390,505],B:[372,452,392,495]},opening:[-65,9.5,7,15]},
{id:'AB-elevator',kind:'elevator',lowerPixel:[379,571],upperPixel:[380,572],footprints:{A:[364,564,395,582],B:[372,565,389,583]},opening:[-65.125,32.875,4,4]}
];
export const pixelToWorld=([x,y])=>[(x-640)*.25,(y-440)*.25];
export const calibratedAB=abAnchors.map(c=>({...c,a:'A',b:'B',from:pixelToWorld(c.lowerPixel),to:pixelToWorld(c.upperPixel),tier:'scenario',name:'2024Candidate plan position; type, landings and direction unverified'}));

// Opening stops at the upper threshold; the landing lies entirely beyond it.
for(const c of abAnchors){const a=pixelToWorld(c.lowerPixel),b=pixelToWorld(c.upperPixel);if(c.kind!=='elevator'){const shift=c.kind==='escalator'?1.35:0;const margin=c.kind==='escalator'?2.6:2.1;c.opening[0]=(a[0]+b[0])/2+shift;c.opening[1]=(a[1]+b[1])/2;c.opening[2]=Math.abs(b[0]-a[0])+margin*2;c.opening[3]=Math.abs(b[1]-a[1]);}}

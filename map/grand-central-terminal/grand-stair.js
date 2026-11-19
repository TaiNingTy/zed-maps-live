import * as T from "three";

export const GRAND_RAIL_INSET = .17;
export const GRAND_POST_WIDTH = .32;

// The 2010 balcony plan shows a central flight and two transverse returns.
// The lower reference is local to the balcony so the assembly moves as a unit.
export function buildGrandStair(parent, plan, {box, material, stoneRail, stone}) {
  const {edge,inward,z,upperRun,upperHalf,landingDepth,landingHalf,wingRun,
    landingRise,upperSteps,wingSteps}=plan;
  const landingY=landingRise-parent.userData.physicalElevation;
  const bottomY=-parent.userData.physicalElevation;
  const front=upperRun+landingDepth;
  const mid=(upperRun+front)/2;
  const marble=0xe2d1b8;
  const at=(u,v)=>[edge+inward*u,z+v];
  const prism=(u,v,y,w,h,d,color)=>box(parent,...[at(u,v)[0],y,at(u,v)[1]],w,h,d,color);
  const spindle=new T.LatheGeometry([[.14,0],[.11,.13],[.085,.27],[.13,.43],[.1,.62]]
    .map(([r,h])=>new T.Vector2(r,h)),8);

  // Each flight has one stepped profile. Adjacent treads do not have overlapping faces.
  function flight(start, end, width, low, high, steps) {
    const [ax,az]=at(...start), [bx,bz]=at(...end);
    const length=Math.hypot(bx-ax,bz-az);
    const profile=new T.Shape();
    profile.moveTo(0,low);
    for(let i=0;i<steps;i++) {
      const y=low+(high-low)*(i+1)/steps;
      profile.lineTo(i*length/steps,y);
      profile.lineTo((i+1)*length/steps,y);
    }
    profile.lineTo(length,bottomY);
    profile.lineTo(0,bottomY);
    const geometry=new T.ExtrudeGeometry(profile,{depth:width,bevelEnabled:false});
    geometry.translate(0,0,-width/2);
    const mesh=new T.Mesh(geometry,material(marble));
    mesh.position.set(ax,0,az);
    mesh.rotation.y=-Math.atan2(bz-az,bx-ax);
    parent.add(mesh);
  }

  function slopingRail(a,b,low,high,steps) {
    const [ax,az]=at(...a), [bx,bz]=at(...b);
    const length=Math.hypot(bx-ax,bz-az);
    const capBottom=.885, capTop=1.075;
    const startsOnTread=low===bottomY;
    const start=startsOnTread?Math.min(GRAND_POST_WIDTH,length/steps-.012):0;
    const startY=T.MathUtils.lerp(low,high,start/length);
    const profile=new T.Shape();
    profile.moveTo(start,startY+capBottom);
    profile.lineTo(length,high+capBottom);
    profile.lineTo(length,high+capTop);
    profile.lineTo(start,startY+capTop);
    const geometry=new T.ExtrudeGeometry(profile,{depth:.31,bevelEnabled:false});
    geometry.translate(0,0,-.155);
    const rail=new T.Mesh(geometry,material(stone));
    rail.position.set(ax,0,az);
    rail.rotation.y=-Math.atan2(bz-az,bx-ax);
    parent.add(rail);

    // Seat each baluster in the middle of an actual tread and fit it to the cap.
    for(let step=1;step<steps-1;step+=2) {
      const t=(step+.5)/steps;
      const tread=low+(high-low)*(step+1)/steps;
      const underside=T.MathUtils.lerp(low,high,t)+capBottom;
      const post=new T.Mesh(spindle,material(stone));
      post.position.set(T.MathUtils.lerp(ax,bx,t),tread-.008,T.MathUtils.lerp(az,bz,t));
      post.scale.set(.82,(underside-tread+.063)/.62,.82);
      parent.add(post);
    }
    // The flat railing supplies the posts at the shared landing.
    if(startsOnTread) {
      const t=start/(2*length);
      const base=low+(high-low)/steps;
      const top=startY+capTop+.025;
      box(parent,T.MathUtils.lerp(ax,bx,t),(base+top)/2,T.MathUtils.lerp(az,bz,t),
        ax===bx?GRAND_POST_WIDTH:start,top-base,az===bz?GRAND_POST_WIDTH:start,stone);
    }
  }

  // The cap meets the body at its underside instead of occupying the same volume.
  prism(mid,0,(landingY-.18+bottomY)/2,landingDepth,landingRise-.18,landingHalf*2,stone);
  prism(mid,0,landingY-.09,landingDepth,.18,landingHalf*2,marble);
  flight([upperRun,0],[0,0],upperHalf*2,landingY,0,upperSteps);
  for(const side of [-1,1]) {
    const upperRail=side*(upperHalf-GRAND_RAIL_INSET);
    slopingRail([upperRun,upperRail],[0,upperRail],landingY,0,upperSteps);
    stoneRail(parent,box,material,at(upperRun,upperRail),at(upperRun+GRAND_RAIL_INSET,side*landingHalf),landingY,stone,GRAND_POST_WIDTH);
    flight([mid,side*(landingHalf+wingRun)],[mid,side*landingHalf],
      landingDepth,bottomY,landingY,wingSteps);
    for(const u of [upperRun+GRAND_RAIL_INSET,front-GRAND_RAIL_INSET]) {
      slopingRail([u,side*(landingHalf+wingRun)],[u,side*landingHalf],bottomY,landingY,wingSteps);
    }
  }
  stoneRail(parent,box,material,at(front-GRAND_RAIL_INSET,-landingHalf),at(front-GRAND_RAIL_INSET,landingHalf),landingY,stone,GRAND_POST_WIDTH);
}

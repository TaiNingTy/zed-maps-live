// Heights are in metres above the model street datum.
export const floorY={ground:0, first:4, second:9.5, third:15};
export const floorHeights=[floorY.ground,floorY.first,floorY.second,floorY.third];
export const roseWindow={
  bays:Array.from({length:9},(_,index)=>(index-4)*8.45),
  sill:floorY.third+5.4,
  width:4.45,
  height:7.2
};


// Bryant Park wing. The floor meets the inner faces of the shared shell.
export const exteriorWallThickness=.8;
export const courtWallThickness=.3;
export const bryantParkWingEast=-9.64;
export const readingRoomBounds=width=>({
  west:-width/2+exteriorWallThickness,
  east:bryantParkWingEast-courtWallThickness,
  south:45.2628,
  north:-45.2628
});

// Shared plan registration for corridor 201 and the level 3 galleries.
export const gallerySpine={west:25,east:29};

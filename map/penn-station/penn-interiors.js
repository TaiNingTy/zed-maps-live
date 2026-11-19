// Group envelopes read from the 2024 raster; exact leases / room uses are unknown.
// Pixel coordinates share the existing 2024 floor registration.
export const roomGroups={A:[[130,100,330,208],[130,235,330,335],[130,430,330,550],[130,590,330,770],[423,88,607,195],[423,224,607,340],[423,444,600,570],[423,600,600,770],[664,82,860,220],[664,240,860,367],[700,430,900,580],[705,610,900,780],[995,160,1180,280],[996,418,1190,490],[1000,600,1190,780]],B:[[130,100,255,230],[450,84,650,174],[660,84,815,174],[440,185,790,244],[130,340,250,540],[130,630,250,770],[440,620,610,720],[650,640,810,780],[850,170,940,365],[1010,180,1180,285],[1090,600,1190,775]]};
export const columns={A:[[355,136],[392,136],[355,650],[392,650],[355,718],[392,718],[626,80],[644,80],[948,640],[970,640],[1000,80],[1050,80]],B:[[314,328],[340,328],[424,328],[314,402],[340,402],[424,402],[314,496],[340,496],[424,496],[314,573],[340,573],[424,573],[900,510],[1000,510],[900,705],[1000,705]]};
// Supplemental furniture candidates, admitted only if within a public floor polygon,
// clear of extracted walls, route buffers and vertical circulation footprints.
export const furniture={A:[{x:360,y:95,kind:'desk'},{x:1010,y:100,kind:'tickets'},{x:385,y:620,kind:'seats'},{x:970,y:620,kind:'seats'}],B:[{x:340,y:350,kind:'seats'},{x:340,y:520,kind:'seats'},{x:640,y:425,kind:'desk'},{x:940,y:680,kind:'tickets'},{x:920,y:580,kind:'seats'}]};
export const point=([x,y])=>[(x-640)*.25,(y-440)*.25];

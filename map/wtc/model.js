import { retailCirculation } from "./retail-circulation.js";
import { appleStair } from "./retail.js";
import { towerStack } from "./tower.js";

// Metres in a campus-local frame. Heights and fitted outlines are approximate.
export const levels = {
  street: ['L1 · Street and plazas', 0, 'oculus', 'rebuilt'],
  balcony: ['C1 · Oculus balcony', -4.4, 'oculus', 'rebuilt'],
  east: ['C2M · Dey Street connection', -7.8, 'east', 'scenario'],
  main: ['C2 · Oculus and West Concourse', -10.36, 'oculus', 'rebuilt'],
  pathHall: ['PATH Hall · Fare zone', -12.8, 'path', 'rebuilt'],
  pathPlatforms: ['PATH · Four platforms', -18.3, 'path', 'rebuilt'],
  one: ['WTC Cortlandt · Northbound and southbound', -4.4, 'one', 'rebuilt'],
  e: ['World Trade Center · E platform', -5.4, 'east', 'scenario'],
  rw: ['Cortlandt St · R/W platforms', -5.6, 'east', 'scenario'],
  fulton45: ['Fulton · 4/5 platforms', -6.4, 'east', 'scenario'],
  fulton23: ['Fulton · 2/3 platform', -9.5, 'east', 'scenario'],
  fultonJZ: ['Fulton · J/Z platforms', -12.4, 'east', 'scenario'],
  fultonAC: ['Fulton · A/C platform', -15, 'east', 'scenario'],
  entry: ['One World Observatory · Entrance', -4.4, 'tower', 'rebuilt'],
};

for(const f of towerStack)levels[f.id]=[f.label,f.y,"tower",f.tier,f.use];

export const areas = {
  all: ['Overview', [-45, 138, -20], 610],
  oculus: ['Oculus', [0, 9, 0], 148],
  one: ['1 train', [-59, -6, 0], 178],
  path: ['PATH', [-108, -14, 0], 173],
  east: ['E · R/W · Fulton', [122, -7, 15], 215],
  tower: ['One WTC', [-208, 244, -68], 580],
};

export const sources = [
  ["SOM · Podium, tower form and structure (published by ArchDaily)", "https://www.archdaily.com/795277/one-world-trade-center-som"],
  ["Durst · Floor 59 as-built leasing plan", "https://www.durst.org/uploads/floorplan/1704/pdf/OWTC_SingleListing_E59_2020.03.16.pdf"],
  ["Durst · Floor 73 suggested layout (July 2026)", "https://cdn.production.durst.org/uploads/floorplan/3904/pdf/OneWTC_SingleListingFlyer_E73_2026-07-17.pdf"],
  ["One WTC · Well& tenant amenity", "https://www.onewtc.com/well-and-amenity/"],
  ["Tribeca Citizen · Platform B opening photographs and map", "https://tribecacitizen.com/2015/05/07/first-look-the-new-part-of-the-world-trade-center-path-station/"],
  ["MTA · WTC Cortlandt station opening and platform finishes", "https://apps.cio.ny.gov/apps/mediaContact/public/view.cfm?parm=3A82BA02-5056-907F-6F195A3F8CA51A42"],
  ["Port Authority · Platform A escalators and elevators (2013 annual report)", "https://www.panynj.gov/content/dam/corporate/annual-reports/2013.pdf"],
  ["FTA · Platform B escalators and elevators (May 2015)", "https://www.transit.dot.gov/sites/fta.dot.gov/files/docs/May_2015_Report.pdf"],
  ["FTA · Platform B stair openings (February 2015)", "https://www.transit.dot.gov/sites/fta.dot.gov/files/docs/February_2015_Report.pdf"],
  ["FTA · Platform C and D south stairs (December 2015)", "https://www.transit.dot.gov/sites/fta.dot.gov/files/docs/December_2015_Report.pdf"],
  ["FTA · Platform C and D escalators (February 2016)", "https://www.transit.dot.gov/sites/fta.dot.gov/files/docs/February%202016%20Report.pdf"],
  ["FTA · PATH terminal oversight reports", "https://www.transit.dot.gov/foia/port-authority-new-york-and-new-jersey-permanent-wtc-path-terminal"],
  ["Port Authority · PATH platform opening history", "https://www.panynj.gov/path/en/about/history.html"],
  ["Port Authority · North Concourse escalators, C1 photo", "https://www.explorewtc.com/en/local/plan-your-visit/getting-here/elevator-outage-wayfinding-assistance-c1-up.html"],
  ["Port Authority · North and South Concourse stair and escalator photos, C2", "https://www.explorewtc.com/en/local/plan-your-visit/getting-here/elevator-outage-wayfinding-assistance--c2-main-level.html"],
  ["WTC campus · Retail directory, C1 unit 19 and C2 unit 2", "https://www.explorewtc.com/content/dam/wtc/site-resources/maps/WTC_Retail.pdf"],
  ["AppleInsider · Store visit, two entrances and internal stair", "https://appleinsider.com/articles/23/03/05/inside-apple-world-trade-center-traditional-design-unique-interior"],
  ["Apple · World Trade Center store photographs", "https://www.apple.com/newsroom/2016/08/manhattans-newest-apple-store-opens-at-world-trade-center/"],
  ["CGTrader · Reference views of wing ties and end portals", "https://www.cgtrader.com/3d-models/architectural/engineering/world-trade-center-transportation-hub-oculus"],
  ["Calatrava · Transverse section at axis O, reproduced by WikiArquitectura", "https://fr.wikiarquitectura.com/oculus-sec-2/"],
  ["Port Authority · Completed Oculus exterior", "https://wtcprod.panynj.gov/en/local/plan-your-visit/getting-here.html"],
  ["FTA · Oculus steel monitoring and rafter count, November 2014", "https://www.transit.dot.gov/sites/fta.dot.gov/files/docs/November_2014_Report.pdf"],
  ['Skanska · Completed steelwork and site photographs', 'https://www.skanska.com/us/en/construction/transportation-infrastructure/transit--rail/oculus---world-trade-center-transportation-hub'],
  ['Project Subway NYC · Oculus and PATH spatial sections', 'https://www.projectsubwaynyc.com/ground-zero'],
  ['Visual Lexicon · Port Authority West Concourse section', 'https://visuallexicon.wordpress.com/2017/10/04/world-trade-center-transportation-hub-santiago-calatrava/'],
  ['M.Arch · Interior concept section', 'https://marcharch.com/wtcoculus'],
  ['Calatrava · Transit Hall and PATH section dimensions', 'https://calatrava.com/projects/world-trade-center-transportation-hub-new-york.html?image=8&view_mode=overview'],
  ['Port Authority · Campus floor maps', 'https://wtcprod.panynj.gov/content/dam/wtc/site-resources/maps/2023-update/pdf/WTC%20Elevators.Escalators%20%281%29.pdf'],
  ['Port Authority · Elevator connections', 'https://www.officialworldtradecenter.com/content/dam/wtc/site-resources/documents/campus-updates/WorldTradeCenter_Oculus_ElevatorMaps.pdf'],
  ['MTA · Elevator and escalator inventory', 'https://data.ny.gov/d/94fv-bak7'],
  ["WTC Cortlandt · Opening-day footage, platform edges", "https://commons.wikimedia.org/wiki/File:WTC_Cortlandt_video_vc.webm"],
  ['ERA · WTC Cortlandt opening observations', 'https://erausa.org/pdf/bulletin/2010s/2018/2018-10-bulletin.pdf'],
  ['MTA · Dey Street opening and dimensions', 'https://apps.cio.ny.gov/apps/mediaContact/public/view.cfm?parm=16B69C1E-5056-9D2A-10A5C5E8920E655C'],
  ['Fulton Street · LiDAR-based floor diagram', 'https://commons.wikimedia.org/wiki/File:Fulton_Street_%28NYC_subway_station_map%29.png'],
  ['Port Authority · Indoor route to One World Observatory', 'https://www.explorewtc.com/en/local/plan-your-visit/getting-here/qr-code-wayfinding-program-/One-World-Observatory.html'],
  ['One World Observatory · Visitor guide', 'https://www.oneworldobservatory.com/plan-your-visit/'],
  ['Structural design team · Core and podium dimensions', 'https://www.structuremag.org/article/one-world-trade-center/'],
  ['WSP · Tower structure and office stack', 'https://www.wsp.com/en-us/projects/one-world-trade-center'],
  ['Durst · Floor 59 and 73 plans and 64th floor amenities', 'https://dashboard.durst.org/onewtc/wp-content/uploads/sites/10/2026/03/OneWTC_Glossy_2026-02-05.pdf'],
  ['SOM · One World Trade Center', 'https://www.som.com/projects/one-world-trade-center/'],
];

// [floor, x, south] uses the same endpoints for geometry and routes.
const southStair = retailCirculation.find(({kind, a}) => kind === "stairs" && a[1] > 0 && a[2] > 0);
const southApproach = southStair.b[2] + 2.5;

export const points = {
  westStreet: ['street',-58,6.4],
  westStreetTurn: ['street',-46.35,6.4],
  westStreetStair: ['street',-46.35,4.5],
  westC1Stair: ['balcony',-46.35,-4.5],
  westC1Turn: ['balcony',-46.35,-10.5],
  westC1Arrival: ['balcony',-44,-10.5],
  southBalconyStart: ["balcony", 0, 14],
  southAisle: ["balcony", 0, southApproach],
  southStairApproach: ["balcony", southStair.b[1], southApproach],
  southStairTop: southStair.b,
  southStairFoot: southStair.a,
  southStairClear: ["main", southStair.a[1], 16],
  southHallTurn: ["main", 0, 16],
  southHallArrival: ["main", 0, 8],
  eastStart: ['e', 57, -54], eastGate: ['e', 57, -23],
  eastStairApproach: ['e', 51, -16], eastStairFoot: ['e', 51, -13.8],
  eastTop: ['balcony', 51, -11.2], eastBalconyWalk: ['balcony', 51, -9],
  eastHallTop: ['balcony',46,0],
  eastHall: ['main', 37, -1], eastHallWest: ['main', 8, 0],
  fultonStart: ['fulton45', 169, 44], fultonLanding: ['fulton45', 169, 19],
  deyEast: ['east', 165, 15], deyWest: ['east', 56, 16], deyFoot: ['main', 40, 7],
  north:  ['one', -49.65, -53], northDirect: ['one', -51, -42], northGate: ['one', -51, -11], northBalcony: ['balcony', -44, -11],
  south: ['one', -65, 25], southTop: ['one', -65, 15], southFoot: ['main', -65, 3],
  southGateIn: ['main', -64.75, 2], southGateOut: ['main', -64.75, 0],
  northStairTop: ['one', -49.65, -48], northStairFoot: ['main', -49.65, -33],
  northC2Gate: ['main', -49.65, -22], northC2Turn: ['main', -55, -7],
  pathExit: ['pathHall',-96,13], pathTurn: ['pathHall',-96,14], pathGateLane: ['pathHall',-81,14],
  entryTurn: ['entry',-186,-25], entryHall: ['entry',-186,-41], entryLiftDoor: ['entry',-209,-66],
  skyExit: ['obs102',-209,-66], skyTurn: ['obs102',-202,-66],
  obs101: ['obs101',-202,-69], obs100: ['obs100',-202,-69], deck: ['obs100',-191,-68],
  deckDoor: ['obs100',-202,-66],
  main: ['main', -37, 0], westLiftApproach: ['main', -127, -7], westFoot: ['main', -130, -7], westTop: ['balcony', -130, -7], westLiftExit: ['balcony', -133, -7],
  pathStairStart: ['pathPlatforms',-96,-47.5], pathStairFoot: ['pathPlatforms',-96,-49],
  pathStairTop: ['pathHall',-96,-61], pathStairClear: ['pathHall',-96,-63],
  pathStairAisle: ['pathHall',-92.8,-63],
  pathEscStart: ['pathPlatforms',-95.15,39], pathEscFoot: ['pathPlatforms',-95.15,36],
  pathEscTop: ['pathHall',-95.15,24], pathEscClear: ['pathHall',-95.15,22],
  pathEscAisle: ['pathHall',-92.8,22], pathBankTurn: ['pathHall',-92.8,14],
  pathStart: ['pathPlatforms', -96, 25], pathLiftFoot: ['pathPlatforms', -96, 10],
  pathLiftTop: ['pathHall', -96, 10], pathGate: ['pathHall', -81, 10], pathTop: ['main', -70, 0],
  appleApproach: ['main', -15.5, -12], appleDoor: ['main', -15.5, -17.1],
  appleLower: ['main', -15.5, -18.5], appleLeft: ['main', -25, -18.5],
  appleRear: ['main', -25, -28.3], appleFootApproach: ['main', -29, -28.3],
  appleFoot: appleStair.a, appleTop: appleStair.b,
  appleUpper: ['balcony', -29, -17.8], appleUpperSales: ['balcony', -15.5, -17.8],
  appleUpperDoor: ['balcony', -15.5, -16.55], appleBalcony: ['balcony', -15.5, -14.2],
  towerDoor: ['entry', -177, -14], skyFoot: ['entry', -209, -69],
  skyTop: ['obs102', -209, -69], skyLink: ['obs102', -202, -69],
};

export const journeys = {
  southRetail: ["Oculus C1 balcony · South Concourse stairs", [
    "southBalconyStart", "southAisle", "southStairApproach", "southStairTop",
    "southStairFoot", "southStairClear", "southHallTurn", "southHallArrival",
  ]],
  westHeadhouse: ["Greenwich Street · Oculus west entrance", [
    "westStreet","westStreetTurn","westStreetStair","westC1Stair","westC1Turn","westC1Arrival",
  ]],
  north: ['1 train · Northbound', ['north','northStairTop','northStairFoot','northC2Gate','northC2Turn','westLiftApproach','westFoot','westTop','westLiftExit','towerDoor','entryTurn','entryHall','entryLiftDoor','skyFoot','skyTop','skyExit','skyTurn','skyLink','obs101','obs100','deckDoor','deck']],
  south: ['1 train · Southbound', ['south','southTop','southFoot','southGateIn','southGateOut','northC2Turn','westLiftApproach','westFoot','westTop','westLiftExit','towerDoor','entryTurn','entryHall','entryLiftDoor','skyFoot','skyTop','skyExit','skyTurn','skyLink','obs101','obs100','deckDoor','deck']],
  e: ['E train · World Trade Center', ['eastStart','eastGate','eastStairApproach','eastStairFoot','eastTop','eastBalconyWalk','eastHallTop','eastHall','eastHallWest','westLiftApproach','westFoot','westTop','westLiftExit','towerDoor','entryTurn','entryHall','entryLiftDoor','skyFoot','skyTop','skyExit','skyTurn','skyLink','obs101','obs100','deckDoor','deck']],
  fulton: ['4/5 · Fulton Street via Dey Street', ['fultonStart','fultonLanding','deyEast','deyWest','deyFoot','eastHallWest','westLiftApproach','westFoot','westTop','westLiftExit','towerDoor','entryTurn','entryHall','entryLiftDoor','skyFoot','skyTop','skyExit','skyTurn','skyLink','obs101','obs100','deckDoor','deck']],
  path: ['PATH · Platform B (modeled)', ['pathStart','pathLiftFoot','pathLiftTop','pathExit','pathTurn','pathGateLane','pathGate','pathTop','main','northC2Turn','westLiftApproach','westFoot','westTop','westLiftExit','towerDoor','entryTurn','entryHall','entryLiftDoor','skyFoot','skyTop','skyExit','skyTurn','skyLink','obs101','obs100','deckDoor','deck']],
};


export const subwayOculus = {
  north: ["Oculus · C1 balcony", ["northDirect","northGate","northBalcony"]],
  south: ["Oculus · C2 West Concourse", ["south","southTop","southFoot","southGateIn","southGateOut","northC2Turn"]],
};

// Reuse the PATH paid-area approach and the physical mall stair landing.
const appleArrival = [...journeys.path[1].slice(0, journeys.path[1].indexOf("pathTop") + 1),
  "main", "appleApproach", "appleDoor", "appleLower"];
export const appleJourneys = {
  appleC2: ["Apple Store · C2 entrance", appleArrival],
  appleC1: ["Apple Store · C1 via the in-store stair", [...appleArrival,
    "appleLeft", "appleRear", "appleFootApproach", "appleFoot", "appleTop",
    "appleUpper", "appleUpperSales", "appleUpperDoor", "appleBalcony"]],
};


const pathBankExit = ["pathBankTurn", "pathGateLane", "pathGate", "pathTop", "main"];

export const pathDestinations = {
  pathOculus: ["Oculus · C2 main hall", [...appleArrival.slice(0, -3)]],
  pathOculusStairs: ["Oculus · C2 via PATH stairs (scenario)", ["pathStairStart", "pathStairFoot",
    "pathStairTop", "pathStairClear", "pathStairAisle", ...pathBankExit]],
  pathOculusEscalator: ["Oculus · C2 via PATH escalator (scenario)", ["pathEscStart", "pathEscFoot",
    "pathEscTop", "pathEscClear", "pathEscAisle", ...pathBankExit]],
  ...appleJourneys,
};

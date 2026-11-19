// Agreed palette. The decisions behind every value are in design/palette-design-log.md.
// Two sets, kept apart (owner, 2026-11-18): BASE and ACCENTS are the STATION's colours; LANDMARK holds the colours of
// landmark buildings, named by material (glass, metal, stone). A landmark model takes its colours from LANDMARK only.
// Materials keep these colours in every mode: a dark interface only dims the indoor light (INDOOR_DIM),
// and night only changes what is outdoors (NIGHT).

export const BASE = {
  tile: '#EEEBE4', floor: '#B9B5AD', band: '#77736C', steel: '#9EA2A5', darkSteel: '#5F6368', sign: '#14171A',
  edge: '#E3B23C', street: '#2F6F68', tan: '#B08A5A', white: '#FFFFFF',
  copper: '#B5714A',            // kept here for Vessel, which was built before the landmark set existed; same value as LANDMARK.copper
  glass: '#DDE6EA',             // glass panels (in use since the first kit; entered in the palette 2026-11-18)
 
  // Foliage by day: the street green's hue, lighter and greyer, so tree crowns stay background (2026-11-17). By night: NIGHT.street.
  // Picked by the owner from three candidates (A #6E9C94, B #86AFA6, C #9DBFB5).
  leaf: '#86AFA6',
  road: '#8F8C86',                       // day road: the dark band colour at half strength over the floor colour
  routeFill: '#2F80FF', routeEdgeOnBright: '#1A4FB8', routeEdgeOnDark: '#7FB0FF',
};

// LANDMARK colours, by material. Bodies are opaque and lighter than the buildings round them, which stay translucent.
// Only `glass` is a value of its own (agreed 2026-11-18). The others start equal to station values that were already agreed
// (stone = tile and floor, metal = steel and dark steel, copper = Vessel's): they are named apart so that either set can
// change later without touching the other.
export const LANDMARK = {
  glass: '#DDE6EA',                      // curtain walls; also, translucent, balustrades, glass floors, lift cars
  metal: '#9EA2A5', metalDark: '#5F6368', // trim, fins, masts, rails · plant floors, spandrels, soffits, reveals
  copper: '#B5714A',                     // a metal accent; at most one accent material per landmark
  stone: '#EEEBE4', stoneGrey: '#B9B5AD', // limestone, light concrete · terraces, roofs, plinths, floor plates
};
// What stands INSIDE a landmark (service desk, ticket gates, security, lift doors, queue lines) is one set of models for every
// landmark, as the station's furniture is one set for every station. A landmark makes it its own with ONE accent colour, on the
// sign bands, gate tops, belts and lift indicators; everything else keeps the landmark materials. Only colours already agreed are
// listed; a new landmark's accent is added here when the owner agrees it.
export const LANDMARK_ACCENTS = {
  none:   { name: 'None',   eg: 'Edge',   accent: '#9EA2A5' },   // the metal itself
  copper: { name: 'Copper', eg: 'Vessel', accent: '#B5714A' },
};
// A landmark is read at three distances (metres from the viewer). Beyond `mid`: mass, crown and accent only. Between: floor
// lines, setbacks, plant bands. Within `near`: rails, doors, deck details. No window is ever modelled: floors and bays are a
// drawn pattern that fades out between `near` and `mid`.
export const LOD = { near: 150, mid: 600 };

// One accent per station. `col` paints the columns, `tab` the name tablet, `band` the strip along the top of the wall.
export const ACCENTS = {
  blue:       { name: 'Blue',       eg: '28 St (R W)',          col: '#1F4F8F', tab: '#1F4F8F', band: '#B08A5A' },
  maroon:     { name: 'Maroon',     eg: '34 St–Herald Sq',      col: '#7A3028', tab: '#7A3028', band: null },
  tan:        { name: 'Tan',        eg: '34 St–Penn (1 2 3)',   col: '#B08A5A', tab: '#B08A5A', band: null },
  terracotta: { name: 'Terracotta', eg: '47–50 Sts',            col: '#5F6368', tab: '#9A5440', band: '#9A5440' },
  none:       { name: 'None',       eg: '34 St–Hudson Yards',   col: '#9EA2A5', tab: '#9EA2A5', band: null },
};

export const NIGHT = {
  sky: '#111722', sidewalk: '#2B2D31', road: '#1E2023', stripe: '#8E9194', outline: '#4A5058',
  window: '#FFE2A0', lamp: '#FFD9A0', globe: '#6FE3A8', street: '#1F4A45', steel: '#55595D',
};

// Official MTA values (data.ny.gov, "MTA Colors"). `dark: true` means the letter is black instead of white.
export const LINES = [
  ['A', '#0062CF'], ['D', '#EB6800'], ['N', '#F6BC26', true], ['1', '#D82233'], ['4', '#009952'],
  ['7', '#9A38A1'], ['G', '#799534'], ['J', '#8E5C33'], ['L', '#7C858C'],
];
export const NQRW = '#F6BC26';

export const UI = {
  light: { bg: '#F3F2EE', card: 'rgba(255,255,255,.92)', text: '#20252B', muted: '#5A6470', line: 'rgba(0,0,0,.10)', on: '#2F80FF' },
  dark:  { bg: '#16181B', card: 'rgba(30,32,35,.94)',    text: '#ECEEF0', muted: '#9AA1AA', line: 'rgba(255,255,255,.12)', on: '#2F80FF' },
};

export const INDOOR_DIM = 0.85;

// Street trees (crown and trunk) are translucent and fade with distance from the viewer: opacity NEAR at up to D0 metres, FAR from D1 metres on.
export const CROWN = { near: 0.80, far: 0.28, d0: 12, d1: 70 };
// Paving joints are drawn only near the viewer: full strength up to D0 metres, gone from D1 metres on. Far ground is plain,
// as in the navigation maps studied (design/palette-design-log.md, step 49).
export const JOINTS = { d0: 22, d1: 65 };

// Simplified country polygons in the map's percentage coordinate space (0-100).
// x% and y% match the MAP_NODES positions used in worldmap.tsx.
// These are stylized game-map shapes, not precise geographic borders.

export interface CountryPolygon {
  id: string;
  points: string; // SVG polygon points string "x1,y1 x2,y2 ..."
  labelX: number;
  labelY: number;
}

// Converts [x%, y%] pairs to SVG polygon points string
function pts(pairs: [number, number][]): string {
  return pairs.map(([x, y]) => `${x},${y}`).join(" ");
}

// All coordinates are in % of the map viewport (mapW × mapH).
// Each polygon is centered near its MAP_NODE position.
export const COUNTRY_POLYGONS: CountryPolygon[] = [
  {
    id: "usa",
    points: pts([[4,28],[24,26],[27,33],[26,42],[24,50],[10,52],[4,45],[3,35]]),
    labelX: 14, labelY: 38,
  },
  {
    id: "brazil",
    points: pts([[20,56],[35,54],[38,64],[37,76],[31,82],[22,80],[18,70],[18,62]]),
    labelX: 27, labelY: 68,
  },
  {
    id: "uk",
    points: pts([[39,18],[44,17],[46,22],[44,28],[40,29],[38,25]]),
    labelX: 42, labelY: 23,
  },
  {
    id: "germany",
    points: pts([[46,23],[53,22],[55,27],[53,33],[46,33],[44,28]]),
    labelX: 49, labelY: 27,
  },
  {
    id: "france",
    points: pts([[40,27],[49,26],[51,32],[49,38],[43,39],[39,34]]),
    labelX: 45, labelY: 32,
  },
  {
    id: "italy",
    points: pts([[48,32],[54,32],[56,37],[54,43],[51,47],[48,44],[47,38]]),
    labelX: 51, labelY: 38,
  },
  {
    id: "russia",
    points: pts([[50,10],[92,8],[93,26],[78,30],[60,28],[52,22],[50,16]]),
    labelX: 68, labelY: 18,
  },
  {
    id: "turkey",
    points: pts([[52,33],[64,33],[65,38],[63,42],[52,42],[50,37]]),
    labelX: 57, labelY: 37,
  },
  {
    id: "israel",
    points: pts([[54,40],[58,40],[58,47],[55,47],[54,43]]),
    labelX: 56, labelY: 43,
  },
  {
    id: "saudi_arabia",
    points: pts([[53,44],[66,43],[68,54],[65,63],[57,66],[52,60],[52,50]]),
    labelX: 59, labelY: 53,
  },
  {
    id: "iran",
    points: pts([[57,35],[68,34],[70,43],[68,50],[57,50],[55,42]]),
    labelX: 63, labelY: 42,
  },
  {
    id: "india",
    points: pts([[63,40],[74,38],[76,46],[74,57],[70,65],[63,64],[62,55],[62,46]]),
    labelX: 68, labelY: 52,
  },
  {
    id: "china",
    points: pts([[62,25],[86,22],[88,37],[84,48],[72,50],[62,44],[60,33]]),
    labelX: 74, labelY: 36,
  },
  {
    id: "south_korea",
    points: pts([[77,31],[82,30],[83,37],[78,38]]),
    labelX: 80, labelY: 34,
  },
  {
    id: "japan",
    points: pts([[80,24],[87,24],[88,33],[85,40],[80,39],[79,32]]),
    labelX: 83, labelY: 31,
  },
];

// Continent outline polygons (decorative background layer, low opacity)
export const CONTINENT_POLYGONS: { id: string; points: string }[] = [
  {
    id: "north_america",
    points: pts([[2,20],[28,16],[30,36],[28,55],[10,57],[2,48]]),
  },
  {
    id: "south_america",
    points: pts([[18,55],[38,53],[42,70],[38,84],[24,86],[16,74]]),
  },
  {
    id: "europe_africa",
    points: pts([[37,14],[58,12],[60,36],[62,55],[58,75],[46,85],[38,78],[36,55],[38,35]]),
  },
  {
    id: "asia",
    points: pts([[50,8],[95,6],[95,55],[80,65],[65,65],[55,50],[50,30]]),
  },
  {
    id: "australia",
    points: pts([[72,63],[88,61],[90,74],[78,76],[70,70]]),
  },
];

// SYNTHETIC sample owners for the marketing log. No real people or numbers.
export type LogStatus = "nc" | "att" | "con" | "off" | "neg" | "lea" | "dec" | "unr";

export interface LogOwner {
  name: string;
  nma: number;
}

export const OWNERS: LogOwner[] = [
  { name: "Harlan Family Trust", nma: 38.4 },
  { name: "Mesa Verde Minerals, LLC", nma: 32.0 },
  { name: "Estate of R. T. Calloway", nma: 24.8 },
  { name: "Wren Creek Royalty, LP", nma: 20.0 },
  { name: "Dolores M. Aldana", nma: 16.0 },
  { name: "Thornfield Holdings", nma: 12.8 },
  { name: "J. & L. Okafor Living Trust", nma: 10.0 },
  { name: "Pruitt Mineral Partners", nma: 8.0 },
  { name: "Samuel E. Brandt", nma: 6.4 },
  { name: "Lakeshore Energy Trust", nma: 5.0 },
  { name: "Marguerite Voss", nma: 4.0 },
  { name: "Ridgeline Land Co.", nma: 3.2 },
  { name: "Teodoro & Ana Villareal", nma: 2.4 },
  { name: "Hollis Basin Interests", nma: 1.6 },
  { name: "C. R. Whitlock Estate", nma: 1.2 },
  { name: "Nell P. Sutter", nma: 0.8 },
];

export const TOTAL_NMA = Math.round(OWNERS.reduce((s, o) => s + o.nma, 0) * 10) / 10;

const nc = (n: number): LogStatus[] => Array(n).fill("nc");
const rest = (head: LogStatus[]): LogStatus[] => [...head, ...nc(OWNERS.length - head.length)];

// One status list per step of the story: import, call, offer, lease, report.
export const STEP_STATUS: LogStatus[][] = [
  rest([]),
  rest([]),
  rest(["con", "con", "att", "att", "att", "att", "con"]),
  rest(["off", "off", "neg", "off", "con", "att", "dec", "att", "att"]),
  rest(["lea", "lea", "neg", "lea", "off", "con", "dec", "con", "att", "att"]),
  rest(["lea", "lea", "lea", "lea", "off", "con", "dec", "con", "con", "att", "att", "unr"]),
];

export const STATUS_LABEL: Record<LogStatus, string> = {
  nc: "Not contacted",
  att: "Attempted",
  con: "Contacted",
  off: "Offer made",
  neg: "Negotiating",
  lea: "Leased",
  dec: "Declined",
  unr: "Unresponsive",
};

export function readout(statuses: LogStatus[]) {
  let leased = 0;
  let reached = 0;
  OWNERS.forEach((o, i) => {
    if (statuses[i] === "lea") leased += o.nma;
    if (statuses[i] !== "nc") reached += o.nma;
  });
  return {
    leased: Math.round(leased * 10) / 10,
    reached: Math.round(reached * 10) / 10,
    pctLeased: Math.round((leased / TOTAL_NMA) * 1000) / 10,
  };
}

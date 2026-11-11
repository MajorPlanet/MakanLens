#!/usr/bin/env node
// Snapshot HPB's Singapore Food Insights Database (SG FoodID) into data/sgfoodid.json.
//
//   node scripts/fetch-sgfoodid.mjs            # uses the cache in data/cache/sgfoodid (resumable)
//   node scripts/fetch-sgfoodid.mjs --refresh  # re-download everything
//
// The SG FoodID search page is backed by a public JSON API (60 requests a minute). We stay under it
// (one request every ~1.1 s), honour the rate-limit headers, and identify ourselves in the User-Agent.
// Listing needs a filter, so every item is reached by paging each food group; full records come from
// foods/compare in batches of 10.
//
// Licence: SG FoodID Terms of Use, section 10 (https://file.go.gov.sg/termsofuse-hpbsgfoodid.pdf) allow
// use, copying, distribution and adaptation, commercial or not, with a conspicuous attribution notice and
// no suggestion of HPB endorsement. The notice is written into the output file and shown in the app.

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://pphtpc.hpb.gov.sg/bff/v1/food-portal";
const SITE = "https://pphtpc.hpb.gov.sg/web/sgfoodid";
const LICENCE = "https://file.go.gov.sg/termsofuse-hpbsgfoodid.pdf";
const UA = "MakanLens-snapshot/1.0 (open-source MIT nutrition app; one-off dataset snapshot; github.com/MajorPlanet/MakanLens)";
const MIN_INTERVAL_MS = 1100;
const PAGE_SIZE = 25;
const BATCH = 10;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "data", "cache", "sgfoodid");
const OUT = join(ROOT, "data", "sgfoodid.json");
const refresh = process.argv.includes("--refresh");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;

async function getJson(path, params = []) {
  const qs = params.length ? "?" + new URLSearchParams(params).toString() : "";
  const url = `${API}/${path}${qs}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = last + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let backoff = 2 ** attempt * 1000;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        if (res.headers.get("x-ratelimit-remaining") === "0") await sleep((Number(res.headers.get("x-ratelimit-reset")) || 60) * 1000 + 1000);
        return data;
      }
      if (res.status === 429) backoff = (Number(res.headers.get("x-ratelimit-reset")) || 60) * 1000 + 1000;
      else if (res.status < 500) throw new Error(`${res.status} for ${url}`);
      console.error(`  retry ${attempt + 1} for ${url} in ${backoff / 1000}s (HTTP ${res.status})`);
    } catch (e) {
      if (String(e.message).startsWith("4")) throw e;
      console.error(`  retry ${attempt + 1} for ${url} in ${backoff / 1000}s (${e.message})`);
    }
    await sleep(backoff);
  }
  throw new Error(`giving up on ${url}`);
}

const exists = (p) => access(p).then(() => true, () => false);

async function pageAll(params) {
  const rows = [];
  for (let page = 1; ; page++) {
    const batch = await getJson("foods", [...params, ["pageNumber", String(page)]]);
    if (!Array.isArray(batch)) throw new Error(`unexpected response for ${JSON.stringify(params)}`);
    if (batch.length === 0) break;
    rows.push(...batch);
    if (rows.length >= batch[0].totalCount || batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function listItems() {
  const cached = join(CACHE, "list.json");
  if (!refresh && (await exists(cached))) return JSON.parse(await readFile(cached, "utf8"));
  const groups = await getJson("foods/groups");
  const items = new Map();
  for (const g of groups.sort((a, b) => a.id - b.id)) {
    const rows = await pageAll([["foodGroupId", String(g.id)]]);
    console.log(`group ${String(g.id).padStart(2)} ${g.name}: ${rows.length}`);
    for (const r of rows) if (!items.has(r.crId)) items.set(r.crId, r);
  }
  const list = [...items.values()].sort((a, b) => a.crId.localeCompare(b.crId));
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, JSON.stringify(list));
  return list;
}

async function fetchDetails(list) {
  const dir = join(CACHE, "details");
  await mkdir(dir, { recursive: true });
  const details = new Map();
  const todo = [];
  for (const r of list) {
    const p = join(dir, `${r.crId}.json`);
    if (!refresh && (await exists(p))) details.set(r.crId, JSON.parse(await readFile(p, "utf8")));
    else todo.push(r.crId);
  }
  const keep = async (d) => {
    details.set(d.crId, d);
    await writeFile(join(dir, `${d.crId}.json`), JSON.stringify(d));
  };
  for (let i = 0; i < todo.length; i += BATCH) {
    const ids = todo.slice(i, i + BATCH);
    if (ids.length === 1) await keep(await getJson(`foods/details/${ids[0]}`));
    else for (const d of await getJson("foods/compare", ids.map((c) => ["crIds", c]))) await keep(d);
    for (const c of ids) if (!details.has(c)) await keep(await getJson(`foods/details/${c}`)); // compare can drop one
    console.log(`details ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  }
  return details;
}

// "1 plate(s) = 389g" → { label: "1 plate", grams: 389 }
const PORTION = /^\s*(.+?)\s*=\s*(\d+(?:\.\d+)?)\s*(g|ml)\s*$/i;
function parsePortion(text) {
  if (!text || text.trim() === "-" || text.trim() === "") return null;
  const m = PORTION.exec(text);
  if (!m) return null;
  const qty = /^\s*(\d+(?:[./]\d+)?)/.exec(m[1]);
  const plural = !qty || (qty[1] !== "1" && qty[1] !== "1.0");
  const label = m[1].replace(/\(s\)/g, plural ? "s" : "").replace(/\s+/g, " ").trim();
  return { label, grams: Number(m[2]) };
}
const splitPortions = (t) => (!t || t.trim() === "-" ? [] : t.split(/\s*[,;\n]\s*(?=\d)/).filter((s) => s.trim()));

const n = (v, dp = 1) => (v === null || v === undefined || v === -1 ? null : Math.round(v * 10 ** dp) / 10 ** dp);

function toRecord(d) {
  const b = d.baseFoodNutrients ?? {};
  const kcal = n(b.energy, 0);
  if (kcal === null) return null;
  // Nutrients are per 100 g edible portion; portion weights include inedible parts (bone, shell), so scale them.
  const edible = (d.ediblePortion || 100) / 100;
  const servings = [];
  const def = parsePortion(d.defaultPortion);
  if (def) servings.push({ label: def.label, grams: Math.round(def.grams * edible) });
  else if (d.defaultWeight) servings.push({ label: "1 serving", grams: Math.round(d.defaultWeight * edible) });
  for (const alt of splitPortions(d.alternativePortions)) {
    const p = parsePortion(alt);
    if (p && !servings.some((s) => s.label === p.label)) servings.push({ label: p.label, grams: Math.round(p.grams * edible) });
  }
  const desc = (d.description || "").trim();
  return {
    id: d.crId,
    name: d.name.trim(),
    desc: desc && desc !== "-" ? desc : undefined,
    group: d.l1Category || undefined,
    sub: d.l2Category || undefined,
    drink: d.category === "Drink" || undefined,
    per100: {
      kcal,
      protein_g: n(b.protein) ?? 0,
      carbs_g: n(b.carbohydrate) ?? 0,
      fat_g: n(b.fat) ?? 0,
      ...(n(b.sodium, 0) !== null && { sodium_mg: n(b.sodium, 0) }),
      ...(n(b.dietaryFibre) !== null && { fibre_g: n(b.dietaryFibre) }),
      ...(n(b.saturatedFat) !== null && { satfat_g: n(b.saturatedFat) }),
      ...(n(b.sugar) !== null && { sugar_g: n(b.sugar) }),
    },
    servings,
    year: d.yearOfData || undefined,
    basis: d.sourceOfData || undefined,
  };
}

const list = await listItems();
console.log(`listed ${list.length} unique items`);
const active = list.filter((r) => !r.isDeactivated);
const details = await fetchDetails(active);
const foods = [...details.values()].map(toRecord).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
const accessed = new Date().toISOString().slice(0, 10);
const out = {
  name: "Singapore Food Insights Database (SG FoodID)",
  publisher: "Health Promotion Board, Singapore",
  accessed,
  source_url: SITE,
  licence_url: LICENCE,
  attribution: `Contains information from Singapore Food Insights Database (SG FoodID) accessed on ${accessed} from Health Promotion Board which is made available under the terms found at ${SITE} The information contained within this dataset is provided on an "as-is" basis. The data, including but not limited to nutritional information, is subject to inherent limitations. No warranty or representation is made as to the accuracy or completeness of the data contained herein.`,
  basis: "Nutrients are per 100 g edible portion; serving grams are edible weight.",
  count: foods.length,
  foods,
};
await writeFile(OUT, JSON.stringify(out));
console.log(`wrote ${foods.length} foods to data/sgfoodid.json (${list.length - active.length} deactivated skipped, ${details.size - foods.length} without energy dropped)`);

// SERVER ONLY. Loads the SG FoodID snapshot (data/sgfoodid.json) once per server process.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sgToFood } from "./sgfoodid";
import type { FoodRecord, SgFoodFile } from "./types";

let file: SgFoodFile | null = null;
let records: FoodRecord[] | null = null;

const EMPTY: SgFoodFile = { name: "", publisher: "", accessed: "", source_url: "", licence_url: "", attribution: "", basis: "", count: 0, foods: [] };

/** The raw snapshot (empty if the file is missing, so the app still runs before the first fetch). */
export function getSgFile(): SgFoodFile {
  if (!file) {
    try {
      file = JSON.parse(readFileSync(join(process.cwd(), "data", "sgfoodid.json"), "utf8")) as SgFoodFile;
    } catch {
      file = EMPTY;
    }
  }
  return file;
}

/** Every SG FoodID item as a FoodRecord (id "sgf-<crId>"). */
export function getSgFoods(): FoodRecord[] {
  records ??= getSgFile().foods.map(sgToFood);
  return records;
}

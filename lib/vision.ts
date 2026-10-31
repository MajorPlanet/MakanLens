// STUB — owned by api-builder. SERVER ONLY: reads API keys.
import type { Dish } from "./types";

export async function analyseWithVision(args: {
  image?: string;
  text?: string;
  knownDishes: Pick<Dish, "id" | "name">[];
}): Promise<unknown> {
  void args;
  throw new Error("not implemented");
}

// STUB — owned by frontend-builder. Browser-side API client.
import type { AnalyseResponse, BarcodeResponse } from "./types";

export async function analyse(input: { image?: string; text?: string }): Promise<AnalyseResponse> {
  void input;
  throw new Error("not implemented");
}

export async function lookupBarcode(code: string): Promise<BarcodeResponse> {
  void code;
  throw new Error("not implemented");
}

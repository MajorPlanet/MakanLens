// Browser-side API client.
import type { AnalyseResponse, ApiError, ApiErrorCode, BarcodeResponse } from "./types";
import { mockAnalyseResponse } from "./mock";

export class ApiClientError extends Error {
  code: ApiErrorCode | "network";
  constructor(code: ApiErrorCode | "network", message?: string) {
    super(message ?? code);
    this.name = "ApiClientError";
    this.code = code;
  }
}

const CODES: ApiErrorCode[] = ["missing_api_key", "rate_limited", "bad_request", "not_found", "provider_error"];

async function toError(res: Response): Promise<ApiClientError> {
  try {
    const body = (await res.json()) as Partial<ApiError>;
    if (body.error && CODES.includes(body.error)) return new ApiClientError(body.error, body.message);
  } catch {
    /* not JSON */
  }
  if (res.status === 404) return new ApiClientError("not_found");
  if (res.status === 429) return new ApiClientError("rate_limited");
  return new ApiClientError("provider_error");
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiClientError("network");
  }
  if (!res.ok) throw await toError(res);
  return res;
}

export async function analyse(input: { image?: string; text?: string }): Promise<AnalyseResponse> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "1") {
    await new Promise((r) => setTimeout(r, 1200));
    return structuredClone(mockAnalyseResponse);
  }
  const res = await request("/api/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  try {
    return (await res.json()) as AnalyseResponse;
  } catch {
    throw new ApiClientError("provider_error");
  }
}

export async function lookupBarcode(code: string): Promise<BarcodeResponse> {
  const res = await request(`/api/barcode?code=${encodeURIComponent(code)}`);
  try {
    return (await res.json()) as BarcodeResponse;
  } catch {
    throw new ApiClientError("provider_error");
  }
}

import type { ApiErrorCode } from "@/lib/types";
import { ACCENT_BTN } from "./format";

export type NoticeKind = ApiErrorCode | "network" | "no_food" | "image";

const COPY: Record<NoticeKind, { title: string; body: string; retry: boolean }> = {
  no_food: {
    title: "No food spotted",
    body: "We couldn't spot any food in that photo. Try again closer, or describe it instead.",
    retry: false,
  },
  missing_api_key: {
    title: "Server not configured",
    body: "The server has no vision API key yet. Add one to .env.local (see .env.example), restart the app, and try again.",
    retry: false,
  },
  rate_limited: {
    title: "Easy there, chef",
    body: "We're getting a lot of requests right now. Wait a few seconds and try again.",
    retry: true,
  },
  network: {
    title: "You seem to be offline",
    body: "We couldn't reach the server. Check your connection and try again.",
    retry: true,
  },
  provider_error: {
    title: "The AI had a hiccup",
    body: "Our food-recognition service didn't respond properly. Please try again, or describe the meal instead.",
    retry: true,
  },
  bad_request: {
    title: "That didn't work",
    body: "We couldn't process that request. Try a different photo, or describe the meal instead.",
    retry: false,
  },
  not_found: {
    title: "Not found",
    body: "We couldn't find a match. Try describing it instead.",
    retry: false,
  },
  image: {
    title: "Photo problem",
    body: "We couldn't read that photo.",
    retry: false,
  },
};

export default function ErrorNotice({
  kind,
  detail,
  onRetry,
  onDismiss,
}: {
  kind: NoticeKind;
  detail?: string;
  onRetry?: () => void;
  onDismiss: () => void;
}) {
  const c = COPY[kind];
  return (
    <div role="alert" className="rounded-3xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/40">
      <p className="font-semibold">{c.title}</p>
      <p className="mt-1 text-sm">{kind === "image" && detail ? detail : c.body}</p>
      <div className="mt-3 flex gap-2">
        {c.retry && onRetry && (
          <button type="button" onClick={onRetry} className={`h-11 rounded-xl px-4 font-medium ${ACCENT_BTN}`}>
            Try again
          </button>
        )}
        <button type="button" onClick={onDismiss} className="h-11 rounded-xl border border-neutral-300 px-4 text-sm font-medium dark:border-neutral-700">
          Dismiss
        </button>
      </div>
    </div>
  );
}

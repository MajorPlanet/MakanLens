import { TriangleAlert, UtensilsCrossed } from "lucide-react";
import type { ApiErrorCode } from "@/lib/types";
import { Button } from "@/components/ui/Controls";

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

/** Inline alert card: icon, title, one line of copy, and at most Try Again plus Dismiss. */
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
  const Icon = kind === "no_food" ? UtensilsCrossed : TriangleAlert;
  return (
    <div role="alert" className="surface p-4">
      <div className="flex items-start gap-3">
        <Icon size={22} strokeWidth={1.75} aria-hidden className={`mt-0.5 shrink-0 ${kind === "no_food" ? "text-label-3" : "text-ios-yellow"}`} />
        <div className="min-w-0">
          <p className="type-headline">{c.title}</p>
          <p className="mt-0.5 text-label-2 type-subhead">{kind === "image" && detail ? detail : c.body}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {c.retry && onRetry && (
          <Button variant="tinted" size="medium" onClick={onRetry} className="flex-1">
            Try Again
          </Button>
        )}
        <Button variant="gray" size="medium" onClick={onDismiss} className="flex-1">
          Dismiss
        </Button>
      </div>
    </div>
  );
}

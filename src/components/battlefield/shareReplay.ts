import type { ReplayAction, ReplayFile } from "./replayTypes";

export type ReplayParseResult =
  | { ok: true; replay: ReplayFile }
  | { ok: false; error: string };

function toBase64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return decodeURIComponent(escape(atob(padded)));
}

function isReplayFile(value: unknown): value is ReplayFile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ReplayFile>;
  return typeof candidate.matchName === "string" && Array.isArray(candidate.actions);
}

export function replayFileFromActions(actions: ReplayAction[], matchName = "On Da Stack Shared Replay"): ReplayFile {
  return {
    version: "0.1.0",
    exportedAt: new Date().toISOString(),
    matchName,
    actions,
  };
}

export function encodeReplayFileForUrl(replay: ReplayFile) {
  return toBase64Url(JSON.stringify(replay));
}

export function decodeReplayFileFromUrlData(data: string): ReplayParseResult {
  try {
    const decoded = data.trim().startsWith("{") ? decodeURIComponent(data) : fromBase64Url(data.trim());
    const parsed = JSON.parse(decoded) as unknown;
    if (!isReplayFile(parsed)) {
      return { ok: false, error: "Replay data is valid JSON, but it does not match the .replay.json shape." };
    }
    return { ok: true, replay: parsed };
  } catch {
    return { ok: false, error: "Could not decode replay data from the URL." };
  }
}

export function getReplayDataFromLocation(location: Location = window.location) {
  const search = new URLSearchParams(location.search);
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : hash;
  const hashParams = new URLSearchParams(hashQuery);
  return search.get("replay") ?? search.get("data") ?? hashParams.get("replay") ?? hashParams.get("data");
}

export async function parseReplayFileUpload(file: File): Promise<ReplayParseResult> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    if (!isReplayFile(parsed)) {
      return { ok: false, error: "Uploaded file is not a valid .replay.json export." };
    }
    return { ok: true, replay: parsed };
  } catch {
    return { ok: false, error: "Could not read that replay file. Confirm it is JSON." };
  }
}

export function createShareableReplayUrl(replay: ReplayFile, baseUrl = window.location.href) {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = `#/replay?data=${encodeReplayFileForUrl(replay)}`;
  return url.toString();
}

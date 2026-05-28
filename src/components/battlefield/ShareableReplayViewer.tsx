import { useEffect, useMemo, useState } from "react";
import { ReplayBoardStateScrubber } from "./ReplayBoardStateScrubber";
import {
  createShareableReplayUrl,
  decodeReplayFileFromUrlData,
  getReplayDataFromLocation,
  parseReplayFileUpload,
  replayFileFromActions,
} from "./shareReplay";
import { makeSampleReplayActions } from "./replayEngine";
import type { ReplayFile } from "./replayTypes";

export interface ShareableReplayViewerProps {
  initialReplay?: ReplayFile;
  allowSampleFallback?: boolean;
  className?: string;
}

export function ShareableReplayViewer({
  initialReplay,
  allowSampleFallback = true,
  className = "",
}: ShareableReplayViewerProps) {
  const sampleReplay = useMemo(() => replayFileFromActions(makeSampleReplayActions(), "On Da Stack Demo Replay"), []);
  const [replay, setReplay] = useState<ReplayFile | null>(initialReplay ?? null);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (initialReplay) {
      setReplay(initialReplay);
      return;
    }
    const encoded = getReplayDataFromLocation();
    if (!encoded) {
      if (allowSampleFallback) {
        setReplay(sampleReplay);
      }
      return;
    }
    const parsed = decodeReplayFileFromUrlData(encoded);
    if (parsed.ok) {
      setReplay(parsed.replay);
      setError("");
    } else {
      setError(parsed.error);
      if (allowSampleFallback) {
        setReplay(sampleReplay);
      }
    }
  }, [allowSampleFallback, initialReplay, sampleReplay]);

  useEffect(() => {
    if (replay) {
      setShareUrl(createShareableReplayUrl(replay));
    }
  }, [replay]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    const parsed = await parseReplayFileUpload(file);
    if (parsed.ok) {
      setReplay(parsed.replay);
      setError("");
    } else {
      setError(parsed.error);
    }
  };

  return (
    <main className={`ods-share-viewer ${className}`.trim()} data-testid="page-shareable-replay-viewer">
      <section className="ods-share-viewer__hero">
        <div>
          <p>On Da Stack Replay Viewer</p>
          <h1>Share a Commander game without opening the full simulator.</h1>
          <span>
            Read-only viewer for `.replay.json` exports and URL-encoded replay links. The board-state scrubber rebuilds
            zones, stack, life totals, commander damage, and judge notes from the action log.
          </span>
        </div>
        <label className="ods-share-viewer__upload">
          <input
            type="file"
            accept=".json,.replay.json,application/json"
            onChange={(event) => handleUpload(event.target.files?.[0])}
            data-testid="input-upload-replay-json"
          />
          Upload replay JSON
        </label>
      </section>

      {error && (
        <aside className="ods-share-viewer__error" role="alert" data-testid="status-replay-error">
          {error}
        </aside>
      )}

      {replay ? (
        <>
          <section className="ods-share-viewer__meta">
            <article>
              <span>Match</span>
              <strong>{replay.matchName}</strong>
            </article>
            <article>
              <span>Actions</span>
              <strong>{replay.actions.length}</strong>
            </article>
            <article>
              <span>Exported</span>
              <strong>{new Date(replay.exportedAt).toLocaleString()}</strong>
            </article>
          </section>

          <section className="ods-share-viewer__share">
            <label htmlFor="ods-share-url">Community share URL</label>
            <div>
              <input id="ods-share-url" value={shareUrl} readOnly data-testid="input-share-replay-url" />
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
                data-testid="button-copy-share-replay-url"
              >
                Copy
              </button>
            </div>
            <small>
              GitHub Pages route format: <code>#/replay?data=...</code>
            </small>
          </section>

          <ReplayBoardStateScrubber actions={replay.actions} matchName={replay.matchName} />
        </>
      ) : (
        <section className="ods-share-viewer__empty">
          <h2>Load a replay to begin</h2>
          <p>Upload an exported `.replay.json` file or open a link with URL-encoded replay data.</p>
        </section>
      )}
    </main>
  );
}

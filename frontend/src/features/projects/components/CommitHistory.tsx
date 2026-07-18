import { AlertTriangle, ChevronDown, FileCode2, GitCommitHorizontal } from "lucide-react";
import { useState } from "react";
import { formatRelativeTime } from "../projectModel";
import type { GitCommit, GitCommitDetails } from "../types";

interface CommitHistoryProps {
  projectId: string;
  commits: GitCommit[];
  onLoadDetails: (projectId: string, hash: string) => Promise<GitCommitDetails>;
}

export function CommitHistory({ projectId, commits, onLoadDetails }: CommitHistoryProps) {
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [detailsByHash, setDetailsByHash] = useState<Record<string, GitCommitDetails>>({});
  const [loadingHash, setLoadingHash] = useState<string | null>(null);
  const [errorByHash, setErrorByHash] = useState<Record<string, string>>({});

  const loadDetails = async (commit: GitCommit) => {
    if (detailsByHash[commit.hash] || loadingHash === commit.hash) return;
    setLoadingHash(commit.hash);
    setErrorByHash((current) => ({ ...current, [commit.hash]: "" }));
    try {
      const details = await onLoadDetails(projectId, commit.hash);
      setDetailsByHash((current) => ({ ...current, [commit.hash]: details }));
    } catch (caught) {
      setErrorByHash((current) => ({
        ...current,
        [commit.hash]: caught instanceof Error ? caught.message : String(caught),
      }));
    } finally {
      setLoadingHash(null);
    }
  };

  const toggle = async (commit: GitCommit) => {
    if (expandedHash === commit.hash) {
      setExpandedHash(null);
      return;
    }
    setExpandedHash(commit.hash);
    await loadDetails(commit);
  };

  return (
    <section className="panel telemetry-panel commit-panel">
      <div className="panel__header panel__header--compact">
        <div>
          <p className="eyebrow">Latest changes</p>
          <h2>Recent commits</h2>
        </div>
        <GitCommitHorizontal size={18} />
      </div>
      {commits.length === 0 ? (
        <p className="subtle-copy">This repository has no commits yet.</p>
      ) : (
        <div className="commit-list">
          {commits.map((commit) => {
            const expanded = expandedHash === commit.hash;
            const details = detailsByHash[commit.hash];
            const error = errorByHash[commit.hash];
            return (
              <article key={commit.hash} className={expanded ? "is-expanded" : ""}>
                <span className="commit-list__node" />
                <button
                  aria-expanded={expanded}
                  className="commit-list__summary"
                  onClick={() => void toggle(commit)}
                  type="button"
                >
                  <span>
                    <strong>{commit.subject}</strong>
                    <span className="commit-list__meta">
                      <code>{commit.shortHash}</code>
                      <span>{formatRelativeTime(commit.authoredAt)}</span>
                    </span>
                    <span className="commit-list__stats">
                      <span>{commit.changedFiles} files</span>
                      <span className="text-success">+{commit.additions}</span>
                      <span className="text-attention">−{commit.deletions}</span>
                    </span>
                  </span>
                  <ChevronDown size={15} />
                </button>
                {expanded && (
                  <div className="commit-details">
                    {loadingHash === commit.hash && <p>Reading changed files…</p>}
                    {error && (
                      <div className="commit-details__error" role="alert">
                        <AlertTriangle size={15} />
                        <span>{error}</span>
                        <button onClick={() => void loadDetails(commit)} type="button">
                          Retry
                        </button>
                      </div>
                    )}
                    {details && (
                      <>
                        <div className="commit-details__types">
                          {details.changeTypes.map((type) => (
                            <span key={type}>{type}</span>
                          ))}
                        </div>
                        <div className="commit-files">
                          {details.files.map((file) => (
                            <div key={`${file.status}:${file.path}`}>
                              <FileCode2 size={13} />
                              <span title={file.path}>{file.path}</span>
                              <small>{file.status}</small>
                              <code>
                                {file.additions === null ? "binary" : `+${file.additions}`}
                                {file.deletions !== null && ` −${file.deletions}`}
                              </code>
                            </div>
                          ))}
                        </div>
                        <details className="commit-diff">
                          <summary>Technical diff</summary>
                          <pre>{details.diff || "No textual diff for this commit."}</pre>
                          {details.diffTruncated && (
                            <small>Diff shortened to 60,000 characters.</small>
                          )}
                        </details>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

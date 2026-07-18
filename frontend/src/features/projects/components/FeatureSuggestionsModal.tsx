import { AlertTriangle, Check, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../../shared/ui/Modal";
import { featureStatusLabels } from "../projectModel";
import type { FeatureAnalysisResult, FeatureSuggestion } from "../types";

interface FeatureSuggestionsModalProps {
  analysis: FeatureAnalysisResult | null;
  error: string | null;
  loading: boolean;
  saving: boolean;
  onAccept: (suggestions: FeatureSuggestion[]) => Promise<void>;
  onClose: () => void;
  onRetry: () => void;
}

export function FeatureSuggestionsModal({
  analysis,
  error,
  loading,
  saving,
  onAccept,
  onClose,
  onRetry,
}: FeatureSuggestionsModalProps) {
  const [rejectedNames, setRejectedNames] = useState<Set<string>>(new Set());

  const selectedSuggestions =
    analysis?.suggestions.filter(({ name }) => !rejectedNames.has(name)) ?? [];

  return (
    <Modal eyebrow="Local AI review" title="Repository feature scan" onClose={onClose}>
      <div className="analysis-modal">
        {loading && (
          <div className="analysis-state" aria-live="polite">
            <LoaderCircle className="is-spinning" size={28} />
            <h3>LM Studio is mapping this repository…</h3>
            <p>Orion is reading a limited set of safe project files. Nothing will be saved yet.</p>
          </div>
        )}

        {!loading && error && (
          <div className="analysis-state analysis-state--error" role="alert">
            <AlertTriangle size={26} />
            <h3>Repository scan did not finish</h3>
            <p>{error}</p>
            <button className="button button--secondary" onClick={onRetry}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && analysis && analysis.suggestions.length === 0 && (
          <div className="analysis-state">
            <Check size={28} />
            <h3>No missing features found</h3>
            <p>The model did not find evidence-backed capabilities outside the current map.</p>
          </div>
        )}

        {!loading && !error && analysis && analysis.suggestions.length > 0 && (
          <>
            <div className="analysis-summary">
              <div>
                <Sparkles size={17} />
                <span>
                  <strong>{analysis.suggestions.length}</strong> proposed features
                </span>
              </div>
              <p>
                {analysis.model} · {analysis.scannedFiles} files
                {analysis.truncated ? " · context limit reached" : ""}
              </p>
            </div>
            <div className="suggestion-list">
              {analysis.suggestions.map((suggestion) => {
                const selected = !rejectedNames.has(suggestion.name);
                return (
                  <label
                    className={`suggestion-card${selected ? " suggestion-card--selected" : ""}`}
                    key={suggestion.name}
                  >
                    <input
                      aria-label={`Select ${suggestion.name}`}
                      checked={selected}
                      type="checkbox"
                      onChange={(event) => {
                        setRejectedNames((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.delete(suggestion.name);
                          else next.add(suggestion.name);
                          return next;
                        });
                      }}
                    />
                    <span className="suggestion-card__check" aria-hidden="true">
                      {selected && <Check size={14} />}
                    </span>
                    <span className="suggestion-card__body">
                      <span className="suggestion-card__heading">
                        <strong>{suggestion.name}</strong>
                        <span className={`status-tag status-tag--${suggestion.suggestedStatus}`}>
                          {featureStatusLabels[suggestion.suggestedStatus]}
                        </span>
                        <small>{Math.round(suggestion.confidence * 100)}% confidence</small>
                      </span>
                      <span>{suggestion.description}</span>
                      <small className="suggestion-card__evidence">
                        <strong>Evidence</strong> {suggestion.evidence}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="button button--ghost" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          {analysis && analysis.suggestions.length > 0 && !error && (
            <button
              className="button button--primary"
              disabled={saving || selectedSuggestions.length === 0}
              onClick={() => void onAccept(selectedSuggestions)}
            >
              {saving
                ? "Adding features…"
                : `Add ${selectedSuggestions.length} feature${selectedSuggestions.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export type ProjectStatus = "planning" | "active" | "paused" | "shipped";
export type FeatureStatus = "planned" | "in_progress" | "working" | "blocked";
export type FeaturePriority = "now" | "next" | "later";

export interface Project {
  id: string;
  name: string;
  path: string;
  goal: string;
  nextAction: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFeature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  evidence: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  focusId: string | null;
  featureId: string | null;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFocus {
  id: string;
  projectId: string;
  title: string;
  status: "active" | "archived";
  startedAt: string;
  endedAt: string | null;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  subject: string;
  authoredAt: string;
  author: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

export interface GitFileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "type changed";
  additions: number | null;
  deletions: number | null;
}

export interface GitCommitDetails {
  hash: string;
  files: GitFileChange[];
  changeTypes: string[];
  diff: string;
  diffTruncated: boolean;
}

export interface CommitTaskSuggestion {
  taskId: string;
  reason: string;
}

export interface CommitFeatureSuggestion {
  featureId: string;
  status: FeatureStatus;
  reason: string;
}

export interface CommitAnalysis {
  commitHash: string;
  model: string;
  whatChanged: string;
  nowPossible: string;
  caution: string;
  taskSuggestion: CommitTaskSuggestion | null;
  featureSuggestion: CommitFeatureSuggestion | null;
  focusImpact: string;
  goalImpact: string;
  reviewStatus: "pending" | "accepted" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
}

export interface ReviewCommitAnalysisInput {
  projectId: string;
  commitHash: string;
  action: "accept" | "reject";
  taskId: string | null;
  completeTask: boolean;
  featureId: string | null;
  featureStatus: FeatureStatus | null;
}

export interface GitBranch {
  name: string;
  shortHash: string;
  updatedAt: string;
  isCurrent: boolean;
}

export interface GitSnapshot {
  available: boolean;
  error: string | null;
  currentBranch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  modifiedFiles: number;
  isDirty: boolean;
  branches: GitBranch[];
  commits: GitCommit[];
}

export interface ProjectSnapshot {
  project: Project;
  features: ProjectFeature[];
  focuses: ProjectFocus[];
  tasks: ProjectTask[];
  git: GitSnapshot;
}

export interface Dashboard {
  projects: ProjectSnapshot[];
  refreshedAt: string;
}

export interface UpdateProjectInput {
  id: string;
  goal: string;
  nextAction: string;
  status: ProjectStatus;
}

export interface AddFeatureInput {
  projectId: string;
  name: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  evidence: string;
}

export interface AddProjectTaskInput {
  projectId: string;
  featureId: string | null;
  title: string;
}

export interface StartProjectFocusInput {
  projectId: string;
  title: string;
}

export interface FeatureSuggestion {
  name: string;
  description: string;
  suggestedStatus: Exclude<FeatureStatus, "blocked">;
  evidence: string;
  confidence: number;
}

export interface FeatureAnalysisResult {
  model: string;
  scannedFiles: number;
  truncated: boolean;
  suggestions: FeatureSuggestion[];
}

export interface AcceptFeatureSuggestionsInput {
  projectId: string;
  suggestions: FeatureSuggestion[];
}

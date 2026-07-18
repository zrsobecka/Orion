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
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  subject: string;
  authoredAt: string;
  author: string;
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

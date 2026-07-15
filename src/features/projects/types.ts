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

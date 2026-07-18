use std::path::PathBuf;

use serde::Serialize;

use super::process::background_command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub subject: String,
    pub authored_at: String,
    pub author: String,
    pub changed_files: usize,
    pub additions: u32,
    pub deletions: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileChange {
    pub path: String,
    pub status: String,
    pub additions: Option<u32>,
    pub deletions: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitDetails {
    pub hash: String,
    pub files: Vec<GitFileChange>,
    pub change_types: Vec<String>,
    pub diff: String,
    pub diff_truncated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranch {
    pub name: String,
    pub short_hash: String,
    pub updated_at: String,
    pub is_current: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSnapshot {
    pub available: bool,
    pub error: Option<String>,
    pub current_branch: String,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub modified_files: usize,
    pub is_dirty: bool,
    pub branches: Vec<GitBranch>,
    pub commits: Vec<GitCommit>,
}

impl GitSnapshot {
    pub fn unavailable(error: String) -> Self {
        Self {
            available: false,
            error: Some(error),
            current_branch: String::new(),
            upstream: None,
            ahead: 0,
            behind: 0,
            modified_files: 0,
            is_dirty: false,
            branches: Vec::new(),
            commits: Vec::new(),
        }
    }
}

fn run_git(path: &str, arguments: &[&str]) -> Result<String, String> {
    let output = background_command("git")
        .arg("-C")
        .arg(path)
        .args(arguments)
        .output()
        .map_err(|error| format!("Git could not be started: {error}"))?;

    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if detail.is_empty() {
            "Git did not recognize this folder as a repository.".to_string()
        } else {
            format!("Git could not read this repository: {detail}")
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn resolve_repository_root(selected_path: &str) -> Result<PathBuf, String> {
    let root = run_git(selected_path, &["rev-parse", "--show-toplevel"])?;
    let root = PathBuf::from(root.trim());
    root.canonicalize()
        .map_err(|error| format!("Could not resolve the repository folder: {error}"))
}

pub fn read_snapshot(path: &str) -> Result<GitSnapshot, String> {
    let status_output = run_git(path, &["status", "--porcelain=v2", "--branch"])?;
    let mut current_branch = "HEAD detached".to_string();
    let mut upstream = None;
    let mut ahead = 0;
    let mut behind = 0;
    let mut modified_files = 0;

    for line in status_output.lines() {
        if let Some(value) = line.strip_prefix("# branch.head ") {
            current_branch = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("# branch.upstream ") {
            upstream = Some(value.trim().to_string());
        } else if let Some(value) = line.strip_prefix("# branch.ab ") {
            for part in value.split_whitespace() {
                if let Some(value) = part.strip_prefix('+') {
                    ahead = value.parse().unwrap_or(0);
                } else if let Some(value) = part.strip_prefix('-') {
                    behind = value.parse().unwrap_or(0);
                }
            }
        } else if !line.starts_with('#') && !line.trim().is_empty() {
            modified_files += 1;
        }
    }

    let branches = read_branches(path, &current_branch)?;
    let commits = if has_head(path) {
        read_commits(path)?
    } else {
        Vec::new()
    };

    Ok(GitSnapshot {
        available: true,
        error: None,
        current_branch,
        upstream,
        ahead,
        behind,
        modified_files,
        is_dirty: modified_files > 0,
        branches,
        commits,
    })
}

fn has_head(path: &str) -> bool {
    background_command("git")
        .arg("-C")
        .arg(path)
        .args(["rev-parse", "--verify", "HEAD"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn read_branches(path: &str, current_branch: &str) -> Result<Vec<GitBranch>, String> {
    let output = run_git(
        path,
        &[
            "for-each-ref",
            "--sort=-committerdate",
            "--format=%(refname:short)%1f%(objectname:short)%1f%(committerdate:iso-strict)",
            "refs/heads",
        ],
    )?;

    Ok(output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\u{1f}');
            let name = parts.next()?.to_string();
            Some(GitBranch {
                is_current: name == current_branch,
                name,
                short_hash: parts.next()?.to_string(),
                updated_at: parts.next().unwrap_or_default().to_string(),
            })
        })
        .collect())
}

fn read_commits(path: &str) -> Result<Vec<GitCommit>, String> {
    let output = run_git(
        path,
        &[
            "log",
            "-10",
            "--format=%x1e%H%x1f%h%x1f%s%x1f%aI%x1f%an",
            "--numstat",
            "--no-renames",
        ],
    )?;

    Ok(output
        .split('\u{1e}')
        .filter_map(|block| {
            let mut lines = block.trim().lines();
            let mut parts = lines.next()?.split('\u{1f}');
            let hash = parts.next()?.to_string();
            let short_hash = parts.next()?.to_string();
            let subject = parts.next()?.to_string();
            let authored_at = parts.next()?.to_string();
            let author = parts.next().unwrap_or_default().to_string();
            let mut changed_files = 0;
            let mut additions = 0;
            let mut deletions = 0;
            for line in lines.filter(|line| !line.trim().is_empty()) {
                let mut stats = line.splitn(3, '\t');
                let added = stats.next()?;
                let deleted = stats.next()?;
                stats.next()?;
                changed_files += 1;
                additions += added.parse::<u32>().unwrap_or(0);
                deletions += deleted.parse::<u32>().unwrap_or(0);
            }
            Some(GitCommit {
                hash,
                short_hash,
                subject,
                authored_at,
                author,
                changed_files,
                additions,
                deletions,
            })
        })
        .collect())
}

pub fn read_commit_details(path: &str, hash: &str) -> Result<GitCommitDetails, String> {
    if !(7..=64).contains(&hash.len())
        || !hash.chars().all(|character| character.is_ascii_hexdigit())
    {
        return Err("The commit hash is invalid.".to_string());
    }

    let status_output = run_git(
        path,
        &["show", "--format=", "--name-status", "--find-renames", hash],
    )?;
    let numstat_output = run_git(
        path,
        &["show", "--format=", "--numstat", "--find-renames", hash],
    )?;
    let mut stats = std::collections::HashMap::new();
    for line in numstat_output
        .lines()
        .filter(|line| !line.trim().is_empty())
    {
        let mut parts = line.splitn(3, '\t');
        let additions = parts.next().and_then(|value| value.parse::<u32>().ok());
        let deletions = parts.next().and_then(|value| value.parse::<u32>().ok());
        if let Some(file_path) = parts.next() {
            stats.insert(file_path.to_string(), (additions, deletions));
        }
    }

    let mut change_types = Vec::new();
    let files = status_output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| {
            let mut parts = line.split('\t');
            let raw_status = parts.next()?;
            let file_path = parts.last()?.to_string();
            let status = match raw_status.chars().next()? {
                'A' => "added",
                'D' => "deleted",
                'R' => "renamed",
                'T' => "type changed",
                _ => "modified",
            }
            .to_string();
            if !change_types.contains(&status) {
                change_types.push(status.clone());
            }
            let (additions, deletions) = stats.get(&file_path).copied().unwrap_or((None, None));
            Some(GitFileChange {
                path: file_path,
                status,
                additions,
                deletions,
            })
        })
        .collect();

    const DIFF_LIMIT: usize = 60_000;
    let raw_diff = run_git(
        path,
        &["show", "--format=", "--no-ext-diff", "--unified=3", hash],
    )?;
    let diff_truncated = raw_diff.chars().count() > DIFF_LIMIT;
    let diff = raw_diff.chars().take(DIFF_LIMIT).collect();
    Ok(GitCommitDetails {
        hash: hash.to_string(),
        files,
        change_types,
        diff,
        diff_truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repository_snapshot_includes_real_commit_statistics() {
        let snapshot = read_snapshot(env!("CARGO_MANIFEST_DIR")).expect("repository snapshot");
        assert!(!snapshot.commits.is_empty());
        assert!(snapshot
            .commits
            .iter()
            .any(|commit| commit.changed_files > 0 && commit.additions + commit.deletions > 0));
    }

    #[test]
    fn commit_details_reject_non_hexadecimal_hashes_before_running_git() {
        let error = read_commit_details("missing repository", "not-a-hash")
            .expect_err("invalid commit hash");
        assert_eq!(error, "The commit hash is invalid.");
    }
}

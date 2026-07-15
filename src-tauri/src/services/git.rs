use std::{path::PathBuf, process::Command};

use crate::models::{GitBranch, GitCommit, GitSnapshot};

fn run_git(path: &str, arguments: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
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
    Command::new("git")
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
        &["log", "-10", "--format=%H%x1f%h%x1f%s%x1f%aI%x1f%an"],
    )?;

    Ok(output
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\u{1f}');
            Some(GitCommit {
                hash: parts.next()?.to_string(),
                short_hash: parts.next()?.to_string(),
                subject: parts.next()?.to_string(),
                authored_at: parts.next()?.to_string(),
                author: parts.next().unwrap_or_default().to_string(),
            })
        })
        .collect())
}

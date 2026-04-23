export interface GithubIssue {
  number: number;
  title: string;
  repo: string; // "owner/repo"
  url: string; // html_url
  labels: string[];
  updatedAt: string; // ISO 8601
  body?: string;
}

export interface GithubPullRequest {
  number: number;
  title: string;
  repo: string;
  url: string;
  draft: boolean;
  updatedAt: string;
  requestedReviewers: string[];
}

export interface AssignedTasks {
  issues: GithubIssue[];
  pullRequests: GithubPullRequest[];
}

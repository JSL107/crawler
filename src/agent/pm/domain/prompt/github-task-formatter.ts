import { AssignedTasks } from '../../../../github/domain/github.type';

// PM Agent 프롬프트에 끼워 넣을 GitHub assigned task 섹션을 markdown 으로 변환한다.
// 빈 결과(GitHub 호출은 성공했으나 할당 없음)도 명시적으로 표기해 모델이 "GitHub 데이터는 없다" 는 사실을 알 수 있게 한다.
export const formatGithubTasksAsPromptSection = (
  tasks: AssignedTasks,
): string => {
  const lines: string[] = ['[GitHub 에서 자동 수집한 assigned 항목]'];

  if (tasks.issues.length === 0 && tasks.pullRequests.length === 0) {
    lines.push('(없음 — GitHub 호출은 성공했으나 assigned 항목이 없음)');
    return lines.join('\n');
  }

  for (const issue of tasks.issues) {
    const labels =
      issue.labels.length > 0 ? ` [${issue.labels.join(', ')}]` : '';
    lines.push(
      `- Issue #${issue.number} (${issue.repo})${labels}: ${issue.title}`,
    );
  }

  for (const pr of tasks.pullRequests) {
    const draft = pr.draft ? ' [draft]' : '';
    lines.push(`- PR #${pr.number} (${pr.repo})${draft}: ${pr.title}`);
  }

  return lines.join('\n');
};

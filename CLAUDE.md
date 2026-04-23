# CLAUDE.md

자동화 에이전트(Claude Code 포함) 가 이 레포에서 따라야 할 규칙은 [AGENTS.md](./AGENTS.md) 한 파일로 통합되어 있다. Claude Code 도 그 문서를 그대로 따른다.

핵심만 다시 짚으면:
- 빌드/테스트/린트: `pnpm build`, `pnpm test`, `pnpm lint:check` (코드 변경 후 3중 green 필수)
- DDD 컨벤션 / 보안 규칙: [CODE_RULES.md](./CODE_RULES.md)
- 인프라: PostgreSQL 5434, Redis 6381, Slack Socket Mode, codex/claude CLI subscription quota
- commit 은 사용자가 명시 요청 전엔 하지 않음

자세한 내용은 [AGENTS.md](./AGENTS.md) 참조.

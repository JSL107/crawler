// Notion DB 의 한 row(=page) 를 PM Agent 가 활용할 수 있는 형태로 narrow.
// 속성 schema 는 DB 마다 다르므로 title 만 우선 추출하고 나머지는 raw key-value 로 노출 — 모델이 알아서 해석.
export interface NotionTask {
  databaseId: string;
  pageId: string;
  url: string;
  title: string;
  // 사람이 읽기 좋은 라벨 → 사람이 읽기 좋은 값. 빈 속성은 미포함.
  // 예: { "상태": "진행중", "우선순위": "높음", "담당자": "김준석" }
  properties: Record<string, string>;
}

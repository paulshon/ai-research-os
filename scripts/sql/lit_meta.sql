-- 적재율 분모: papers_v2 에서 lit_papers 조건에 맞는 논문 수(llb-status.ts 가 읽는다). 적재·증분 후에 다시 세어 갱신한다.
CREATE TABLE IF NOT EXISTS openalex.lit_meta (key String, value UInt64, note String, updated_at DateTime DEFAULT now())
ENGINE = ReplacingMergeTree(updated_at) ORDER BY key;

INSERT INTO openalex.lit_meta (key, value, note)
SELECT 'eligible_rows', count(), 'papers_v2 rows that lit_papers is built from (type IN article/review/preprint/conference-paper/dissertation, tier<=2, title!=\'\', year>=2000)'
FROM openalex.papers_v2
WHERE type IN ('article', 'review', 'preprint', 'conference-paper', 'dissertation') AND tier <= 2 AND title != '' AND publication_year >= 2000;

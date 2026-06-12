"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useMemo, useCallback, useRef } from "react";
import { useGemini } from "@/hooks/use-gemini";
import { useTranslation } from "@/lib/i18n";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import NetworkAnalysis, { type NetworkPaper } from "@/components/literature/network-analysis";

/* ─────────────────────────────────────────────
   53개 글로벌 학술 DB 정의
───────────────────────────────────────────── */
interface AcademicDB {
  id: number;
  name: string;
  type: string;
  field: string;
  feature: string;
  provider: string;
  apiAvailable: boolean;
  url: string;
}

const ACADEMIC_DBS: AcademicDB[] = [
  { id: 1,  name: "RISS",                       type: "통합검색",    field: "전 주제", feature: "국내외 논문·학위논문 통합검색",       provider: "KERIS",                      apiAvailable: false, url: "https://www.riss.kr" },
  { id: 2,  name: "KCI",                        type: "인용색인",    field: "전 주제", feature: "국내 등재지·인용정보 분석",          provider: "한국연구재단",                   apiAvailable: false, url: "https://www.kci.go.kr" },
  { id: 3,  name: "DBpia",                      type: "저널원문",    field: "전 주제", feature: "국내 학술논문·학회지",              provider: "누리미디어",                    apiAvailable: false, url: "https://www.dbpia.co.kr" },
  { id: 4,  name: "KISS",                       type: "저널원문",    field: "전 주제", feature: "국내 대표 학술논문 플랫폼",          provider: "한국학술정보",                   apiAvailable: false, url: "https://kiss.kstudy.com" },
  { id: 6,  name: "코리아스칼라",                    type: "저널원문",    field: "전 주제", feature: "국내 학회지·Proceedings",         provider: "코리아스칼라",                   apiAvailable: false, url: "https://www.koreascience.kr" },
  { id: 7,  name: "KoreaScience",               type: "저널원문",    field: "과학기술", feature: "자연과학·공학 중심 플랫폼",           provider: "KISTI",                      apiAvailable: false, url: "https://www.koreascience.kr" },
  { id: 8,  name: "OAK 국가리포지터리",               type: "오픈액세스",   field: "전 주제", feature: "국내 기관 리포지터리",              provider: "국립중앙도서관",                  apiAvailable: false, url: "https://oak.go.kr" },
  { id: 9,  name: "KOSSDA",                     type: "데이터/통계", field: "사회과학", feature: "조사자료·질적자료·패널데이터",          provider: "한국사회과학자료원",                apiAvailable: false, url: "https://kossda.snu.ac.kr" },
  { id: 10, name: "KSDC",                       type: "통계/설문",   field: "전 주제", feature: "설문조사·통계 분석",               provider: "한국사회과학데이터센터",              apiAvailable: false, url: "https://ksdc.re.kr" },
  { id: 11, name: "KRpia",                      type: "데이터/리포트",field: "한국학",  feature: "역사·문화·문학 자료",              provider: "누리미디어",                    apiAvailable: false, url: "https://www.krpia.co.kr" },
  { id: 12, name: "KIPRIS",                     type: "특허DB",    field: "전 주제", feature: "국내외 특허 검색",                provider: "특허청",                       apiAvailable: false, url: "https://www.kipris.or.kr" },
  { id: 13, name: "WIPS ON",                    type: "특허DB",    field: "전 주제", feature: "글로벌 특허 분석",                provider: "윕스",                        apiAvailable: false, url: "https://www.wipson.com" },
  { id: 14, name: "ACM Digital Library",        type: "저널원문",    field: "컴퓨터공학",feature: "컴퓨터공학·멀티미디어",              provider: "ACM",                        apiAvailable: true,  url: "https://dl.acm.org" },
  { id: 15, name: "IEEE Xplore",                type: "저널원문",    field: "공학",   feature: "전기전자·통신 핵심 DB",            provider: "IEEE",                       apiAvailable: true,  url: "https://ieeexplore.ieee.org" },
  { id: 16, name: "ScienceDirect",              type: "저널원문",    field: "전 주제", feature: "Elsevier 통합 플랫폼",           provider: "Elsevier",                   apiAvailable: true,  url: "https://www.sciencedirect.com" },
  { id: 17, name: "SpringerLink",               type: "저널원문",    field: "전 주제", feature: "Springer 전자저널",             provider: "Springer Nature",            apiAvailable: true,  url: "https://link.springer.com" },
  { id: 18, name: "Wiley Online Library",       type: "저널원문",    field: "전 주제", feature: "Wiley 학술저널",                provider: "Wiley",                      apiAvailable: true,  url: "https://onlinelibrary.wiley.com" },
  { id: 19, name: "Taylor & Francis Online",    type: "저널원문",    field: "전 주제", feature: "글로벌 학술저널",                 provider: "Taylor & Francis",           apiAvailable: true,  url: "https://www.tandfonline.com" },
  { id: 20, name: "Cambridge Core",             type: "저널원문",    field: "전 주제", feature: "Cambridge 전자저널",            provider: "Cambridge University Press",  apiAvailable: true,  url: "https://www.cambridge.org/core" },
  { id: 21, name: "SAGE Journals",              type: "저널원문",    field: "사회과학", feature: "사회과학·교육학 강세",              provider: "SAGE",                       apiAvailable: true,  url: "https://journals.sagepub.com" },
  { id: 22, name: "JSTOR",                      type: "저널원문",    field: "인문사회", feature: "인문·사회 아카이브",               provider: "JSTOR",                      apiAvailable: true,  url: "https://www.jstor.org" },
  { id: 23, name: "ProQuest Central",           type: "통합DB",    field: "전 주제", feature: "글로벌 통합 학술DB",              provider: "ProQuest",                   apiAvailable: true,  url: "https://www.proquest.com" },
  { id: 24, name: "PQDT Global",                type: "학위논문",    field: "전 주제", feature: "글로벌 석·박사 논문",              provider: "ProQuest",                   apiAvailable: true,  url: "https://www.proquest.com/pqdtglobal" },
  { id: 25, name: "Scopus",                     type: "인용색인",    field: "전 주제", feature: "세계 최대 초록·인용 DB",           provider: "Elsevier",                   apiAvailable: true,  url: "https://www.scopus.com" },
  { id: 26, name: "Web of Science",             type: "인용색인",    field: "전 주제", feature: "SCIE·SSCI·A&HCI",            provider: "Clarivate",                  apiAvailable: true,  url: "https://www.webofscience.com" },
  { id: 27, name: "Journal Citation Reports",   type: "인용분석",    field: "전 주제", feature: "IF·저널 영향력 분석",             provider: "Clarivate",                  apiAvailable: false, url: "https://jcr.clarivate.com" },
  { id: 28, name: "Nature",                     type: "저널원문",    field: "자연과학", feature: "Nature 계열 저널",              provider: "Nature Publishing Group",    apiAvailable: true,  url: "https://www.nature.com" },
  { id: 29, name: "Science Magazine",           type: "저널원문",    field: "과학",   feature: "Science·Science Robotics",    provider: "AAAS",                       apiAvailable: true,  url: "https://www.science.org" },
  { id: 30, name: "American Chemical Society",  type: "저널원문",    field: "화학",   feature: "화학 핵심 저널",                 provider: "ACS",                        apiAvailable: true,  url: "https://pubs.acs.org" },
  { id: 31, name: "Royal Society of Chemistry", type: "저널원문",    field: "화학",   feature: "화학 분야 주요 저널",              provider: "RSC",                        apiAvailable: true,  url: "https://pubs.rsc.org" },
  { id: 32, name: "SciFinder",                  type: "화학DB",    field: "화학",   feature: "화학·반응식·특허 검색",             provider: "CAS",                        apiAvailable: false, url: "https://scifinder.cas.org" },
  { id: 33, name: "AIP Publishing",             type: "저널원문",    field: "물리학",  feature: "물리학 핵심 저널",                provider: "AIP",                        apiAvailable: true,  url: "https://publishing.aip.org" },
  { id: 34, name: "APS Journals",               type: "저널원문",    field: "물리학",  feature: "미국물리학회 저널",               provider: "APS",                        apiAvailable: true,  url: "https://journals.aps.org" },
  { id: 35, name: "Annual Reviews",             type: "리뷰저널",    field: "전 주제", feature: "최고 수준 리뷰논문",              provider: "Annual Reviews",             apiAvailable: true,  url: "https://www.annualreviews.org" },
  { id: 36, name: "Business Source Premier",    type: "저널원문",    field: "경영학",  feature: "비즈니스 핵심 DB",               provider: "EBSCO",                      apiAvailable: true,  url: "https://www.ebsco.com" },
  { id: 37, name: "OECD iLibrary",              type: "데이터/리포트",field: "경제·정책",feature: "OECD 보고서·통계",              provider: "OECD",                       apiAvailable: true,  url: "https://www.oecd-ilibrary.org" },
  { id: 38, name: "PsycARTICLES",               type: "저널원문",    field: "심리학",  feature: "APA Full Text",               provider: "APA",                        apiAvailable: true,  url: "https://psycnet.apa.org" },
  { id: 39, name: "HeinOnline",                 type: "법률DB",    field: "법학",   feature: "미국 법률저널 아카이브",            provider: "W.S. Hein",                  apiAvailable: false, url: "https://heinonline.org" },
  { id: 40, name: "Lexis+",                     type: "법률DB",    field: "법학",   feature: "글로벌 법률·판례",               provider: "LexisNexis",                 apiAvailable: false, url: "https://www.lexisnexis.com" },
  { id: 41, name: "CAIRN.info",                 type: "저널원문",    field: "인문사회", feature: "프랑스어권 인문사회",              provider: "CAIRN",                      apiAvailable: false, url: "https://www.cairn.info" },
  { id: 42, name: "Literature Online",          type: "문학DB",    field: "영문학",  feature: "영문학 작품·비평",               provider: "ProQuest",                   apiAvailable: false, url: "https://literature.proquest.com" },
  { id: 43, name: "Art & Architecture Source",  type: "저널원문",    field: "예술·건축",feature: "미술·건축 자료",                provider: "EBSCO",                      apiAvailable: false, url: "https://www.ebsco.com" },
  { id: 44, name: "Artstor Digital Library",    type: "이미지DB",   field: "예술·건축",feature: "고화질 예술 이미지",              provider: "ARTstor",                    apiAvailable: false, url: "https://www.artstor.org" },
  { id: 45, name: "ArtPrice",                   type: "데이터DB",   field: "미술시장", feature: "글로벌 미술시장 정보",             provider: "Artprice",                   apiAvailable: false, url: "https://www.artprice.com" },
  { id: 46, name: "The Vogue Archive",          type: "패션아카이브",  field: "디자인",  feature: "Vogue 전호 아카이브",            provider: "ProQuest",                   apiAvailable: false, url: "https://www.proquest.com" },
  { id: 47, name: "WGSN",                       type: "트렌드DB",   field: "디자인",  feature: "패션·소비자 트렌드",              provider: "WGSN",                       apiAvailable: false, url: "https://www.wgsn.com" },
  { id: 48, name: "AVON",                       type: "동영상자료",   field: "전 주제", feature: "학술 비디오 스트리밍",             provider: "Alexander Street",           apiAvailable: false, url: "https://video.alexanderstreet.com" },
  { id: 49, name: "DOAJ",                       type: "OA저널",    field: "전 주제", feature: "오픈액세스 저널 검색",             provider: "Lund University",            apiAvailable: true,  url: "https://doaj.org" },
  { id: 50, name: "CNKI",                       type: "저널원문",    field: "중국학",  feature: "중국 논문·학위논문",              provider: "CNKI",                       apiAvailable: false, url: "https://www.cnki.net" },
  { id: 51, name: "CiNii Research",             type: "저널원문",    field: "전 주제", feature: "일본 학술정보 검색",              provider: "NII",                        apiAvailable: true,  url: "https://cir.nii.ac.jp" },
  { id: 52, name: "The New York Times",         type: "신문",      field: "전 주제", feature: "디지털 뉴스 플랫폼",              provider: "The New York Times",         apiAvailable: false, url: "https://www.nytimes.com" },
  { id: 53, name: "O'Reilly Higher Education",  type: "전자책",     field: "IT·AI",  feature: "프로그래밍·AI 학습자료",           provider: "O'Reilly Media",             apiAvailable: false, url: "https://www.oreilly.com" },
];

/* ─────────────────────────────────────────────
   DB 분류 (카테고리)
───────────────────────────────────────────── */
const DB_CATEGORIES = [
  { id: "korean",    labelKey: "litReview.catKorean",    ids: [1,2,3,4,6,7,8,9,10,11] },
  { id: "patent",    labelKey: "litReview.catPatent",    ids: [12,13] },
  { id: "global",    labelKey: "litReview.catGlobal",    ids: [14,15,16,17,18,19,20,21,22,23,24] },
  { id: "citation",  labelKey: "litReview.catCitation",  ids: [25,26,27] },
  { id: "science",   labelKey: "litReview.catScience",   ids: [28,29,30,31,32,33,34,35] },
  { id: "social",    labelKey: "litReview.catSocial",    ids: [36,37,38] },
  { id: "law",       labelKey: "litReview.catLaw",       ids: [39,40] },
  { id: "arts",      labelKey: "litReview.catArts",      ids: [41,42,43,44,45,46,47,48] },
  { id: "opendata",  labelKey: "litReview.catOpenData",  ids: [49,50,51,52,53] },
];

/** 국내 DB IDs (id 1-13: 한국 학술DB + 특허DB) */
const KOREAN_DB_IDS = new Set([1,2,3,4,6,7,8,9,10,11,12,13]);

/* ─────────────────────────────────────────────
   검색 결과 타입
───────────────────────────────────────────── */
interface SearchResult {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  abstract: string;
  doi: string;
  url: string;
  citations: number;
  keywords: string[];
  source: string;
  similarity?: number;
  region: "domestic" | "international";
}

/* ─────────────────────────────────────────────
   Draft 타입
───────────────────────────────────────────── */
interface LitReviewDraft {
  activeTab: string;
  searchQuery: string;
  searchResults: SearchResult[];
  selectedDBs: number[];
  selectedResults: string[];
  researchGap: string;
  researchDesign: string;
  clusterAnalysis: string;
  theoryConnection: string;
  filterField: string;
  filterType: string;
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */
export default function LiteratureReviewPage() {
  const { t, locale } = useTranslation();
  const { generate, loading } = useGemini();

  // ── 상태 ──
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedDBs, setSelectedDBs] = useState<number[]>([25, 26, 49]); // Scopus, WoS, DOAJ default
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [researchGap, setResearchGap] = useState("");
  const [researchDesign, setResearchDesign] = useState("");
  const [clusterAnalysis, setClusterAnalysis] = useState("");
  const [theoryConnection, setTheoryConnection] = useState("");
  const [filterField, setFilterField] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchLoading, setSearchLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("global");
  const [searchRegion, setSearchRegion] = useState<"domestic" | "international">("domestic");
  const [mobileSidebar, setMobileSidebar] = useState(false); // v23: 모바일 좌측 패널 드로어
  const buildDbSearchUrl = (db: AcademicDB, keyword: string) => {
    const q = encodeURIComponent(keyword);
    if (db.name === "RISS") return `https://www.riss.kr/search/Search.do?queryText=${q}`;
    if (db.name === "KCI") return `https://www.kci.go.kr/kciportal/po/search/poArtiSearList.kci?keyword=${q}`;
    if (db.name === "DBpia") return `https://www.dbpia.co.kr/search/topSearch?searchWord=${q}`;
    if (db.name === "KISS") return `https://kiss.kstudy.com/search/sch-result.asp?key=${q}`;
    return `${db.url}?q=${q}`;
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Persistence ──
  const getData = useCallback(
    (): LitReviewDraft => ({
      activeTab, searchQuery, searchResults, selectedDBs, selectedResults,
      researchGap, researchDesign, clusterAnalysis, theoryConnection,
      filterField, filterType,
    }),
    [activeTab, searchQuery, searchResults, selectedDBs, selectedResults,
     researchGap, researchDesign, clusterAnalysis, theoryConnection,
     filterField, filterType]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as LitReviewDraft;
    if (d.activeTab) setActiveTab(d.activeTab);
    if (d.searchQuery !== undefined) setSearchQuery(d.searchQuery);
    if (d.searchResults) setSearchResults(d.searchResults);
    if (d.selectedDBs) setSelectedDBs(d.selectedDBs);
    if (d.selectedResults) setSelectedResults(d.selectedResults);
    if (d.researchGap !== undefined) setResearchGap(d.researchGap);
    if (d.researchDesign !== undefined) setResearchDesign(d.researchDesign);
    if (d.clusterAnalysis !== undefined) setClusterAnalysis(d.clusterAnalysis);
    if (d.theoryConnection !== undefined) setTheoryConnection(d.theoryConnection);
    if (d.filterField !== undefined) setFilterField(d.filterField);
    if (d.filterType !== undefined) setFilterType(d.filterType);
  }, []);

  const handleReset = useCallback(() => {
    setActiveTab("search");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedDBs([25, 26, 49]);
    setSelectedResults([]);
    setResearchGap("");
    setResearchDesign("");
    setClusterAnalysis("");
    setTheoryConnection("");
    setFilterField("all");
    setFilterType("all");
  }, []);

  usePagePersistence("literature-review", handleLoad, handleReset);

  // ── 탭 목록 ── (v41: 파이프라인 제거 → 네트워크분석 추가)
  const TABS = useMemo(() => [
    { id: "search",    label: t("litReview.tabSearch"),    icon: "🔍" },
    { id: "databases", label: t("litReview.tabDatabases"), icon: "🗄️" },
    { id: "network",   label: t("litReview.tabNetwork"),   icon: "network" },
    { id: "gap",       label: t("litReview.tabGap"),       icon: "💡" },
    { id: "design",    label: t("litReview.tabDesign"),    icon: "📐" },
    { id: "cluster",   label: t("litReview.tabCluster"),   icon: "🔬" },
  ], [t]);

  // ── DB 필터링 ──
  const filteredDBs = useMemo(() => {
    return ACADEMIC_DBS.filter(db => {
      if (filterField !== "all" && db.field !== filterField) return false;
      if (filterType !== "all" && db.type !== filterType) return false;
      return true;
    });
  }, [filterField, filterType]);

  const uniqueFields = useMemo(() =>
    [...new Set(ACADEMIC_DBS.map(db => db.field))].sort(),
  []);

  const uniqueTypes = useMemo(() =>
    [...new Set(ACADEMIC_DBS.map(db => db.type))].sort(),
  []);

  // ── DB 토글 ──
  const toggleDB = (id: number) => {
    setSelectedDBs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCategoryDBs = (ids: number[]) => {
    const allSelected = ids.every(id => selectedDBs.includes(id));
    if (allSelected) {
      setSelectedDBs(prev => prev.filter(x => !ids.includes(x)));
    } else {
      setSelectedDBs(prev => [...new Set([...prev, ...ids])]);
    }
  };

  // ── 검색 결과 토글 ──
  const toggleResult = (id: string) => {
    setSelectedResults(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── 실제 학술 API 검색 (OpenAlex + CrossRef + Semantic Scholar) ──
  // Gemini 불필요: 100% 실제 메타데이터
  const handleSearch = async (regionOverride?: "domestic" | "international") => {
    if (!searchQuery.trim()) return;
    setMobileSidebar(false); // v23: 모바일에서 검색 시 드로어 닫아 결과 표시
    const region = regionOverride ?? searchRegion;
    setSearchLoading(true);

    try {
      // v41: 해외 검색은 최대한 많은 리스트 추출(최대 100건 요청 → 소스 통합/중복제거 후 표시)
      const reqLimit = region === "international" ? 100 : 40;
      const res = await fetch(
        `/api/scholar?q=${encodeURIComponent(searchQuery)}&region=${region}&limit=${reqLimit}`
      );
      const data = await res.json();
      const results: SearchResult[] = (data.results ?? []).map((r: any) => ({
        ...r,
        region: region,
        year: r.year ?? 0,
        similarity: r.similarity ?? 0.5,
      }));

      // similarity 내림차순 정렬 (매치율 높은 것이 상위)
      results.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

      if (region === searchRegion) {
        // 같은 지역 재검색이면 교체
        setSearchResults(prev => {
          const other = prev.filter(r => r.region !== region);
          return [...results, ...other];
        });
      } else {
        // 새 지역 탭이면 기존에 추가
        setSearchResults(prev => {
          const other = prev.filter(r => r.region !== region);
          return [...other, ...results];
        });
      }

      // 상위 5개 자동 선택
      const autoSelect = results.slice(0, 5).map(r => r.id);
      setSelectedResults(prev => {
        const otherSelected = prev.filter(id => !results.find(r => r.id === id));
        return [...otherSelected, ...autoSelect];
      });
    } catch {
      // 에러 시 빈 결과
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Gemini 추론: 연구갭 ──
  const analyzeResearchGap = async () => {
    const selected = searchResults.filter(r => selectedResults.includes(r.id));
    if (selected.length === 0) return;

    try {
      const result = await generate({
        systemInstruction: `You are a research gap analysis expert. Analyze the provided paper metadata (titles, abstracts, keywords) and identify:
1. Well-studied areas (what has been done extensively)
2. Under-explored intersections (gaps between theories/methods/contexts)
3. Methodological gaps (missing approaches)
4. Contextual gaps (underrepresented populations, cultures, settings)
5. Temporal gaps (outdated findings that need updating)
6. Specific research gap recommendations with potential RQs

${locale === "ko" ? "반드시 한국어로 응답하세요." : locale === "zh" ? "请用中文回答。" : "Respond in the same language as the paper titles."} Be specific and actionable.`,
        userText: `Analyze research gaps from these ${selected.length} papers:\n\n${selected.map((p, i) =>
          `[${i + 1}] "${p.title}" (${p.year}) - ${p.journal}\nAuthors: ${p.authors}\nAbstract: ${p.abstract}\nKeywords: ${p.keywords.join(", ")}`
        ).join("\n\n")}`,
        temperature: 0.5,
        maxOutputTokens: 8192,
      });
      setResearchGap(result);
      setActiveTab("gap");
    } catch (e: unknown) {
      setResearchGap(e instanceof Error && e.message === "API_KEY_MISSING" ? "API" : "Error");
    }
  };

  // ── Gemini 추론: 연구설계 ──
  const recommendResearchDesign = async () => {
    const selected = searchResults.filter(r => selectedResults.includes(r.id));
    if (selected.length === 0) return;

    try {
      const gapContext = researchGap ? `\n\nIdentified research gaps:\n${researchGap.slice(0, 2000)}` : "";
      const result = await generate({
        systemInstruction: `You are a research design advisor. Based on the literature review and identified gaps, recommend:
1. Optimal research methodology (quantitative/qualitative/mixed/experimental)
2. Specific methods (e.g., Q Methodology, BERTopic, MDS, SEM, Grounded Theory)
3. Recommended theoretical frameworks
4. Sample size and sampling strategy
5. Data collection instruments
6. Analysis techniques
7. Expected contributions

Provide detailed, actionable recommendations. ${locale === "ko" ? "반드시 한국어로 응답하세요." : locale === "zh" ? "请用中文回答。" : "Respond in the same language as the input."}`,
        userText: `Based on these ${selected.length} papers:\n\n${selected.slice(0, 10).map((p, i) =>
          `[${i + 1}] "${p.title}" (${p.year})\nKeywords: ${p.keywords.join(", ")}`
        ).join("\n\n")}${gapContext}`,
        temperature: 0.5,
        maxOutputTokens: 8192,
      });
      setResearchDesign(result);
      setActiveTab("design");
    } catch (e: unknown) {
      setResearchDesign(e instanceof Error && e.message === "API_KEY_MISSING" ? "API" : "Error");
    }
  };

  // ── Gemini 추론: 학자 군집 + 이론 연결 ──
  const analyzeCluster = async () => {
    const selected = searchResults.filter(r => selectedResults.includes(r.id));
    if (selected.length === 0) return;

    try {
      const result = await generate({
        systemInstruction: `You are an academic network and theory analysis expert. Based on paper metadata:
1. RESEARCHER CLUSTERS: Group authors into research paradigm clusters (e.g., objectivist, subjectivist, interactionist, constructivist). Show which authors belong to which cluster and why.
2. THEORY CONNECTIONS: Map the theoretical connections between papers. Show how Theory A connects to Theory B through specific papers.
3. TOPIC NETWORK: Identify main topic clusters from keywords and show connections.
4. CITATION FLOW: Analyze citation patterns to identify key hub papers.
5. RESEARCH TRENDS: Timeline of how the field has evolved based on publication years.

Use clear headings and visual indicators. ${locale === "ko" ? "반드시 한국어로 응답하세요." : locale === "zh" ? "请用中文回答。" : "Respond in the same language as the input."}`,
        userText: `Analyze clusters from these papers:\n\n${selected.map((p, i) =>
          `[${i + 1}] "${p.title}" (${p.year}) by ${p.authors}\nJournal: ${p.journal}\nKeywords: ${p.keywords.join(", ")}\nCitations: ${p.citations}`
        ).join("\n\n")}`,
        temperature: 0.5,
        maxOutputTokens: 8192,
      });
      setClusterAnalysis(result);
      setActiveTab("cluster");
    } catch (e: unknown) {
      setClusterAnalysis(e instanceof Error && e.message === "API_KEY_MISSING" ? "API" : "Error");
    }
  };

  // ── v41: 상단 탭 ↔ 우측 분석 버튼 연동 ──
  // 연구갭/연구설계/군집분석 탭과 동명의 버튼이 동일한 동작을 공유한다.
  //  · 결과가 이미 있으면 해당 탭으로 이동만
  //  · 선택 논문이 있고 결과가 없으면 분석 실행
  //  · 선택 논문이 없으면 탭으로 이동(빈 상태 안내 표시)
  const runAnalysis = useCallback(
    (kind: "gap" | "design" | "cluster") => {
      const hasSelection = selectedResults.length > 0;
      if (kind === "gap") {
        if (researchGap || !hasSelection) { setActiveTab("gap"); if (hasSelection && !researchGap) analyzeResearchGap(); }
        else analyzeResearchGap();
      } else if (kind === "design") {
        if (researchDesign || !hasSelection) { setActiveTab("design"); if (hasSelection && !researchDesign) recommendResearchDesign(); }
        else recommendResearchDesign();
      } else {
        if (clusterAnalysis || !hasSelection) { setActiveTab("cluster"); if (hasSelection && !clusterAnalysis) analyzeCluster(); }
        else analyzeCluster();
      }
    },
    [selectedResults, researchGap, researchDesign, clusterAnalysis] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── v41: 네트워크 분석 대상 논문 (선택분 우선, 없으면 현재 지역 전체) ──
  const networkPapers: NetworkPaper[] = useMemo(() => {
    const base = selectedResults.length > 0
      ? searchResults.filter((r) => selectedResults.includes(r.id))
      : searchResults.filter((r) => r.region === searchRegion);
    return base.map((r) => ({
      id: r.id,
      title: r.title,
      authors: r.authors,
      keywords: r.keywords ?? [],
      journal: r.journal,
      year: r.year,
    }));
  }, [searchResults, selectedResults, searchRegion]);

  /* ═══════════════════════════════════════════
     렌더링
  ═══════════════════════════════════════════ */
  return (
    <div className="flex flex-col md:flex-row font-nanum-gothic">
      <PageSaveRegistration pageId="literature-review" getData={getData} />

      {/* ── v23: 모바일 좌측 패널 토글 바 (md 미만에서만 표시) ── */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] bg-[#0d0f14] sticky top-0 z-[40]">
        <button
          onClick={() => setMobileSidebar(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white/70 active:scale-95 transition-transform"
        >
          <Icon name="🔬" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("litReview.title")}
        </button>
        <span className="text-[13px] text-white/30">{t("litReview.selectedCount")}: {selectedDBs.length} DBs</span>
      </div>

      {/* ── v23: 모바일 드로어 백드롭 ── */}
      {mobileSidebar && (
        <div className="md:hidden fixed inset-0 z-[7800] bg-black/60" onClick={() => setMobileSidebar(false)} aria-hidden />
      )}

      {/* ── 좌측 사이드바: DB 선택 + 검색 (데스크탑=고정 / 모바일=드로어) ── */}
      <div className={`${mobileSidebar ? "fixed inset-y-0 left-0 z-[7900] flex animate-slide-in-left" : "hidden"} md:relative md:z-auto md:flex w-80 max-w-[85vw] border-r border-white/[0.04] bg-[#0d0f14] flex-col overflow-y-auto flex-shrink-0`}>
        {/* 모바일 닫기 버튼 */}
        <div className="md:hidden flex justify-end px-3 pt-2 -mb-2">
          <button
            onClick={() => setMobileSidebar(false)}
            className="text-white/40 hover:text-white/70 text-[23px] leading-none px-2 py-1"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="p-4 border-b border-white/[0.04]">
          <h2 className="text-[17px] font-semibold flex items-center gap-1.5">
            <span><Icon name="🔬" className="inline-flex align-[-0.125em] mr-1" size={15} /></span> {t("litReview.title")}
          </h2>
          <p className="text-[14px] text-white/25 mt-1">{t("litReview.desc")}</p>
        </div>

        {/* 검색 입력 */}
        <div className="p-3 border-b border-white/[0.04]">
          <div className="flex gap-1.5">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("litReview.searchPlaceholder")}
              className="flex-1 px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white/70 focus:border-[#6c8cff] focus:outline-none"
            />
            <button
              onClick={() => handleSearch()}
              disabled={searchLoading || !searchQuery.trim()}
              className="px-3 py-2 bg-[#4a6cf7] text-white rounded-lg text-[15px] font-medium disabled:opacity-30 whitespace-nowrap"
            >
              {searchLoading ? "..." : t("litReview.searchBtn")}
            </button>
          </div>
          <p className="text-[13px] text-white/20 mt-1.5">
            {t("litReview.selectedCount")}: {selectedDBs.length} DBs
          </p>
          {searchQuery.trim() && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ACADEMIC_DBS.filter((db) => KOREAN_DB_IDS.has(db.id) && selectedDBs.includes(db.id)).slice(0, 8).map((db) => (
                <a key={db.id} href={buildDbSearchUrl(db, searchQuery)} target="_blank" rel="noopener" className="text-[13px] px-2 py-1 rounded bg-[#6c8cff]/10 text-[#6c8cff] hover:bg-[#6c8cff]/20">
                  {db.name} 검색
                </a>
              ))}
            </div>
          )}
        </div>

        {/* DB 카테고리 브라우저 */}
        <div className="overflow-y-auto p-2 max-h-[50vh] md:max-h-none md:flex-1">
          <p className="text-[14px] text-white/30 px-2 mb-1.5">{t("litReview.dbBrowser")}</p>
          {DB_CATEGORIES.map(cat => {
            const catDBs = ACADEMIC_DBS.filter(db => cat.ids.includes(db.id));
            const selectedInCat = catDBs.filter(db => selectedDBs.includes(db.id)).length;
            const isExpanded = expandedCategory === cat.id;
            return (
              <div key={cat.id} className="mb-1">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[15px] hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-white/60">{t(cat.labelKey)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] text-white/25">{selectedInCat}/{catDBs.length}</span>
                    <span className="text-[13px] text-white/20">{isExpanded ? <Icon name="chevronDown" size={11} /> : <Icon name="chevronRight" size={11} />}</span>
                  </span>
                </button>
                {isExpanded && (
                  <div className="ml-2 pl-2 border-l border-white/[0.04]">
                    <button
                      onClick={() => toggleCategoryDBs(cat.ids)}
                      className="text-[13px] text-[#6c8cff] hover:text-[#8ba5ff] px-2 py-1 transition-colors"
                    >
                      {selectedInCat === catDBs.length ? t("litReview.deselectAll") : t("litReview.selectAll")}
                    </button>
                    {catDBs.map(db => (
                      <a
                        key={db.id}
                        href={db.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-[14px] hover:bg-white/[0.04] group"
                      >
                        <span className="text-white/50 group-hover:text-white/80 flex-1 min-w-0 truncate transition-colors">
                          {db.name}
                        </span>
                        {db.apiAvailable && (
                          <span className="text-[11px] px-1 py-0.5 rounded bg-[#3ecfb2]/10 text-[#3ecfb2] flex-shrink-0">API</span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 분석 버튼은 플로팅으로 이동됨 */}
      </div>

      {/* ── 메인 콘텐츠 영역 ── */}
      <div className="flex-1 flex flex-col">
        {/* 탭 바 */}
        <div className="h-10 border-b border-white/[0.04] flex items-center px-3 gap-0.5 flex-shrink-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "gap" || tab.id === "design" || tab.id === "cluster") {
                  runAnalysis(tab.id);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`px-3 py-1 rounded-md text-[15px] transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#1e2230] text-white"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              <Icon name={tab.icon} className="inline-flex align-[-0.125em]" size={15} /> {tab.label}
            </button>
          ))}
          {loading && (
            <span className="ml-auto text-[14px] text-[#e8b84b] animate-pulse flex-shrink-0">
              <Icon name="⏳" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("litReview.geminiProcessing")}
            </span>
          )}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="overflow-y-auto p-4 md:p-6">
          {/* ── 검색 탭 ── */}
          {activeTab === "search" && (
            <div className="max-w-4xl">
              {/* ── 국내/해외 하위 탭 ── */}
              <div className="flex items-center gap-1 mb-5">
                <button
                  onClick={() => { setSearchRegion("domestic"); }}
                  className={`px-4 py-2 rounded-lg text-[16px] font-medium transition-all ${
                    searchRegion === "domestic"
                      ? "bg-[#6c8cff]/15 text-[#6c8cff] border border-[#6c8cff]/30"
                      : "text-white/30 hover:text-white/50 border border-transparent"
                  }`}
                >
                  <Icon name="flag" size={14} className="inline-flex align-[-0.125em] mr-1" /> {t("litReview.tabDomestic")}
                </button>
                <button
                  onClick={() => { setSearchRegion("international"); }}
                  className={`px-4 py-2 rounded-lg text-[16px] font-medium transition-all ${
                    searchRegion === "international"
                      ? "bg-[#3ecfb2]/15 text-[#3ecfb2] border border-[#3ecfb2]/30"
                      : "text-white/30 hover:text-white/50 border border-transparent"
                  }`}
                >
                  <Icon name="🌐" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("litReview.tabInternational")}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[13px] text-white/15">{t("litReview.realApiNote")}</span>
                </div>
              </div>

              {/* ── v26: 검색 입력 (항상 표시 — 모바일에서 드로어를 열지 않아도 검색 가능) ── */}
              <div className="mb-5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={t("litReview.searchPlaceholder")}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#13161e] border border-white/[0.06] text-[16px] text-white/80 placeholder:text-white/20 focus:border-[#6c8cff] focus:outline-none"
                  />
                  <button
                    onClick={() => handleSearch()}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-xl text-[16px] font-medium disabled:opacity-30 whitespace-nowrap active:scale-95 transition-transform"
                  >
                    {searchLoading ? "..." : t("litReview.searchBtn")}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[13px] text-white/25">{t("litReview.selectedCount")}: {selectedDBs.length} DBs</span>
                  <button
                    onClick={() => setMobileSidebar(true)}
                    className="md:hidden text-[13px] text-[#6c8cff] flex items-center gap-1"
                  >
                    <Icon name="database" size={11} /> DB 선택
                  </button>
                </div>
              </div>

              {/* 검색 상태 */}
              {searchLoading ? (
                <div className="text-center py-16">
                  <div className="inline-block w-8 h-8 border-2 border-[#6c8cff]/30 border-t-[#6c8cff] rounded-full animate-spin mb-4" />
                  <p className="text-white/30 text-[16px]">{t("litReview.searching")}</p>
                  <p className="text-white/15 text-[14px] mt-1">{t("litReview.searchingReal")}</p>
                </div>
              ) : (() => {
                const regionPapers = searchResults
                  .filter(r => r.region === searchRegion)
                  .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

                if (regionPapers.length > 0) {
                  const regionColor = searchRegion === "domestic" ? "#6c8cff" : "#3ecfb2";
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[18px] font-semibold">
                          {searchRegion === "domestic" ? t("litReview.domesticResults") : t("litReview.internationalResults")} ({regionPapers.length})
                        </h3>
                        <span className="text-[14px] text-white/25">
                          {t("litReview.selectedPapers")}: {selectedResults.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {regionPapers.map((paper, idx) => {
                          const isSelected = selectedResults.includes(paper.id);
                          return (
                            <div
                              key={paper.id}
                              onClick={() => toggleResult(paper.id)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? `border-[${regionColor}]/30 bg-[${regionColor}]/[0.04]`
                                  : "border-white/[0.04] bg-[#13161e] hover:border-white/[0.08]"
                              }`}
                              style={isSelected ? { borderColor: `${regionColor}33`, backgroundColor: `${regionColor}0a` } : {}}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-[13px] flex-shrink-0 mt-0.5"
                                  style={isSelected ? { backgroundColor: regionColor, color: "#fff" } : { backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }}
                                >
                                  {isSelected ? <Icon name="check" size={12} /> : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[16px] font-medium text-white/80 leading-tight mb-1">
                                    {paper.title}
                                  </h4>
                                  <p className="text-[14px] text-white/40 mb-1.5">
                                    {paper.authors} · {paper.year || "N/A"} · <span style={{ color: `${regionColor}b3` }}>{paper.journal}</span>
                                  </p>
                                  {paper.abstract && (
                                    <p className="text-[14px] text-white/30 leading-relaxed mb-2 line-clamp-3">
                                      {paper.abstract}
                                    </p>
                                  )}
                                  {/* 링크 — 실제 DOI/원문 */}
                                  <div className="flex items-center gap-2 mb-1.5">
                                    {paper.url && paper.url !== "#" && (
                                      <a href={paper.url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-[13px] hover:underline flex items-center gap-0.5" style={{ color: regionColor }}>
                                        <Icon name="🔗" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("litReview.viewPaper")}
                                      </a>
                                    )}
                                    {paper.doi && (
                                      <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-[13px] text-[#a78bfa] hover:underline">
                                        DOI: {paper.doi.length > 30 ? paper.doi.slice(0, 30) + "…" : paper.doi}
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[13px] text-white/20"><Icon name="📊" className="inline-flex align-[-0.125em] mr-1" size={15} />{paper.citations} {t("litReview.cited")}</span>
                                    <span className="text-[13px] text-white/20"><Icon name="📂" className="inline-flex align-[-0.125em] mr-1" size={15} />{paper.source}</span>
                                    {paper.similarity != null && (
                                      <span className="text-[13px]" style={{ color: "#3ecfb2" }}>
                                        ≈ {(paper.similarity * 100).toFixed(0)}% {t("litReview.match")}
                                      </span>
                                    )}
                                    {paper.keywords?.slice(0, 3).map(kw => (
                                      <span key={kw} className="text-[12px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25">
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                }

                return (
                  <div className="text-center py-20 text-white/15">
                    <p className="text-[43px] mb-3">{searchRegion === "domestic" ? <Icon name="flag" size={36} /> : <Icon name="globe" size={36} />}</p>
                    <p className="text-[18px] mb-1">{t("litReview.emptyTitle")}</p>
                    <p className="text-[15px] text-white/10">{t("litReview.emptyDesc")}</p>
                    <p className="text-[13px] text-white/8 mt-2">{t("litReview.realApiNote")}</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── DB 탭 ── */}
          {activeTab === "databases" && (
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <h3 className="text-[18px] font-semibold">{t("litReview.dbTitle")} (53)</h3>
                <select
                  value={filterField}
                  onChange={e => setFilterField(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white/50"
                >
                  <option value="all">{t("litReview.allFields")}</option>
                  {uniqueFields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white/50"
                >
                  <option value="all">{t("litReview.allTypes")}</option>
                  {uniqueTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDBs.map(db => {
                  return (
                    <a
                      key={db.id}
                      href={db.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-xl border border-white/[0.04] bg-[#13161e] hover:border-white/[0.12] transition-all block"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="text-[15px] font-medium text-white/70 truncate flex-1">{db.name}</h4>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          {db.apiAvailable && (
                            <span className="text-[11px] px-1 py-0.5 rounded bg-[#3ecfb2]/10 text-[#3ecfb2]">API</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[13px] text-white/25 mb-1">{db.feature}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/20">{db.type}</span>
                        <span className="text-[12px] text-white/15">{db.field}</span>
                        <span className="text-[12px] text-white/15 ml-auto">{db.provider}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 네트워크분석 탭 (v41) ── */}
          {activeTab === "network" && (
            <NetworkAnalysis papers={networkPapers} />
          )}

          {/* ── 연구갭 탭 ── */}
          {activeTab === "gap" && (
            <div className="max-w-3xl">
              {researchGap ? (
                <>
                  <h3 className="text-[18px] font-semibold mb-4">
                    <Icon name="💡" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("litReview.gapTitle")}
                  </h3>
                  <div className="text-[16px] text-white/70 leading-[1.8] whitespace-pre-wrap">
                    {researchGap}
                  </div>
                </>
              ) : loading ? (
                <div className="text-center py-16">
                  <div className="inline-block w-8 h-8 border-2 border-[#ec4899]/30 border-t-[#ec4899] rounded-full animate-spin mb-4" />
                  <p className="text-white/30 text-[16px]">{t("litReview.analyzingGap")}</p>
                </div>
              ) : (
                <div className="text-center py-20 text-white/15">
                  <p className="text-[43px] mb-3"><Icon name="💡" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
                  <p className="text-[17px]">{t("litReview.gapEmpty")}</p>
                  <p className="text-[15px] text-white/10 mt-1">{t("litReview.gapEmptyDesc")}</p>
                </div>
              )}
            </div>
          )}

          {/* ── 연구설계 탭 ── */}
          {activeTab === "design" && (
            <div className="max-w-3xl">
              {researchDesign ? (
                <>
                  <h3 className="text-[18px] font-semibold mb-4">
                    <Icon name="📐" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("litReview.designTitle")}
                  </h3>
                  <div className="text-[16px] text-white/70 leading-[1.8] whitespace-pre-wrap">
                    {researchDesign}
                  </div>
                </>
              ) : loading ? (
                <div className="text-center py-16">
                  <div className="inline-block w-8 h-8 border-2 border-[#4a6cf7]/30 border-t-[#4a6cf7] rounded-full animate-spin mb-4" />
                  <p className="text-white/30 text-[16px]">{t("litReview.analyzingDesign")}</p>
                </div>
              ) : (
                <div className="text-center py-20 text-white/15">
                  <p className="text-[43px] mb-3"><Icon name="📐" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
                  <p className="text-[17px]">{t("litReview.designEmpty")}</p>
                  <p className="text-[15px] text-white/10 mt-1">{t("litReview.designEmptyDesc")}</p>
                </div>
              )}
            </div>
          )}

          {/* ── 군집 분석 탭 ── */}
          {activeTab === "cluster" && (
            <div className="max-w-3xl">
              {clusterAnalysis ? (
                <>
                  <h3 className="text-[18px] font-semibold mb-4">
                    <Icon name="🔬" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("litReview.clusterTitle")}
                  </h3>
                  <div className="text-[16px] text-white/70 leading-[1.8] whitespace-pre-wrap">
                    {clusterAnalysis}
                  </div>
                </>
              ) : loading ? (
                <div className="text-center py-16">
                  <div className="inline-block w-8 h-8 border-2 border-[#3ecfb2]/30 border-t-[#3ecfb2] rounded-full animate-spin mb-4" />
                  <p className="text-white/30 text-[16px]">{t("litReview.analyzingCluster")}</p>
                </div>
              ) : (
                <div className="text-center py-20 text-white/15">
                  <p className="text-[43px] mb-3"><Icon name="🔬" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
                  <p className="text-[17px]">{t("litReview.clusterEmpty")}</p>
                  <p className="text-[15px] text-white/10 mt-1">{t("litReview.clusterEmptyDesc")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* v41: 통합 분석 컨트롤 — 상단 탭과 연동, 세련된 단일 패널(글래스)로 재디자인
           데스크탑=우측 상단 / 모바일=하단(바텀네비 위) */}
      <div className="fixed right-3 bottom-20 md:right-6 md:top-[64px] md:bottom-auto z-[60]">
        <div className="rounded-2xl border border-white/[0.08] bg-[#11141d]/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.45)] p-1.5 flex flex-col gap-1 w-[188px]">
          <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
            <span className="text-[13px] font-semibold tracking-wide text-white/40">AI 분석</span>
            <span className="text-[12px] text-white/25">{selectedResults.length}편 선택</span>
          </div>
          {([
            { kind: "gap" as const,     label: t("litReview.btnGap"),     icon: "💡", accent: "#a78bfa", active: activeTab === "gap",     done: !!researchGap },
            { kind: "design" as const,  label: t("litReview.btnDesign"),  icon: "📐", accent: "#6c8cff", active: activeTab === "design",  done: !!researchDesign },
            { kind: "cluster" as const, label: t("litReview.btnCluster"), icon: "🔬", accent: "#3ecfb2", active: activeTab === "cluster", done: !!clusterAnalysis },
          ]).map((b) => (
            <button
              key={b.kind}
              onClick={() => runAnalysis(b.kind)}
              disabled={loading || selectedResults.length === 0}
              style={{
                "--ac": b.accent,
                backgroundColor: b.active ? `${b.accent}1f` : undefined,
                borderColor: b.active ? `${b.accent}59` : "transparent",
              } as React.CSSProperties}
              className={`group w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                b.active ? "" : "hover:bg-white/[0.05]"
              }`}
            >
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ backgroundColor: `${b.accent}1f`, color: b.accent }}
              >
                <Icon name={b.icon} size={13} className="inline-flex align-[-0.125em]" />
              </span>
              <span className={`flex-1 text-[14.5px] leading-tight ${b.active ? "text-white font-medium" : "text-white/70"}`}>
                {b.label}
              </span>
              {b.done && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.accent }} title="분석 완료" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

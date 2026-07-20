// ── APA 7th Edition 참고문헌 유틸리티 ────────────────────────────────
// Ported from v41-final/js/app.js

export interface RefAuthor {
  last: string;
  first: string;
  initials: string;
  full: string;
  isKorean: boolean;
}

export interface RefEntry {
  id: string;
  raw: string;
  type: "journal" | "book" | "other";
  authors: RefAuthor[];
  year: string;
  title: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  publisher: string;
  source: string;
  cited: boolean;
  /** 초록 (요약) — UODE/저널 파서가 추출 */
  abstract?: string;
  /** 핵심 키워드 */
  keywords?: string[];
}

/** APA 7th 본문내 인용 형식: (Smith, 2020) */
export function toAPAInline(ref: RefEntry, page?: string): string {
  if (!ref) return "";
  const auths = ref.authors || [];
  const yr = ref.year || "?";
  if (auths.length === 0) return `(저자미상, ${yr})`;

  const isKo = auths[0].isKorean || /[가-힣]/.test(auths[0].last || "");
  const amp = " & ";
  let authorStr = "";

  if (auths.length === 1) {
    authorStr = auths[0].last;
  } else if (auths.length === 2) {
    authorStr = `${auths[0].last}${amp}${auths[1].last}`;
  } else {
    authorStr = `${auths[0].last} et al.`;
  }

  const pageStr = page ? `, p. ${page}` : "";
  return `(${authorStr}, ${yr}${pageStr})`;
}

/** APA 7th 참고문헌 목록 형식 */
export function toAPARef(ref: RefEntry): string {
  if (!ref) return "";
  const auths = ref.authors || [];
  const isKo =
    auths.length > 0 &&
    (auths[0].isKorean || /[가-힣]/.test(auths[0].last || ""));

  let authStr = "";
  if (auths.length === 0) {
    authStr = "";
  } else if (isKo) {
    if (auths.length === 1) {
      authStr = auths[0].last + ".";
    } else {
      const names = auths.slice(0, -1).map((a) => a.last).join(", ");
      authStr = names + ", & " + auths[auths.length - 1].last + ".";
    }
  } else {
    const formatAuth = (a: RefAuthor) => {
      if (!a.first && !a.initials) return a.last;
      const ini =
        a.initials ||
        a.first
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + ".")
          .join(" ");
      return `${a.last}, ${ini}`;
    };
    if (auths.length === 1) {
      authStr = formatAuth(auths[0]) + ".";
    } else if (auths.length <= 20) {
      const formatted = auths.map(formatAuth);
      authStr =
        formatted.slice(0, -1).join(", ") +
        ", & " +
        formatted[formatted.length - 1] +
        ".";
    } else {
      const first19 = auths.slice(0, 19).map(formatAuth).join(", ");
      authStr = first19 + ", . . . " + formatAuth(auths[auths.length - 1]) + ".";
    }
  }

  const yearPart = ref.year ? `(${ref.year}).` : "";
  const titlePart = ref.title ? `${ref.title}.` : "";
  const linkPart = ref.doi
    ? ref.doi.startsWith("http")
      ? ref.doi
      : `https://doi.org/${ref.doi}`
    : ref.url || "";

  if (ref.type === "journal" && ref.journal) {
    const volPart = ref.volume ? `, ${ref.volume}` : "";
    const issPart = ref.issue ? `(${ref.issue})` : "";
    const pgsPart = ref.pages ? `, ${ref.pages}.` : ".";
    const doiPart = linkPart ? ` ${linkPart}` : "";
    return `${authStr} ${yearPart} ${titlePart} ${ref.journal}${volPart}${issPart}${pgsPart}${doiPart}`
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  if (ref.type === "book" && ref.publisher) {
    const doiPart = linkPart ? ` ${linkPart}` : "";
    return `${authStr} ${yearPart} ${titlePart} ${ref.publisher}.${doiPart}`
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  const doiPart = linkPart ? ` ${linkPart}` : "";
  return `${authStr} ${yearPart} ${titlePart}${doiPart}`
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** APA 저자 파싱 */
export function parseAuthorsAPA7(str: string): RefAuthor[] {
  if (!str || str.trim().length < 1) return [];
  str = str.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰*†‡§]+/g, "").trim();

  const isKorean = /[가-힣]/.test(str);

  if (isKorean) {
    const names = str
      .split(/[,·,]\s*(?:&|and|그리고|\s*)?\s*/)
      .map((n) => n.trim().replace(/[¹²³⁴⁵*]+/g, "").trim())
      .filter((n) => n.length >= 2 && /[가-힣]/.test(n))
      .slice(0, 20);
    return names.map((n) => ({
      last: n,
      first: "",
      initials: "",
      full: n,
      isKorean: true,
    }));
  }

  const isAPAFormat = /^[A-Z][a-z\-']+,\s*[A-Z]\./.test(str.trim());

  if (isAPAFormat) {
    const parts = str.split(/,\s*&\s*|\s+&\s+|;\s*/);
    return parts
      .map((p) => {
        p = p.trim().replace(/[,.]$/, "");
        const commaIdx = p.indexOf(",");
        if (commaIdx > 0) {
          const last = p.slice(0, commaIdx).trim();
          const first = p.slice(commaIdx + 1).trim();
          return { last, first, initials: first, full: p, isKorean: false };
        }
        return { last: p, first: "", initials: "", full: p, isKorean: false };
      })
      .filter((a) => a.last.length > 0)
      .slice(0, 20);
  } else {
    const parts = str.split(/,\s*&\s*|\s+&\s+|,\s+(?=[A-Z])|\s+and\s+/i);
    return parts
      .map((p) => {
        p = p.trim().replace(/\d+/g, "").trim();
        const words = p.split(/\s+/).filter(Boolean);
        if (words.length === 0) return null;
        const last = words[words.length - 1];
        const firstWords = words.slice(0, -1);
        const first = firstWords.join(" ");
        const initials = firstWords
          .map((w) => w.charAt(0).toUpperCase() + ".")
          .join(" ");
        return { last, first, initials, full: p, isKorean: false };
      })
      .filter((a): a is RefAuthor => a !== null && a.last.length > 0)
      .slice(0, 20);
  }
}

/** PDF 텍스트에서 논문 메타데이터 파싱 */
export function parsePDFAsOnePaper(text: string, filename: string): RefEntry {
  const rawLines = text.split("\n");
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 1);
  const top60 = lines.slice(0, 60);

  let title = "",
    authors: RefAuthor[] = [],
    year = "",
    journal = "",
    doi = "",
    url = "",
    volume = "",
    issue = "",
    pages = "";

  // DOI 추출
  const doiPatterns = [
    /https?:\/\/dx\.doi\.org\/[\w.\-\/]+/i,
    /https?:\/\/doi\.org\/[\w.\-\/]+/i,
    /doi\.org\/[\w.\-\/]+/i,
    /10\.\d{4,}\/[\w.\-\/]+/i,
  ];
  for (const pat of doiPatterns) {
    const m = text.match(pat);
    if (m) {
      doi = m[0].replace(/[.,;)]+$/, "").trim();
      break;
    }
  }
  if (!doi) {
    const urlM = text.match(/https?:\/\/[^\s)]+/);
    if (urlM) url = urlM[0].replace(/[.,;)]+$/, "").trim();
  }

  // 연도 추출
  const yearM = text.match(/\b(20\d{2}|19\d{2})\b/);
  year = yearM ? yearM[0] : new Date().getFullYear().toString();
  const citeLineM = text.match(/Citation[:\s].*?(\d{4})/i);
  if (citeLineM) year = citeLineM[1];

  // 제목 추출
  const skipPat =
    /^(abstract|keywords?|introduction|doi|http|vol|issue|page|copyright|received|accepted|revised|department|university|school|college|institute|corresponding|check for|pissn|eissn|journal|archives|design|apa)/i;
  const numPat = /^\d+$/;

  const citeM = text.match(
    /Citation:\s*[^.]+\.\s*\(?\d{4}\)?\.?\s*([^.]{10,150})\./i
  );
  if (citeM) {
    title = citeM[1].trim();
  } else {
    const cands = top60.filter(
      (l) =>
        l.length >= 10 &&
        l.length <= 250 &&
        !skipPat.test(l) &&
        !numPat.test(l) &&
        !/[@\d]{5,}/.test(l)
    );
    if (cands.length > 0) {
      title = cands.find((c) => c.length >= 15) || cands[0];
      const titleIdx = top60.indexOf(title);
      if (titleIdx >= 0 && titleIdx + 1 < top60.length) {
        const nextLine = top60[titleIdx + 1];
        if (
          nextLine &&
          nextLine.length >= 5 &&
          nextLine.length <= 100 &&
          !skipPat.test(nextLine) &&
          /^[A-Za-z가-힣]/.test(nextLine) &&
          !/\d{4}/.test(nextLine)
        ) {
          title = title + " " + nextLine;
        }
      }
    }
    if (!title)
      title = filename
        .replace(/\.pdf$/i, "")
        .replace(/[_\-]/g, " ")
        .trim();
  }
  title = title
    .replace(/^["'"']+|["'"']+$/g, "")
    .trim()
    .slice(0, 200);

  // 저자 추출
  const citeLine =
    text.match(/Citation:\s*([^(]+?)\s*\(/i) ||
    text.match(/\*Corresponding author[^\n]*\n([^\n]+)/i);

  let authorRaw = "";
  if (citeLine) {
    authorRaw = citeLine[1].trim();
  } else {
    const titleIdx = top60.findIndex((l) => l.includes(title.slice(0, 20)));
    const searchFrom = Math.max(0, titleIdx);
    const searchLines = top60.slice(searchFrom, searchFrom + 15);

    for (const line of searchLines) {
      if (
        /^[A-Z][a-zA-Z\s]+[A-Z][a-z]+[¹²³⁴⁵\d,\s&]+$/.test(line) ||
        /^[A-Z][a-z]+,\s*[A-Z]\./.test(line) ||
        /[A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]\./.test(line)
      ) {
        authorRaw = line;
        break;
      }
      if (/^[가-힣]{2,4}[¹²³⁴⁵,\s·]*[가-힣]{2,4}/.test(line)) {
        authorRaw = line;
        break;
      }
    }
  }

  if (authorRaw) {
    authorRaw = authorRaw
      .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "")
      .replace(/\d+/g, "")
      .trim();
    authors = parseAuthorsAPA7(authorRaw);
  }

  if (authors.length === 0) {
    const fn = filename
      .replace(/\.pdf$/i, "")
      .replace(/[_\-\d]+/g, " ")
      .trim();
    authors = [
      {
        last: fn.split(/[\s,]/)[0] || fn,
        first: "",
        full: fn,
        initials: "",
        isKorean: false,
      },
    ];
  }

  // 저널/권호 추출
  const journalFromCite = text.match(
    /\.\s*([A-Z][a-zA-Z\s]+),\s*(\d+)\((\d+)\),\s*([\d–\-]+)/
  );
  if (journalFromCite) {
    journal = journalFromCite[1].trim();
    volume = journalFromCite[2];
    issue = journalFromCite[3];
    pages = journalFromCite[4];
  } else {
    const jM = text.match(
      /(?:Journal of|Archives of|Research in|International|학회지|디자인학|한국)\s*[A-Za-z가-힣\s]+/i
    );
    if (jM) journal = jM[0].trim().slice(0, 80);
    const vM = text.match(/,\s*(\d+)\s*\((\d+)\)\s*,\s*([\d–\-]+)/);
    if (vM) {
      volume = vM[1];
      issue = vM[2];
      pages = vM[3];
    }
  }

  return {
    id: "ref_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    raw: "",
    type: journal ? "journal" : "other",
    authors,
    year,
    title,
    journal: journal.slice(0, 100),
    volume,
    issue,
    pages,
    doi,
    url,
    publisher: "",
    source: filename,
    cited: false,
  };
}

/** PDF 텍스트 추출 (pdf.js) */
export async function extractPDFText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          reject(new Error("PDF.js 로드 안됨"));
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(e.target!.result as ArrayBuffer),
        });
        const doc = await loadingTask.promise;
        const pageLimit = Math.min(doc.numPages, 50);
        let fullText = "";

        for (let i = 1; i <= pageLimit; i++) {
          const page = await doc.getPage(i);
          const tc = await page.getTextContent();
          const lineMap: Record<number, string> = {};
          tc.items.forEach((item: any) => {
            if (!item.str) return;
            const y = item.transform ? Math.round(item.transform[5]) : 0;
            lineMap[y] = (lineMap[y] || "") + item.str;
          });
          const sortedY = Object.keys(lineMap)
            .map(Number)
            .sort((a, b) => b - a);
          fullText += sortedY.map((y) => lineMap[y]).join("\n") + "\n\n";
        }
        resolve(fullText.trim());
      } catch (err: any) {
        reject(new Error("PDF 파싱 오류: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsArrayBuffer(file);
  });
}

/** localStorage 키 */
export const REF_DB_KEY = "ai_research_os_refdb";

export function loadRefDB(): RefEntry[] {
  try {
    const saved = JSON.parse(
      localStorage.getItem(REF_DB_KEY) ||
        localStorage.getItem("awa_v33_refdb") ||
        "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function saveRefDB(refs: RefEntry[]): void {
  try {
    localStorage.setItem(REF_DB_KEY, JSON.stringify(refs));
  } catch {}
}

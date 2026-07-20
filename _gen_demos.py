# -*- coding: utf-8 -*-
"""Generate topic-matched demo CSVs for all basic-stats modules (12 topics × modules)."""
import json, random
from pathlib import Path

random.seed(42)

TOPICS = [
    {
        "key": "학습동기",
        "title": "대학생 학습동기 조사",
        "context": "대학생의 학습동기·자기효능감·학습시간과 관련 요인",
        "freq": {
            "headers": ["ID", "학년", "전공", "학습동기점수", "선호학습시간"],
            "cats": {
                "학년": ["1학년", "2학년", "3학년", "4학년"],
                "전공": ["경영", "교육", "공학", "인문", "사회"],
                "선호학습시간": ["오전", "오후", "저녁", "심야"],
            },
            "score_col": "학습동기점수",
            "score_range": (2, 5),
        },
        "group": ["대면수업", "온라인수업"],
        "group3": ["저동기", "중동기", "고동기"],
        "score_name": "학습동기점수",
        "y": "학습동기",
        "x1": "자기효능감",
        "x2": "주당학습시간",
        "items": ["내재동기", "외재동기", "목표지향", "노력지속", "흥미"],
        "assoc": ("학년", "전공", ["1학년", "2학년", "3학년", "4학년"], ["경영", "교육", "공학", "인문"]),
        "path": ("자기효능감", "학습노력", "학업성취"),
        "sem": ("효능1", "효능2", "효능3", "동기1", "동기2", "성취1", "성취2"),
        "mod": ("자기효능감", "스트레스", "동기저하"),
    },
    {
        "key": "조직몰입",
        "title": "직장인 조직몰입",
        "context": "직장인의 조직몰입·상사지지·직무자율성",
        "freq": {
            "headers": ["ID", "직급", "부서", "조직몰입점수", "근무형태"],
            "cats": {
                "직급": ["사원", "대리", "과장", "차장", "부장"],
                "부서": ["영업", "인사", "연구", "생산", "기획"],
                "근무형태": ["정규", "계약", "원격", "하이브리드"],
            },
            "score_col": "조직몰입점수",
            "score_range": (2, 5),
        },
        "group": ["영업부", "연구부"],
        "group3": ["저몰입", "중몰입", "고몰입"],
        "score_name": "조직몰입점수",
        "y": "조직몰입",
        "x1": "상사지지",
        "x2": "직무자율성",
        "items": ["정서적몰입", "지속적몰입", "규범적몰입", "직무만족", "이직의도역"],
        "assoc": ("직급", "부서", ["사원", "대리", "과장", "부장"], ["영업", "인사", "연구", "기획"]),
        "path": ("상사지지", "직무만족", "조직몰입"),
        "sem": ("지지1", "지지2", "지지3", "만족1", "만족2", "몰입1", "몰입2"),
        "mod": ("상사지지", "업무부하", "소진"),
    },
    {
        "key": "수업만족",
        "title": "온라인 수업 만족도",
        "context": "온라인·원격수업 만족도와 상호작용·콘텐츠 품질",
        "freq": {
            "headers": ["ID", "학년", "수강방식", "만족도점수", "접속기기"],
            "cats": {
                "학년": ["1학년", "2학년", "3학년", "4학년"],
                "수강방식": ["실시간", "녹화", "혼합"],
                "접속기기": ["PC", "노트북", "태블릿", "스마트폰"],
            },
            "score_col": "만족도점수",
            "score_range": (2, 5),
        },
        "group": ["실시간", "녹화"],
        "group3": ["저만족", "중만족", "고만족"],
        "score_name": "만족도점수",
        "y": "수업만족도",
        "x1": "상호작용품질",
        "x2": "콘텐츠유용성",
        "items": ["내용이해", "상호작용", "기술편의", "과제적절", "전반만족"],
        "assoc": ("수강방식", "접속기기", ["실시간", "녹화", "혼합"], ["PC", "노트북", "태블릿", "스마트폰"]),
        "path": ("상호작용", "몰입도", "만족도"),
        "sem": ("상호1", "상호2", "상호3", "유용1", "유용2", "만족1", "만족2"),
        "mod": ("상호작용", "기술불안", "만족저하"),
    },
    {
        "key": "복지인식",
        "title": "지역사회 복지 인식",
        "context": "지역주민의 복지서비스 인식·정보접근·지역애착",
        "freq": {
            "headers": ["ID", "연령대", "거주지역", "복지인식점수", "정보경로"],
            "cats": {
                "연령대": ["20대", "30대", "40대", "50대", "60대이상"],
                "거주지역": ["도심", "교외", "농촌", "신도시"],
                "정보경로": ["행정앱", "동네소식", "SNS", "방문상담"],
            },
            "score_col": "복지인식점수",
            "score_range": (2, 5),
        },
        "group": ["도심", "농촌"],
        "group3": ["저인식", "중인식", "고인식"],
        "score_name": "복지인식점수",
        "y": "복지인식",
        "x1": "정보접근성",
        "x2": "지역애착",
        "items": ["서비스인지", "이용편의", "형평성", "신뢰", "만족"],
        "assoc": ("연령대", "거주지역", ["20대", "30대", "40대", "50대"], ["도심", "교외", "농촌", "신도시"]),
        "path": ("정보접근", "이용의도", "복지만족"),
        "sem": ("정보1", "정보2", "정보3", "애착1", "애착2", "인식1", "인식2"),
        "mod": ("정보접근", "불신", "이용회피"),
    },
    {
        "key": "창업의도",
        "title": "스타트업 창업의도",
        "context": "예비창업자의 창업의도·기업가정신·자원접근",
        "freq": {
            "headers": ["ID", "전공계열", "창업경험", "창업의도점수", "관심분야"],
            "cats": {
                "전공계열": ["경영", "공대", "디자인", "인문", "IT"],
                "창업경험": ["없음", "동아리", "인턴", "실제창업"],
                "관심분야": ["테크", "커머스", "소셜", "바이오", "콘텐츠"],
            },
            "score_col": "창업의도점수",
            "score_range": (2, 5),
        },
        "group": ["경영전공", "공학전공"],
        "group3": ["저의도", "중의도", "고의도"],
        "score_name": "창업의도점수",
        "y": "창업의도",
        "x1": "기업가정신",
        "x2": "자원접근성",
        "items": ["기회인식", "위험감수", "혁신성", "자기효능", "실행의지"],
        "assoc": ("전공계열", "관심분야", ["경영", "공대", "디자인", "IT"], ["테크", "커머스", "소셜", "콘텐츠"]),
        "path": ("기업가정신", "기회인식", "창업의도"),
        "sem": ("기정1", "기정2", "기정3", "자원1", "자원2", "의도1", "의도2"),
        "mod": ("기업가정신", "자금제약", "의도저하"),
    },
    {
        "key": "진로성숙",
        "title": "중학생 진로성숙",
        "context": "중학생의 진로성숙·진로탐색·부모지지",
        "freq": {
            "headers": ["ID", "학년", "성별", "진로성숙점수", "희망진로"],
            "cats": {
                "학년": ["1학년", "2학년", "3학년"],
                "성별": ["남", "여"],
                "희망진로": ["의사", "교사", "엔지니어", "예능", "미정"],
            },
            "score_col": "진로성숙점수",
            "score_range": (2, 5),
        },
        "group": ["남학생", "여학생"],
        "group3": ["탐색기", "결정기", "성숙기"],
        "score_name": "진로성숙점수",
        "y": "진로성숙도",
        "x1": "진로탐색",
        "x2": "부모지지",
        "items": ["자기이해", "직업정보", "계획성", "확신", "준비행동"],
        "assoc": ("학년", "희망진로", ["1학년", "2학년", "3학년"], ["의사", "교사", "엔지니어", "예능", "미정"]),
        "path": ("진로탐색", "자기이해", "진로성숙"),
        "sem": ("탐색1", "탐색2", "탐색3", "지지1", "지지2", "성숙1", "성숙2"),
        "mod": ("진로탐색", "가정갈등", "혼란"),
    },
    {
        "key": "직무스트레스",
        "title": "간호 직무스트레스",
        "context": "간호사의 직무스트레스·업무부하·사회적지지",
        "freq": {
            "headers": ["ID", "경력연수", "근무부서", "스트레스점수", "근무조"],
            "cats": {
                "경력연수": ["1년미만", "1-3년", "3-5년", "5년이상"],
                "근무부서": ["내과", "외과", "ICU", "응급실", "외래"],
                "근무조": ["데이", "이브닝", "나이트", "순환"],
            },
            "score_col": "스트레스점수",
            "score_range": (2, 5),
        },
        "group": ["ICU", "외래"],
        "group3": ["저스트레스", "중스트레스", "고스트레스"],
        "score_name": "스트레스점수",
        "y": "직무스트레스",
        "x1": "업무부하",
        "x2": "사회적지지",
        "items": ["업무과다", "역할갈등", "대인갈등", "지지부족", "소진"],
        "assoc": ("근무부서", "근무조", ["내과", "외과", "ICU", "응급실"], ["데이", "이브닝", "나이트", "순환"]),
        "path": ("업무부하", "소진", "이직의도"),
        "sem": ("부하1", "부하2", "부하3", "지지1", "지지2", "스트레스1", "스트레스2"),
        "mod": ("업무부하", "동료지지", "소진"),
    },
    {
        "key": "브랜드충성",
        "title": "소비자 브랜드충성",
        "context": "소비자의 브랜드충성도·신뢰·만족",
        "freq": {
            "headers": ["ID", "연령대", "구매빈도", "충성도점수", "구매채널"],
            "cats": {
                "연령대": ["10대", "20대", "30대", "40대", "50대이상"],
                "구매빈도": ["월1회미만", "월1-2회", "주1회", "주2회이상"],
                "구매채널": ["온라인몰", "오프라인", "SNS쇼핑", "앱"],
            },
            "score_col": "충성도점수",
            "score_range": (2, 5),
        },
        "group": ["신규고객", "재구매고객"],
        "group3": ["전환가능", "중립", "충성"],
        "score_name": "충성도점수",
        "y": "브랜드충성도",
        "x1": "브랜드신뢰",
        "x2": "제품만족",
        "items": ["재구매의향", "추천의향", "프리미엄수용", "전환저항", "애착"],
        "assoc": ("연령대", "구매채널", ["20대", "30대", "40대", "50대이상"], ["온라인몰", "오프라인", "SNS쇼핑", "앱"]),
        "path": ("브랜드신뢰", "만족", "충성도"),
        "sem": ("신뢰1", "신뢰2", "신뢰3", "만족1", "만족2", "충성1", "충성2"),
        "mod": ("브랜드신뢰", "가격민감", "전환의도"),
    },
    {
        "key": "디지털리터러시",
        "title": "노인 디지털리터러시",
        "context": "노인의 디지털리터러시·기기사용·교육경험",
        "freq": {
            "headers": ["ID", "연령대", "거주형태", "리터러시점수", "주사용기기"],
            "cats": {
                "연령대": ["65-69", "70-74", "75-79", "80이상"],
                "거주형태": ["独居", "부부가구", "자녀동거", "시설"],
                "주사용기기": ["스마트폰", "태블릿", "PC", "사용안함"],
            },
            "score_col": "리터러시점수",
            "score_range": (1, 5),
        },
        "group": ["교육이수", "미이수"],
        "group3": ["초급", "중급", "활용"],
        "score_name": "리터러시점수",
        "y": "디지털리터러시",
        "x1": "기기사용빈도",
        "x2": "교육경험월수",
        "items": ["검색능력", "앱사용", "정보판별", "소통", "보안인식"],
        "assoc": ("연령대", "주사용기기", ["65-69", "70-74", "75-79", "80이상"], ["스마트폰", "태블릿", "PC", "사용안함"]),
        "path": ("교육경험", "자기효능", "리터러시"),
        "sem": ("사용1", "사용2", "사용3", "교육1", "교육2", "리터1", "리터2"),
        "mod": ("기기사용", "기술불안", "회피"),
    },
    {
        "key": "교사효능",
        "title": "교사 소진·효능감",
        "context": "교사의 효능감·소진·동료지지",
        "freq": {
            "headers": ["ID", "학교급", "경력", "효능감점수", "담당교과"],
            "cats": {
                "학교급": ["초등", "중등", "고등"],
                "경력": ["5년미만", "5-10년", "10-20년", "20년이상"],
                "담당교과": ["국어", "수학", "영어", "과학", "예체능"],
            },
            "score_col": "효능감점수",
            "score_range": (2, 5),
        },
        "group": ["초등", "중등"],
        "group3": ["고소진", "보통", "고효능"],
        "score_name": "효능감점수",
        "y": "교사효능감",
        "x1": "소진점수",
        "x2": "동료지지",
        "items": ["수업효능", "생활지도", "학부모소통", "소진정서", "동료지지"],
        "assoc": ("학교급", "담당교과", ["초등", "중등", "고등"], ["국어", "수학", "영어", "과학", "예체능"]),
        "path": ("동료지지", "효능감", "소진감소"),
        "sem": ("지지1", "지지2", "지지3", "효능1", "효능2", "소진1", "소진2"),
        "mod": ("업무부하", "동료지지", "소진"),
    },
    {
        "key": "기후행동",
        "title": "기후행동 의도",
        "context": "시민의 기후행동의도·환경태도·규범인식",
        "freq": {
            "headers": ["ID", "연령대", "거주지역", "행동의도점수", "정보원"],
            "cats": {
                "연령대": ["10대", "20대", "30대", "40대", "50대이상"],
                "거주지역": ["대도시", "중소도시", "군지역"],
                "정보원": ["뉴스", "SNS", "학교", "캠페인", "지인"],
            },
            "score_col": "행동의도점수",
            "score_range": (2, 5),
        },
        "group": ["캠페인노출", "비노출"],
        "group3": ["무관심", "관심", "실천의도"],
        "score_name": "행동의도점수",
        "y": "기후행동의도",
        "x1": "환경태도",
        "x2": "규범인식",
        "items": ["태도", "주관적규범", "지각통제", "의도", "과거행동"],
        "assoc": ("연령대", "정보원", ["10대", "20대", "30대", "40대"], ["뉴스", "SNS", "학교", "캠페인"]),
        "path": ("환경태도", "규범인식", "행동의도"),
        "sem": ("태도1", "태도2", "태도3", "규범1", "규범2", "의도1", "의도2"),
        "mod": ("환경태도", "비용부담", "의도저하"),
    },
    {
        "key": "헬스케어앱",
        "title": "헬스케어 앱 사용",
        "context": "헬스케어 앱 지속사용의도·유용성·용이성",
        "freq": {
            "headers": ["ID", "연령대", "이용기간", "사용의도점수", "주이용기능"],
            "cats": {
                "연령대": ["20대", "30대", "40대", "50대", "60대이상"],
                "이용기간": ["1개월미만", "1-3개월", "3-12개월", "1년이상"],
                "주이용기능": ["걸음수", "수면", "식단", "진료예약", "복약알림"],
            },
            "score_col": "사용의도점수",
            "score_range": (2, 5),
        },
        "group": ["신규이용", "장기이용"],
        "group3": ["이탈위험", "보통", "충성"],
        "score_name": "사용의도점수",
        "y": "지속사용의도",
        "x1": "지각유용성",
        "x2": "지각용이성",
        "items": ["유용성", "용이성", "신뢰", "만족", "지속의도"],
        "assoc": ("연령대", "주이용기능", ["20대", "30대", "40대", "50대"], ["걸음수", "수면", "식단", "진료예약"]),
        "path": ("유용성", "만족", "지속사용"),
        "sem": ("유용1", "유용2", "유용3", "용이1", "용이2", "의도1", "의도2"),
        "mod": ("유용성", "프라이버시우려", "이탈의도"),
    },
]

# Fix 独居 typo to Korean
TOPICS[8]["freq"]["cats"]["거주형태"] = ["독거", "부부가구", "자녀동거", "시설"]


def pick(xs):
    return random.choice(xs)


def gen_freq(t, n=16):
    h = t["freq"]["headers"]
    sc = t["freq"]["score_col"]
    lo, hi = t["freq"]["score_range"]
    cats = t["freq"]["cats"]
    rows = []
    for i in range(1, n + 1):
        row = [str(i)]
        for col in h[1:]:
            if col == sc:
                row.append(str(random.randint(lo, hi)))
            else:
                row.append(pick(cats[col]))
        rows.append(row)
    return h, rows


def gen_ttest(t, n=20):
    h = ["집단", t["score_name"]]
    rows = []
    for i in range(n):
        g = t["group"][i % 2]
        base = 72 if i % 2 == 0 else 65
        rows.append([g, str(base + random.randint(-8, 12))])
    return h, rows


def gen_anova(t, n=24):
    h = ["집단", t["score_name"]]
    rows = []
    for i in range(n):
        g = t["group3"][i % 3]
        base = [58, 70, 82][i % 3]
        rows.append([g, str(base + random.randint(-6, 8))])
    return h, rows


def gen_items(names, n=18, k=None):
    names = names[: k or len(names)]
    h = names
    rows = []
    for _ in range(n):
        rows.append([str(round(random.uniform(2.0, 5.0), 1)) for _ in names])
    return h, rows


def gen_reg(t, n=16, extra=None):
    h = [t["y"], t["x1"], t["x2"]]
    if extra:
        h = h + extra
    rows = []
    for _ in range(n):
        x1 = round(random.uniform(2.0, 5.0), 1)
        x2 = round(random.uniform(1.0, 5.0), 1)
        y = round(40 + x1 * 8 + x2 * 4 + random.uniform(-5, 5), 1)
        row = [str(y), str(x1), str(x2)]
        if extra:
            for e in extra:
                if e in ("coastal", "연안거주"):
                    row.append(pick(["예", "아니오"]))
                elif e in ("m", "매개"):
                    row.append(str(round(random.uniform(2, 5), 1)))
                elif e in ("z", "조절"):
                    row.append(str(round(random.uniform(1, 5), 1)))
                elif e == "x":
                    row.append(str(x1))
                else:
                    row.append(str(round(random.uniform(1, 5), 1)))
        rows.append(row)
    return h, rows


def gen_assoc(t, n=20):
    a, b, av, bv = t["assoc"]
    h = [a, b]
    rows = [[pick(av), pick(bv)] for _ in range(n)]
    return h, rows


def gen_cluster(t, n=18):
    h = [t["x1"], t["x2"], t["y"]]
    rows = []
    for _ in range(n):
        rows.append([
            str(round(random.uniform(1.5, 5.0), 1)),
            str(round(random.uniform(1.5, 5.0), 1)),
            str(round(random.uniform(40, 90), 1)),
        ])
    return h, rows


def gen_path(t, n=16):
    a, b, c = t["path"]
    h = [a, b, c]
    rows = []
    for _ in range(n):
        rows.append([str(round(random.uniform(2, 5), 1)) for _ in range(3)])
    return h, rows


def gen_sem(t, n=16):
    h = list(t["sem"])
    rows = [[str(round(random.uniform(2, 5), 1)) for _ in h] for _ in range(n)]
    return h, rows


def gen_mod(t, n=16):
    h = list(t["mod"])
    rows = [[str(round(random.uniform(2, 5), 1)) for _ in h] for _ in range(n)]
    return h, rows


def gen_mg(t, n=20):
    h = ["집단", t["items"][0], t["items"][1], t["items"][2], t["items"][3]]
    rows = []
    for i in range(n):
        rows.append([t["group"][i % 2]] + [str(round(random.uniform(2, 5), 1)) for _ in range(4)])
    return h, rows


def to_csv(headers, rows):
    lines = [",".join(headers)]
    for r in rows:
        lines.append(",".join(r))
    return "\n".join(lines)


def make_demo(module_id, idx, t, headers, rows):
    title = f"{t['title']} ({idx})"
    desc = f"{t['context']} · {module_id}용 컬럼({', '.join(headers)})"
    return {
        "id": f"{module_id}-demo-{idx:02d}",
        "title": title,
        "desc": desc,
        "n": len(rows),
        "csv": to_csv(headers, rows),
    }


MODULES = {
    "freq": lambda t, i: gen_freq(t),
    "ttest": lambda t, i: gen_ttest(t),
    "anova": lambda t, i: gen_anova(t),
    "validity": lambda t, i: gen_items(t["items"], k=5),
    "efa": lambda t, i: gen_items(t["items"] + ["추가문항"], k=6),
    "reliability": lambda t, i: gen_items(t["items"], k=4),
    "assoc": lambda t, i: gen_assoc(t),
    "reg_basic": lambda t, i: gen_reg(t),
    "reg_mid": lambda t, i: gen_reg(t, extra=["연안거주"]),
    "reg_adv": lambda t, i: gen_reg(t, extra=["매개", "조절"]),
    "cluster": lambda t, i: gen_cluster(t),
    "cfa": lambda t, i: gen_sem(t),
    "path": lambda t, i: gen_path(t),
    "sem": lambda t, i: gen_sem(t),
    "sem_fix": lambda t, i: gen_items(t["items"] + ["추가"], k=6),
    "sem_mod": lambda t, i: gen_mod(t),
    "mg": lambda t, i: gen_mg(t),
}

out = {}
for mid, gen in MODULES.items():
    out[mid] = []
    for i, t in enumerate(TOPICS, 1):
        h, rows = gen(t, i)
        # fix reg_adv headers to meaningful Korean
        if mid == "reg_adv":
            h = [t["y"], t["x1"], "매개변인", "조절변인"]
            # regenerate with correct header names in csv body already from gen_reg extra
            # rebuild csv headers
            new_rows = []
            for r in rows:
                # y,x1,x2,m,z from gen_reg with extra - actually gen_reg with extra=["매개","조절"] produces y,x1,x2,매개,조절
                pass
        out[mid].append(make_demo(mid, i, t, h, rows))

# Fix reg_adv properly
out["reg_adv"] = []
for i, t in enumerate(TOPICS, 1):
    h = [t["y"], t["x1"], "매개변인", "조절변인"]
    rows = []
    for _ in range(16):
        x1 = round(random.uniform(2.0, 5.0), 1)
        m = round(random.uniform(2.0, 5.0), 1)
        z = round(random.uniform(1.0, 5.0), 1)
        y = round(40 + x1 * 6 + m * 3 + z * 2 + random.uniform(-4, 4), 1)
        rows.append([str(y), str(x1), str(m), str(z)])
    out["reg_adv"].append(make_demo("reg_adv", i, t, h, rows))

# Fix reg_mid coastal header
out["reg_mid"] = []
for i, t in enumerate(TOPICS, 1):
    h = [t["y"], t["x1"], t["x2"], "추가조건"]
    rows = []
    for _ in range(16):
        x1 = round(random.uniform(2.0, 5.0), 1)
        x2 = round(random.uniform(1.0, 5.0), 1)
        y = round(40 + x1 * 8 + x2 * 4 + random.uniform(-5, 5), 1)
        rows.append([str(y), str(x1), str(x2), pick(["예", "아니오"])])
    out["reg_mid"].append(make_demo("reg_mid", i, t, h, rows))

path = Path(r"C:\Users\saran\OneDrive\Desktop\2026-6-24\AI-Research-OS_RDOS\AI-Research-OS_RDOS_-s23\AI-Research-OS_RDOS_-s23\apps\web\lib\basic-stats\basic-stats-demos.generated.json")
path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
# sync duplicate filename
path2 = path.with_name("demos.generated.json")
path2.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
print("wrote", path)
print("freq demo1 header:", out["freq"][0]["csv"].splitlines()[0])
print("freq demo1 title:", out["freq"][0]["title"])
print("ttest demo1:", out["ttest"][0]["csv"].splitlines()[0])
print("reg demo1:", out["reg_basic"][0]["csv"].splitlines()[0])

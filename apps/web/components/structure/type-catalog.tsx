"use client";

import { cn } from "@/lib/utils";
import { getChapters, THESIS_CATEGORIES } from "@/lib/research-data";
import { splitCircledName, stripLeadingEmoji } from "@/lib/structure-format";

type Categories = typeof THESIS_CATEGORIES;

/**
 * 좌측 268px 고정 유형 카탈로그 — 9개 카테고리 · 34개 유형.
 * 검색어로 필터링하고, 유형별 장 수를 getChapters(id).length 로 표시한다.
 */
export function TypeCatalog({
  categories,
  selectedId,
  onSelect,
  filter,
}: {
  categories: Categories;
  selectedId: string;
  onSelect: (id: string) => void;
  filter: string;
}) {
  const q = filter.trim().toLowerCase();

  return (
    <div>
      {categories.map((cat) => {
        const types = cat.types.filter((ty) => {
          if (!q) return true;
          const { name } = splitCircledName(ty.name);
          return name.toLowerCase().includes(q);
        });
        if (!types.length) return null;
        return (
          <div className="tcat" key={cat.cat}>
            <h5>
              {stripLeadingEmoji(cat.cat)}
              <span className="cnt">{cat.types.length}</span>
            </h5>
            <div className="tlist">
              {types.map((ty) => {
                const { num, name } = splitCircledName(ty.name);
                const chapterCount = getChapters(ty.id).length;
                const on = ty.id === selectedId;
                return (
                  <button
                    key={ty.id}
                    type="button"
                    className={cn("ty", on && "on")}
                    aria-pressed={on}
                    onClick={() => onSelect(ty.id)}
                  >
                    <span className="tno" style={{ background: `${ty.color}26`, color: ty.color }}>
                      {num}
                    </span>
                    <span className="tnm">{name}</span>
                    <span className="tch">{chapterCount}장</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

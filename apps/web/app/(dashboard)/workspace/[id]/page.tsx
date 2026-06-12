"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { localizeCategories } from "@/lib/i18n/research-labels";

interface Project { id: string; title: string; thesis_type: string; status: string; localDir?: string; }

export default function WorkspacePage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("quant");
  const [newLocalDir, setNewLocalDir] = useState("");
  const [userName, setUserName] = useState("사용자");

  useEffect(() => {
    // Try to get user name from Clerk or localStorage
    const stored = localStorage.getItem("user-display-name");
    if (stored) setUserName(stored);
    // Load persisted projects
    const savedProjects = localStorage.getItem("aros-workspace-projects");
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch {}
    }
  }, []);

  const categories = useMemo(() => localizeCategories(t), [t]);
  const allTypes = categories.flatMap((c) => c.types);

  const createProject = () => {
    if (!newTitle.trim()) return;
    const newProject: Project = {
      id: Date.now().toString(),
      title: newTitle,
      thesis_type: newType,
      status: "draft",
      localDir: newLocalDir || undefined,
    };
    setProjects((p) => {
      const updated = [newProject, ...p];
      // Persist projects list to localStorage
      localStorage.setItem("aros-workspace-projects", JSON.stringify(updated));
      return updated;
    });
    // Also set as current project name in the save system
    localStorage.setItem("aros-project-name", newTitle);
    setNewTitle("");
    setNewLocalDir("");
    setShowCreate(false);
  };

  const handleLoadProject = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".aros,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const loadedProject: Project = {
          id: Date.now().toString(),
          title: data.projectName || data.name || file.name.replace(/\.(aros|json)$/, ""),
          thesis_type: data.thesisType || "quant",
          status: data.status || "draft",
        };
        setProjects((p) => {
          const updated = [loadedProject, ...p];
          localStorage.setItem("aros-workspace-projects", JSON.stringify(updated));
          return updated;
        });
        // Apply project snapshot if it has page data
        if (data.pages) {
          Object.entries(data.pages).forEach(([key, val]) => {
            localStorage.setItem(`aros-page-${key}`, JSON.stringify(val));
          });
        }
        localStorage.setItem("aros-project-name", loadedProject.title);
        // Dispatch event so other components refresh
        window.dispatchEvent(new CustomEvent("aros:project-loaded", { detail: data }));
      } catch (err) {
        alert("프로젝트 파일을 읽을 수 없습니다. 올바른 .aros 또는 .json 형식인지 확인하세요.");
      }
    };
    input.click();
  };

  const handleSelectDir = async () => {
    // Use showDirectoryPicker if available (Chromium browsers)
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
        setNewLocalDir(dirHandle.name);
      } catch {
        // User cancelled
      }
    } else {
      const dir = prompt("로컬 저장 디렉토리 경로를 입력하세요:", "~/Documents/Research");
      if (dir) setNewLocalDir(dir);
    }
  };

  return (
    <div className="p-8 font-nanum-gothic">
      <div className="max-w-[1680px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[14px] text-white/25 font-['JetBrains_Mono',monospace] mb-1">Workspace</p>
            <h1 className="text-[27px] font-bold font-nanum-myeongjo">{t("workspace.title")}</h1>
          </div>

        </div>

        {showCreate && (
          <div className="mb-6 p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
            <h3 className="text-[17px] font-semibold mb-4">{t("workspace.createTitle")}</h3>
            <div className="space-y-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createProject()}
                className="w-full px-4 py-3 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[17px] text-white focus:border-[#6c8cff] focus:outline-none"
                placeholder={t("workspace.titlePlaceholder")}
                autoFocus
              />
              <div>
                <label className="block text-[15px] text-white/30 mb-2">{t("workspace.researchType")}</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[17px] text-white/60"
                >
                  {categories.map((cat) => (
                    <optgroup key={cat.cat} label={cat.cat}>
                      {cat.types.map((ty) => (
                        <option key={ty.id} value={ty.id}>
                          {ty.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[15px] text-white/30 mb-2">로컬 저장 디렉토리 (선택사항)</label>
                <div className="flex gap-2">
                  <input
                    value={newLocalDir}
                    onChange={(e) => setNewLocalDir(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[17px] text-white/60 focus:border-[#6c8cff] focus:outline-none"
                    placeholder="~/Documents/Research"
                  />
                  <button onClick={handleSelectDir} className="px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[16px] text-white/50 hover:text-white/70 whitespace-nowrap">
                    <Icon name="📁" className="inline-flex align-[-0.125em] mr-1" size={15} />선택
                  </button>
                </div>
                <p className="text-[14px] text-white/20 mt-1">프로젝트 파일이 저장될 로컬 경로를 지정합니다.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={createProject} className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-xl text-[16px] font-medium">
                  {t("workspace.create")}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 bg-white/[0.04] text-white/50 rounded-xl text-[16px]">
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {projects.length === 0 && !showCreate ? (
          <div className="p-12 rounded-[18px] bg-[#13161e] border border-white/[0.04] text-center">
            <p className="text-[31px] mb-3"><Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
            <p className="text-[18px] font-semibold mb-2">{t("workspace.emptyTitle")}</p>
            <p className="text-[16px] text-white/30 mb-5">{t("workspace.emptyDesc")}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-[#4a6cf7] text-white rounded-[10px] text-[16px] font-medium">
                {t("sidebar.newProject")}
              </button>
              <button onClick={handleLoadProject} className="px-6 py-3 bg-white/[0.04] text-white/60 border border-white/[0.06] rounded-[10px] text-[16px] font-medium hover:bg-white/[0.07]">
                {t("workspace.firstProject")}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/editor/${p.id}`}
                className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] hover:border-[#6c8cff]/30 transition-colors group"
              >
                <h3 className="text-[17px] font-semibold group-hover:text-[#6c8cff]">{p.title}</h3>
                <p className="text-[14px] text-white/25 mt-1">
                  {allTypes.find((ty) => ty.id === p.thesis_type)?.name} · {p.status}
                </p>
                {p.localDir && (
                  <p className="text-[13px] text-white/15 mt-1 font-mono truncate"><Icon name="📁" className="inline-flex align-[-0.125em] mr-1" size={15} />{p.localDir}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

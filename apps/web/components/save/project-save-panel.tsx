"use client";
import { Icon } from "@/components/ui/icon";

import { useEffect, useRef, useState } from "react";
import {
  getProjectName,
  setProjectName,
  buildProjectSnapshot,
  applyProjectSnapshot,
  savePageDraft,
  getProjectFileName,
  setProjectFileName,
  LS_KEYS,
} from "@/lib/project-save";
import { useLocalSave, type ProjectSaveMode } from "@/hooks/use-local-save";
import { flushAllRegisteredPages } from "@/lib/page-flush-registry";
import { performProjectReset } from "@/lib/project-reset";
import { resetProjectStorage } from "@/lib/project-save";
import { useTranslation } from "@/lib/i18n";

export default function ProjectSavePanel() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [tempSaved, setTempSaved] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [fileName, setFileName] = useState("my-research-project");
  const [saveMode, setSaveMode] = useState<ProjectSaveMode>("overwrite");
  const [linkedFileLabel, setLinkedFileLabel] = useState<string | null>(null);
  const {
    saveProjectFile,
    loadProjectFile,
    clearFileHandle,
    hasOpenFileHandle,
    saving,
    loading,
  } = useLocalSave();

  useEffect(() => {
    const syncName = () => {
      const stored = getProjectName();
      const display = stored === "새 프로젝트" ? t("save.defaultProjectName") : stored;
      setName(display);
      const storedFile = getProjectFileName();
      const base = storedFile || display.replace(/\s+/g, "-") || "my-research-project";
      setFileName(base);
      setLinkedFileLabel(storedFile);
    };
    syncName();
    window.addEventListener("aros:project-reset", syncName);
    window.addEventListener("aros:project-loaded", syncName);
    return () => {
      window.removeEventListener("aros:project-reset", syncName);
      window.removeEventListener("aros:project-loaded", syncName);
    };
  }, [t]);

  const openSaveDialog = () => {
    const storedFile = getProjectFileName();
    setLinkedFileLabel(storedFile);
    setSaveMode(storedFile || hasOpenFileHandle() ? "overwrite" : "saveAs");
    setShowDialog(true);
  };

  const handleNameBlur = () => {
    setEditing(false);
    const trimmed = name.trim() || t("save.defaultProjectName");
    setProjectName(trimmed);
    setName(trimmed);
  };

  // v49: 프로젝트 단위 자동저장 — 주기적으로 모든 페이지를 모아 임시 스냅샷 저장
  //  + 탭/앱 백그라운드 전환·종료 시에도 저장하여 모든 메뉴 작업이 항상 보존되게 함
  const nameRef = useRef(name);
  nameRef.current = name;
  useEffect(() => {
    const autosaveProject = () => {
      try {
        flushAllRegisteredPages();
        const snapshot = buildProjectSnapshot(nameRef.current || t("save.defaultProjectName"));
        localStorage.setItem(LS_KEYS.projectTemp, JSON.stringify(snapshot));
        setAutoSavedAt(snapshot.savedAt);
      } catch { /* noop */ }
    };
    const id = window.setInterval(autosaveProject, 8000);
    const onHide = () => autosaveProject();
    const onVisibility = () => { if (document.visibilityState === "hidden") autosaveProject(); };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [t]);

  const handleTempSave = () => {
    flushAllRegisteredPages();
    const snapshot = buildProjectSnapshot(name);
    localStorage.setItem(LS_KEYS.projectTemp, JSON.stringify(snapshot));
    savePageDraft("dashboard", { projectName: name, tempSavedAt: snapshot.savedAt });
    setAutoSavedAt(snapshot.savedAt);
    setTempSaved(true);
    setTimeout(() => setTempSaved(false), 2000);
  };

  const handleSaveFile = async () => {
    flushAllRegisteredPages();
    const trimmedName = name.trim() || fileName;
    setProjectName(trimmedName);
    const snapshot = buildProjectSnapshot(trimmedName);
    const baseFile = fileName.trim() || trimmedName.replace(/\s+/g, "-");

    const ok = await saveProjectFile(snapshot, {
      mode: saveMode,
      suggestedName: baseFile,
    });

    if (ok) {
      if (saveMode === "saveAs" || !getProjectFileName()) {
        setProjectFileName(baseFile);
      }
      setLinkedFileLabel(getProjectFileName());
      setShowDialog(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm(t("save.resetConfirm"))) return;
    performProjectReset(t("save.defaultProjectName"));
    clearFileHandle();
    setName(t("save.defaultProjectName"));
    setFileName("my-research-project");
    setLinkedFileLabel(null);
  };

  const handleLoadFile = async () => {
    const snapshot = await loadProjectFile();
    if (!snapshot) return;
    flushAllRegisteredPages();
    resetProjectStorage(snapshot.name || t("save.defaultProjectName"));
    applyProjectSnapshot(snapshot);
    setName(snapshot.name || t("save.defaultProjectName"));
    const loadedBase = (snapshot.name || "project").replace(/\s+/g, "-");
    setFileName(loadedBase);
    setLinkedFileLabel(getProjectFileName());
    window.dispatchEvent(new CustomEvent("aros:project-loaded", { detail: snapshot }));
  };

  const canOverwrite = !!(linkedFileLabel || hasOpenFileHandle());

  return (
    <>
      <div className="px-3 py-3 border-t border-white/[0.05] bg-[#13161e]">
        <div className="rounded-[14px] border border-white/[0.06] bg-[#0f131b] p-2.5">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <p className="text-[10.5px] tracking-[0.14em] uppercase text-white/30 font-semibold">
              {t("save.currentProject")}
            </p>
            {linkedFileLabel ? (
              <span className="text-[10px] text-[#5ebd7c] flex items-center gap-1 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5ebd7c] flex-shrink-0" />
                <span className="truncate max-w-[88px]">{linkedFileLabel}.aros</span>
              </span>
            ) : autoSavedAt ? (
              <span className="text-[10px] text-white/30 flex items-center gap-1 min-w-0" title={t("common.autoSaved")}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#6c8cff] flex-shrink-0 animate-pulse" />
                <span className="truncate">{t("common.autoSave")} {new Date(autoSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </span>
            ) : null}
          </div>

          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
              className="w-full px-2.5 py-2 mb-2.5 rounded-[10px] bg-[#1a1e2a] border border-[#6c8cff]/50 text-[14px] text-white focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group w-full flex items-center gap-2 text-left px-2.5 py-2 mb-2.5 rounded-[10px] bg-[#1a1e2a] hover:bg-[#222637] border border-white/[0.05] transition-colors"
              title={t("save.editProjectName")}
            >
              <Icon name="folder" size={16} className="text-[#6c8cff] flex-shrink-0" />
              <span className="flex-1 text-[14px] font-medium text-[#e8eaf0] truncate">{name}</span>
              <Icon name="edit" size={13} className="text-white/20 group-hover:text-white/45 transition-colors flex-shrink-0" />
            </button>
          )}

          {/* 주 동작: 저장 + 불러오기 */}
          <div className="flex gap-1.5 mb-1.5">
            <button
              type="button"
              onClick={openSaveDialog}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-[10px] text-[13px] font-medium bg-[#4a6cf7] text-white hover:bg-[#5a78ff] transition-all disabled:opacity-50"
              title={t("save.saveToDisk")}
            >
              <Icon name="save" size={15} />{saving ? "..." : t("save.save")}
            </button>
            <button
              type="button"
              onClick={handleLoadFile}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-[10px] text-[13px] font-medium border border-white/[0.08] text-white/55 hover:text-white/85 hover:border-white/15 hover:bg-white/[0.03] transition-all disabled:opacity-50"
              title={t("save.loadFromDisk")}
            >
              <Icon name="folderOpen" size={15} />{loading ? "..." : t("save.load")}
            </button>
          </div>

          {/* 보조 동작: 임시저장 + 초기화 */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleTempSave}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[9px] text-[12px] text-white/45 hover:text-white/75 hover:bg-white/[0.04] transition-all"
              title={t("save.tempSaveHint")}
            >
              {tempSaved ? <Icon name="check" size={13} className="text-[#5ebd7c]" /> : <Icon name="timer" size={13} />} {t("save.tempSave")}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[9px] text-[12px] text-[#ff7066]/70 hover:text-[#ff7066] hover:bg-[#ff7066]/10 transition-all"
              title={t("save.resetHint")}
            >
              <Icon name="refresh" size={13} /> {t("save.reset")}
            </button>
          </div>
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1e2a] border border-white/10 rounded-2xl p-6 w-[400px] shadow-2xl">
            <h3 className="text-[15px] font-semibold mb-1"><Icon name="💾" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("save.saveDialogTitle")}</h3>
            <p className="text-[11px] text-white/35 mb-4">{t("save.saveDialogDesc")}</p>

            <p className="text-[11px] text-white/40 mb-2">{t("save.saveModeLabel")}</p>
            <div className="space-y-2 mb-4">
              <label
                className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  saveMode === "overwrite"
                    ? "border-[#4a6cf7]/40 bg-[#4a6cf7]/10"
                    : "border-white/[0.06] hover:border-white/12"
                } ${!canOverwrite ? "opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="saveMode"
                  checked={saveMode === "overwrite"}
                  disabled={!canOverwrite}
                  onChange={() => setSaveMode("overwrite")}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-[12px] font-medium text-white/85">
                    {t("save.modeOverwrite")}
                  </span>
                  <span className="block text-[10px] text-white/35 mt-0.5">
                    {canOverwrite
                      ? t("save.modeOverwriteHint").replace(
                          "{file}",
                          linkedFileLabel || fileName
                        )
                      : t("save.modeOverwriteDisabled")}
                  </span>
                </span>
              </label>

              <label
                className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  saveMode === "saveAs"
                    ? "border-[#4a6cf7]/40 bg-[#4a6cf7]/10"
                    : "border-white/[0.06] hover:border-white/12"
                }`}
              >
                <input
                  type="radio"
                  name="saveMode"
                  checked={saveMode === "saveAs"}
                  onChange={() => setSaveMode("saveAs")}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-[12px] font-medium text-white/85">
                    {t("save.modeSaveAs")}
                  </span>
                  <span className="block text-[10px] text-white/35 mt-0.5">
                    {t("save.modeSaveAsHint")}
                  </span>
                </span>
              </label>
            </div>

            <label className="text-[11px] text-white/40 block mb-1">{t("save.fileName")}</label>
            <div className="flex items-center gap-1 mb-4">
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0d0f14] border border-white/[0.08] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none"
              />
              <span className="text-[11px] text-white/30">.aros</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="flex-1 py-2 rounded-lg text-[12px] border border-white/[0.08] text-white/50 hover:text-white/80"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveFile}
                disabled={saving || (saveMode === "overwrite" && !canOverwrite)}
                className="flex-1 py-2 rounded-lg text-[12px] bg-[#4a6cf7] text-white font-medium disabled:opacity-50"
              >
                {saving ? t("save.saving") : t("save.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

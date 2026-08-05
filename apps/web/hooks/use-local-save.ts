"use client";

import { useCallback, useRef, useState } from "react";
import {
  PROJECT_FILE_EXT,
  PROJECT_MIME,
  setProjectFileName,
  type ProjectSnapshot,
} from "@/lib/project-save";

export type ProjectSaveMode = "overwrite" | "saveAs";

type FileSystemWritableFileStream = {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
};

type FileSystemFileHandle = {
  name?: string;
  createWritable(): Promise<FileSystemWritableFileStream>;
};

type ShowSaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
};

declare global {
  interface Window {
    showSaveFilePicker?: (
      options?: ShowSaveFilePickerOptions
    ) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options?: {
      types?: ShowSaveFilePickerOptions["types"];
      multiple?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
  }
}

const PICKER_TYPES: ShowSaveFilePickerOptions["types"] = [
  {
    description: "AI Research OS Project",
    accept: { [PROJECT_MIME]: [PROJECT_FILE_EXT] },
  },
];

function downloadFallback(filename: string, content: string): void {
  const blob = new Blob([content], { type: PROJECT_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(PROJECT_FILE_EXT)
    ? filename
    : `${filename}${PROJECT_FILE_EXT}`;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeBaseName(name: string): string {
  return name.replace(/\.aros$/i, "").trim() || "project";
}

export function useLocalSave() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  const writeToHandle = async (handle: FileSystemFileHandle, content: string) => {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    fileHandleRef.current = handle;
    if (handle.name) setProjectFileName(handle.name);
  };

  const saveProjectFile = useCallback(
    async (
      snapshot: ProjectSnapshot,
      options: { mode: ProjectSaveMode; suggestedName?: string }
    ) => {
      setSaving(true);
      const baseName = normalizeBaseName(
        options.suggestedName || snapshot.name || "project"
      );
      const content = JSON.stringify(snapshot, null, 2);

      try {
        if (options.mode === "overwrite" && fileHandleRef.current) {
          await writeToHandle(fileHandleRef.current, content);
          setProjectFileName(baseName);
          return true;
        }

        if (typeof window.showSaveFilePicker === "function") {
          const handle = await window.showSaveFilePicker({
            suggestedName: `${baseName}${PROJECT_FILE_EXT}`,
            types: PICKER_TYPES,
          });
          await writeToHandle(handle, content);
          return true;
        }

        downloadFallback(baseName, content);
        setProjectFileName(baseName);
        return true;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return false;
        downloadFallback(baseName, content);
        setProjectFileName(baseName);
        return true;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const loadProjectFile = useCallback(async (): Promise<ProjectSnapshot | null> => {
    setLoading(true);
    try {
      if (typeof window.showOpenFilePicker === "function") {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: "AI Research OS Project",
              accept: {
                [PROJECT_MIME]: [PROJECT_FILE_EXT, ".json"],
                "application/json": [".json"],
              },
            },
          ],
          multiple: false,
        });
        const file = await (handle as unknown as { getFile(): Promise<File> }).getFile();
        const text = await file.text();
        fileHandleRef.current = handle;
        setProjectFileName(file.name || handle.name || "project");
        return JSON.parse(text) as ProjectSnapshot;
      }
      return await loadViaInput((name) => setProjectFileName(name));
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return null;
      return await loadViaInput((name) => setProjectFileName(name));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFileHandle = useCallback(() => {
    fileHandleRef.current = null;
  }, []);

  const hasOpenFileHandle = useCallback(() => !!fileHandleRef.current, []);

  return {
    saveProjectFile,
    loadProjectFile,
    clearFileHandle,
    hasOpenFileHandle,
    saving,
    loading,
  };
}

function loadViaInput(onName?: (name: string) => void): Promise<ProjectSnapshot | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `${PROJECT_FILE_EXT},.json,application/json`;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      onName?.(file.name);
      try {
        const text = await file.text();
        resolve(JSON.parse(text) as ProjectSnapshot);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

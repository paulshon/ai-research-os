"use client";

import { useEffect, useState } from "react";

export type OS = "ios" | "android" | "web";

/* v49: 런타임 플랫폼 감지 훅 — <html data-os> 값을 읽어 조건부 렌더에 사용 */
export function usePlatform() {
  const [os, setOs] = useState<OS>("web");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const d = document.documentElement;
    const attr = (d.getAttribute("data-os") as OS) || "web";
    setOs(attr);
    setStandalone(d.getAttribute("data-standalone") === "true");
  }, []);

  return {
    os,
    isIOS: os === "ios",
    isAndroid: os === "android",
    isWeb: os === "web",
    standalone,
  };
}

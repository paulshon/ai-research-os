"use client";

/* ove-1 · 어시스턴트 기본 스타일 (레트로 CRT 스킨 원형 유지) */
export const BASE_CSS = `
.ra-root{position:fixed;bottom:24px;z-index:1200;
  /* s-renew-17: 본문이 좌측 정렬로 바뀌면서 오브만 화면 끝에 떨어져 보였다.
     셸이 알려준 사이드바 폭·본문 최대폭으로 본문 오른쪽 끝에 붙인다. */
  right:max(24px, calc(100vw - var(--ra-sidebar,0px) - var(--ra-maxw,100vw) + 24px));
  --ph:#33ff66;--phDim:#1b8a3a;--scr0:#0a1a0e;--scr1:#030804;
  --panelBg:#0a0d14;--panelFg:#c6d2ea;--bord:rgba(150,180,255,.16);
  --caseA:#2a2d2c;--caseB:#181a19;--caseC:#3a3e3c}
.ra-orbwrap{position:relative;width:176px;height:176px;transition:opacity .25s,transform .32s cubic-bezier(.2,1.2,.4,1)}
.ra-orbwrap:hover{transform:scale(1.06)}
.ra-root.ra-open .ra-orbwrap{transform:scale(.3);opacity:0;pointer-events:none}
.ra-orb{position:relative;width:176px;height:176px;border:0;border-radius:50%;padding:0;cursor:pointer;
  background:transparent;animation:ra-bob 5.4s ease-in-out infinite}
@keyframes ra-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.ra-orb canvas{position:absolute;inset:0;width:100%;height:100%;
  -webkit-mask-image:radial-gradient(circle,#000 94%,transparent 100%);
  mask-image:radial-gradient(circle,#000 94%,transparent 100%)}
/* s-renew-17: 오브 윤곽 — 성좌가 배경에 묻히지 않도록 얇은 테두리와 안쪽 그림자를 준다 */
.ra-orb::after{content:"";position:absolute;inset:6%;border-radius:50%;pointer-events:none;z-index:2;
  border:1px solid rgba(150,185,255,.22);
  box-shadow:inset 0 0 22px rgba(90,130,220,.16),0 0 18px rgba(70,110,200,.14)}
body.light .ra-orb::after{border-color:rgba(40,70,140,.20);
  box-shadow:inset 0 0 22px rgba(40,70,140,.10),0 0 18px rgba(40,70,140,.08)}
.ra-panel{position:absolute;right:0;bottom:0;width:340px;max-width:calc(100vw - 28px);
  height:452px;max-height:calc(100dvh - 48px);border-radius:14px;overflow:hidden;
  background:var(--panelBg);border:1px solid var(--bord);box-shadow:0 26px 64px rgba(0,0,0,.55);
  display:flex;flex-direction:column;opacity:0;visibility:hidden;
  transform:translateY(12px) scale(.95);transform-origin:bottom right;
  transition:opacity .22s,transform .32s cubic-bezier(.2,1,.3,1),border-color .5s}
.ra-root.ra-open .ra-panel{opacity:1;visibility:visible;transform:none}
.ra-bg{position:absolute;inset:0;width:100%;height:100%}
.ra-hd{position:relative;z-index:3;display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--bord)}
.ra-badge{font-family:ui-monospace,Menlo,monospace;font-size:8.5px;letter-spacing:.1em;padding:5px 7px;
  border-radius:4px;border:1px solid var(--bord);color:var(--panelFg);white-space:nowrap;transition:.45s}
.ra-root.ra-term .ra-badge{border-color:var(--phDim);color:var(--ph);text-shadow:0 0 6px var(--ph);background:rgba(0,0,0,.3)}
.ra-st{font-size:11.5px;color:var(--panelFg);opacity:.75;flex:1;transition:.45s}
.ra-root.ra-term .ra-st{color:var(--ph);opacity:1;font-family:ui-monospace,Menlo,monospace;
  font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;text-shadow:0 0 7px var(--ph)}
.ra-x{border:0;background:transparent;cursor:pointer;color:var(--panelFg);opacity:.55;font-size:17px;line-height:1;padding:2px 6px}
.ra-body{position:relative;z-index:3;flex:1;display:flex;align-items:center;justify-content:center;padding:8px;min-height:0}
.ra-hint{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:9px;text-align:center;padding:0 28px;transition:opacity .35s;pointer-events:none}
.ra-root.ra-term .ra-hint{opacity:0}
.ra-hint-t{font-size:13px;color:var(--panelFg);margin:0}
.ra-hint-s{font-size:11px;opacity:.55;line-height:1.65;color:var(--panelFg);margin:0}
.ra-mon{width:288px;max-width:100%;opacity:0;transform:scale(.92);pointer-events:none;
  transition:opacity .3s,transform .4s cubic-bezier(.2,1,.3,1)}
.ra-root.ra-term .ra-mon{opacity:1;transform:none;pointer-events:auto}
.ra-bezel{position:relative;padding:11px 11px 13px;border-radius:12px 12px 9px 9px;
  background:linear-gradient(160deg,var(--caseC),var(--caseA) 34%,var(--caseB));
  box-shadow:0 10px 22px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.1),inset 0 -2px 4px rgba(0,0,0,.5)}
.ra-vent{position:absolute;right:11px;bottom:4px;display:flex;gap:2px}
.ra-vent i{width:2px;height:5px;background:rgba(0,0,0,.45);border-radius:1px}
.ra-screen{position:relative;width:100%;aspect-ratio:4/3;overflow:hidden;border-radius:22px/28px;
  background:radial-gradient(120% 120% at 50% 45%,var(--scr0),var(--scr1) 78%);
  box-shadow:inset 0 0 34px rgba(0,0,0,.9),0 0 0 2px #0c0e0d;animation:ra-flick 5.5s steps(1) infinite}
@keyframes ra-flick{0%,94%,100%{filter:brightness(1)}95%{filter:brightness(1.13)}96%{filter:brightness(.94)}97%{filter:brightness(1.06)}}
.ra-root.ra-term .ra-screen{animation:ra-flick 5.5s steps(1) infinite,ra-power .55s ease-out 1}
@keyframes ra-power{0%{transform:scaleY(.006) scaleX(.7);filter:brightness(4)}42%{transform:scaleY(.03) scaleX(1);filter:brightness(3)}100%{transform:none;filter:brightness(1)}}
.ra-screen::before{content:"";position:absolute;inset:0;z-index:4;pointer-events:none;
  background:repeating-linear-gradient(rgba(0,0,0,.42) 0 1px,transparent 1px 3px)}
.ra-screen::after{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;border-radius:inherit;
  background:radial-gradient(115% 115% at 50% 42%,transparent 52%,rgba(0,0,0,.5) 88%,rgba(0,0,0,.75)),
    linear-gradient(122deg,rgba(255,255,255,.09) 0 16%,transparent 34%)}
.ra-sweep{position:absolute;left:0;right:0;height:56px;z-index:3;pointer-events:none;
  background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,.055),rgba(255,255,255,0));
  animation:ra-roll 6.5s linear infinite}
@keyframes ra-roll{0%{top:-60px}100%{top:100%}}
.ra-scr{position:absolute;inset:0;z-index:2;overflow-y:auto;padding:11px 12px 22px;
  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.5;
  color:var(--ph);letter-spacing:.02em;word-break:break-word;
  text-shadow:0 0 4px var(--ph),.6px 0 rgba(255,0,60,.3),-.6px 0 rgba(0,140,255,.3)}
.ra-scr::-webkit-scrollbar{width:0}
.ra-ln{margin-bottom:5px;white-space:pre-wrap}
.ra-sys{color:var(--phDim);text-shadow:0 0 4px var(--phDim);font-size:11px}
.ra-q{opacity:.86}
.ra-a{filter:brightness(1.12)}
.ra-cur{display:inline-block;width:7px;height:11px;background:var(--ph);vertical-align:-1px;
  box-shadow:0 0 8px var(--ph);animation:ra-blink .9s steps(1) infinite}
@keyframes ra-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
.ra-pbar{position:absolute;left:11px;right:11px;bottom:9px;height:7px;z-index:3;
  border:1px solid var(--phDim);opacity:0;transition:opacity .25s}
.ra-root.ra-busy .ra-pbar{opacity:1}
.ra-pbar i{display:block;height:100%;transition:width .12s linear;
  background:repeating-linear-gradient(90deg,var(--ph) 0 3px,transparent 3px 5px)}
.ra-chin{display:flex;align-items:center;gap:6px;margin-top:9px;padding:0 2px}
.ra-led{width:6px;height:6px;border-radius:50%;background:#3a1010;transition:.4s}
.ra-root.ra-term .ra-led{background:var(--ph);box-shadow:0 0 8px var(--ph)}
.ra-brand{font-family:ui-monospace,Menlo,monospace;font-size:7px;color:#6b706e;letter-spacing:.14em}
.ra-knob{margin-left:auto;width:9px;height:9px;border-radius:50%;background:linear-gradient(140deg,#4a4f4c,#232624)}
.ra-ft{position:relative;z-index:3;padding:10px 11px 11px;
  background:linear-gradient(180deg,var(--caseC),var(--caseA) 40%,var(--caseB));
  border-top:1px solid rgba(0,0,0,.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.ra-deck{display:flex;gap:8px;align-items:stretch}
.ra-key{width:40px;flex:none;border-radius:5px;cursor:pointer;display:flex;align-items:center;justify-content:center;
  border:1px solid rgba(0,0,0,.7);color:#cfd6d2;
  background:linear-gradient(180deg,#4c514e,#333835 48%,#252927);
  box-shadow:0 3px 0 #141715,0 5px 7px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.22);
  transition:transform .06s,box-shadow .06s,color .35s}
.ra-key:active{transform:translateY(3px);box-shadow:0 0 0 #141715,inset 0 1px 3px rgba(0,0,0,.6)}
.ra-key svg{width:17px;height:17px;shape-rendering:crispEdges}
.ra-root.ra-term .ra-key{color:var(--ph);filter:drop-shadow(0 0 4px var(--ph))}
.ra-key[aria-pressed="true"]{color:#ff5a5a;filter:drop-shadow(0 0 6px #ff3b3b)}
.ra-well{flex:1;position:relative;display:flex;align-items:flex-start;gap:6px;padding:6px 9px;
  border-radius:3px;overflow:hidden;border:1px solid rgba(0,0,0,.85);
  background:radial-gradient(120% 130% at 50% 40%,var(--scr0),var(--scr1) 85%);
  box-shadow:inset 0 2px 7px rgba(0,0,0,.95),inset 0 0 0 1px var(--phDim)}
.ra-well::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(rgba(0,0,0,.34) 0 1px,transparent 1px 3px)}
.ra-prompt{font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.5;color:var(--ph);
  text-shadow:0 0 6px var(--ph);user-select:none}
.ra-well textarea{flex:1;background:transparent;border:0;outline:none;resize:none;height:26px;max-height:84px;
  padding:1px 0 0;font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.5;
  color:var(--ph);text-shadow:0 0 6px var(--ph);scrollbar-width:none}
.ra-well textarea::-webkit-scrollbar{display:none}
.ra-well textarea::placeholder{color:var(--phDim);text-shadow:none}
.ra-note{position:relative;z-index:3;font-family:ui-monospace,Menlo,monospace;font-size:11px;text-align:center;
  color:var(--phDim);padding:4px 12px 6px;min-height:8px;background:var(--caseB)}

/* ── 모바일: 하단 시트로 전환 ───────────────────────────── */
@media (max-width:767px){
  .ra-root{right:14px}
  /* 셸의 하단 탭바(--imm-tabbar 62px) 위로 띄운다. 탭바는 z-[7500] 이므로
     시트로 열릴 때는 그보다 위(7600)로 올려 가려지지 않게 한다. */
  .ra-root{right:14px;
    bottom:calc(var(--imm-tabbar,62px) + env(safe-area-inset-bottom,0px) + 42px)}
  .ra-root.ra-open{z-index:7600}
  .ra-orbwrap,.ra-orb{width:124px;height:124px}
  .ra-panel{position:fixed;left:0;right:0;bottom:0;width:100vw;max-width:100vw;
    height:min(78dvh,560px);max-height:78dvh;border-radius:16px 16px 0 0;transform-origin:bottom center;
    transform:translateY(16px);
    padding-bottom:calc(var(--imm-tabbar,62px) + env(safe-area-inset-bottom,0px))}
  .ra-root.ra-open .ra-panel{transform:none}
  .ra-mon{width:min(300px,86vw)}
  .ra-hd{padding:12px 14px}
  .ra-key{width:46px}
  .ra-well textarea,.ra-prompt{font-size:16px}   /* iOS 자동 확대 방지 */
}
@media (prefers-reduced-motion:reduce){
  .ra-orb,.ra-screen,.ra-sweep,.ra-cur{animation:none!important}
  .ra-panel,.ra-orbwrap,.ra-mon{transition:none!important}
}
`;

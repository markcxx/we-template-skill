// Both the standalone HTML and /proof work without JavaScript inside the sandbox.
export const previewControls = `<div class="preview-mode" role="group" aria-label="预览方式">
<input type="radio" id="phone-mode" name="mode" checked><label for="phone-mode">手机预览</label>
<input type="radio" id="reading-mode" name="mode"><label for="reading-mode">阅读模式</label></div>`;

// Draw status symbols on a shared pixel grid so their baselines stay aligned.
export const phoneTop = `<div class="chassis"><span class="hardware-keys" aria-hidden="true"></span><div class="device"><div class="status" aria-hidden="true"><b>9:41</b><i class="island"></i><svg width="67" height="16" viewBox="0 0 67 16" fill="currentColor">
<rect x="0" y="10" width="3.2" height="4" rx=".8"/><rect x="4.6" y="8" width="3.2" height="6" rx=".8"/><rect x="9.2" y="5" width="3.2" height="9" rx=".8"/><rect x="13.8" y="2" width="3.2" height="12" rx=".8"/>
<path d="M23 5.2a12 12 0 0 1 15 0M25.8 8.2a7.7 7.7 0 0 1 9.4 0M28.6 11a3.3 3.3 0 0 1 3.8 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><circle cx="30.5" cy="13.3" r="1"/>
<rect x="42" y="2.5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".55"/><rect x="44" y="4.4" width="18" height="7.2" rx="1.7"/><path d="M65.5 6v4q2-2 0-4"/></svg></div><div class="screen" role="region" aria-label="文章阅读区域" tabindex="0">`;
export const phoneBottom = '</div><div class="home-indicator" aria-hidden="true"></div></div></div>';

// iPhone 16 enclosure: 71.6 × 147.6 mm (Apple support, article 121029).
export const deviceCss = `
body{background:#f3f4f6}
.preview-mode{width:fit-content;margin:12px auto;display:flex;padding:3px;gap:2px;border:1px solid #d5d7dd;border-radius:22px;background:#e7e8ec;font:13px/1.4 system-ui}
.preview-mode input{position:absolute;width:1px;height:1px;opacity:0}
.preview-mode label{padding:5px 14px;border-radius:18px;color:#60636b;cursor:pointer}
.preview-mode input:checked+label{background:white;color:#151619;box-shadow:0 1px 4px #0002}
.preview-mode input:focus-visible+label,.screen:focus-visible{outline:2px solid #526e97;outline-offset:-2px}
.chassis{--frame-width:min(406px,calc(100vw - 28px),calc((100dvh - 72px) * 71.6 / 147.6));--radius:calc(var(--frame-width) * .135);position:relative;isolation:isolate;width:var(--frame-width);height:calc(var(--frame-width) * 147.6 / 71.6);margin:auto;padding:3px;border-radius:var(--radius);background:linear-gradient(115deg,#a6a49f,#f3f1ee 12%,#757572 27%,#c3c1be 62%,#797977 84%,#cecdca);box-shadow:0 0 0 1px #70706f,0 2px 3px #191b201a,0 18px 42px -15px #16182160}
.hardware-keys{position:absolute;left:-3px;top:21%;width:3px;height:44px;border-radius:2px 0 0 2px;background:linear-gradient(to right,#777673,#c4c3bf);box-shadow:0 51px #93928f}.hardware-keys:after{content:"";position:absolute;left:calc(var(--frame-width) + 2px);top:34px;height:60px;width:3px;border-radius:0 2px 2px 0;background:#94938f}
.device{position:relative;display:flex;flex-direction:column;width:100%;height:100%;border:calc(var(--frame-width) * .019) solid #111213;border-radius:calc(var(--radius) - 3px);overflow:hidden;background:white}
.status{position:relative;display:flex;align-items:center;justify-content:space-between;height:calc(var(--frame-width) * .136);flex:none;padding:0 6.5% 0 8%;color:#121214;font:600 16px/1 -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:-.4px}
.status svg{width:18%;height:auto}.island{position:absolute;left:50%;top:calc(var(--frame-width) * .025);transform:translateX(-50%);width:25%;height:calc(var(--frame-width) * .072);background:#09090b;border-radius:18px}.island:after{content:"";position:absolute;right:10%;top:36%;width:8%;aspect-ratio:1;border-radius:50%;background:radial-gradient(at 40% 35%,#233049,#10131e 45%,#08090c)}
.screen{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:none}.screen::-webkit-scrollbar{display:none}
.device article{overflow-x:clip;padding:16px 16px 40px}.home-indicator{height:5px;width:110px;border-radius:4px;background:#191919;margin:7px auto;flex:none}
body:has(#reading-mode:checked){background:white}body:has(#reading-mode:checked) :is(.device,.chassis){padding:0;display:block;width:auto;height:auto;border:0;box-shadow:none;border-radius:0;overflow:visible}
body:has(#reading-mode:checked) :is(.status,.home-indicator,.hardware-keys){display:none}body:has(#reading-mode:checked) .screen{overflow:visible}
@media print{.hardware-keys,.preview-mode,.status,.home-indicator{display:none}.chassis,.device,.screen{display:block;width:auto;height:auto;border:0;box-shadow:none;overflow:visible;border-radius:0}}
`;

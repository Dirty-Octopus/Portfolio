/** Panels retract, the frame resizes, then content seats along the same rails. */
import { EASE, MOTION, finishAll } from "./motion.js";
import { t } from "./i18n.js";
import { initSettings } from "./settings.js";
import { initParallax } from "./parallax.js";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const labels = {
  projects: ["GitHub 项目", "GITHUB PROJECTS"],
  overview: ["个人简介", "PROFILE"],
  fun: ["有趣的东西", "PLAYGROUND"],
  contact: ["联系方式", "CONTACT"],
};
let transition = null,
  heightMotion = null,
  pendingView = null,
  generation = 0,
  options = {};
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
export const motionAllowed = () =>
  !document.body.classList.contains("motion-off") && !motionPreference.matches;
function updateViewLabels() {
  const view = $(".shell").dataset.view;
  $("#module-path").textContent = t(...labels[view]);
  $("#workspace-label").textContent =
    `${t("档案", "ARCHIVE")} / ${t(...labels[view])}`;
  $("#interaction-hint").textContent = t(
    "独立开发 / 开源项目",
    "INDEPENDENT DEVELOPMENT / OPEN SOURCE",
  );
}
function commitView(view) {
  $(".shell").dataset.view = view;
  $$(".nav").forEach((element) => {
    const active = element.dataset.nav === view;
    element.classList.toggle("active", active);
    element.setAttribute("aria-current", active ? "page" : "false");
  });
  options.onView?.(view);
  updateViewLabels();
  logAction(`${t("版块", "MODULE")} / ${t(...labels[view])}`);
  document.dispatchEvent(new CustomEvent("modulechange", { detail: view }));
}
function settleTransition() {
  generation += 1;
  if (pendingView && pendingView !== $(".shell").dataset.view)
    commitView(pendingView);
  pendingView = null;
  if (transition) {
    transition.forEach((animation) => animation.cancel());
    transition = null;
  }
  heightMotion?.cancel();
  heightMotion = null;
  $(".module-surface").style.height = "";
  $(".shell").classList.remove("reconfiguring");
  $(".workspace").inert = false;
  $(".workspace").setAttribute("aria-busy", "false");
  $$(".nav.pending").forEach((el) => el.classList.remove("pending"));
  document.dispatchEvent(
    new CustomEvent("modulesettled", { detail: $(".shell").dataset.view }),
  );
}
export function changeView(view) {
  if (!(view in labels)) return;
  const shell = $(".shell"),
    workspace = $(".workspace");
  if (view === pendingView || (!transition && shell.dataset.view === view))
    return;
  pendingView = view;
  $$(".nav").forEach((el) =>
    el.classList.toggle("pending", el.dataset.nav === view),
  );
  if (!motionAllowed()) {
    options.engine.sfx("scanner");
    settleTransition();
    return;
  }
  if (transition) return;
  shell.classList.add("reconfiguring");
  workspace.inert = true;
  workspace.setAttribute("aria-busy", "true");
  sweep();
}

async function sweep() {
  options.engine.sfx("scanner");
  const ticket = ++generation;
  const surface = $(".module-surface");
  const panels = () =>
    [...surface.children].filter(
      (el) =>
        !el.classList.contains("module-wipe") &&
        el.getBoundingClientRect().height > 0,
    );
  const outgoing = panels();
  transition = outgoing.map((el, i) =>
    el.animate(
      [
        { clipPath: "inset(0 0 0 0)", transform: "translateY(0)", opacity: 1 },
        {
          clipPath: "inset(0 0 100% 0)",
          transform: "translateY(-8px)",
          opacity: 0.4,
        },
      ],
      {
        duration: MOTION.close,
        delay: i * 18,
        easing: EASE.close,
        fill: "both",
      },
    ),
  );
  await finishAll(transition);
  if (ticket !== generation) return;
  const from = surface.offsetHeight;
  if (pendingView) commitView(pendingView);
  pendingView = null;
  const to = surface.offsetHeight;
  // Install every incoming first frame before releasing the outgoing masks.
  const incoming = panels().map((el, i) =>
    el.animate(
      [
        {
          clipPath: "inset(0 100% 0 0)",
          transform: "translateY(9px)",
          opacity: 0.5,
        },
        { clipPath: "inset(0 0 0 0)", transform: "translateY(0)", opacity: 1 },
      ],
      {
        duration: MOTION.reveal,
        delay: 70 + i * MOTION.stagger,
        easing: EASE.glide,
        fill: "both",
      },
    ),
  );
  transition.forEach((a) => a.cancel());
  transition = incoming;
  surface.style.height = `${to}px`;
  heightMotion = surface.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    {
      duration: MOTION.expand,
      easing: EASE.machine,
      fill: "both",
    },
  );
  const rail = $(".module-wipe");
  transition.push(
    rail.animate(
      [
        { transform: "scaleX(0)", opacity: 0 },
        { transform: "scaleX(1)", opacity: 1, offset: 0.6 },
        { transform: "scaleX(1)", opacity: 0 },
      ],
      { duration: MOTION.expand, easing: EASE.glide, fill: "both" },
    ),
  );
  await finishAll([...transition, heightMotion]);
  if (ticket !== generation) return;
  transition.forEach((a) => a.cancel());
  transition = null;
  heightMotion.cancel();
  heightMotion = null;
  surface.style.height = "";
  const next = pendingView;
  pendingView = null;
  if (next && next !== $(".shell").dataset.view) changeView(next);
  else settleTransition();
}
export function logAction(message) {
  if ($("#last-action")) $("#last-action").textContent = message;
}
function processArtwork(value, persist = true) {
  if (!["mono", "duotone", "halftone"].includes(value)) return;
  document.body.dataset.treatment = value;
  try {
    if (persist) localStorage.setItem("portfolio-theme", value);
  } catch {
    /* Storage may be unavailable. */
  }
  $$("button[data-treatment]").forEach((el) => {
    const active = el.dataset.treatment === value;
    el.setAttribute("aria-pressed", String(active));
    el.classList.toggle("active", active);
  });
  logAction(
    `${t("主题", "THEME")} / ${{ duotone: "BLUE", halftone: "PRIMARY", mono: "GRAYSCALE" }[value]}`,
  );
}
export function initInterface(config) {
  options = config;
  try {
    processArtwork(
      localStorage.getItem("portfolio-theme") || "halftone",
      false,
    );
  } catch {
    processArtwork("halftone", false);
  }
  initSettings({
    motionAllowed,
    onOpen: () => {
      $("#system-sfx").setAttribute(
        "aria-checked",
        String(config.engine.sfxEnabled),
      );
      $("#system-sfx").textContent = config.engine.sfxEnabled
        ? t("开", "ON")
        : t("关", "OFF");
      updateState();
      logAction(t("系统控制 / 开启", "SYSTEM CONTROL / OPEN"));
    },
  });
  $$("button[data-treatment]").forEach((button) =>
    button.addEventListener("click", () =>
      processArtwork(button.dataset.treatment),
    ),
  );
  function updateMotion() {
    $("#motion-toggle").setAttribute("aria-checked", String(motionAllowed()));
    $("#motion-toggle").textContent = motionAllowed()
      ? t("开", "ON")
      : t("精简", "REDUCED");
    if (!motionAllowed()) {
      document.getAnimations().forEach((animation) => animation.cancel());
      settleTransition();
    }
    document.dispatchEvent(new Event("motionchange"));
  }
  updateMotion();
  motionPreference.addEventListener("change", updateMotion);
  $("#motion-toggle").addEventListener("click", () => {
    const enable = document.body.classList.contains("motion-off");
    document.body.classList.toggle("motion-off", !enable);
    updateMotion();
    logAction(
      `${t("动画", "MOTION")} / ${motionAllowed() ? t("开启", "ENABLED") : t("精简", "REDUCED")}`,
    );
  });
  $("#system-sfx").addEventListener("click", () => {
    $("#sfx-toggle").click();
    $("#system-sfx").setAttribute(
      "aria-checked",
      String(config.engine.sfxEnabled),
    );
    $("#system-sfx").textContent = config.engine.sfxEnabled
      ? t("开", "ON")
      : t("关", "OFF");
    logAction(
      `SFX / ${config.engine.sfxEnabled ? t("开", "ON") : t("关", "OFF")}`,
    );
  });
  $("#system-bgm").addEventListener("click", () => $("#bgm-toggle").click());
  $("#softness").addEventListener("input", (event) => {
    document.documentElement.style.setProperty(
      "--screen-softness",
      `${event.target.value}px`,
    );
    $("#softness-value").textContent = Number(event.target.value).toFixed(2);
  });
  $("#settings-reset").addEventListener("click", () => {
    processArtwork("halftone", false);
    try {
      localStorage.removeItem("portfolio-theme");
    } catch {
      /* Optional preference. */
    }
    document.body.classList.remove("motion-off");
    $("#softness").value = "0.2";
    $("#softness").dispatchEvent(new Event("input", { bubbles: true }));
    updateMotion();
    document.dispatchEvent(new Event("settingsreset"));
    logAction(t("已恢复默认设置", "DEFAULT SETTINGS RESTORED"));
  });
  function updateState() {
    $("#system-playback-state").textContent =
      config.engine.bgmEnabled && config.engine.bgmVoice
        ? t("背景音乐 / 播放中", "BACKGROUND MUSIC / PLAYING")
        : t("待机", "IDLE");
  }
  const previousChange = config.engine.onChange;
  config.engine.onChange = (...args) => {
    previousChange.apply(config.engine, args);
    updateState();
  };
  document.addEventListener("settingsreset", updateState);
  document.addEventListener("portalentered", updateState);
  document.addEventListener("languagechange", () => {
    updateViewLabels();
    updateState();
    updateMotion();
    logAction(t("项目档案 / 已连接", "PROJECT ARCHIVE / CONNECTED"));
  });
  updateViewLabels();
  updateState();
  initParallax(motionAllowed);
}

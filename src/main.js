import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./style.css";
import "./forum.css";
import "./choreography.css";
import "./experience.css";
import "./refinements.css";
import "./console.css";
import "./contact.css";
import "./portal-contour.css";
import "./portal.css";
import "./motion.css";
import "./projects.css";
import { AudioAssets } from "./loading.js";
import { initPortal } from "./portal.js";
import { initPortalContour } from "./portal-contour.js";
import { initMetalLogos } from "./metal-logo.js";
import { initCrtLens } from "./crt.js";
import { initBackground } from "./background.js";
import { initViewportSurface } from "./viewport.js";
import { initTactileExperience } from "./tactile.js";
import { t, setLanguage } from "./i18n.js";
import { initInterface, changeView, motionAllowed } from "./interface.js";
import { initProjects } from "./projects.js";
import { PlaybackEngine } from "./player.js";
import manifest from "./media.json";
import volumeIcon from "@phosphor-icons/core/assets/regular/speaker-high.svg?raw";
import searchIcon from "@phosphor-icons/core/assets/regular/magnifying-glass.svg?raw";
import arrowIcon from "@phosphor-icons/core/assets/regular/arrow-up-right.svg?raw";
import slidersIcon from "@phosphor-icons/core/assets/regular/sliders-horizontal.svg?raw";
import expandIcon from "@phosphor-icons/core/assets/regular/arrows-out-simple.svg?raw";
import musicIcon from "@phosphor-icons/core/assets/regular/music-notes.svg?raw";
import resetIcon from "@phosphor-icons/core/assets/regular/arrow-counter-clockwise.svg?raw";
import copyIcon from "@phosphor-icons/core/assets/regular/copy.svg?raw";
import githubIcon from "@phosphor-icons/core/assets/regular/github-logo.svg?raw";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const icons = {
  "speaker-high": volumeIcon,
  "magnifying-glass": searchIcon,
  "arrow-up-right": arrowIcon,
  "sliders-horizontal": slidersIcon,
  "arrows-out-simple": expandIcon,
  "music-notes": musicIcon,
  "arrow-counter-clockwise": resetIcon,
  copy: copyIcon,
  "github-logo": githubIcon,
};
function hydrateIcons() {
  $$("[data-icon]").forEach((element) => {
    element.innerHTML = icons[element.dataset.icon] || "";
    element.setAttribute("aria-hidden", "true");
  });
}
hydrateIcons();
let entered = false,
  opening = false,
  assetsReady,
  logosReady,
  portal,
  logoController,
  toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4200);
}
const engine = new PlaybackEngine({
  audio: $("#audio"),
  video: $("#video"),
  onChange: syncSoundControls,
  onError: () =>
    toast(
      t("声音加载失败，请重试。", "Audio could not load. Please try again."),
    ),
});
const audioAssets = new AudioAssets(
  engine,
  (path) => `${import.meta.env.BASE_URL}${path}`,
);
function syncSoundControls() {
  for (const [name, enabled] of [
    ["sfx", engine.sfxEnabled],
    ["bgm", engine.bgmEnabled],
  ]) {
    const toggle = $(`#${name}-toggle`);
    toggle.setAttribute("aria-pressed", String(enabled));
    const label =
      name === "sfx"
        ? enabled
          ? t("关闭界面音效", "Disable interface sounds")
          : t("开启界面音效", "Enable interface sounds")
        : enabled
          ? t("关闭背景音乐", "Disable background music")
          : t("开启背景音乐", "Enable background music");
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    toggle.querySelector("b").textContent = enabled
      ? t("开", "ON")
      : t("关", "OFF");
    $(`#system-${name}`).setAttribute("aria-checked", String(enabled));
    $(`#system-${name}`).textContent = enabled ? t("开", "ON") : t("关", "OFF");
  }
}
$("#sfx-toggle").addEventListener("click", () => {
  engine.sfxEnabled = !engine.sfxEnabled;
  if (!engine.sfxEnabled) engine.stopSfx();
  else engine.sfx("clickevent");
  syncSoundControls();
});
$("#bgm-toggle").addEventListener("click", async () => {
  engine.bgmEnabled = !engine.bgmEnabled;
  syncSoundControls();
  await assetsReady;
  await engine.setBgmEnabled(engine.bgmEnabled);
});
initInterface({ engine });
initProjects({ motionAllowed, engine });
initTactileExperience({ engine, motionAllowed });
initViewportSurface();
initCrtLens(t);
initBackground(motionAllowed);
portal = initPortal({ engine, motionAllowed, getLogo: () => logoController });
initPortalContour({ motionAllowed, engine });
logosReady = initMetalLogos({ engine, motionAllowed }).then((controller) => {
  logoController = controller;
});
$("#year").textContent = new Date().getFullYear();
document.addEventListener("visibilitychange", () =>
  document.body.classList.toggle("page-hidden", document.hidden),
);
async function startAudioLoading() {
  $("#boot-retry").hidden = true;
  $("#boot").classList.remove("load-failed");
  assetsReady = (async () => {
    try {
      await audioAssets.load([], manifest.sfx, (fraction) => {
        const percent = Math.floor(fraction * 97);
        $(".boot-progress").style.setProperty("--loaded", `${percent}%`);
        $(".boot-progress").setAttribute("aria-valuenow", String(percent));
        $("#boot-percent").value = `${String(percent).padStart(2, "0")}%`;
        $("#boot-status").textContent = t(
          "正在载入交互声音…",
          "LOADING INTERFACE AUDIO…",
        );
      });
      await Promise.all([
        document.fonts.ready,
        logosReady,
        ...$$("img").map((image) => image.decode().catch(() => {})),
      ]);
      $(".boot-progress").style.setProperty("--loaded", "100%");
      $(".boot-progress").setAttribute("aria-valuenow", "100");
      $("#boot-percent").value = "100%";
      await portal.reveal();
      $("#boot-status").textContent = t(
        "已就绪 / 选择语言进入",
        "READY / SELECT LANGUAGE",
      );
      return true;
    } catch (error) {
      console.error("Interface assets could not load", error);
      $("#boot").classList.add("load-failed");
      $("#boot-status").textContent = t(
        "部分资源未能加载，请重试。",
        "LOADING INTERRUPTED. PLEASE RETRY.",
      );
      $("#boot-retry").hidden = false;
      return false;
    }
  })();
  return assetsReady;
}
async function enterExperience(language) {
  if (entered || !portal.ready) return;
  entered = true;
  setLanguage(language);
  $$("[data-enter]").forEach((button) => {
    button.disabled = true;
  });
  try {
    await engine.unlock();
  } catch {
    toast(
      t(
        "点击声音开关即可开启声音。",
        "Use the sound controls to enable audio.",
      ),
    );
  }
  if (!(await assetsReady) || opening) return;
  opening = true;
  engine.sfx("website_bootup", { lane: "startup" });
  await engine.setBgmEnabled(engine.bgmEnabled);
  $("#boot-status").textContent = t(
    "连接完成 / 项目已就绪",
    "CONNECTED / PROJECTS READY",
  );
  await portal.enter();
  $("[data-nav=projects]").focus({ preventScroll: true });
}
$$("[data-enter]").forEach((button) =>
  button.addEventListener("click", () => enterExperience(button.dataset.enter)),
);
$("#boot-retry").addEventListener("click", () => {
  engine.unlock();
  startAudioLoading();
});
$$("[data-nav]").forEach((button) =>
  button.addEventListener("click", () => changeView(button.dataset.nav)),
);
$("#explore").addEventListener("click", () => {
  const focus = () => {
    $("#project-list button")?.focus({ preventScroll: true });
    window.scrollTo({
      top: $(".project-board").getBoundingClientRect().top + scrollY - 24,
      behavior: motionAllowed() ? "smooth" : "instant",
    });
  };
  if ($(".shell").dataset.view === "projects") focus();
  else {
    document.addEventListener("modulesettled", focus, { once: true });
    changeView("projects");
  }
});
const scrollTop = () =>
  window.scrollTo({ top: 0, behavior: motionAllowed() ? "smooth" : "instant" });
$("#back-top").addEventListener("click", scrollTop);
$(".brand-home").addEventListener("click", (event) => {
  event.preventDefault();
  changeView("projects");
  scrollTop();
});
$$("[data-copy-contact]").forEach((button) =>
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copyContact);
      toast(t("已复制：", "Copied: ") + button.dataset.copyContact);
    } catch {
      toast(
        t(
          "请选中联系方式手动复制。",
          "Select the contact details to copy manually.",
        ),
      );
    }
  }),
);
document.addEventListener("keydown", (event) => {
  if (!entered || !$("#boot").hidden) {
    if (event.key === "Tab") {
      event.preventDefault();
      const buttons = $$(".boot-symbol,[data-enter],#boot-retry").filter(
        (button) => !button.disabled && !button.hidden,
      );
      const index = buttons.indexOf(document.activeElement);
      buttons[
        (index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length
      ]?.focus();
    }
    return;
  }
  if ($("#system-dialog").open || $("#preview-dialog").open) return;
  const input = event.target.closest("input,textarea,button,a,select");
  if (event.key === " " && !input) {
    event.preventDefault();
    $("#bgm-toggle").click();
  }
  if (event.key === "/" && !input) {
    event.preventDefault();
    if ($(".shell").dataset.view === "projects" && !$(".workspace").inert)
      $("#search").focus();
    else {
      const focusSearch = (event) => {
        if (event.detail !== "projects") return;
        document.removeEventListener("modulesettled", focusSearch);
        $("#search").focus();
      };
      document.addEventListener("modulesettled", focusSearch);
      changeView("projects");
    }
  }
});
document.addEventListener(
  "click",
  (event) => {
    if (event.target.closest(":disabled,[inert],[data-sfx=logo]")) return;
    if (
      event.target.closest("#boot") &&
      !event.target.closest("button,a,input")
    )
      return;
    const interactive = event.target.closest("button,a,input,select,textarea");
    engine
      .unlock()
      .then(() => {
        engine.sfx("clickeffect");
        if (interactive) engine.sfx("clickevent");
      })
      .catch(() => {});
  },
  true,
);
let lastPreselect = { control: null, time: 0 };
function preselect(event) {
  const control = event.target.closest("button,a,input[type=range]");
  if (!control || control.disabled || !$("#boot").hidden || !entered) return;
  if (
    event.type === "pointerover" &&
    (event.pointerType !== "mouse" || control.contains(event.relatedTarget))
  )
    return;
  const now = performance.now();
  if (control === lastPreselect.control && now - lastPreselect.time < 30)
    return;
  lastPreselect = { control, time: now };
  engine.sfx("preselect");
}
document.addEventListener("pointerover", preselect);
document.addEventListener("focusin", preselect);
document.addEventListener("settingsreset", async () => {
  engine.sfxEnabled = engine.bgmEnabled = true;
  engine.setMuted(false);
  engine.setVolume(0.65);
  setLanguage("zh");
  syncSoundControls();
  toast(t("已恢复默认设置", "Default settings restored"));
  await assetsReady;
  await engine.setBgmEnabled(true);
});
document.addEventListener("languagechange", () => {
  hydrateIcons();
  syncSoundControls();
});
$$("[data-language]").forEach((button) =>
  button.addEventListener("click", () => setLanguage(button.dataset.language)),
);
setLanguage("zh");
startAudioLoading();

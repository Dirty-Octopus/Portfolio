import { clearScramble, scrambleText } from "./text-transition.js";
let language = "zh";
export const t = (zh, en) => (language === "en" ? en : zh);
export const getLanguage = () => language;
// Kept for shared media utilities; this archive's project titles remain unchanged.
export const trackTitle = (track) => track.title;

const content = {
  archive: ["项目档案", "PROJECT ARCHIVE"],
  welcome: ["欢迎来到项目档案。", "Welcome to the project archive."],
  notice: [
    "独立开发、音频工具与开源实验。",
    "Independent software, audio tools and open-source experiments.",
  ],
  works: ["代码仓库", "REPOSITORIES"],
  projects: ["GitHub 项目", "GITHUB PROJECTS"],
  repositories: ["代码仓库", "REPOSITORIES"],
  projectIndex: ["项目索引", "PROJECT INDEX"],
  allProjects: ["全部项目", "ALL PROJECTS"],
  projectSearch: ["搜索项目", "Search projects"],
  selectedProject: ["已选项目", "SELECTED PROJECT"],
  viewRepository: ["查看仓库", "VIEW REPOSITORY"],
  viewPreview: ["查看预览", "VIEW PREVIEW"],
  audioPortfolio: ["音频作品集", "AUDIO PORTFOLIO"],
  projectHint: [
    "选择项目，查看预览与源代码。",
    "Select a project to explore its preview and source.",
  ],
  preview: ["界面预览", "INTERFACE PREVIEW"],
  projectDetails: ["项目资料", "PROJECT DETAILS"],
  githubProfile: ["GitHub 主页", "GITHUB PROFILE"],
  bgm: ["背景音乐", "BACKGROUND MUSIC"],
  softness: ["屏幕柔化", "SCREEN DIFFUSION"],
  language: ["语言", "LANGUAGE"],
  profile: ["个人简介", "ARTIST PROFILE"],
  profileRole: [
    "音乐制作 / 混音 / 声音设计",
    "MUSIC PRODUCTION / MIXING / SOUND DESIGN",
  ],
  biographyExperience: [
    "曾为海外独立游戏团队担任音频方向职务，有三年以上个人接稿经验，并参与过多个来自国内外的中小型商业混音、音乐及音效项目。",
    "Previously held an audio leadership role with an overseas indie game team, with over three years of freelance experience and contributions to small and mid-sized commercial mixing, music and sound design projects in China and abroad.",
  ],
  biographyReach: [
    "个人独立作品在 YouTube 单曲最高播放量超过 39 万，抖音作品累计获赞约 24 万。",
    "My most-played independent release on YouTube has surpassed 390,000 views, and my work on Douyin has received approximately 240,000 likes in total.",
  ],
  biographyRecognition: [
    "部分作品也曾得到国内知名游戏公司音乐制作人、制作人 Exyl、国内知名嘻哈制作人、韩国某知名娱乐公司制作人等业内人士的认可。",
    "Some of my work has also received recognition from industry professionals including music producers at well-known Chinese game companies, producer Exyl, prominent Chinese hip-hop producers and producers at a well-known South Korean entertainment company.",
  ],
  yearsFreelance: ["年个人接稿经验", "YEARS FREELANCING"],
  youtubePlays: ["YouTube 单曲播放", "YOUTUBE / TOP RELEASE"],
  douyinLikes: ["抖音累计获赞", "DOUYIN / TOTAL LIKES"],
  playground: ["有趣的东西", "OFF THE RECORD"],
  openGame: ["打开小游戏（新标签页）", "OPEN GAME (NEW TAB)"],
  contact: ["联系方式", "CONTACT"],
  contactWelcome: ["欢迎约稿 / 咨询。", "Open for commissions / inquiries."],
  email: ["电邮", "Email"],
  wechat: ["微信", "WeChat"],
  rotary: ["摇把", "WINDOW CRANK"],
  crtLens: ["视角畸变 · 实验性", "CRT LENS · EXPERIMENTAL"],
  themeBlue: ["经典蓝", "BLUE"],
  themePrimary: ["高对比", "PRIMARY"],
  themeMono: ["灰阶", "GRAYSCALE"],
  resetSettings: ["重置所有设置", "RESET ALL SETTINGS"],
};

// Explicit selectors keep translation separate from project data and icon markup.
const markup = {
  ".boot-note": [
    "独立软件 / 音频工具 / 开源项目",
    "INDEPENDENT SOFTWARE / AUDIO TOOLS / OPEN SOURCE",
  ],
  ".outer-label > span:first-child": [
    "独立开发与声音实验",
    "INDEPENDENT SOFTWARE & SOUND EXPERIMENTS",
  ],
  ".outer-label > span:last-child": [
    "DIRTY OCTOPUS / 项目档案",
    "DIRTY OCTOPUS / PROJECT ARCHIVE",
  ],
  ".brand-name small": ["独立开发 / 声音设计", "SOFTWARE / SOUND DESIGN"],
  ".navigation-caption > span:first-child": [
    "独立项目与开源实验",
    "INDEPENDENT PROJECTS & OPEN SOURCE",
  ],
  ".navigation-caption > span:last-child": ["作品集目录", "ARCHIVE DIRECTORY"],
  '[data-nav="projects"] b': ["GitHub 项目", "Projects"],
  '[data-nav="projects"] small': ["PROJECTS", "GITHUB ARCHIVE"],
  '[data-nav="overview"] b': ["个人简介", "Profile"],
  '[data-nav="overview"] small': ["PROFILE", "BIOGRAPHY"],
  '[data-nav="audio-portfolio"] b, #audio-portfolio b': [
    "音频作品集",
    "Audio portfolio",
  ],
  '[data-nav="audio-portfolio"] small, #audio-portfolio small': [
    "AUDIO ↗",
    "DIRTYOCTOPUS.NET ↗",
  ],
  '[data-nav="fun"] b': ["有趣的东西", "Playground"],
  '[data-nav="contact"] b': ["联系方式", "Contact"],
  "#system-open > span:last-child": ["设置", "SYSTEM"],
  ".hero-copy > .micro": [
    "独立软件 / 音频工具 / 开源档案",
    "INDEPENDENT SOFTWARE / AUDIO TOOLS / OPEN SOURCE",
  ],
  ".hero-subtitle": ["代码与声音。", "CODE & SOUND."],
  ".hero-description": [
    "从声音出发，构建工具。<small>桌面应用 / 音频插件 / 开源实验</small>",
    "Building tools, starting from sound.<small>DESKTOP APPS / AUDIO PLUGINS / OPEN SOURCE</small>",
  ],
  "#explore b": ["浏览项目", "Explore projects"],
  "#explore small": ["GitHub 档案", "GITHUB ARCHIVE"],
  ".hero-coordinate > span": [
    "精选项目<br>独立开发档案",
    "SELECTED PROJECTS<br>AN INDEPENDENT ARCHIVE",
  ],
  ".image-index > span": ["开源<br>项目", "OPEN SOURCE<br>PROJECTS"],
  ".scene-corner > span": ["视觉主题", "THEME"],
  ".hero-bottom > span:first-child": [
    "把想法做成可用的工具。",
    "IDEAS, BUILT INTO WORKING TOOLS.",
  ],
  ".hero-bottom > span:last-child": [
    "软件 / 插件 / 实验",
    "SOFTWARE / PLUGINS / EXPERIMENTS",
  ],
  ".catalog > .panel-label": [
    "项目索引 <span>04</span>",
    "PROJECT INDEX <span>04</span>",
  ],
  ".list-header > span:first-child": ["项目 / 仓库", "PROJECT / REPOSITORY"],
  ".list-header > span:nth-child(2)": ["技术", "STACK"],
  ".list-header > span:last-child": ["平台", "PLATFORM"],
  ".library-footer > span:last-child": [
    "DIRTY OCTOPUS / 独立开发",
    "DIRTY OCTOPUS / INDEPENDENT SOFTWARE",
  ],
  ".heading-main": ["精选 / 项目预览", "FEATURE / PROJECT PREVIEW"],
  ".output-label > span:first-child": ["主输出", "MASTER OUTPUT"],
  ".footer-message": ["代码与声音。", "Code & sound."],
  "#back-top": [
    '返回顶部 <span data-icon="arrow-up-right"></span>',
    'BACK TO TOP <span data-icon="arrow-up-right"></span>',
  ],
  ".bottom-label > span:first-child": [
    "独立构建。公开分享。",
    "BUILT INDEPENDENTLY. SHARED OPENLY.",
  ],
  ".bottom-label > span:last-child": [
    "DIRTY OCTOPUS / 独立创作",
    "DIRTY OCTOPUS / INDEPENDENT",
  ],
  "#system-title": ["界面控制", "INTERFACE.CONTROL"],
  ".system-description": ["声音与显示", "SOUND & DISPLAY"],
  ".system-section:has(.system-treatments button[data-treatment]) h3": [
    "视觉主题",
    "VISUAL THEME",
  ],
  ".system-section > p": [
    "经典蓝 / 高对比 / 灰阶",
    "BLUE / PRIMARY / GRAYSCALE",
  ],
  ".system-switch-row:has(#motion-toggle) > span": [
    "界面动画",
    "INTERFACE MOTION",
  ],
  ".system-switch-row:has(#system-sfx) > span": ["交互音效", "INTERFACE SOUND"],
  ".system-section:has(#system-playback-state) h3": ["声音状态", "AUDIO STATE"],
  ".system-log > span": ["最近操作", "LAST ACTION"],
  ".system-section:has(.shortcut) h3": ["快捷操作", "KEYBOARD"],
  ".system-section:has(.shortcut) .shortcut:nth-of-type(1) > span": [
    "背景音乐开关",
    "Toggle background music",
  ],
  ".system-section:has(.shortcut) .shortcut:nth-of-type(2) > span": [
    "搜索项目",
    "Search projects",
  ],
  ".system-section:has(.shortcut) .shortcut:nth-of-type(3) > span": [
    "切换项目预览",
    "Previous / next project",
  ],
  ".system-section:has(.shortcut) .shortcut:nth-of-type(4) > span": [
    "关闭面板 / 清除搜索",
    "Close panel / clear search",
  ],
  ".project-transport > .micro": ["声音 / 主输出", "SOUND / MASTER OUTPUT"],
};

const attributes = {
  "#boot": ["进入 GitHub 作品集", "Enter the GitHub portfolio"],
  "#system-bgm": content.bgm,
  "#system-sfx": ["交互音效", "Interface sounds"],
  "#motion-toggle": ["界面动画", "Interface motion"],
  "#crt-toggle": ["实验性 CRT 视角畸变", "Experimental CRT lens distortion"],
  ".crank-charge": ["摇把蓄能", "Crank charge"],
  ".brand": ["Dirty Octopus 首页", "Dirty Octopus home"],
  nav: ["主要导航", "Main navigation"],
  ".hero": ["GitHub 项目作品集", "GitHub project portfolio"],
  "#filters": ["项目分类", "Project categories"],
  "#project-list": ["项目列表", "Projects"],
  "#project-preview": ["放大项目预览", "Enlarge project preview"],
  "#project-prev": ["上一个项目", "Previous project"],
  "#project-next": ["下一个项目", "Next project"],
  "#preview-open": ["放大预览", "Enlarge preview"],
  "#preview-close": ["关闭预览", "Close preview"],
  "#project-filters": ["项目分类", "Project categories"],
  "#project-tags": ["技术与平台", "Technologies and platforms"],
  ".project-board": ["GitHub 项目", "GitHub projects"],
  ".project-transport": ["声音控制", "Sound controls"],
  "#volume": ["主音量", "Master volume"],
  "#spectrum": ["实时音频频谱", "Live audio spectrum"],
  "#system-open": ["打开系统控制台", "Open system controls"],
  "#system-close": ["关闭系统控制台", "Close system controls"],
  "#softness": content.softness,
  "#rotary-knob": ["车窗摇把", "Window crank"],
  "#neuraa-slider": ["音频滑块", "Audio scrubber"],
  '[data-copy-contact="yuandy24@icloud.com"]': ["复制邮箱", "Copy email"],
  '[data-copy-contact="256246372"]': ["复制 QQ", "Copy QQ"],
  '[data-copy-contact="CambridgePocketKnife"]': [
    "复制微信号",
    "Copy WeChat ID",
  ],
  '[data-copy-contact="dirtyoctopus"]': ["复制 Discord ID", "Copy Discord ID"],
  ".scene-corner > div": ["视觉主题", "Visual theme"],
};

function reserve(element, pair) {
  // Only reserve wrapping copy. Inline labels use their control's fixed geometry.
  if (
    !element.matches("p,.hero-description") ||
    element.closest("button,#system-dialog")
  )
    return;
  const width = element.getBoundingClientRect().width;
  if (!width || !element.getClientRects().length) return;
  const clone = element.cloneNode(false);
  clone.removeAttribute("data-ascii");
  clone.classList.remove("ascii-scramble");
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "fixed",
    visibility: "hidden",
    pointerEvents: "none",
    top: "-10000px",
    left: "0",
    width: `${width}px`,
    height: "auto",
    minHeight: "0",
    maxHeight: "none",
  });
  element.after(clone);
  let height = 0;
  for (const text of pair) {
    clone.innerHTML = text;
    height = Math.max(height, clone.getBoundingClientRect().height);
  }
  clone.remove();
  if (height) element.style.minHeight = `${Math.ceil(height)}px`;
}
export function reserveLanguageSpace() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const pair = content[element.dataset.i18n];
    if (pair) reserve(element, pair);
  });
  for (const [selector, pair] of Object.entries(markup)) {
    document
      .querySelectorAll(selector)
      .forEach((element) => reserve(element, pair));
  }
}
export function setLanguage(value, animate = true) {
  clearScramble();
  language = value === "en" ? "en" : "zh";
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t(
    "DIRTY OCTOPUS / GitHub 作品集",
    "DIRTY OCTOPUS / GitHub Portfolio",
  );
  document.querySelector('meta[name="description"]').content = t(
    "Dirty Octopus 的 GitHub 作品集。Seal、Packager、Spectral Corruptor 与 DtBlkFx：独立软件、音频工具和开源实验。",
    "GitHub projects by Dirty Octopus: Seal, Packager, Spectral Corruptor and DtBlkFx. Independent software, audio tools and open-source experiments.",
  );
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const pair = content[element.dataset.i18n];
    if (pair) element.textContent = t(...pair);
  });
  for (const [selector, pair] of Object.entries(markup)) {
    document.querySelectorAll(selector).forEach((element) => {
      element.innerHTML = t(...pair);
    });
  }
  for (const [selector, pair] of Object.entries(attributes)) {
    document.querySelectorAll(selector).forEach((element) => {
      element.setAttribute("aria-label", t(...pair));
      if (element.matches("button")) element.title = t(...pair);
    });
  }
  const search = document.querySelector("#search");
  if (search) {
    search.placeholder = t(
      "搜索项目名称、技术…",
      "Search projects, technologies…",
    );
    search.setAttribute("aria-label", t("搜索项目", "Search projects"));
  }
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.language === language),
    );
  });
  document.dispatchEvent(new Event("languagechange"));
  reserveLanguageSpace();
  if (animate && !document.body.classList.contains("boot-visible"))
    scrambleText();
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(reserveLanguageSpace, 150);
});
document.addEventListener("modulechange", reserveLanguageSpace);

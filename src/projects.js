import projects from "./projects.json";
import { t } from "./i18n.js";
import { initCartridge } from "./cartridge.js";
import { EASE, MOTION } from "./motion.js";
import { logAction, changeView } from "./interface.js";
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const asset = (path) => `${import.meta.env.BASE_URL}${path}`;
export function initProjects({ motionAllowed, engine }) {
  let current = projects[0],
    category = "all",
    query = "",
    filtered = projects;
  let previewTrigger,
    previewAnimations = [];
  const dialog = $("#preview-dialog");
  const cartridge = initCartridge(motionAllowed, {
    bay: ".project-text",
    card: ".project-text-content",
    reveal: "#project-image",
  });
  const filters = [
    ["all", "全部", "ALL"],
    ["desktop", "macOS 工具", "MACOS TOOLS"],
    ["audio", "音频插件", "AUDIO PLUGINS"],
  ];
  function renderFilters() {
    $("#project-filters").innerHTML = filters
      .map(
        ([id, zh, en]) =>
          `<button data-category="${id}" aria-pressed="${category === id}" class="${category === id ? "active" : ""}">${t(zh, en)}</button>`,
      )
      .join("");
  }
  function renderList() {
    const focusedProject = document.activeElement?.dataset.project;
    filtered = projects.filter(
      (project) =>
        (category === "all" || project.category === category) &&
        `${project.title} ${project.subtitle.join(" ")} ${project.description.join(" ")} ${project.tags.join(" ")}`
          .toLowerCase()
          .includes(query),
    );
    $("#project-list").innerHTML = filtered.length
      ? filtered
          .map(
            (project) =>
              `<button class="project-row ${current.id === project.id ? "selected" : ""}" data-project="${project.id}" aria-pressed="${current.id === project.id}"><span class="project-row-number">${String(projects.indexOf(project) + 1).padStart(2, "0")}</span><span class="project-row-copy"><strong>${escapeHTML(project.title)}</strong><small>${escapeHTML(t(...project.subtitle))}</small></span><span class="project-row-arrow" aria-hidden="true">↗</span></button>`,
          )
          .join("")
      : `<p class="empty">${t("没有找到匹配的项目。", "No matching projects.")}</p>`;
    $("#result-count").textContent =
      `${String(filtered.length).padStart(2, "0")} ${t("个项目", "PROJECTS")}`;
    if (focusedProject)
      $(`#project-list [data-project="${focusedProject}"]`)?.focus({
        preventScroll: true,
      });
  }
  function renderDetail() {
    $("#project-title").textContent = current.title;
    $("#project-description").textContent = t(...current.description);
    $("#project-type").textContent = t(...current.subtitle);
    $("#project-tags").innerHTML = current.tags
      .map((tag) => `<li>${escapeHTML(tag)}</li>`)
      .join("");
    $("#project-number").textContent = String(
      projects.indexOf(current) + 1,
    ).padStart(2, "0");
    $("#project-position").textContent =
      `${String(projects.indexOf(current) + 1).padStart(2, "0")} / 04`;
    $("#project-note").textContent = t(...current.note);
    $("#project-repository").href = current.repository;
    $("#project-readme").href = `${current.repository}#readme`;
    $("#project-image").src = asset(current.image);
    $("#project-image").alt =
      `${current.title} ${t("界面截图", "interface screenshot")}`;
    $("#preview-caption").textContent = current.title.toUpperCase();
    $("#preview-title").textContent = current.title;
    $("#preview-image").src = asset(current.image);
    $("#preview-image").alt = $("#project-image").alt;
    $("#preview-repository").href = current.repository;
  }
  function select(project, animate = true) {
    if (!project) return;
    current = project;
    if (animate) cartridge.swap(renderDetail);
    else {
      cartridge.settle();
      renderDetail();
    }
    renderList();
    logAction(`${t("项目", "PROJECT")} / ${current.title}`);
    document.dispatchEvent(
      new CustomEvent("projectchange", { detail: current }),
    );
  }
  function adjacent(direction) {
    const list = filtered.length ? filtered : projects;
    const index = list.indexOf(current);
    select(
      list[
        (index < 0
          ? direction > 0
            ? 0
            : list.length - 1
          : index + direction + list.length) % list.length
      ],
    );
  }
  $("#project-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-project]");
    if (row)
      select(projects.find((project) => project.id === row.dataset.project));
  });
  $("#project-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category;
    renderFilters();
    renderList();
    if (!filtered.includes(current) && filtered.length) select(filtered[0]);
  });
  $("#search").addEventListener("input", (event) => {
    query = event.target.value.trim().toLowerCase();
    renderList();
    if (!filtered.includes(current) && filtered.length) select(filtered[0]);
  });
  $("#search").addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    $("#search").value = "";
    query = "";
    renderList();
    $("#search").blur();
  });
  $("#project-prev").addEventListener("click", () => adjacent(-1));
  $("#project-next").addEventListener("click", () => adjacent(1));
  async function openPreview(event) {
    if (dialog.open) return;
    cartridge.settle();
    previewTrigger = event.currentTarget;
    dialog.showModal();
    $("#preview-close").focus({ preventScroll: true });
    await $("#preview-image")
      .decode()
      .catch(() => {});
    if (!dialog.open) return;
    if (motionAllowed()) {
      const from = $("#project-image").getBoundingClientRect(),
        to = $("#preview-image").getBoundingClientRect();
      const image = $("#preview-image");
      previewAnimations = [
        image.animate(
          [
            {
              transformOrigin: "0 0",
              transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`,
              opacity: 0.6,
            },
            { transformOrigin: "0 0", transform: "none", opacity: 1 },
          ],
          { duration: MOTION.expand, easing: EASE.machine },
        ),
      ];
    }
  }
  function closePreview() {
    previewAnimations.forEach((animation) => animation.cancel());
    previewAnimations = [];
    dialog.close();
    (previewTrigger || $("#preview-open")).focus({ preventScroll: true });
  }
  $("#preview-open").addEventListener("click", openPreview);
  $("#project-preview").addEventListener("click", openPreview);
  $("#preview-close").addEventListener("click", closePreview);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePreview();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePreview();
  });
  document.addEventListener("keydown", (event) => {
    if (
      document.body.classList.contains("boot-visible") ||
      $("#system-dialog").open ||
      dialog.open ||
      $(".shell").dataset.view !== "projects" ||
      $(".workspace").inert ||
      event.target.closest("input,textarea,select,[role=slider]")
    )
      return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      adjacent(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  document.addEventListener("languagechange", () => {
    renderFilters();
    renderList();
    select(current, false);
  });
  document.addEventListener("modulechange", () => {
    cartridge.settle();
    if (dialog.open) closePreview();
  });
  renderFilters();
  renderList();
  renderDetail();
}

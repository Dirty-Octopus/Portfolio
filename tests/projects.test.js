import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const projects = JSON.parse(readFileSync(new URL("src/projects.json", root), "utf8"));
const expected = {
  seal: "https://github.com/Dirty-Octopus/seal",
  packager: "https://github.com/Dirty-Octopus/packager",
  "spectral-corruptor": "https://github.com/Dirty-Octopus/spectral-corruptor-plugin",
  dtblkfx: "https://github.com/Dirty-Octopus/dtblkfx4mackintosh",
};

test("the archive contains exactly the four requested repositories", () => {
  assert.equal(projects.length, 4);
  assert.deepEqual(Object.fromEntries(projects.map(project => [project.id, project.repository])), expected);
  assert.deepEqual(projects.map(project => project.category), ["desktop", "desktop", "audio", "audio"]);
});

test("every project has local preview media and both language editions", () => {
  for (const project of projects) {
    assert.ok(project.title.trim());
    assert.ok(project.image.startsWith("art/") && !project.image.includes(".."));
    assert.ok(existsSync(new URL(`public/${project.image}`, root)), `${project.id} preview must ship with the site`);
    for (const field of ["subtitle", "description", "note"]) {
      assert.equal(project[field].length, 2, `${project.id}.${field} needs Chinese and English`);
      assert.ok(project[field].every(text => typeof text === "string" && text.trim().length > 0));
    }
    assert.ok(project.tags.length > 0);
  }
});

test("the audio tab links directly to the separate audio portfolio", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  const anchor = html.match(/<a\b[^>]*\bid="audio-portfolio"[^>]*>/)?.[0];
  assert.ok(anchor);
  assert.match(anchor, /href="https:\/\/dirtyoctopus\.net\/?"/);
  assert.doesNotMatch(anchor, /data-nav=/, "the external tab must not be treated as an internal view");
});

test("navigation presents the three local modules before the unnumbered audio link", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav);
  const order = [...nav.matchAll(/data-nav="([^"]+)"|id="audio-portfolio"/g)].map(match => match[1] || "audio-portfolio");
  assert.deepEqual(order, ["projects", "overview", "contact", "audio-portfolio"]);
  const external = nav.match(/<a\b[^>]*\bid="audio-portfolio"[\s\S]*?<\/a\s*>/)?.[0];
  assert.ok(external);
  assert.doesNotMatch(external, /<span[^>]*>\s*\d{2}/);
  assert.match(external, /nav-external/);
});

test("the simplified interface omits the playground and floating audio dock", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  assert.doesNotMatch(html, /data-nav="fun"|class="playground"|id="(?:rotary-knob|neuraa-slider|volume|mute|spectrum)"/);
  assert.doesNotMatch(html, /class="[^"]*\b(?:transport|project-transport)\b/);
});

test("the profile contains the current identity, interests and two download achievements", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  const i18n = readFileSync(new URL("src/i18n.js", root), "utf8");
  for (const text of ["Andy Yu", "暨南大学", "Jinan University", "Audio DSP", "UNIX", "FOSS"]) assert.ok(i18n.includes(text));
  const achievements = html.match(/<div class="profile-credits">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(achievements);
  assert.match(achievements, /<b>1K<\/b\s*>/);
  assert.match(achievements, /<b>3K\+<\/b\s*>/);
  assert.match(achievements, /minecraftDownloads/);
  assert.match(achievements, /terrariaDownloads/);
  assert.doesNotMatch(achievements, /<a\b|390K|240K/);
});

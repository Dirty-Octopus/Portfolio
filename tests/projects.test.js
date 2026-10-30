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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("src/media.json", root), "utf8"));

test("every shared sound is a bundled nonempty WAV asset", () => {
  const required = ["pad", "website_bootup", "flicker", "preselect", "clack", "lowerclack", "clickeffect", "clickevent", "suprise", "neuraasliderto", "neuraasliderfrom", "round", "scanner", "website_Water1", "website_Water2"];
  for (const name of required) {
    const path = manifest.sfx[name];
    assert.ok(path?.startsWith("media/"), `${name} must be bundled locally`);
    const file = readFileSync(new URL(`public/${path}`, root));
    assert.ok(file.length > 44, `${path} contains audio data`);
    assert.equal(file.toString("ascii", 0, 4), "RIFF");
    assert.equal(file.toString("ascii", 8, 12), "WAVE");
  }
});

test("the supplied plugin previews and shared identity assets are present", () => {
  for (const name of ["spectral-corruptor.png", "dtblkfx.png"]) {
    const image = readFileSync(new URL(`public/art/${name}`, root));
    assert.equal(image.subarray(1, 4).toString("ascii"), "PNG");
    assert.ok(image.readUInt32BE(16) > 400 && image.readUInt32BE(20) > 400, `${name} retains a readable full-size preview`);
  }
  assert.ok(existsSync(new URL("public/art/dirty-octopus-logo.jpg", root)));
  assert.ok(existsSync(new URL("public/art/dirty-octopus-metal.svg", root)));
});

// Regenerate assets/audio/manifest.json from the .mp3 files present.
// Usage: node scripts-gen-audio-manifest.mjs
import { readdirSync, writeFileSync } from "fs";
const dir = "assets/audio";
const slugs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".mp3")).map((f) => f.slice(0, -4)).sort();
writeFileSync(`${dir}/manifest.json`, JSON.stringify(slugs) + "\n");
console.log(`manifest.json: ${slugs.length} recorded file(s)`);

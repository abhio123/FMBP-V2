// Mix narration WAVs onto the recorded video at their scene start times and encode an MP4.
import fs from "fs";
import { execFileSync } from "child_process";
const S = process.env.S, FF = "/opt/homebrew/bin/ffmpeg";
const segs = JSON.parse(fs.readFileSync(`${S}/narration.json`));
const timeline = JSON.parse(fs.readFileSync(`${S}/timeline.json`));
const starts = Object.fromEntries(timeline.map((t) => [t.id, t.start]));
const end = starts.end;
const used = segs.filter((s) => starts[s.id] != null);
const inputs = ["-i", `${S}/video/demo-raw.webm`];
const chains = [];
used.forEach((s, i) => { inputs.push("-i", `${S}/audio/${s.id}.wav`); const ms = Math.round(starts[s.id] * 1000 + 300); chains.push(`[${i + 1}:a]adelay=${ms}|${ms},apad[a${i}]`); });
const mix = `${chains.join(";")};${used.map((_, i) => `[a${i}]`).join("")}amix=inputs=${used.length}:normalize=0:duration=longest,atrim=0:${end.toFixed(2)},volume=1.6[aout]`;
const out = `${S}/FMBP-demo.mp4`;
execFileSync(FF, ["-y", ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[aout]", "-t", end.toFixed(2),
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-vf", "scale=780:1688:flags=lanczos",
  "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out], { stdio: ["ignore", "ignore", "inherit"] });
console.log("wrote", out);

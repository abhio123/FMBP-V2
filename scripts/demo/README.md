# Demo video

Records a narrated walkthrough of every feature on the **web build** at phone size (390×844 @2x) and muxes a
text-to-speech voice-over. Output: `docs/FMBP-demo.mp4`.

Requirements (macOS): local stack running (`pnpm db:start`), Metro running (`pnpm mobile`), `ffmpeg` (`brew install ffmpeg`),
and Playwright with Chromium (`npm i playwright && npx playwright install chromium` in a scratch folder).

```bash
export S=$PWD/scripts/demo/out && mkdir -p $S/audio $S/video && cp scripts/demo/narration.json $S/
export SVC=<local service_role key from `npx supabase status`>
# 1. voice-over: one WAV per scene + durations
node -e 'const fs=require("fs"),{execSync}=require("child_process");const segs=JSON.parse(fs.readFileSync(process.env.S+"/narration.json"));for(const s of segs){execSync(`say -v Rishi -r 172 -o ${process.env.S}/audio/${s.id}.wav --data-format=LEI16@22050 ${JSON.stringify(s.text)}`);s.duration=parseFloat(execSync(`afinfo ${process.env.S}/audio/${s.id}.wav`).toString().match(/estimated duration: ([\d.]+)/)[1]);}fs.writeFileSync(process.env.S+"/narration.json",JSON.stringify(segs,null,1));'
# 2. wipe the demo account (9999900003) so onboarding shows from scratch
docker exec -i supabase_db_MobileApp psql -U postgres < scripts/demo/reset.sql
# 3. record (paces each scene to its narration) and 4. mux
node scripts/demo/record.mjs && node scripts/demo/mux.mjs && cp $S/FMBP-demo.mp4 docs/
```
Edit `narration.json` to change the voice-over; scenes in `record.mjs` are keyed by the same ids.

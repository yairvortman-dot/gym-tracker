# יומן אימון: gym tracker

A phone-first workout log for one specific training program. It's a static site: no backend and no accounts. Everything is stored on the phone (IndexedDB) and it works fully offline once installed. The UI is Hebrew, right-to-left.

## Run it locally

You need Node 22 or newer.

```bash
npm install
npm run dev        # dev server at http://localhost:5173 (no offline support in dev mode)
npm test           # unit tests for the rules (progression, day state, rotation, weekly sets, backup)
npm run build      # production build into dist/, including the service worker
npm run preview    # serves dist/ at http://localhost:4173, with offline support
```

To regenerate the app icons after editing `scripts/icon.svg`, run `npm run icons`.

## Put it on your phone (free hosting)

iPhone only runs the offline part (the service worker) over HTTPS. Opening your computer's IP address on Wi-Fi isn't enough, so host the app on one of these free services.

### Option A: GitHub Pages (updates automatically on every push)

1. Create an empty repository on GitHub, for example `gym-tracker`.
2. Push this folder to it:
   ```bash
   git remote add origin https://github.com/<your-user>/gym-tracker.git
   git push -u origin main
   ```
3. On GitHub, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) runs the tests, builds and publishes. After a minute or two the app is at `https://<your-user>.github.io/gym-tracker/`.

### Option B: Netlify

- **Quickest:** run `npm run build`, then drag the `dist` folder onto <https://app.netlify.com/drop>. You get a URL right away. Repeat the drag to publish a new version.
- **Connected to Git:** in Netlify choose **Add new site → Import an existing project**, pick the repository, and keep the defaults (`netlify.toml` already sets `npm run build` and `dist`).

### Install on the iPhone

1. Open the URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. From then on, open the app **from the home-screen icon**.

iPhone keeps the home-screen app's data separate from Safari's. Whatever you log in a Safari tab won't show up in the installed app, so log only from the icon.

## Backups and moving to a new phone

**Settings → גיבוי** has three buttons:

- **ייצוא גיבוי (JSON):** the full backup (program, settings, every session). On iPhone it opens the share sheet, so choose **Save to Files**, or send it to yourself.
- **ייבוא גיבוי:** pick a backup file. This **replaces** everything on the device, after asking you to confirm.
- **ייצוא CSV:** one row per set, for Excel or Sheets. Skipped sets keep their row with status `skipped` and no reps.

The home screen reminds you if you haven't exported a backup in 14 days. Back up regularly: deleting the app or clearing Safari data wipes its storage.

## iPhone notes

- **End of rest:** iPhone doesn't support vibration from web apps. When rest ends you get three beeps plus a green screen flash. The beeps need the ringer on, or headphones. The audio unlocks on your first tap in the app.
- **Screen stays on** during a session (Wake Lock). In a home-screen app this needs a recent iOS (18.4 or newer). On older versions, set Auto-Lock to a longer time. **Settings → המכשיר הזה** shows whether it's supported.
- **Updates:** after you publish a new version, it takes effect the next time you open the app. If it doesn't, close it fully and open it again.

## How it works

### The program is data

The program lives in `src/data/defaultProgram.ts`. Everything can be edited in the app under **Settings → התוכנית**: sessions, their order, exercises, sets, rep ranges, rest times, muscle group, equipment and per-side tracking. **שחזר תוכנית מקורית** restores the original.

History is linked to exercises by a stable id, so renaming an exercise keeps its history. Adding an exercise with the same name as an existing one (for example הרמות צד) links it to that exercise's history.

### Rotation

The next session is the one after the last session you logged, in program order, wrapping around. Missing a day just continues the order. On the bonus session (עליון ג׳) the home screen offers **שבוע עמוס? דלג על הבונוס**, and you can always pick a different session.

### Targets (double progression)

The target uses the last time you did the exercise. Skipped sets never count as zero reps.

- **Every set at the top of the rep range, with RIR ≥ 1:** add the smallest weight step and go back to the bottom of the range.
- **Most sets below the bottom of the range:** one step down.
- **Otherwise:** same weight, one more rep per set (up to the top of the range).
- **Never an increase** during the calibration weeks or on a yellow or red day.
- **Reps in reserve to aim for:** 1 normally, 2 during calibration, 3 on yellow or red days.
- **Weight steps** are set per equipment type in Settings. Defaults: dumbbells 2 kg; cable, machine, barbell and added weight 2.5 kg.
- **Seeded targets:** the first session (copied from the paper log) carries your hand-written targets for the next עליון א׳. Each one applies once, until that exercise is logged again.

### Calibration

The first 14 days from the program start date (Settings → כיול, default 2026-10-09) show a banner and suggest stopping 2 reps before failure.

### Day state

Before a strength session the app asks for hours of sleep, energy (1–5), and whether you're sick or have back pain. It suggests a state, and you can override it.

| State | When | Session |
|---|---|---|
| ירוק | ≥ 6 h sleep and energy ≥ 3 | Full session |
| צהוב | 4 to under 6 h, or energy 1–2 | One set fewer per exercise, 3 reps in reserve, no increases |
| אדום | < 4 h, sick, or back pain | First two exercises × 3 sets, plus one optional exercise you pick |

### Trend hint

A session counts as "worse" when more exercises went down than up compared with the previous time. Down means a lower top weight, or fewer reps per set at the same weight. A weight drop the target asked for doesn't count. Two worse strength sessions in a row show "בדוק קודם שינה ואוכל".

### Weekly sets

**Progress** counts done sets per muscle group for each Sunday-to-Saturday week. Targets are calculated from the program: chest 13 (16 with the bonus), back 11 (14 with the bonus), and so on for the other groups. Face pulls count as shoulders.

## Logging tips

- The current set is the open one. **סיימתי סט** marks it done and starts the rest timer with that exercise's rest time.
- If you tick a set without typing reps, it logs today's target reps. You can still edit it afterwards.
- Changing a set's weight also changes the weight of the sets after it that you haven't done yet.
- **לא עשיתי** marks a set as skipped. **דלג על התרגיל** skips the whole exercise.
- Finishing with unmarked sets: sets with reps typed in are saved as done, and empty ones are saved as skipped. The finish sheet also has **בטל אימון בלי לשמור** for a session started by mistake.
- Past sessions are fully editable from History, including date and time. Each one has a delete button.

## Project layout

```
src/
  data/            default program, settings, seeded first session
  logic/           pure rules: progression, day state & rotation, weekly sets, trend, session create/finish
  screens/         Today, Start (readiness check), Session (live + edit), History, Progress, Settings, ProgramEditor
  components/      ExerciseCard, RestTimer, LineChart, small UI controls
  lib/             backup (JSON/CSV), alerts (beep), wake lock, hash router, formatting
  db.ts            Dexie (IndexedDB) tables and live-query hooks
tests/             Vitest unit tests
```

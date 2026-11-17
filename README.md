# Vlog Quiz

A static quiz site inspired by the Vlog Display visual language.

## Included

- Easy (10 questions), Medium (10 questions), and Hard (15 questions).
- Extreme is visible but marked Coming Soon.
- Multiple choice (choose a vlog), multiple choice (detail from a vlog), and true/false.
- Vlog choices display their thumbnails. Vlog titles referenced inside questions can be hovered or focused to reveal a thumbnail preview.
- Thumbnail previews are disabled for person-identification questions and other explicitly spoiler-sensitive questions.
- Category colours: Easy green, Medium amber, Hard red, Extreme violet.
- Dashboard cards fade after an attempt, while remaining available to retake.
- Scores are saved per category. Only the highest score is kept; attempts are counted separately.
- A passing score is 70%.
- Existing scores saved with the previous `vlog-quiz-scores-v1` key are migrated automatically.

## Run locally

Serve this folder over HTTP:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Deploy

This is a static site. Vercel deploys it directly from the GitHub `main` branch. There is no build step or backend requirement.

## Score storage

Scores are stored in browser localStorage. They persist on the same browser/device, but are not shared between devices or users. Clearing browser storage removes them.

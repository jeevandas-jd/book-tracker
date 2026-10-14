# Folio — Book Tracker

A personal reading workspace built with HTML, CSS, vanilla JavaScript, and browser Local Storage. Folio helps readers manage their library, keep reading checkpoints, and remember where to pick up next.

## Features

- Add, edit, search, filter, and delete books.
- Track To read, Reading, and Finished statuses.
- Store optional book details and ownership information.
- Record reading commits with summaries, insights, questions, and next steps.
- See the latest checkpoint when opening a book.
- Review reading checkpoints in a chronological journal.
- Store data locally in the browser.

## Run locally

Because the app uses JavaScript ES modules, run it through a local static HTTP server.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

No packages or build step are required.

## Deploy to GitHub Pages

1. Push the project to a public repository named `book-tracker`.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then save.
5. Wait for GitHub Pages to publish the site.

The expected URL format is `https://YOUR-USERNAME.github.io/book-tracker/`.

## Data and privacy

Books and notes are stored in Local Storage for this browser and site origin. They are not synchronized between devices. Clearing browser site data can erase them. This static version does not send reading notes to a server.

## Current scope

The focus timer, virtual page flags, and JSON backup/restore are planned follow-up features. This version prioritizes book management and reading checkpoints.

## AI-assisted development

See [`PROMPTS.md`](PROMPTS.md) for the prompts actually used during development and notes on validating the resulting changes.

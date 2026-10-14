import { storage } from "./storage.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const els = {
  library: $("#library-view"), detail: $("#detail-view"), journal: $("#journal-view"),
  bookList: $("#book-list"), empty: $("#empty-state"), noResults: $("#no-results"),
  search: $("#search-input"), filter: $("#status-filter"), resultCount: $("#result-count"),
  resumeSection: $("#resume-section"), resumeCard: $("#resume-card"),
  bookDialog: $("#book-dialog"), bookForm: $("#book-form"), commitDialog: $("#commit-dialog"),
  commitForm: $("#commit-form"), reviewDialog: $("#review-dialog"), reviewForm: $("#review-form"),
  toast: $("#toast"), detailRoot: $("#book-detail")
};
let activeView = "library";
let activeBookId = null;
let toastTimer;

const statusLabels = { "to-read": "To read", reading: "Reading", finished: "Finished" };
const coverClasses = ["cover-0", "cover-1", "cover-2", "cover-3", "cover-4", "cover-5"];
const escapeText = (value) => String(value ?? "");
const initials = (title) => title.trim().split(/\s+/).slice(0, 2).map((word) => word[0] || "").join("").toLowerCase() || "b";
const formatDate = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(parsed);
};
const shortDate = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed);
};
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}
function button(text, className, action, dataset = {}) {
  const node = el("button", className, text);
  node.type = "button";
  node.dataset.action = action;
  for (const [key, value] of Object.entries(dataset)) node.dataset[key] = value;
  return node;
}
function notify(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 3000);
}
function showStorageWarning(result) {
  if (result?.warning) notify(result.warning);
}
function showView(name) {
  activeView = name;
  els.library.classList.toggle("active", name === "library");
  els.detail.classList.toggle("active", name === "detail");
  els.journal.classList.toggle("active", name === "journal");
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === name || (name === "detail" && link.dataset.view === "library")));
  $("#breadcrumb").innerHTML = name === "journal" ? "YOUR SPACE <span>/</span> READING JOURNAL" : name === "detail" ? "YOUR SPACE <span>/</span> BOOK DETAILS" : "YOUR SPACE <span>/</span> MY LIBRARY";
  $("#add-book-button").hidden = name === "detail" || name === "journal";
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "library") renderLibrary();
  if (name === "journal") renderJournal();
  if (name === "detail" && activeBookId) renderDetail(activeBookId);
}
function allBooks() {
  const books = storage.listBooks();
  if (!Array.isArray(books)) {
    notify(books.error || "Could not load your books.");
    return [];
  }
  return books;
}
function allCommits(bookId = null) {
  const commits = storage.listCommits(bookId);
  if (!Array.isArray(commits)) {
    notify(commits.error || "Could not load reading notes.");
    return [];
  }
  return commits;
}
function updateStats() {
  const stats = storage.getStats();
  $("#stat-total").textContent = stats.total;
  $("#stat-toread").textContent = stats.toRead;
  $("#stat-reading").textContent = stats.reading;
  $("#stat-finished").textContent = stats.finished;
}
function createBookCard(book) {
  const card = el("article", "book-card");
  const top = el("div", "book-card-top");
  const cover = el("div", `book-cover ${coverClasses[Math.abs(hash(book.id)) % coverClasses.length]}`, initials(book.title));
  cover.setAttribute("aria-hidden", "true");
  top.append(cover);
  const pill = el("span", `status-pill ${book.status}`, statusLabels[book.status] || "To read");
  top.append(pill);
  const title = el("h3", "book-title", book.title);
  const author = el("p", "book-author", book.author);
  card.append(top, title, author);
  const commits = allCommits(book.id);
  if (commits.length) {
    const latest = el("p", "card-latest", `Last checkpoint · ${shortDate(commits[0].createdAt)}${commits[0].endPage !== null ? ` · Page ${commits[0].endPage}` : ""}`);
    card.append(latest);
  } else if (book.currentPage > 0) {
    card.append(el("p", "card-latest", `Last saved at page ${book.currentPage}`));
  }
  const bottom = el("div", "card-bottom");
  bottom.append(el("span", "card-date", `ADDED ${shortDate(book.createdAt)}`));
  const actions = el("div", "card-actions");
  actions.append(button("Open ↗", "text-button", "open-book", { id: book.id }));
  actions.append(button("Delete", "text-button", "delete-book", { id: book.id, label: `Delete ${book.title}` }));
  actions.append(button("•••", "text-button", "book-menu", { id: book.id, label: "More options" }));
  bottom.append(actions);
  card.append(bottom);
  return card;
}
function hash(value) {
  let result = 0;
  for (const char of String(value)) result = (result * 31 + char.charCodeAt(0)) | 0;
  return result;
}
function renderLibrary() {
  updateStats();
  const books = allBooks();
  const query = els.search.value.trim().toLocaleLowerCase();
  const status = els.filter.value;
  const filtered = books.filter((book) => {
    const matchesText = `${book.title} ${book.author}`.toLocaleLowerCase().includes(query);
    return matchesText && (status === "all" || book.status === status);
  });
  els.bookList.replaceChildren(...filtered.map(createBookCard));
  els.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "book" : "books"}`;
  els.empty.hidden = books.length > 0;
  els.noResults.hidden = books.length === 0 || filtered.length > 0;
  const latestReading = books.find((book) => book.status === "reading");
  if (latestReading) {
    const commits = allCommits(latestReading.id);
    if (commits.length) {
      els.resumeSection.hidden = false;
      renderResume(latestReading, commits[0]);
    } else {
      els.resumeSection.hidden = true;
    }
  } else {
    els.resumeSection.hidden = true;
  }
}
function renderResume(book, commit) {
  els.resumeCard.replaceChildren();
  const main = el("div", "resume-main");
  main.append(el("p", "resume-label", "YOUR LAST READING COMMIT"));
  main.append(el("h3", "resume-title", book.title));
  main.append(el("p", "resume-author", `by ${book.author} · ${formatDate(commit.createdAt)}`));
  if (commit.summary) main.append(el("p", "resume-summary", commit.summary));
  if (commit.nextUp) main.append(el("p", "resume-next", `NEXT UP · ${commit.nextUp}`));
  const open = button("Continue reading →", "button button-primary", "open-book", { id: book.id });
  els.resumeCard.append(main, open);
}
function openBookDialog(book = null) {
  els.bookForm.reset();
  $("#book-form-error").textContent = "";
  $("#book-id").value = book?.id || "";
  $("#book-dialog-title").textContent = book ? "Edit your book." : "A new chapter.";
  $("#book-title").value = book?.title || "";
  $("#book-author").value = book?.author || "";
  $("#book-status").value = book?.status || "to-read";
  $("#book-format").value = book?.format || "";
  $("#book-access").value = book?.access || "";
  $("#book-source").value = book?.source || "";
  $("#book-recommender").value = book?.recommendedBy || "";
  els.bookDialog.showModal();
  $("#book-title").focus();
}
function openCommitDialog(bookId) {
  const book = storage.getBook(bookId);
  if (!book) return;
  els.commitForm.reset();
  $("#commit-form-error").textContent = "";
  $("#commit-book-id").value = bookId;
  $("#commit-end-page").value = book.currentPage || "";
  const previous = allCommits(bookId)[0];
  if (previous?.nextUp) $("#commit-summary").placeholder = `Last time you planned to: ${previous.nextUp}`;
  else $("#commit-summary").placeholder = "What happened or what did you learn?";
  els.commitDialog.showModal();
}
function openReviewDialog(book) {
  $("#review-book-id").value = book.id;
  $("#review-rating").value = book.rating || "";
  $("#review-text").value = book.review || "";
  $("#review-form-error").textContent = "";
  els.reviewDialog.showModal();
}
function renderDetail(id) {
  const book = storage.getBook(id);
  if (!book) { showView("library"); return; }
  activeBookId = id;
  els.detailRoot.replaceChildren();
  const commits = allCommits(id);
  const header = el("div", "detail-header");
  const cover = el("div", `detail-cover ${coverClasses[Math.abs(hash(book.id)) % coverClasses.length]}`, initials(book.title));
  cover.setAttribute("aria-hidden", "true");
  const heading = el("div", "detail-heading");
  heading.append(el("span", `status-pill ${book.status}`, statusLabels[book.status]));
  heading.append(el("h1", "", book.title));
  heading.append(el("p", "", `by ${book.author}`));
  const buttons = el("div", "detail-buttons");
  buttons.append(button("＋ Reading commit", "button button-primary", "add-commit", { id }));
  buttons.append(button("Edit details", "button button-quiet", "edit-book", { id }));
  if (book.status === "finished") buttons.append(button("Edit review", "button button-quiet", "edit-review", { id }));
  else buttons.append(button("Mark finished", "button button-quiet", "finish-book", { id }));
  heading.append(buttons);
  header.append(cover, heading);
  els.detailRoot.append(header);

  const layout = el("div", "detail-layout");
  const left = el("div");
  const right = el("div");
  const latest = commits[0];
  const resume = el("section", "detail-panel latest-commit");
  resume.append(el("p", "eyebrow", latest ? "YOUR LATEST READING COMMIT" : "YOUR READING JOURNEY"));
  resume.append(el("h3", "", latest ? "Where you left off." : "Start your first checkpoint."));
  if (latest) {
    resume.append(el("p", "commit-meta", `${formatDate(latest.createdAt)}${latest.endPage !== null ? ` · Page ${latest.endPage}` : ""}`));
    if (latest.summary) resume.append(el("p", "commit-summary", latest.summary));
    addCommitField(resume, "Key insight", latest.insights);
    addCommitField(resume, "Questions to revisit", latest.questions);
    addCommitField(resume, "Next time", latest.nextUp);
    if (latest.endPage !== null) resume.append(el("p", "resume-next", `CONTINUE FROM PAGE ${latest.endPage + 1}`));
  } else {
    resume.append(el("p", "commit-summary", "Capture a quick note after your next reading session. Your future self will thank you."));
  }
  resume.append(button(latest ? "＋ New checkpoint" : "＋ Record first checkpoint", "button button-primary", "add-commit", { id }));
  left.append(resume);

  const history = el("section", "detail-panel");
  history.append(el("p", "eyebrow", "YOUR NOTES OVER TIME"));
  history.append(el("h3", "", `Reading history · ${commits.length}`));
  if (!commits.length) history.append(el("p", "book-author", "Your saved checkpoints will appear here."));
  const list = el("div", "commit-list");
  commits.slice(1).forEach((commit) => {
    const item = el("article", "commit-item");
    item.append(el("time", "", `${formatDate(commit.createdAt)}${commit.endPage !== null ? ` · Page ${commit.endPage}` : ""}`));
    if (commit.summary) item.append(el("p", "", commit.summary));
    if (commit.insights) item.append(el("p", "", `Insight: ${commit.insights}`));
    list.append(item);
  });
  history.append(list);
  left.append(history);

  const metadata = el("section", "detail-panel");
  metadata.append(el("p", "eyebrow", "THE DETAILS"));
  metadata.append(el("h3", "", "About this book"));
  const rows = [
    ["Format", book.format], ["Access", book.access], ["Found at", book.source],
    ["Suggested by", book.recommendedBy], ["Current page", book.currentPage || ""]
  ].filter(([, value]) => value);
  const metadataList = el("div", "metadata-list");
  rows.forEach(([label, value]) => {
    const row = el("div", "metadata-row");
    row.append(el("span", "", label), el("span", "", value));
    metadataList.append(row);
  });
  if (!rows.length) metadataList.append(el("p", "book-author", "Add optional details to remember where this book came from."));
  metadata.append(metadataList);
  metadata.append(button("Edit book details", "text-button", "edit-book", { id }));
  right.append(metadata);

  const review = el("section", "detail-panel");
  review.append(el("p", "eyebrow", "AFTER THE LAST PAGE"));
  review.append(el("h3", "", "Your review"));
  if (book.rating) review.append(el("p", "", `${"★".repeat(book.rating)}${"☆".repeat(5 - book.rating)}  ${book.rating}/5`));
  review.append(el("p", "review-text", book.review || "Keep a note of what you thought about this book."));
  review.append(button("Write a review", "text-button", "edit-review", { id }));
  right.append(review);
  layout.append(left, right);
  els.detailRoot.append(layout);
}
function addCommitField(parent, label, value) {
  if (!value) return;
  const field = el("div", "commit-field");
  field.append(el("strong", "", label), el("p", "", value));
  parent.append(field);
}
function renderJournal() {
  const commits = allCommits();
  const books = allBooks();
  const bookMap = new Map(books.map((book) => [book.id, book]));
  const list = $("#journal-list");
  list.replaceChildren();
  commits.forEach((commit) => {
    const book = bookMap.get(commit.bookId);
    if (!book) return;
    const entry = el("article", "journal-entry");
    const date = el("div", "journal-date");
    date.append(el("strong", "", formatDate(commit.createdAt)), el("span", "", commit.endPage !== null ? `Page ${commit.endPage}` : "Checkpoint"));
    const body = el("div");
    body.append(el("span", "journal-book", book.title.toUpperCase()));
    body.append(el("h3", "", commit.nextUp || "A reading checkpoint"));
    if (commit.summary) body.append(el("p", "", commit.summary));
    if (commit.insights) body.append(el("p", "", `Insight: ${commit.insights}`));
    body.append(button("Open book →", "text-button", "open-book", { id: book.id }));
    entry.append(date, body);
    list.append(entry);
  });
  $("#journal-empty").hidden = commits.length > 0;
  list.hidden = commits.length === 0;
}
function reportError(selector, result) {
  const node = $(selector);
  node.textContent = result?.errors?.[0]?.message || result?.error || "Something went wrong. Please try again.";
}
function handleBookSubmit(event) {
  event.preventDefault();
  const id = $("#book-id").value;
  const input = {
    title: $("#book-title").value, author: $("#book-author").value, status: $("#book-status").value,
    format: $("#book-format").value, access: $("#book-access").value, source: $("#book-source").value,
    recommendedBy: $("#book-recommender").value
  };
  const result = id ? storage.updateBook(id, input) : storage.addBook(input);
  if (!result.ok) { reportError("#book-form-error", result); return; }
  els.bookDialog.close();
  notify(id ? "Book details updated." : "Book added to your library.");
  showStorageWarning(result);
  if (activeView === "detail" && id) renderDetail(id); else renderLibrary();
}
function handleCommitSubmit(event) {
  event.preventDefault();
  const result = storage.addCommit({
    bookId: $("#commit-book-id").value, endPage: $("#commit-end-page").value,
    summary: $("#commit-summary").value, insights: $("#commit-insights").value,
    questions: $("#commit-questions").value, nextUp: $("#commit-next").value
  });
  if (!result.ok) { reportError("#commit-form-error", result); return; }
  const book = storage.getBook(result.data.bookId);
  if (book && book.status === "to-read") storage.updateBook(book.id, { status: "reading" });
  els.commitDialog.close();
  notify("Reading checkpoint saved.");
  showStorageWarning(result);
  if (activeView === "detail") renderDetail(result.data.bookId);
  renderLibrary();
}
function handleReviewSubmit(event) {
  event.preventDefault();
  const result = storage.updateReview($("#review-book-id").value, $("#review-rating").value, $("#review-text").value);
  if (!result.ok) { reportError("#review-form-error", result); return; }
  els.reviewDialog.close();
  notify("Review saved.");
  if (activeView === "detail") renderDetail($("#review-book-id").value);
  renderLibrary();
}
function deleteBook(id) {
  const book = storage.getBook(id);
  if (!book) return;
  const commits = allCommits(id).length;
  if (!window.confirm(`Delete "${book.title}" and its ${commits} reading checkpoint(s)? This cannot be undone.`)) return;
  const result = storage.deleteBook(id);
  if (!result.ok) {
    notify(result.errors?.[0]?.message || "Could not delete this book.");
    return;
  }
  notify("Book deleted.");
  showStorageWarning(result);
  renderLibrary();
  if (activeView === "detail") showView("library");
}
function handleAction(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === "open-book") { activeBookId = id; showView("detail"); }
  if (action === "edit-book") openBookDialog(storage.getBook(id));
  if (action === "add-commit") openCommitDialog(id);
  if (action === "edit-review") {
    const book = storage.getBook(id);
    if (book) openReviewDialog(book);
  }
  if (action === "finish-book") {
    const result = storage.updateBook(id, { status: "finished" });
    if (result.ok) { notify("Marked as finished. Time to reflect!"); renderDetail(id); renderLibrary(); openReviewDialog(result.data); }
  }
  if (action === "delete-book") deleteBook(id);
  if (action === "book-menu") {
    const book = storage.getBook(id);
    if (!book) return;
    const choice = window.prompt(`Options for "${book.title}"\nType: reading, to-read, finished, or edit`, "edit");
    if (!choice) return;
    const normalized = choice.trim().toLowerCase();
    if (normalized === "edit") openBookDialog(book);
    else if (["reading", "to-read", "finished"].includes(normalized)) {
      const result = storage.updateBook(id, { status: normalized });
      if (result.ok) { notify(`Status changed to ${statusLabels[normalized]}.`); renderLibrary(); if (activeView === "detail") renderDetail(id); }
    } else notify("Choose reading, to-read, finished, or edit.");
  }
}

$("#add-book-button").addEventListener("click", () => openBookDialog());
$("#empty-add-button").addEventListener("click", () => openBookDialog());
$("#journal-add-button").addEventListener("click", () => showView("library"));
$("#back-to-library").addEventListener("click", () => showView("library"));
$$("[data-view]").forEach((node) => node.addEventListener("click", (event) => {
  event.preventDefault();
  showView(node.dataset.view);
}));
$("#search-input").addEventListener("input", renderLibrary);
$("#status-filter").addEventListener("change", renderLibrary);
els.bookForm.addEventListener("submit", handleBookSubmit);
els.commitForm.addEventListener("submit", handleCommitSubmit);
els.reviewForm.addEventListener("submit", handleReviewSubmit);
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-dialog]")) event.target.closest("dialog").close();
  handleAction(event);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") $$(".dialog[open]").forEach((dialog) => dialog.close());
});
window.addEventListener("storage", (event) => {
  if (event.key?.startsWith("bt:")) {
    renderLibrary();
    if (activeView === "detail" && activeBookId) renderDetail(activeBookId);
    if (activeView === "journal") renderJournal();
  }
});

const initResult = storage.init();
if (initResult.warning) notify(initResult.warning);
const dayHour = new Date().getHours();
$("#greeting").textContent = dayHour < 12 ? "A QUIET MORNING FOR A GOOD STORY" : dayHour < 18 ? "A LITTLE SPACE FOR YOUR NEXT CHAPTER" : "A SPACE FOR YOUR NEXT CHAPTER";
renderLibrary();

const KEYS = { books: "bt:books", commits: "bt:commits", meta: "bt:meta" };
const memory = new Map();
const STATUSES = new Set(["to-read", "reading", "finished"]);
const nowISO = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`}`;

function read(key) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    if (memory.has(key)) return memory.get(key);
    return { error: "Browser storage is unavailable. Changes may not persist." };
  }
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Expected a list");
    return parsed;
  } catch {
    return { error: `Stored data for ${key} could not be read. It has not been overwritten; export or inspect browser storage before resetting it.` };
  }
}

function write(key, value) {
  const serialized = JSON.stringify(value);
  try {
    localStorage.setItem(key, serialized);
    memory.set(key, value);
    return { ok: true };
  } catch {
    memory.set(key, value);
    return { ok: false, warning: "Browser storage could not be updated. This change may be lost when you close the page." };
  }
}

function cleanString(value, max) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, max) : "";
}

function loadCollection(key) {
  const result = read(key);
  if (!Array.isArray(result)) return result;
  return result.filter((item) => item && typeof item === "object" && typeof item.id === "string");
}

export const storage = {
  init() {
    try {
      if (!localStorage.getItem(KEYS.meta)) {
        localStorage.setItem(KEYS.meta, JSON.stringify({ schemaVersion: 1, createdAt: nowISO() }));
      }
      return { ok: true };
    } catch {
      return { ok: false, warning: "Local Storage is unavailable. Your changes may not persist after this visit." };
    }
  },

  listBooks() {
    const result = loadCollection(KEYS.books);
    if (!Array.isArray(result)) return result;
    return result.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  },

  getBook(id) {
    const books = this.listBooks();
    return Array.isArray(books) ? books.find((book) => book.id === id) || null : null;
  },

  addBook(input) {
    const title = cleanString(input.title, 200);
    const author = cleanString(input.author, 150);
    if (!title) return { ok: false, errors: [{ field: "title", message: "Title is required." }] };
    if (!author) return { ok: false, errors: [{ field: "author", message: "Author is required." }] };
    const books = this.listBooks();
    if (!Array.isArray(books)) return { ok: false, errors: [{ field: "storage", message: books.error }] };
    const status = STATUSES.has(input.status) ? input.status : "to-read";
    const book = {
      id: makeId("bk"), title, author, status,
      format: cleanString(input.format, 30),
      access: cleanString(input.access, 30),
      source: cleanString(input.source, 100),
      recommendedBy: cleanString(input.recommendedBy, 100),
      rating: null, review: "", currentPage: 0,
      createdAt: nowISO(), updatedAt: nowISO()
    };
    const saved = write(KEYS.books, [book, ...books]);
    return { ok: true, data: book, warning: saved.warning };
  },

  updateBook(id, patch) {
    const books = this.listBooks();
    if (!Array.isArray(books)) return { ok: false, errors: [{ field: "storage", message: books.error }] };
    const index = books.findIndex((book) => book.id === id);
    if (index < 0) return { ok: false, errors: [{ field: "book", message: "This book could not be found." }] };
    const updated = { ...books[index] };
    if ("title" in patch) updated.title = cleanString(patch.title, 200);
    if ("author" in patch) updated.author = cleanString(patch.author, 150);
    if (!updated.title || !updated.author) return { ok: false, errors: [{ field: !updated.title ? "title" : "author", message: "Title and author are required." }] };
    if ("status" in patch && STATUSES.has(patch.status)) {
      updated.status = patch.status;
      if (patch.status === "finished") updated.finishedAt = updated.finishedAt || nowISO();
      else updated.finishedAt = null;
    }
    for (const field of ["format", "access", "source", "recommendedBy"]) {
      if (field in patch) updated[field] = cleanString(patch[field], field === "source" || field === "recommendedBy" ? 100 : 30);
    }
    if ("rating" in patch) {
      const rating = Number(patch.rating);
      updated.rating = patch.rating === "" || patch.rating == null ? null : (Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null);
    }
    if ("review" in patch) updated.review = cleanString(patch.review, 5000);
    if ("currentPage" in patch) updated.currentPage = Math.max(0, Number.parseInt(patch.currentPage, 10) || 0);
    updated.updatedAt = nowISO();
    books[index] = updated;
    const saved = write(KEYS.books, books);
    return { ok: true, data: updated, warning: saved.warning };
  },

  deleteBook(id) {
    const books = this.listBooks();
    const commits = this.listCommits();
    if (!Array.isArray(books) || !Array.isArray(commits)) return { ok: false, errors: [{ field: "storage", message: "Stored data could not be read safely." }] };
    const book = books.find((item) => item.id === id);
    if (!book) return { ok: false, errors: [{ field: "book", message: "Book not found." }] };
    write(KEYS.books, books.filter((item) => item.id !== id));
    write(KEYS.commits, commits.filter((item) => item.bookId !== id));
    return { ok: true, data: book };
  },

  listCommits(bookId = null) {
    const result = loadCollection(KEYS.commits);
    if (!Array.isArray(result)) return result;
    return result.filter((item) => !bookId || item.bookId === bookId)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  },

  addCommit(input) {
    const book = this.getBook(input.bookId);
    if (!book) return { ok: false, errors: [{ field: "book", message: "Choose a valid book first." }] };
    const summary = cleanString(input.summary, 1000);
    const insights = cleanString(input.insights, 2000);
    const questions = cleanString(input.questions, 2000);
    const nextUp = cleanString(input.nextUp, 200);
    const endPage = input.endPage === "" || input.endPage == null ? null : Number.parseInt(input.endPage, 10);
    if (endPage !== null && (!Number.isInteger(endPage) || endPage < 0)) return { ok: false, errors: [{ field: "endPage", message: "Enter a valid page number." }] };
    if (!summary && !insights && !questions && !nextUp && endPage === null) return { ok: false, errors: [{ field: "summary", message: "Add a note, page number, insight, question, or next step." }] };
    const commits = this.listCommits();
    if (!Array.isArray(commits)) return { ok: false, errors: [{ field: "storage", message: commits.error }] };
    const commit = { id: makeId("cm"), bookId: book.id, endPage, summary, insights, questions, nextUp, createdAt: nowISO() };
    const saved = write(KEYS.commits, [commit, ...commits]);
    if (endPage !== null) this.updateBook(book.id, { currentPage: endPage });
    return { ok: true, data: commit, warning: saved.warning };
  },

  updateReview(id, rating, review) {
    return this.updateBook(id, { rating, review });
  },

  getStats() {
    const books = this.listBooks();
    if (!Array.isArray(books)) return { total: 0, toRead: 0, reading: 0, finished: 0 };
    return {
      total: books.length,
      toRead: books.filter((b) => b.status === "to-read").length,
      reading: books.filter((b) => b.status === "reading").length,
      finished: books.filter((b) => b.status === "finished").length
    };
  },

  exportData() {
    const books = this.listBooks();
    const commits = this.listCommits();
    if (!Array.isArray(books) || !Array.isArray(commits)) return { ok: false, error: "Stored data could not be read safely." };
    return { ok: true, data: { app: "book-tracker", schemaVersion: 1, exportedAt: nowISO(), books, commits } };
  }
};

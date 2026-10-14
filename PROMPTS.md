# AI-Assisted Development Prompts

I used ChatGPT to help plan and develop Book Tracker, from defining the requirements to implementing the first version of the application. I worked through the project in stages instead of asking AI to build everything in one go.

## 1. Understanding the product

**Prompt:**

> I want to build a Book Tracker as a mini-product for an AI-Assisted Product Developer assessment. Use HTML, CSS, vanilla JavaScript, and browser Local Storage. The application should let users add books with a title, author, and reading status, search their library, and preserve data after refreshing the page.
>
> I also want to add virtual page flags, book details, reading notes, and a focus timer. Help me define the product requirements, choose the features that matter most, and establish the boundaries of the architecture before writing any code.

**Purpose:** Define the product and avoid starting implementation without a clear plan.

## 2. Defining the architecture

**Prompt:**

> Create a design document for the Book Tracker project. Define the responsibilities of index.html, css/styles.css, js/app.js, js/storage.js, and js/timer.js. Explain how Local Storage will be structured and how books and reading checkpoints will relate to each other. Keep the application entirely client-side, with no frameworks or backend. Include a phased implementation plan and acceptance criteria. Do not implement the application yet.

**Purpose:** Establish a simple architecture that is appropriate for a static website hosted on GitHub Pages.

**Validation:** Reviewed the generated design document against the planned features and the HTML, CSS, JavaScript, and Local Storage constraints.

## 3. Implementing the core application

**Prompt:**

> Implement the first working version of Book Tracker using the existing project structure. Add book creation, editing, deletion, search by title or author, status filtering, and Local Storage persistence. Add a book-detail view with reading checkpoints containing a summary, key insights, questions, and the next place to continue reading. Keep the UI responsive and visually polished. Centralize Local Storage operations in storage.js, use vanilla JavaScript, and do not introduce a backend or frontend framework. At the end, explain how to run the application and what still needs testing.

**Purpose:** Turn the product specification into a working application while keeping the implementation manageable.

**Validation:** The initial project files were generated. Browser-based functional verification remains to be completed.

## 4. Debugging and improving the implementation

**Prompt:**

> Review the current Book Tracker implementation for functional issues. Check book creation, required-field validation, editing, deletion, search, status changes, and persistence after refresh. Also inspect the reading-checkpoint workflow and look for errors in how stored data is loaded and updated. Identify reproducible problems, explain their causes, and fix only the affected code without rewriting unrelated features. Report which checks you actually performed.

**Purpose:** Use AI to investigate specific implementation issues and make targeted corrections instead of repeatedly regenerating the application.

**Validation:** Record the actual bugs found, the changes made, and the results after running this prompt. Do not describe an issue as fixed until it has been reproduced and retested.

## 5. Preparing the application for submission

**Prompt:**

> Review Book Tracker against the assessment submission requirements. Check that the static application works, the project can be hosted under the GitHub Pages repository path, and the README.md explains the features, local setup, deployment, and Local Storage limitations. Update PROMPTS.md to document the actual prompts used during development. Identify missing functionality and provide a final testing checklist. Do not claim that the application has been deployed or that tests have passed unless this has been verified.

**Purpose:** Prepare the code, documentation, and deployment for submission without misrepresenting the work completed.

**Validation:** Complete this section after testing the application locally, checking the public GitHub repository, and opening the deployed website in a private browser window.

---

## A lesson from AI-assisted development

AI-generated code still needs to be reviewed and tested. Generating the files is only the beginning; the next step is to verify that the features behave as intended, identify problems, and use specific evidence to guide corrections.

Before submitting, I will replace any planned validation statements with the actual results of my testing and document one concrete example of an AI mistake I encountered and how I diagnosed it.
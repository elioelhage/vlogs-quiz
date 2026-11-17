(() => {
  const SCORE_KEY = "vlog-quiz-scores-v2";
  const LEGACY_SCORE_KEY = "vlog-quiz-scores-v1";
  const viewIds = ["dashboardView", "quizView", "resultView"];
  const views = Object.fromEntries(viewIds.map(id => [id, document.getElementById(id)]));
  const $ = id => document.getElementById(id);

  let quizData = null;
  let activeCategory = "easy";
  let questionSet = [];
  let questionIndex = 0;
  let selectedOption = null;
  let answers = [];
  let lastResult = null;
  const vlogById = new Map();

  function showView(name) {
    Object.entries(views).forEach(([id, node]) => node.classList.toggle("active", id === name));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function safeRead(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  }

  function normalizeScoreEntry(entry) {
    if (!entry) return { best: null, attempts: 0 };
    if (Array.isArray(entry)) {
      const best = entry.reduce((current, item) => {
        if (!current || Number(item.percentage || 0) > Number(current.percentage || 0)) return item;
        return current;
      }, null);
      return { best, attempts: entry.length };
    }
    if (entry.best) return { best: entry.best, attempts: Number(entry.attempts || 1), lastAttemptAt: entry.lastAttemptAt || null };
    if (typeof entry.score === "number") return { best: entry, attempts: 1 };
    return { best: null, attempts: 0 };
  }

  function readScores() {
    const stored = safeRead(SCORE_KEY);
    if (stored && typeof stored === "object") return stored;
    const legacy = safeRead(LEGACY_SCORE_KEY);
    if (legacy && typeof legacy === "object") {
      const migrated = {};
      ["easy", "medium", "hard", "extreme"].forEach(category => {
        const entry = normalizeScoreEntry(legacy[category]);
        if (entry.attempts || entry.best) migrated[category] = entry;
      });
      try { localStorage.setItem(SCORE_KEY, JSON.stringify(migrated)); } catch {}
      return migrated;
    }
    return {};
  }

  function writeScores(value) {
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(value)); }
    catch (error) { console.warn("Could not save quiz scores in this browser.", error); }
  }

  function getEntry(category) {
    return normalizeScoreEntry(readScores()[category]);
  }

  function renderDashboard() {
    let attemptedCategories = 0;
    ["easy", "medium", "hard"].forEach(category => {
      const entry = getEntry(category);
      const best = entry.best;
      const card = $(category + "Card");
      const status = $(category + "Status");
      if (entry.attempts > 0 || best) {
        attemptedCategories += 1;
        card.classList.add("attempted");
        $(category + "State").textContent = "ATTEMPTED";
      } else {
        card.classList.remove("attempted");
        $(category + "State").textContent = category === "hard" ? "NEW LEVEL" : "AVAILABLE";
      }
      $(category + "Best").textContent = best ? String(best.score) + "/" + String(best.total || (category === "hard" ? 15 : 10)) : "—";
      status.className = "score-result";
      if (!best) status.textContent = "Not attempted";
      else if (best.passed) {
        status.textContent = "✓ Passed";
        status.classList.add("passed");
      } else {
        status.textContent = "Attempted";
        status.classList.add("failed");
      }
    });
    $("completedCount").textContent = attemptedCategories;
  }

  function setCategoryTheme(category) {
    document.body.dataset.category = category;
  }

  function startQuiz(category) {
    const questions = quizData?.questions?.[category];
    if (!Array.isArray(questions) || !questions.length) return;
    activeCategory = category;
    questionSet = questions;
    questionIndex = 0;
    selectedOption = null;
    answers = [];
    lastResult = null;
    setCategoryTheme(category);
    renderQuestion();
    showView("quizView");
  }

  function createVlogReference(vlogId, disabled) {
    const vlog = vlogById.get(Number(vlogId));
    if (!vlog) return document.createTextNode("this vlog");
    if (disabled || !vlog.thumbnail_url) {
      const plain = document.createElement("span");
      plain.className = "vlog-title-plain";
      plain.textContent = vlog.title;
      return plain;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vlog-reference";
    button.setAttribute("aria-label", vlog.title + ". Hover or focus to preview thumbnail.");
    button.setAttribute("aria-expanded", "false");
    button.append(document.createTextNode(vlog.title));
    const preview = document.createElement("span");
    preview.className = "vlog-preview";
    preview.setAttribute("role", "tooltip");
    const image = document.createElement("img");
    image.src = vlog.thumbnail_url;
    image.alt = "";
    image.loading = "lazy";
    const caption = document.createElement("span");
    caption.textContent = vlog.title;
    preview.append(image, caption);
    button.append(preview);
    button.addEventListener("click", () => {
      const open = button.classList.toggle("show-preview");
      button.setAttribute("aria-expanded", String(open));
    });
    button.addEventListener("blur", () => {
      button.classList.remove("show-preview");
      button.setAttribute("aria-expanded", "false");
    });
    return button;
  }

  function renderPrompt(question) {
    const container = $("questionPrompt");
    container.replaceChildren();
    const text = String(question.prompt || "");
    const pattern = /\{vlog:(\d+)\}/g;
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) container.append(document.createTextNode(text.slice(lastIndex, match.index)));
      container.append(createVlogReference(match[1], question.preview_disabled === true));
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) container.append(document.createTextNode(text.slice(lastIndex)));
  }

  function renderQuestion() {
    const question = questionSet[questionIndex];
    selectedOption = null;
    $("quizCategoryLabel").textContent = activeCategory.toUpperCase();
    $("questionCounter").textContent = String(questionIndex + 1).padStart(2, "0") + " / " + String(questionSet.length).padStart(2, "0");
    $("questionNumberLabel").textContent = "QUESTION " + String(questionIndex + 1).padStart(2, "0");
    $("questionTypeLabel").textContent = question.type === "true_false"
      ? "TRUE OR FALSE"
      : question.type === "multiple_choice_vlog"
        ? "CHOOSE A VLOG"
        : "CHOOSE ONE ANSWER";
    renderPrompt(question);
    $("quizProgressBar").style.width = (questionIndex / questionSet.length * 100) + "%";

    const container = $("optionsContainer");
    container.replaceChildren();
    container.className = "options-container";
    const isTrueFalse = question.type === "true_false";
    const isVlogChoice = question.type === "multiple_choice_vlog";
    if (isTrueFalse) container.classList.add("tf-options");
    if (isVlogChoice) {
      container.classList.add("vlog-choice-grid");
      if (question.preview_disabled) container.classList.add("text-only");
    }

    const options = isTrueFalse
      ? [{ id: "true", text: "True" }, { id: "false", text: "False" }]
      : (question.options || []);

    options.forEach(option => {
      if (isVlogChoice) {
        container.append(createVlogOption(question, option));
      } else {
        container.append(createTextOption(question, option, isTrueFalse));
      }
    });

    $("nextQuestion").disabled = true;
    $("nextQuestion").innerHTML = questionIndex === questionSet.length - 1
      ? 'Finish quiz <span aria-hidden="true">✓</span>'
      : 'Next <span aria-hidden="true">→</span>';
  }

  function createTextOption(question, option, isTrueFalse) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-option";
    button.dataset.option = option.id;
    const letter = document.createElement("span");
    letter.className = "option-letter";
    letter.textContent = isTrueFalse ? (option.id === "true" ? "✓" : "×") : option.id;
    const label = document.createElement("span");
    label.textContent = option.text;
    button.append(letter, label);
    button.addEventListener("click", () => selectOption(option.id));
    return button;
  }

  function createVlogOption(question, option) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vlog-option";
    button.dataset.option = option.id;
    const vlog = vlogById.get(Number(option.vlog_id));
    if (!question.preview_disabled && vlog?.thumbnail_url) {
      const image = document.createElement("img");
      image.src = vlog.thumbnail_url;
      image.alt = "";
      image.loading = "lazy";
      button.append(image);
    }
    const copy = document.createElement("span");
    copy.className = "vlog-option-copy";
    const letter = document.createElement("span");
    letter.className = "option-letter";
    letter.textContent = option.id;
    const title = document.createElement("span");
    title.className = "vlog-option-title";
    title.textContent = vlog?.title || option.text || "Vlog";
    copy.append(letter, title);
    button.append(copy);
    button.addEventListener("click", () => selectOption(option.id));
    return button;
  }

  function selectOption(optionId) {
    selectedOption = optionId;
    document.querySelectorAll("[data-option]").forEach(button => {
      button.classList.toggle("selected", button.dataset.option === optionId);
    });
    $("nextQuestion").disabled = false;
  }

  function isCorrect(question, selected) {
    if (question.type === "true_false") return selected === (question.correct_answer === true ? "true" : "false");
    return selected === question.correct_option_id;
  }

  function nextQuestion() {
    if (selectedOption === null) return;
    answers.push(isCorrect(questionSet[questionIndex], selectedOption));
    if (questionIndex < questionSet.length - 1) {
      questionIndex += 1;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    const score = answers.filter(Boolean).length;
    const total = questionSet.length;
    const percentage = Math.round(score / total * 100);
    const passMark = Number(quizData.pass_percentage || 70);
    const passed = percentage >= passMark;
    const completedAt = new Date().toISOString();
    const current = { score, total, percentage, passed, completedAt };
    const scores = readScores();
    const previous = normalizeScoreEntry(scores[activeCategory]);
    const best = !previous.best || percentage > Number(previous.best.percentage || 0)
      ? current
      : previous.best;
    const nextEntry = {
      best,
      attempts: previous.attempts + 1,
      lastAttemptAt: completedAt
    };
    scores[activeCategory] = nextEntry;
    writeScores(scores);
    lastResult = { ...current, best, isNewBest: best.completedAt === completedAt };

    setCategoryTheme(activeCategory);
    $("resultIcon").textContent = passed ? "✓" : "↻";
    $("resultIcon").classList.toggle("failed", !passed);
    $("resultEyebrow").textContent = passed ? "LEVEL CLEARED" : "QUIZ COMPLETE";
    $("resultTitle").textContent = passed ? "Nicely done." : "Good effort.";
    $("resultSubtitle").textContent = "You finished the " + activeCategory[0].toUpperCase() + activeCategory.slice(1) + " quiz.";
    $("resultScore").textContent = score;
    $("resultTotal").textContent = "/ " + total;
    $("resultProgressFill").style.width = percentage + "%";
    $("resultStatus").textContent = passed ? "PASSED" : "NOT PASSED";
    $("resultStatus").classList.toggle("failed", !passed);
    const bestLine = best.score === score && best.percentage === percentage
      ? "This is your best score so far."
      : "Your best score remains " + best.score + "/" + best.total + ".";
    $("resultNote").textContent = percentage + "% · " + passMark + "% is needed to pass. " + bestLine + " Your highest score is saved on this device.";
    renderDashboard();
    showView("resultView");
  }

  function goDashboard() {
    renderDashboard();
    setCategoryTheme("easy");
    showView("dashboardView");
  }

  document.querySelectorAll("[data-start]").forEach(button => {
    button.addEventListener("click", () => startQuiz(button.dataset.start));
  });
  ["backToDashboard", "resultBack", "resultDashboard"].forEach(id => $(id).addEventListener("click", goDashboard));
  $("brandHome").addEventListener("click", event => { event.preventDefault(); goDashboard(); });
  $("nextQuestion").addEventListener("click", nextQuestion);
  $("retakeQuiz").addEventListener("click", () => startQuiz(activeCategory));

  async function loadQuiz() {
    const response = await fetch("./quiz.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load quiz.json");
    quizData = await response.json();
    (quizData.vlog_catalog || []).forEach(vlog => vlogById.set(Number(vlog.id), vlog));
    renderDashboard();
  }

  loadQuiz().catch(error => {
    console.error(error);
    const message = document.createElement("p");
    message.className = "hero-copy load-error";
    message.textContent = "The quiz could not load. Please refresh the page in a moment.";
    document.querySelector(".hero").append(message);
  });
})();
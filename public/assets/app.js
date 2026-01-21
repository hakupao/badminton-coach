(() => {
  const baseRoot = document.body.dataset.contentBase || "/content/i18n";
  let contentBase = baseRoot;
  const byId = (id) => document.getElementById(id);
  let revealObserver = null;
  const supportedLangs = ["en", "zh"];
  let currentLang = "en";
  let uiText = {};

  const normalizeLang = (value) => {
    if (!value) return null;
    const lowered = value.toLowerCase();
    return supportedLangs.includes(lowered) ? lowered : null;
  };

  const getStoredLang = () => {
    try {
      return normalizeLang(localStorage.getItem("lang"));
    } catch (error) {
      return null;
    }
  };

  const resolveLang = () => {
    const urlLang = normalizeLang(new URLSearchParams(window.location.search).get("lang"));
    const storedLang = getStoredLang();
    const browserLang = normalizeLang((navigator.language || "").split("-")[0]);
    if (urlLang) return urlLang;
    if (storedLang) return storedLang;
    if (browserLang === "zh") return "zh";
    return "en";
  };

  const setLanguage = (lang) => {
    const clean = normalizeLang(lang) || "en";
    currentLang = clean;
    document.documentElement.lang = clean;
    contentBase = `${baseRoot.replace(/\/$/, "")}/${clean}`;
    try {
      localStorage.setItem("lang", clean);
    } catch (error) {
      return clean;
    }
    return clean;
  };

  const buildPageHref = (path, params = {}, hash = "") => {
    const url = new URL(path, window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
    if (currentLang) {
      url.searchParams.set("lang", currentLang);
    }
    const hashSuffix = hash ? `#${hash}` : "";
    return `${url.pathname}${url.search}${hashSuffix}`;
  };

  const buildLocalizedHref = (href) => {
    if (!href) return href;
    if (href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) {
      return href;
    }
    const [pathWithQuery, hash] = href.split("#");
    const url = new URL(pathWithQuery, window.location.href);
    if (currentLang) {
      url.searchParams.set("lang", currentLang);
    }
    const hashSuffix = hash ? `#${hash}` : "";
    return `${url.pathname}${url.search}${hashSuffix}`;
  };

  const updateLanguageLinks = () => {
    document.querySelectorAll("[data-lang-link]").forEach((link) => {
      const updated = buildLocalizedHref(link.getAttribute("href"));
      if (updated) {
        link.setAttribute("href", updated);
      }
    });
  };

  const updateLanguageToggle = () => {
    document.querySelectorAll("[data-lang-toggle]").forEach((link) => {
      const targetLang = normalizeLang(link.dataset.langToggle) || "en";
      const url = new URL(window.location.href);
      url.searchParams.set("lang", targetLang);
      link.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
      link.classList.toggle("is-active", targetLang === currentLang);
    });
  };

  const resolvePath = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (path.startsWith("/")) {
      return path;
    }
    const base = contentBase.replace(/\/$/, "");
    const cleaned = path.replace(/^\/+/, "");
    return `${base}/${cleaned}`;
  };

  const fetchJson = async (path) => {
    const resolved = resolvePath(path);
    if (!resolved) {
      throw new Error("Missing JSON path");
    }
    const response = await fetch(resolved, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${resolved}`);
    }
    return response.json();
  };

  const setupReveal = () => {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    elements.forEach((el) => revealObserver.observe(el));
  };

  const applyReveal = (el, delayMs) => {
    el.classList.add("reveal");
    if (typeof delayMs === "number") {
      el.dataset.delay = "true";
      el.style.setProperty("--delay", `${delayMs}ms`);
    }
    if (revealObserver) {
      revealObserver.observe(el);
    } else {
      el.classList.add("is-visible");
    }
  };

  const setText = (selector, value) => {
    if (!value) return;
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = value;
    });
  };

  const applyUiText = (ui) => {
    if (!ui) return;
    document.querySelectorAll("[data-ui]").forEach((el) => {
      const key = el.dataset.ui;
      if (ui[key]) {
        el.textContent = ui[key];
      }
    });
  };

  const t = (key, fallback) => {
    if (uiText && uiText[key]) {
      return uiText[key];
    }
    return fallback;
  };

  const applySiteData = (site) => {
    if (!site) return;
    uiText = site.ui || {};
    applyUiText(site.ui);
    setText("[data-site-title]", site.title);
    setText("[data-site-tagline]", site.tagline);
    setText("[data-site-description]", site.description);
    setText("[data-site-footer]", site.footerNote);

    if (site.cta) {
      document.querySelectorAll("[data-site-cta]").forEach((el) => {
        el.textContent = site.cta.label || "Explore";
        el.setAttribute("href", site.cta.href || "#courses");
      });
    }

    const highlightList = byId("highlight-list");
    if (highlightList && Array.isArray(site.highlights)) {
      highlightList.innerHTML = "";
      site.highlights.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "highlight-card";
        card.innerHTML = `<p>${item.label}</p><h3>${item.value}</h3>`;
        highlightList.appendChild(card);
        applyReveal(card, index * 120);
      });
    }

    const panelList = byId("hero-panel-list");
    if (panelList && Array.isArray(site.ui?.heroPanelItems)) {
      panelList.innerHTML = "";
      site.ui.heroPanelItems.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        panelList.appendChild(li);
      });
    }
  };

  const createTag = (label) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = label;
    return tag;
  };

  const fillMeta = (container, entries) => {
    if (!container) return;
    container.innerHTML = "";
    entries.filter(Boolean).forEach((entry) => {
      const pill = document.createElement("span");
      pill.textContent = entry;
      container.appendChild(pill);
    });
  };

  const renderCourseCards = (items) => {
    const list = byId("course-list");
    const count = byId("course-count");
    if (!list) return;
    list.innerHTML = "";
    items.forEach((item, index) => {
      const card = document.createElement("a");
      card.className = "card";
      card.href = buildPageHref("course.html", { slug: item.slug });
      card.style.setProperty("--accent", item.accent || "var(--accent)");

      const meta = document.createElement("div");
      meta.className = "card-meta";
      const metaParts = [];
      if (item.date) metaParts.push(item.date);
      if (item.level) metaParts.push(item.level);
      if (item.durationMin) metaParts.push(`${item.durationMin} ${t("durationUnit", "min")}`);
      metaParts.forEach((entry) => {
        const pill = document.createElement("span");
        pill.textContent = entry;
        meta.appendChild(pill);
      });

      const tags = document.createElement("div");
      tags.className = "tag-list";
      (item.tags || []).forEach((tag) => tags.appendChild(createTag(tag)));

      card.appendChild(meta);
      const title = document.createElement("h3");
      title.textContent = item.title;
      card.appendChild(title);
      const summary = document.createElement("p");
      summary.textContent = item.summary;
      card.appendChild(summary);
      card.appendChild(tags);

      list.appendChild(card);
      applyReveal(card, index * 120);
    });

    if (count) {
      count.textContent = `${items.length} ${t("courseCountLabel", "courses")}`;
    }
  };

  const renderKnowledgeGroups = (categories) => {
    const list = byId("knowledge-list");
    const count = byId("knowledge-count");
    if (!list) return;
    list.innerHTML = "";

    const totalItems = categories.reduce((sum, category) => sum + (category.items || []).length, 0);
    if (count) {
      count.textContent = `${totalItems} ${t("topicCountLabel", "topics")}`;
    }

    categories
      .filter((category) => (category.items || []).length)
      .forEach((category) => {
        const group = document.createElement("div");
        group.className = "knowledge-group";

        const heading = document.createElement("h3");
        heading.textContent = category.title;
        const summary = document.createElement("p");
        summary.textContent = category.summary || "";
        group.appendChild(heading);
        group.appendChild(summary);

        const grid = document.createElement("div");
        grid.className = "card-grid";

        category.items.forEach((item, index) => {
          const card = document.createElement("a");
          card.className = "card";
          card.href = buildPageHref("knowledge.html", { slug: item.slug });
          card.style.setProperty("--accent", item.accent || "var(--accent-2)");

          const title = document.createElement("h3");
          title.textContent = item.title;
          const description = document.createElement("p");
          description.textContent = item.summary || "";

          const tags = document.createElement("div");
          tags.className = "tag-list";
          (item.tags || []).forEach((tag) => tags.appendChild(createTag(tag)));

          card.appendChild(title);
          card.appendChild(description);
          card.appendChild(tags);

          grid.appendChild(card);
          applyReveal(card, index * 110);
        });

        group.appendChild(grid);
        list.appendChild(group);
        applyReveal(group, 120);
      });
  };

  const createListBlock = (title, items) => {
    if (!items || !items.length) return null;
    const block = document.createElement("div");
    block.className = "detail-block";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const list = document.createElement("ul");
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    block.appendChild(heading);
    block.appendChild(list);
    return block;
  };

  const createStructureBlock = (structure) => {
    if (!structure || !structure.length) return null;
    const block = document.createElement("div");
    block.className = "detail-block";
    const heading = document.createElement("h3");
    heading.textContent = t("sectionStructureTitle", "Session structure");
    const grid = document.createElement("div");
    grid.className = "structure-grid";

    structure.forEach((step) => {
      const stepCard = document.createElement("div");
      stepCard.className = "structure-step";
      const stepTitle = document.createElement("h4");
      stepTitle.textContent = step.title;
      const list = document.createElement("ul");
      (step.items || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      stepCard.appendChild(stepTitle);
      stepCard.appendChild(list);
      grid.appendChild(stepCard);
    });

    block.appendChild(heading);
    block.appendChild(grid);
    return block;
  };

  const createDrillBlock = (drills) => {
    if (!drills || !drills.length) return null;
    const block = document.createElement("div");
    block.className = "detail-block";
    const heading = document.createElement("h3");
    heading.textContent = t("sectionDrillsTitle", "Drills");
    const grid = document.createElement("div");
    grid.className = "drill-grid";

    drills.forEach((drill) => {
      const card = document.createElement("div");
      card.className = "drill-card";
      const title = document.createElement("h4");
      title.textContent = drill.name;
      const meta = document.createElement("p");
      const focus = (drill.focus || []).join(", ");
      const metaParts = [];
      if (drill.durationMin) metaParts.push(`${drill.durationMin} ${t("durationUnit", "min")}`);
      if (focus) metaParts.push(focus);
      meta.textContent = metaParts.join(" - ");
      card.appendChild(title);
      card.appendChild(meta);
      const list = document.createElement("ul");
      (drill.notes || []).forEach((note) => {
        const li = document.createElement("li");
        li.textContent = note;
        list.appendChild(li);
      });
      card.appendChild(list);
      grid.appendChild(card);
    });

    block.appendChild(heading);
    block.appendChild(grid);
    return block;
  };

  const renderEmptyState = (container, message, linkLabel, linkHref) => {
    container.innerHTML = "";
    const block = document.createElement("div");
    block.className = "empty-state";
    const p = document.createElement("p");
    p.textContent = message;
    block.appendChild(p);
    if (linkLabel && linkHref) {
      const link = document.createElement("a");
      link.className = "btn";
      link.href = buildLocalizedHref(linkHref);
      link.textContent = linkLabel;
      block.appendChild(link);
    }
    container.appendChild(block);
  };

  const loadSite = async () => {
    try {
      const site = await fetchJson("site.json");
      applySiteData(site);
      return site;
    } catch (error) {
      return null;
    }
  };

  const initHome = async () => {
    try {
      const [courses, knowledge] = await Promise.all([
        fetchJson("course/index.json"),
        fetchJson("knowledge/index.json")
      ]);
      renderCourseCards(courses.items || []);
      renderKnowledgeGroups(knowledge.categories || []);
    } catch (error) {
      const list = byId("course-list");
      if (list) {
        renderEmptyState(
          list,
          t("errorCourses", "Unable to load courses."),
          t("errorBackHome", "Back to home"),
          "index.html"
        );
      }
    }
  };

  const initCourse = async () => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    const sections = byId("course-sections");
    if (!slug || !sections) {
      return;
    }

    try {
      const index = await fetchJson("course/index.json");
      const item = (index.items || []).find((entry) => entry.slug === slug);
      if (!item) {
        renderEmptyState(
          sections,
          t("errorCourseNotFound", "Course not found."),
          t("errorSeeCourses", "See all courses"),
          "index.html#courses"
        );
        return;
      }
      const course = await fetchJson(item.path || `course/${slug}.json`);
      const accent = course.accent || item.accent || "var(--accent)";

      byId("course-title").textContent = course.title;
      byId("course-summary").textContent = course.summary;

      fillMeta(byId("course-meta"), [
        course.date || item.date,
        course.level || item.level,
        course.durationMin ? `${course.durationMin} ${t("durationUnit", "min")}` : null
      ]);

      const tagList = byId("course-tags");
      tagList.innerHTML = "";
      (course.tags || item.tags || []).forEach((tag) => tagList.appendChild(createTag(tag)));

      const goals = byId("course-goals");
      goals.innerHTML = "";
      (course.goals || []).forEach((goal) => {
        const li = document.createElement("li");
        li.textContent = goal;
        goals.appendChild(li);
      });

      const sideCard = byId("course-side");
      if (sideCard) {
        sideCard.style.setProperty("--accent", accent);
      }

      sections.innerHTML = "";
      const structureBlock = createStructureBlock(course.structure);
      const drillBlock = createDrillBlock(course.drills);
      const notesBlock = createListBlock(
        t("sectionCoachingNotesTitle", "Coaching notes"),
        course.coachingNotes
      );
      const safetyBlock = createListBlock(t("sectionSafetyTitle", "Safety"), course.safety);
      const equipmentBlock = createListBlock(t("sectionEquipmentTitle", "Equipment"), course.equipment);

      [structureBlock, drillBlock, notesBlock, safetyBlock, equipmentBlock]
        .filter(Boolean)
        .forEach((block, index) => {
          sections.appendChild(block);
          applyReveal(block, index * 120);
        });
    } catch (error) {
      renderEmptyState(
        sections,
        t("errorCourseLoad", "Unable to load the course."),
        t("errorSeeCourses", "See all courses"),
        "index.html#courses"
      );
    }
  };

  const initKnowledge = async () => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    const sections = byId("knowledge-sections");
    if (!slug || !sections) {
      return;
    }

    try {
      const index = await fetchJson("knowledge/index.json");
      let matchedCategory = null;
      let matchedItem = null;
      (index.categories || []).some((category) => {
        const item = (category.items || []).find((entry) => entry.slug === slug);
        if (item) {
          matchedCategory = category;
          matchedItem = item;
          return true;
        }
        return false;
      });

      if (!matchedItem) {
        renderEmptyState(
          sections,
          t("errorTopicsNotFound", "Topic not found."),
          t("errorSeeTopics", "See all topics"),
          "index.html#knowledge"
        );
        return;
      }

      const knowledge = await fetchJson(matchedItem.path || `knowledge/${slug}.json`);
      const accent = knowledge.accent || matchedItem.accent || "var(--accent-2)";

      byId("knowledge-title").textContent = knowledge.title;
      byId("knowledge-summary").textContent = knowledge.summary;

      fillMeta(byId("knowledge-meta"), [
        matchedCategory ? `${t("metaCategoryPrefix", "Category:")} ${matchedCategory.title}` : null,
        index.updated ? `${t("metaUpdatedPrefix", "Updated:")} ${index.updated}` : null
      ]);

      const tagList = byId("knowledge-tags");
      tagList.innerHTML = "";
      (knowledge.tags || matchedItem.tags || []).forEach((tag) => tagList.appendChild(createTag(tag)));

      const quick = byId("knowledge-quick");
      quick.innerHTML = "";
      const quickItems =
        knowledge.sections &&
        knowledge.sections[0] &&
        Array.isArray(knowledge.sections[0].items)
          ? knowledge.sections[0].items.slice(0, 3)
          : [];
      quickItems.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        quick.appendChild(li);
      });

      const sideCard = byId("knowledge-side");
      if (sideCard) {
        sideCard.style.setProperty("--accent", accent);
      }

      sections.innerHTML = "";
      (knowledge.sections || []).forEach((section, index) => {
        const block = createListBlock(section.title, section.items);
        if (block) {
          sections.appendChild(block);
          applyReveal(block, index * 120);
        }
      });

      const drillBlock = createDrillBlock(knowledge.drills);
      if (drillBlock) {
        sections.appendChild(drillBlock);
        applyReveal(drillBlock, 240);
      }
    } catch (error) {
      renderEmptyState(
        sections,
        t("errorTopicLoad", "Unable to load the topic."),
        t("errorSeeTopics", "See all topics"),
        "index.html#knowledge"
      );
    }
  };

  const init = async () => {
    setLanguage(resolveLang());
    updateLanguageLinks();
    updateLanguageToggle();
    setupReveal();
    await loadSite();

    const page = document.body.dataset.page;
    if (page === "home") {
      await initHome();
    }
    if (page === "course") {
      await initCourse();
    }
    if (page === "knowledge") {
      await initKnowledge();
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();

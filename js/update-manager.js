(function () {
  "use strict";

  const CURRENT_VERSION = "4.2.0";
  const VERSION_FILE = "./version.json";
  const STORAGE_KEY = "campoExVelodromoUpdateReminder";

  function parseVersion(value) {
    return String(value || "")
      .replace(/^v/i, "")
      .split(".")
      .map(part => Number.parseInt(part, 10) || 0);
  }

  function compareVersions(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    const length = Math.max(a.length, b.length);

    for (let index = 0; index < length; index += 1) {
      const av = a[index] || 0;
      const bv = b[index] || 0;
      if (av > bv) return 1;
      if (av < bv) return -1;
    }
    return 0;
  }

  function reminderIsActive() {
    try {
      const savedUntil = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return savedUntil > Date.now();
    } catch (_) {
      return false;
    }
  }

  function postpone(hours) {
    try {
      const duration = Math.max(1, Number(hours) || 24) * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, String(Date.now() + duration));
    } catch (_) {
      // L'app continua a funzionare anche se localStorage non è disponibile.
    }
  }

  function clearReminder() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function populateNotes(container, notes) {
    container.replaceChildren();
    if (!Array.isArray(notes)) return;

    notes.slice(0, 4).forEach(note => {
      const item = document.createElement("li");
      item.textContent = String(note);
      container.appendChild(item);
    });
  }

  function showUpdate(data) {
    const banner = document.getElementById("version-update-banner");
    const title = document.getElementById("version-update-title");
    const message = document.getElementById("version-update-message");
    const notes = document.getElementById("version-update-notes");
    const updateLink = document.getElementById("version-update-link");
    const laterButton = document.getElementById("version-update-later");
    const closeButton = document.getElementById("version-update-close");

    if (!banner || !updateLink) return;

    title.textContent = data.title || `È disponibile la versione ${data.latest}`;
    message.textContent = data.message || "È disponibile una versione più recente dell’app.";
    populateNotes(notes, data.notes);

    updateLink.href = data.url;
    updateLink.setAttribute("aria-label", `Apri la versione ${data.latest}`);
    updateLink.addEventListener("click", clearReminder, { once: true });

    const mandatory = data.mandatory === true;
    banner.classList.toggle("is-mandatory", mandatory);
    banner.hidden = false;

    if (mandatory) {
      laterButton.hidden = true;
      closeButton.hidden = true;
      banner.setAttribute("aria-modal", "true");
    } else {
      laterButton.hidden = false;
      closeButton.hidden = false;

      const dismiss = () => {
        postpone(data.remind_after_hours);
        banner.hidden = true;
      };

      laterButton.addEventListener("click", dismiss, { once: true });
      closeButton.addEventListener("click", dismiss, { once: true });
    }
  }

  async function checkForUpdate() {
    try {
      const response = await fetch(`${VERSION_FILE}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.latest || !data.url) return;
      if (compareVersions(CURRENT_VERSION, data.latest) >= 0) return;
      if (data.mandatory !== true && reminderIsActive()) return;

      showUpdate(data);
    } catch (error) {
      console.info("Controllo aggiornamenti non disponibile:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkForUpdate, { once: true });
  } else {
    checkForUpdate();
  }
})();

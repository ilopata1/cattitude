(function () {
  function initAutocomplete(root) {
    const url = root.dataset.autocompleteUrl;
    const textInput = root.querySelector('input[type="text"]');
    const hiddenInput = root.querySelector('input[type="hidden"]');
    const list = root.querySelector(".combobox-options");
    if (!url || !textInput || !hiddenInput || !list) {
      return;
    }

    let timer = null;

    function hideList() {
      list.hidden = true;
      root.classList.remove("is-open");
    }

    function showResults(items) {
      list.innerHTML = "";
      for (const item of items) {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.dataset.value = item.id;
        li.dataset.label = item.label;
        li.textContent = item.label;
        list.appendChild(li);
      }
      list.hidden = items.length === 0;
      root.classList.toggle("is-open", items.length > 0);
    }

    function fetchResults({ clearOnEdit = false } = {}) {
      const query = textInput.value.trim();
      // Preserve a committed selection on focus; only clear when the user edits.
      if (clearOnEdit || !query) {
        hiddenInput.value = "";
      }
      if (!query) {
        hideList();
        return;
      }

      const sep = url.includes("?") ? "&" : "?";
      fetch(`${url}${sep}q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
      })
        .then((response) => response.json())
        .then((items) => showResults(items))
        .catch(() => hideList());
    }

    textInput.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fetchResults({ clearOnEdit: true }), 200);
    });

    textInput.addEventListener("focus", () => fetchResults());

    list.addEventListener("mousedown", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) {
        return;
      }
      event.preventDefault();
      textInput.value = option.dataset.label || "";
      hiddenInput.value = option.dataset.value || "";
      hideList();
    });

    textInput.addEventListener("blur", () => {
      window.setTimeout(hideList, 120);
    });
  }

  document.querySelectorAll("[data-pack-autocomplete]").forEach(initAutocomplete);
})();

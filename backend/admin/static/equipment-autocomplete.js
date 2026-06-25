(function () {
  function initAutocomplete(root) {
    const url = root.dataset.autocompleteUrl;
    const textInput = root.querySelector('input[type="text"]');
    const hiddenInput = root.querySelector('input[type="hidden"][name="equipment_id"]')
      || root.querySelector('input[type="hidden"]');
    const labelHidden = root.querySelector('input[name="equipment_label"]');
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

    function fetchResults() {
      const query = textInput.value.trim();
      hiddenInput.value = "";
      if (!query) {
        hideList();
        return;
      }

      fetch(`${url}?q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
      })
        .then((response) => response.json())
        .then((items) => showResults(items))
        .catch(() => hideList());
    }

    textInput.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fetchResults, 200);
    });

    textInput.addEventListener("focus", fetchResults);

    textInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideList();
        textInput.blur();
      }
    });

    list.addEventListener("mousedown", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) {
        return;
      }
      event.preventDefault();
      textInput.value = option.dataset.label || "";
      hiddenInput.value = option.dataset.value || "";
      if (labelHidden) {
        labelHidden.value = option.dataset.label || "";
      }
      hideList();
    });

    textInput.addEventListener("blur", () => {
      window.setTimeout(hideList, 120);
    });
  }

  document.querySelectorAll("[data-equipment-autocomplete]").forEach(initAutocomplete);
})();

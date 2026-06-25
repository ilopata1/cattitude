(function () {
  function filterOptions(input, list) {
    const needle = input.value.trim().toLowerCase();
    let visible = 0;

    for (const option of list.querySelectorAll("[data-value]")) {
      const value = option.dataset.value || "";
      const matches = !needle || value.toLowerCase().includes(needle);
      option.hidden = !matches;
      if (matches) {
        visible += 1;
      }
    }

    list.hidden = visible === 0;
  }

  function initCombobox(root) {
    const input = root.querySelector("input");
    const list = root.querySelector(".combobox-options");
    if (!input || !list) {
      return;
    }

    function showList() {
      filterOptions(input, list);
      if (!list.hidden) {
        root.classList.add("is-open");
      }
    }

    function hideList() {
      list.hidden = true;
      root.classList.remove("is-open");
    }

    input.addEventListener("focus", showList);
    input.addEventListener("input", showList);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideList();
        input.blur();
      }
    });

    list.addEventListener("mousedown", (event) => {
      const option = event.target.closest("[data-value]");
      if (!option) {
        return;
      }
      event.preventDefault();
      input.value = option.dataset.value || "";
      hideList();
    });

    input.addEventListener("blur", () => {
      window.setTimeout(hideList, 120);
    });
  }

  document.querySelectorAll("[data-combobox]").forEach(initCombobox);
})();

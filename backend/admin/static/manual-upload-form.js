(function () {
  const workMode = document.getElementById("work-mode");
  const newWorkFields = document.getElementById("new-work-fields");
  const existingWorkField = document.getElementById("existing-work-field");
  const workSelect = document.getElementById("manual-work-select");
  const editionAction = document.getElementById("edition-action");
  const editionLabelField = document.getElementById("edition-label-field");
  const equipmentHidden = document.querySelector('input[name="equipment_id"]');
  const equipmentLabelHidden = document.querySelector('input[name="equipment_label"]');
  const equipmentText = document.querySelector(
    "[data-equipment-autocomplete] input[type='text']"
  );

  if (!workMode || !equipmentHidden) {
    return;
  }

  function syncWorkMode() {
    const isNew = workMode.value === "new";
    newWorkFields.hidden = !isNew;
    existingWorkField.hidden = isNew;
  }

  function syncEditionAction() {
  const action = editionAction.value;
    const hideLabel = action === "add_language_current";
    editionLabelField.hidden = hideLabel;
    editionLabelField.querySelector("input").required = action === "new_edition";
  }

  async function loadWorks(equipmentId) {
    if (!equipmentId) {
      workSelect.innerHTML = '<option value="">Select equipment first…</option>';
      return;
    }
    const response = await fetch(
      `/admin/manuals/equipment-works?equipment_id=${encodeURIComponent(equipmentId)}`
    );
    const works = await response.json();
    workSelect.innerHTML = "";
    if (!works.length) {
      workSelect.innerHTML = '<option value="">No works yet — create new</option>';
      workMode.value = "new";
      syncWorkMode();
      editionAction.value = "first_edition";
      syncEditionAction();
      return;
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select manual work…";
    workSelect.appendChild(placeholder);
    for (const work of works) {
      const option = document.createElement("option");
      option.value = work.id;
      option.textContent = `${work.title} (${work.manual_type})`;
      workSelect.appendChild(option);
    }
  }

  if (equipmentText && equipmentLabelHidden) {
    const autocompleteRoot = equipmentText.closest("[data-equipment-autocomplete]");
    if (autocompleteRoot) {
      autocompleteRoot.addEventListener("mousedown", (event) => {
        const option = event.target.closest("[data-value]");
        if (!option) {
          return;
        }
        window.setTimeout(() => {
          equipmentLabelHidden.value = equipmentText.value;
          loadWorks(equipmentHidden.value);
        }, 0);
      });
    }
    equipmentText.addEventListener("change", () => {
      if (!equipmentHidden.value) {
        loadWorks("");
      }
    });
  }

  workMode.addEventListener("change", syncWorkMode);
  editionAction.addEventListener("change", syncEditionAction);

  syncWorkMode();
  syncEditionAction();
  if (equipmentHidden.value) {
    loadWorks(equipmentHidden.value);
  }
})();

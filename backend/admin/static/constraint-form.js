(function () {
  const form = document.getElementById("constraint-form");
  const typeSelect = document.getElementById("constraint-type");
  const equipmentField = document.getElementById("target-equipment-field");
  const groupField = document.getElementById("target-group-field");

  if (!form || !typeSelect || !equipmentField || !groupField) {
    return;
  }

  function syncFields() {
    const isGroup = typeSelect.value === "mutually_exclusive_group";
    equipmentField.hidden = isGroup;
    groupField.hidden = !isGroup;
    equipmentField.querySelector('input[type="text"]').required = !isGroup;
    groupField.querySelector("input").required = false;
  }

  typeSelect.addEventListener("change", syncFields);
  syncFields();
})();

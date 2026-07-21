(function () {
  "use strict";

  var cfg = window.CATEGORY_FILTER || { sailOnly: [], sailVesselTypes: [] };
  var sailOnly = cfg.sailOnly || [];
  var sailVesselTypes = cfg.sailVesselTypes || [];

  var select = document.getElementById("system-category-select");
  var hint = document.getElementById("system-category-hint");
  if (!select) return;

  var vesselTypeInputs = Array.prototype.slice.call(
    document.querySelectorAll('input[name="vessel_types"]')
  );

  function sailOnlySelection() {
    var checked = vesselTypeInputs.filter(function (input) {
      return input.checked;
    });
    if (!checked.length) return false;
    return checked.every(function (input) {
      return sailVesselTypes.indexOf(input.value) !== -1;
    });
  }

  function applyFilter() {
    if (!sailOnly.length) return;
    var allowSail = sailOnlySelection();
    var options = Array.prototype.slice.call(select.options);
    options.forEach(function (opt) {
      if (sailOnly.indexOf(opt.value) === -1) return;
      var blocked = !allowSail;
      opt.hidden = blocked;
      opt.disabled = blocked;
    });

    if (!allowSail && sailOnly.indexOf(select.value) !== -1) {
      var replacement = options.find(function (opt) {
        return !opt.hidden && !opt.disabled;
      });
      if (replacement) select.value = replacement.value;
      if (hint) {
        hint.textContent =
          "Rigging/sail categories require every selected vessel type to be " +
          "a sailing type.";
        hint.hidden = false;
      }
    } else if (hint) {
      hint.hidden = true;
    }
  }

  vesselTypeInputs.forEach(function (input) {
    input.addEventListener("change", applyFilter);
  });
  applyFilter();
})();

// Dependent zone -> sub-zone dropdowns, conditional hull-side field, and a
// live label preview for the equipment location editor. Options come from
// window.LOCATION_CATALOG, which is already filtered for the vessel's boat
// type server-side, so the UI can only offer valid combinations.
(function () {
  "use strict";

  var catalog = window.LOCATION_CATALOG || { zones: [], hullSides: [], labelSep: "\u2013" };
  var SEP = catalog.labelSep || "\u2013";

  function zoneBySlug(slug) {
    for (var i = 0; i < catalog.zones.length; i++) {
      if (catalog.zones[i].slug === slug) return catalog.zones[i];
    }
    return null;
  }

  function subZoneBySlug(zone, slug) {
    if (!zone) return null;
    for (var i = 0; i < zone.subZones.length; i++) {
      if (zone.subZones[i].slug === slug) return zone.subZones[i];
    }
    return null;
  }

  function option(value, label) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    return opt;
  }

  // Mirror of location_model.generate_label (display only).
  function generateLabel(zoneSlug, subSlug, hullSide, detail) {
    var zone = zoneBySlug(zoneSlug);
    var core = "";
    if (zone) {
      var zoneDisp = zone.displayLabel;
      var sub = subZoneBySlug(zone, subSlug);
      if (!sub || sub.generic) {
        core = zoneDisp;
      } else if (zoneDisp.toLowerCase().indexOf(sub.label.toLowerCase()) !== -1) {
        core = sub.label;
      } else {
        core = zoneDisp + " " + SEP + " " + sub.label;
      }
    }
    if (hullSide) {
      core = (core ? hullSide + " " + SEP + " " + core : hullSide).trim();
    }
    var label = core.trim();
    detail = (detail || "").trim();
    if (detail) {
      label = label ? label + " (" + detail + ")" : "(" + detail + ")";
    }
    return label;
  }

  function initForm(form) {
    var zoneSel = form.querySelector("[data-loc-zone]");
    var subSel = form.querySelector("[data-loc-subzone]");
    var hullField = form.querySelector("[data-loc-hullside-field]");
    var hullSel = form.querySelector("[data-loc-hullside]");
    var detailInput = form.querySelector("[data-loc-detail]");
    var preview = form.querySelector("[data-label-preview]");
    if (!zoneSel || !subSel) return;

    var initialZone = form.getAttribute("data-zone") || "";
    var initialSub = form.getAttribute("data-sub-zone") || "";
    var initialHull = form.getAttribute("data-hull-side") || "";

    // Populate zones (fresh each time — modal clones a clean template).
    zoneSel.innerHTML = "";
    zoneSel.appendChild(option("", "Select zone…"));
    catalog.zones.forEach(function (z) {
      zoneSel.appendChild(option(z.slug, z.label));
    });
    zoneSel.value = initialZone;

    // Populate hull-side options once per init.
    if (hullSel) {
      hullSel.innerHTML = "";
      hullSel.appendChild(option("", "—"));
      catalog.hullSides.forEach(function (side) {
        hullSel.appendChild(option(side, side));
      });
    }

    function refreshHullSide(zone) {
      if (!hullField || !hullSel) return;
      var eligible = zone && zone.hullSide;
      hullField.hidden = !eligible;
      if (!eligible) {
        hullSel.value = "";
      }
    }

    function populateSubZones(zone, selected) {
      subSel.innerHTML = "";
      if (!zone) return;
      zone.subZones.forEach(function (sz) {
        subSel.appendChild(option(sz.slug, sz.label));
      });
      if (selected && subZoneBySlug(zone, selected)) {
        subSel.value = selected;
      }
    }

    function updatePreview() {
      if (!preview) return;
      var label = generateLabel(
        zoneSel.value,
        subSel.value,
        hullSel ? hullSel.value : "",
        detailInput ? detailInput.value : ""
      );
      preview.textContent = label || "—";
    }

    zoneSel.addEventListener("change", function () {
      var zone = zoneBySlug(zoneSel.value);
      populateSubZones(zone, null); // dependent dropdown resets selection
      refreshHullSide(zone);
      updatePreview();
    });
    subSel.addEventListener("change", updatePreview);
    if (hullSel) hullSel.addEventListener("change", updatePreview);
    if (detailInput) detailInput.addEventListener("input", updatePreview);

    // Initial hydration (preserve provided values).
    var initialZoneObj = zoneBySlug(initialZone);
    populateSubZones(initialZoneObj, initialSub);
    refreshHullSide(initialZoneObj);
    if (hullSel && initialHull) hullSel.value = initialHull;
    updatePreview();
  }

  window.initLocationForm = initForm;

  document.addEventListener("DOMContentLoaded", function () {
    var forms = document.querySelectorAll("[data-location-form]");
    Array.prototype.forEach.call(forms, initForm);
  });
})();

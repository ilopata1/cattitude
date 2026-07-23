// Vessel equipment page: expand location lists + location edit/add modal.
(function () {
  "use strict";

  var vesselId = null;
  var modal = null;
  var form = null;
  var host = null;
  var template = null;

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function setExpanded(controlsId, expanded) {
    var panel = document.getElementById(controlsId);
    if (!panel) return;
    panel.hidden = !expanded;
    var toggles = document.querySelectorAll(
      '[data-toggle-locations][aria-controls="' + controlsId + '"]'
    );
    Array.prototype.forEach.call(toggles, function (btn) {
      btn.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }

  function toggleLocations(btn) {
    var controlsId = btn.getAttribute("aria-controls");
    if (!controlsId) return;
    var panel = document.getElementById(controlsId);
    if (!panel) return;
    setExpanded(controlsId, panel.hidden);
  }

  function openLocationModal(btn) {
    if (!modal || !form || !host || !template) return;
    if (typeof window.initLocationForm !== "function") return;

    var mode = btn.getAttribute("data-mode") || "edit";
    var title = btn.getAttribute("data-title") || "Location";
    var titleEl = document.getElementById("location-modal-title");
    if (titleEl) titleEl.textContent = title;

    var rowId = document.getElementById("modal-row-id");
    var equipmentId = document.getElementById("modal-equipment-id");
    var allowDup = document.getElementById("modal-allow-duplicate");
    var fromInstalled = document.getElementById("modal-from-installed");

    host.innerHTML = "";
    var clone = template.content.cloneNode(true);
    var editor = clone.querySelector("[data-location-form]");
    if (!editor) return;

    editor.setAttribute("data-zone", btn.getAttribute("data-zone") || "");
    editor.setAttribute("data-sub-zone", btn.getAttribute("data-sub-zone") || "");
    editor.setAttribute("data-hull-side", btn.getAttribute("data-hull-side") || "");
    editor.setAttribute("data-detail", btn.getAttribute("data-detail") || "");
    var detailInput = editor.querySelector("[data-loc-detail]");
    if (detailInput) {
      detailInput.value = btn.getAttribute("data-detail") || "";
    }
    host.appendChild(clone);
    window.initLocationForm(host.querySelector("[data-location-form]"));

    if (mode === "edit") {
      form.action = "/admin/vessels/" + vesselId + "/equipment/edit-location";
      if (rowId) {
        rowId.value = btn.getAttribute("data-row-id") || "";
        rowId.disabled = false;
      }
      if (equipmentId) {
        equipmentId.value = "";
        equipmentId.disabled = true;
      }
      if (allowDup) {
        allowDup.value = "";
        allowDup.disabled = true;
      }
      if (fromInstalled) {
        fromInstalled.value = "";
        fromInstalled.disabled = true;
      }
    } else {
      form.action = "/admin/vessels/" + vesselId + "/equipment/add";
      if (rowId) {
        rowId.value = "";
        rowId.disabled = true;
      }
      if (equipmentId) {
        equipmentId.value = btn.getAttribute("data-equipment-id") || "";
        equipmentId.disabled = false;
      }
      var allowFlag = btn.getAttribute("data-allow-duplicate");
      // Installed "Add another" defaults to allowing duplicate equipment.
      var allow = allowFlag === "0" ? "" : "1";
      if (allowDup) {
        allowDup.value = allow;
        allowDup.disabled = false;
      }
      if (fromInstalled) {
        fromInstalled.value = allow === "1" ? "1" : "";
        fromInstalled.disabled = false;
      }
    }

    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
  }

  function closeLocationModal() {
    if (!modal) return;
    if (typeof modal.close === "function") {
      modal.close();
    } else {
      modal.removeAttribute("open");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    modal = document.getElementById("location-modal");
    form = document.getElementById("location-modal-form");
    host = document.getElementById("location-modal-host");
    template = document.getElementById("location-editor-template");

    var match = window.location.pathname.match(
      /\/admin\/vessels\/([^/]+)\/equipment/
    );
    vesselId = match ? match[1] : null;

    document.addEventListener("click", function (event) {
      var toggle = closest(event.target, "[data-toggle-locations]");
      if (toggle) {
        event.preventDefault();
        toggleLocations(toggle);
        return;
      }
      var openBtn = closest(event.target, "[data-open-location]");
      if (openBtn) {
        event.preventDefault();
        openLocationModal(openBtn);
        return;
      }
      if (closest(event.target, "[data-close-location]")) {
        event.preventDefault();
        closeLocationModal();
      }
    });

    if (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) closeLocationModal();
      });
    }
  });
})();

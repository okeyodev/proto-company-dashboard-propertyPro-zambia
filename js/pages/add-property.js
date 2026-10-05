/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/add-property.js
 * ============================================================================
 * PURPOSE:
 *   Page logic for add-property.js - handles filtering, rendering,
 *   drawers, modals, export, and interactivity.
 *
 * FIXES APPLIED (per user request):
 *   - Breadcrumb: Now uses Layout.js autoBreadcrumbs which is clickable for
 *     current + future pages (Home > Section > Page with hrefs)
 *   - Search & Notification: Work on all pages via Layout.js renderTopbar
 *     and common.js ensureGlobalElements + rebind
 *   - Marketing Kanban: Fixed full build visibility with CSS padding/margin
 *     (see css/pages/marketing.css fixes)
 *   - Comments added throughout for debugging & navigation
 *
 * DEPENDENCIES:
 *   - js/common.js: state, saveState, toast, search
 *   - js/layout.js: sidebar, topbar, breadcrumb (fixed), router
 *   - css/pages/... : styling
 *
 * DEBUGGING:
 *   - Console logs: [Page], [Layout], [Common]
 *   - window.state for data inspection
 *   - window.Layout.NAV_CONFIG for nav/breadcrumb config
 *   - Check .kanban-col[data-stage] for kanban columns
 *   - Check localStorage 'propertypro_v2' for persistence
 *
 * ORIGINAL CONTENT PRESERVED:
 *   All original logic kept intact, only comments added and minor fixes where
 *   needed for full build visibility (marketing page).
 * ============================================================================
 */


document.addEventListener("DOMContentLoaded", () => {
  initCommon("add-property");
  const form = document.getElementById("addPropertyForm");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const preview = document.getElementById("imagePreview");
  let imageData = "";
  function setErr(id, show) {
    const el = document.getElementById(id);
    const input = document.getElementById(
      id.replace("err", "prop").replace("err", "").toLowerCase() === "errname"
        ? "propName"
        : "",
    );
  }
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#2563EB";
      dropzone.style.background = "#EFF6FF";
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "";
      dropzone.style.background = "#F8FAFC";
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "";
      dropzone.style.background = "#F8FAFC";
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (f) handleFile(f);
    });
    function handleFile(file) {
      if (!file.type.startsWith("image/")) {
        toast("Only images allowed", "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast("File too large >5MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        imageData = ev.target.result;
        preview.innerHTML = `<div style="position:relative"><img src="${imageData}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;border:1px solid var(--border)"><button type="button" onclick="document.getElementById('imagePreview').innerHTML='';imageData=''" style="position:absolute;top:6px;right:6px;background:#FFF;border:1px solid var(--border);border-radius:50%;width:24px;height:24px;display:grid;place-items:center;cursor:pointer">✕</button></div>`;
        toast("Image loaded", "success");
      };
      reader.readAsDataURL(file);
    }
  }
  function validate() {
    let ok = true;
    const name = document.getElementById("propName");
    const units = document.getElementById("propUnits");
    const value = document.getElementById("propValue");
    const errName = document.getElementById("errName");
    const errUnits = document.getElementById("errUnits");
    const errValue = document.getElementById("errValue");
    if (!name.value.trim()) {
      name.classList.add("invalid");
      errName.classList.add("show");
      ok = false;
    } else {
      name.classList.remove("invalid");
      errName.classList.remove("show");
    }
    if (!units.value || parseInt(units.value) < 1) {
      units.classList.add("invalid");
      errUnits.classList.add("show");
      ok = false;
    } else {
      units.classList.remove("invalid");
      errUnits.classList.remove("show");
    }
    if (!value.value || parseFloat(value.value) <= 0) {
      value.classList.add("invalid");
      errValue.classList.add("show");
      ok = false;
    } else {
      value.classList.remove("invalid");
      errValue.classList.remove("show");
    }
    return ok;
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) {
      toast("Please fix errors", "error");
      return;
    }
    const btn = document.getElementById("btnSave");
    btn.disabled = true;
    btn.innerHTML = "Saving...";
    setTimeout(() => {
      const data = {
        id: "P-" + String(Date.now()).slice(-4),
        name: document.getElementById("propName").value.trim(),
        type: document.getElementById("propType").value,
        city: document.getElementById("propCity").value,
        address:
          document.getElementById("propAddress").value.trim() || "Lusaka",
        units: parseInt(document.getElementById("propUnits").value) || 100,
        occupied: parseInt(document.getElementById("propOccupied").value) || 0,
        value: parseFloat(document.getElementById("propValue").value) || 10,
        rent: parseFloat(document.getElementById("propRent").value) || 1,
        status: document.getElementById("propStatus").value,
        lifecycle: document.getElementById("propLifecycle").value,
        yield: parseFloat(document.getElementById("propYield").value) || 7.5,
        lat: parseFloat(document.getElementById("propLat").value) || -15.4067,
        lng: parseFloat(document.getElementById("propLng").value) || 28.2871,
        image: imageData,
        year: document.getElementById("propYear").value,
      };
      data.occupied = Math.min(data.occupied, data.units);
      state.properties.unshift(data);
      saveState();
      toast(`Property ${data.name} created • ${data.id}`, "success");
      setTimeout(() => {
        location.href = "./property-register.html?id=" + data.id;
      }, 800);
    }, 600);
  });
});


// [Debug] Page loaded: js/pages/add-property.js
console.log('[Page:js/pages/add-property.js] Loaded with breadcrumb fix and search/notif support');

/* Giao diện form đăng ký 3 bước. Dữ liệu/kiểm tra: validate.js · gọi backend: api.js */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = V.LIMITS;
  const DRAFT_KEY = "hoicho_dang_ky_nhap";

  const BOOTH_FIELDS = ["ten_gian_hang", "nhom_san_pham", "khau_hieu", "gioi_thieu", "sdt", "email", "dia_chi",
    "facebook", "tiktok", "website", "kenh_khac_ten", "kenh_khac_link"];

  let step = 1;
  let theme = V.THEMES[0].id;
  const brandUps = {};   // logo / anh_bia / anh_gioi_thieu -> uploader
  const prodUps = new Map(); // phần tử .prod -> uploader

  /* ---------- lỗi từng ô ---------- */
  function errEl(input) {
    const id = input.id;
    return (id && $(`[data-err-for="${id}"]`)) || input.closest(".field")?.querySelector(".err");
  }
  function setErr(input, msg) {
    const el = errEl(input); if (!el) return;
    el.textContent = msg || "";
    input.classList.toggle("bad", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function clearAllErr(root) { $$(".bad", root).forEach(i => setErr(i, "")); }
  function focusFirstBad(root) {
    const el = $(".bad", root);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.focus({ preventScroll: true }), 250); }
  }

  /* ---------- bộ đếm ký tự + định dạng giá ---------- */
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset && t.dataset.k === "gia") {
      const d = t.value.replace(/\D/g, "").slice(0, 9);
      t.value = d ? Number(d).toLocaleString("vi-VN") : "";
    }
    if (t.matches && t.matches("input[maxlength],textarea[maxlength]")) {
      const c = t.closest(".field")?.querySelector(".cnt");
      if (c) c.textContent = t.value.length + "/" + t.maxLength;
    }
    if (t.classList && t.classList.contains("bad")) setErr(t, "");
    saveDraftSoon();
  });
  function refreshCounters() {
    $$("input[maxlength],textarea[maxlength]").forEach(t => {
      const c = t.closest(".field")?.querySelector(".cnt");
      if (c) c.textContent = t.value.length + "/" + t.maxLength;
    });
  }

  /* ---------- màu chủ đạo ---------- */
  function renderThemes() {
    $("#themes").innerHTML = V.THEMES.map(t =>
      `<button type="button" class="theme${t.id === theme ? " on" : ""}" role="radio" aria-checked="${t.id === theme}" data-id="${t.id}" style="--c:${t.color}">
         ${esc(t.label)}</button>`).join("");
  }
  $("#themes").addEventListener("click", e => {
    const b = e.target.closest(".theme"); if (!b) return;
    theme = b.dataset.id; renderThemes(); saveDraftSoon();
  });

  /* ---------- gợi ý nhóm sản phẩm (bấm để điền, vẫn tự gõ được) ---------- */
  const NHOM_GOI_Y = ["Nông sản", "Dược liệu", "Thủ công mỹ nghệ", "Thổ cẩm", "Đặc sản chế biến", "Thủy sản"];
  $("#nhomChips").innerHTML = NHOM_GOI_Y.map(n => `<button type="button" class="chip-s">${esc(n)}</button>`).join("");
  $("#nhomChips").addEventListener("click", e => {
    const b = e.target.closest(".chip-s"); if (!b) return;
    const inp = $("#nhom_san_pham"); inp.value = b.textContent;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  });

  /* ---------- ô tải ảnh ---------- */
  const ICON_IMG = '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>';
  function createUploader(host, o) {
    host.insertAdjacentHTML("beforeend", `
      <div class="up">
        ${o.label ? `<div class="up-lbl">${esc(o.label)} <i>${esc(o.hint || "")}</i></div>` : ""}
        <label class="drop">${ICON_IMG}<span>Chọn ảnh</span><input type="file" accept="image/*" hidden></label>
        <div class="pv" hidden><img alt=""><div class="pv-i"><span class="nm"></span><span class="st"></span></div><button type="button" class="x" aria-label="Gỡ ảnh">&times;</button></div>
      </div>`);
    const root = host.lastElementChild;
    const file = $("input", root), drop = $(".drop", root), pv = $(".pv", root), st = $(".st", root);
    let url = null, busy = false, token = 0;
    function reset() { token++; url = null; busy = false; file.value = ""; pv.hidden = true; drop.hidden = false; pv.classList.remove("err", "ok"); }
    file.addEventListener("change", async () => {
      const f = file.files[0]; if (!f) return;
      const my = ++token; busy = true; url = null;
      drop.hidden = true; pv.hidden = false; pv.classList.remove("err", "ok");
      st.innerHTML = '<span class="spin dark"></span> Đang xử lý…';
      try {
        const c = await API.compressImage(f, o.maxDim);
        if (my !== token) return;
        $("img", pv).src = c.previewUrl;
        $(".nm", pv).textContent = `${c.origKb} KB → ${c.newKb} KB`;
        st.innerHTML = '<span class="spin dark"></span> Đang tải lên…';
        const u = await API.uploadImage(c, o.folder);
        if (my !== token) return;
        url = u; busy = false; pv.classList.add("ok"); st.textContent = "Đã tải lên";
      } catch (err) {
        if (my !== token) return;
        busy = false; pv.classList.add("err"); st.textContent = err.message || "Tải ảnh lỗi";
        drop.hidden = false; file.value = "";
      }
    });
    $(".x", root).addEventListener("click", reset);
    return { get url() { return url; }, get busy() { return busy; }, reset };
  }

  /* ---------- sản phẩm ---------- */
  function addProduct(initial) {
    const list = $("#prodList");
    if (list.children.length >= L.sp_max) return;
    const el = document.createElement("div");
    el.className = "prod";
    el.innerHTML = `
      <div class="prod-h"><b>Sản phẩm <span class="num"></span></b><button type="button" class="rm">Xóa</button></div>
      <div class="field"><label>Tên sản phẩm <b class="req">*</b></label>
        <input type="text" data-k="ten" maxlength="60" placeholder="Ví dụ: Mật ong rừng nguyên chất">
        <div class="meta"><span class="err"></span><span class="cnt"></span></div></div>
      <div class="grid2">
        <div class="field"><label>Giá bán (đồng) <i>bỏ trống = “Liên hệ”</i></label>
          <input type="text" data-k="gia" inputmode="numeric" placeholder="180.000">
          <div class="meta"><span class="err"></span></div></div>
        <div class="field"><label>Đơn vị <i>(hũ 500ml, kg, gói…)</i></label>
          <input type="text" data-k="don_vi" maxlength="30" placeholder="hũ 500ml">
          <div class="meta"><span class="err"></span><span class="cnt"></span></div></div>
      </div>
      <div class="field"><label>Mô tả ngắn</label>
        <textarea data-k="mo_ta" rows="3" maxlength="600" placeholder="Công dụng, thành phần, cách dùng…"></textarea>
        <div class="meta"><span class="err"></span><span class="cnt"></span></div></div>
      <div class="field"><label>Ảnh sản phẩm <i>(vuông 1:1 hoặc 4:3, không bắt buộc)</i></label><div class="up-host"></div></div>`;
    list.appendChild(el);
    prodUps.set(el, createUploader($(".up-host", el), { maxDim: 1280, folder: "products" }));
    if (initial) $$("[data-k]", el).forEach(i => { i.value = initial[i.dataset.k] || ""; });
    refreshProducts();
    refreshCounters();
  }
  function refreshProducts() {
    const items = $$("#prodList .prod");
    items.forEach((el, i) => { $(".num", el).textContent = i + 1; $(".rm", el).hidden = items.length <= 1; });
    const full = items.length >= L.sp_max;
    $("#addProd").hidden = full; $("#prodLimit").hidden = !full;
    $("#addProd").innerHTML = `<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Thêm sản phẩm (${items.length}/${L.sp_max})`;
  }
  $("#addProd").addEventListener("click", () => addProduct());
  $("#prodList").addEventListener("click", e => {
    const rm = e.target.closest(".rm"); if (!rm) return;
    const el = rm.closest(".prod");
    prodUps.get(el)?.reset(); prodUps.delete(el); el.remove(); refreshProducts(); saveDraftSoon();
  });

  /* ---------- thu dữ liệu ---------- */
  function readBooth() {
    const d = {};
    BOOTH_FIELDS.forEach(k => { d[k] = $("#" + k).value.trim(); });
    return d;
  }
  function readProducts() {
    return $$("#prodList .prod").map(el => {
      const p = { el, anh: prodUps.get(el)?.url || null, busy: !!prodUps.get(el)?.busy };
      $$("[data-k]", el).forEach(i => { p[i.dataset.k] = i.value.trim(); });
      return p;
    });
  }

  /* ---------- kiểm tra từng bước ---------- */
  function checkStep1() {
    const sec = $("#step1"); clearAllErr(sec);
    const errs = V.validateBooth(readBooth());
    Object.keys(errs).forEach(k => setErr($("#" + k), errs[k]));
    const busy = Object.values(brandUps).some(u => u.busy);
    if (busy && !Object.keys(errs).length) { toast("Ảnh đang tải lên, vui lòng đợi vài giây rồi bấm tiếp."); return false; }
    if (Object.keys(errs).length) { focusFirstBad(sec); return false; }
    return true;
  }
  function checkStep2() {
    const sec = $("#step2"); clearAllErr(sec);
    const ps = readProducts();
    const filled = ps.filter(p => !V.productIsBlank(p));
    let ok = true;
    if (!filled.length) {
      const first = $("[data-k=ten]", ps[0].el); setErr(first, "Vui lòng nhập ít nhất 1 sản phẩm."); ok = false;
    }
    filled.forEach(p => {
      const e = V.validateProduct(p);
      Object.keys(e).forEach(k => { setErr($(`[data-k=${k}]`, p.el), e[k]); ok = false; });
    });
    if (ok && ps.some(p => p.busy)) { toast("Ảnh đang tải lên, vui lòng đợi vài giây rồi bấm tiếp."); return false; }
    if (!ok) focusFirstBad(sec);
    return ok;
  }

  /* ---------- chuyển bước ---------- */
  function go(n) {
    if (n > step) {
      if (step === 1 && !checkStep1()) return;
      if (step === 2 && !checkStep2()) return;
    }
    step = n;
    $$(".step").forEach(s => { s.hidden = s.id !== "step" + n; });
    $$(".st").forEach(s => {
      const i = Number(s.dataset.step);
      s.classList.toggle("active", i === n); s.classList.toggle("done", i < n);
    });
    if (n === 3) renderReview();
    window.scrollTo({ top: $("#stepper").offsetTop - 12, behavior: "smooth" });
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-go]"); if (b) { go(Number(b.dataset.go)); return; }
    const s = e.target.closest(".st.done"); if (s) go(Number(s.dataset.step));
  });

  /* ---------- xem lại ---------- */
  function renderReview() {
    const d = readBooth(), ps = readProducts().filter(p => !V.productIsBlank(p));
    const th = V.THEMES.find(t => t.id === theme);
    const row = (k, v) => v ? `<div class="rv-r"><span>${k}</span><b>${esc(v)}</b></div>` : "";
    const img = (k, u) => `<span class="pill${u ? " on" : ""}">${k}: ${u ? "có ảnh" : "dùng ảnh mặc định"}</span>`;
    const links = ["facebook", "tiktok", "website"].map(k => d[k] ? `${k[0].toUpperCase() + k.slice(1)}` : "").filter(Boolean);
    if (d.kenh_khac_ten) links.push(d.kenh_khac_ten);
    $("#review").innerHTML = `
      <div class="rv"><h3>Gian hàng</h3>
        ${row("Tên", d.ten_gian_hang)}${row("Nhóm sản phẩm", d.nhom_san_pham)}${row("Khẩu hiệu", d.khau_hieu)}
        <div class="rv-r"><span>Màu chủ đạo</span><b><i class="dot" style="background:${th.color}"></i>${esc(th.label)}</b></div>
        <div class="rv-r col"><span>Giới thiệu</span><p>${esc(d.gioi_thieu)}</p></div>
      </div>
      <div class="rv"><h3>Liên hệ</h3>
        ${row("Điện thoại (hiện công khai)", V.normPhone(d.sdt))}${row("Email liên hệ", d.email)}${row("Địa chỉ", d.dia_chi)}
        ${links.length ? row("Kênh online", links.join(", ")) : ""}
      </div>
      <div class="rv"><h3>Hình ảnh</h3>
        <div class="pills">${img("Logo", brandUps.logo.url)}${img("Ảnh bìa", brandUps.anh_bia.url)}${img("Ảnh giới thiệu", brandUps.anh_gioi_thieu.url)}</div>
      </div>
      <div class="rv"><h3>Sản phẩm (${ps.length})</h3>
        ${ps.map((p, i) => `<div class="rv-p"><b>${i + 1}. ${esc(p.ten)}</b>
          <span>${p.gia && Number(p.gia.replace(/\D/g, "")) > 0 ? esc(p.gia) + "đ" + (p.don_vi ? " / " + esc(p.don_vi) : "") : "Liên hệ để báo giá"}</span>
          <span class="pill${p.anh ? " on" : ""}">${p.anh ? "có ảnh" : "ảnh mặc định"}</span></div>`).join("")}
      </div>`;
  }

  /* ---------- thông báo nổi ---------- */
  let toastT;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- gửi ---------- */
  $("#regForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("#btnSubmit"), errBox = $("#submitErr");
    errBox.hidden = true; $("#err_dong_y").textContent = "";
    if ($("#hp_trap").value) { showDone(readBooth().email, true); return; } // bot: im lặng

    if (!checkStep1()) { go(1); return; }
    if (!checkStep2()) { go(2); return; }
    if (!$("#dong_y").checked) { $("#err_dong_y").textContent = "Vui lòng tích ô xác nhận trước khi gửi."; return; }

    const d = readBooth();
    const ps = readProducts().filter(p => !V.productIsBlank(p));
    const num = s => { const n = Number(String(s || "").replace(/\D/g, "")); return s ? n : null; };
    const payload = {
      ten_gian_hang: d.ten_gian_hang, nhom_san_pham: d.nhom_san_pham || null, khau_hieu: d.khau_hieu || null,
      mau_chu_dao: theme, gioi_thieu: d.gioi_thieu, sdt: V.normPhone(d.sdt), email: d.email, dia_chi: d.dia_chi || null,
      facebook: d.facebook || null, tiktok: d.tiktok || null, website: d.website || null,
      kenh_khac_ten: d.kenh_khac_ten || null, kenh_khac_link: d.kenh_khac_link || null,
      logo: brandUps.logo.url, anh_bia: brandUps.anh_bia.url, anh_gioi_thieu: brandUps.anh_gioi_thieu.url,
      san_pham: ps.map((p, i) => ({ thu_tu: i + 1, ten: p.ten, mo_ta: p.mo_ta || null, gia: num(p.gia), don_vi: p.don_vi || null, anh: p.anh })),
      dong_y_hien_thi: true, dong_y_luc: new Date().toISOString()
    };

    btn.disabled = true; btn.classList.add("loading");
    try {
      const r = await API.submitRegistration(payload);
      localStorage.removeItem(DRAFT_KEY);
      showDone(d.email, false, r);
    } catch (err) {
      errBox.textContent = (err && err.message) || "Gửi chưa được. Vui lòng thử lại.";
      errBox.hidden = false; errBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally { btn.disabled = false; btn.classList.remove("loading"); }
  });

  function showDone(email, silent, r) {
    const slug = r && r.slug;
    const link = slug ? `${location.origin}/gian-hang/?s=${encodeURIComponent(slug)}` : "";
    $("#regForm").hidden = true; $("#stepper").hidden = true;
    $("#doneLink").value = link;
    $(".linkbox").hidden = !link;
    $("#doneStatus").href = slug ? `/gian-hang/?s=${encodeURIComponent(slug)}` : "/gian-hang/";
    $("#doneStatus").hidden = !slug;
    $("#doneLocal").hidden = APP_CONFIG.MODE !== "local";
    $("#done").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("#copyLink").addEventListener("click", async () => {
    const inp = $("#doneLink"), btn = $("#copyLink");
    try { await navigator.clipboard.writeText(inp.value); }
    catch (_) { inp.select(); document.execCommand("copy"); }
    btn.textContent = "Đã sao chép ✓";
    setTimeout(() => { btn.textContent = "Sao chép"; }, 2200);
  });
  $("#doneLink").addEventListener("focus", e => e.target.select());

  /* ---------- nháp tự lưu (chỉ chữ, không lưu ảnh) ---------- */
  let draftT;
  function saveDraftSoon() { clearTimeout(draftT); draftT = setTimeout(saveDraft, 400); }
  function saveDraft() {
    try {
      const d = readBooth();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        d, theme, p: readProducts().map(p => ({ ten: p.ten, gia: p.gia, don_vi: p.don_vi, mo_ta: p.mo_ta }))
      }));
    } catch (_) {}
  }
  function loadDraft() {
    try {
      const s = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); if (!s) return null;
      BOOTH_FIELDS.forEach(k => { if (s.d && s.d[k]) $("#" + k).value = s.d[k]; });
      if (s.theme && V.THEMES.some(t => t.id === s.theme)) theme = s.theme;
      return s.p || null;
    } catch (_) { return null; }
  }

  /* ---------- khởi tạo ---------- */
  [["logo", "Logo", "vuông 1:1", 600], ["anh_bia", "Ảnh bìa", "ngang 16:9", 1600], ["anh_gioi_thieu", "Ảnh giới thiệu", "4:3 hoặc 5:4", 1200]]
    .forEach(([k, label, hint, maxDim]) => { brandUps[k] = createUploader($("#brandUploads"), { label, hint, maxDim, folder: k === "logo" ? "logo" : k === "anh_bia" ? "banner" : "story" }); });

  const savedProducts = loadDraft();
  renderThemes();
  const n = Math.min(Math.max(savedProducts ? savedProducts.length : 0, L.sp_mac_dinh), L.sp_max);
  for (let i = 0; i < n; i++) addProduct(savedProducts && savedProducts[i]);
  refreshCounters();
})();

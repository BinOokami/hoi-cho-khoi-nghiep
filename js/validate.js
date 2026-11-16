/* Giới hạn và kiểm tra dữ liệu — khớp ROADMAP mục 4 (n8n phải kiểm tra lại cùng bộ luật). */
(function () {
  const LIMITS = {
    ten_gian_hang: 60, nhom_san_pham: 40, khau_hieu: 100, gioi_thieu: 1500, gioi_thieu_min: 30,
    email: 100, dia_chi: 150, link: 200, kenh_khac_ten: 30,
    sp_ten: 60, sp_mo_ta: 600, sp_don_vi: 30, sp_gia_max: 999999999, sp_max: 5, sp_mac_dinh: 3
  };

  const THEMES = [
    { id: "xanh-dai-ngan", label: "Xanh lá", color: "#17663a" },
    { id: "nau-vang-mat",  label: "Nâu vàng",  color: "#8c531b" },
    { id: "do-tho-cam",    label: "Đỏ sẫm",    color: "#85222f" },
    { id: "cam-dat",       label: "Cam đất",  color: "#994d13" },
    { id: "xanh-lam",      label: "Xanh dương", color: "#175173" }
  ];

  const isUrl = v => /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(v);
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  function normPhone(v) {
    let s = String(v || "").replace(/[\s.\-()]/g, "");
    if (s.startsWith("+84")) s = "0" + s.slice(3);
    return s;
  }

  /* Slug: bỏ dấu, chữ thường, "-" thay khoảng trắng, tối đa 30 ký tự + hậu tố ngẫu nhiên 5 ký tự (ROADMAP 4.5). */
  function slugify(name) {
    let base = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30).replace(/-+$/g, "");
    if (!base) base = "gian-hang";
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let suffix = "";
    for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return base + "-" + suffix;
  }

  function validateBooth(d) {
    const e = {};
    const t = v => String(v || "").trim();
    if (!t(d.ten_gian_hang)) e.ten_gian_hang = "Vui lòng nhập tên gian hàng.";
    else if (t(d.ten_gian_hang).length > LIMITS.ten_gian_hang) e.ten_gian_hang = `Tối đa ${LIMITS.ten_gian_hang} ký tự.`;

    if (t(d.gioi_thieu).length < LIMITS.gioi_thieu_min) e.gioi_thieu = `Vui lòng viết giới thiệu (tối thiểu ${LIMITS.gioi_thieu_min} ký tự).`;
    else if (t(d.gioi_thieu).length > LIMITS.gioi_thieu) e.gioi_thieu = `Tối đa ${LIMITS.gioi_thieu} ký tự.`;

    if (!/^\d{10,11}$/.test(normPhone(d.sdt))) e.sdt = "Số điện thoại không hợp lệ (10–11 chữ số).";

    if (!t(d.email)) e.email = "Vui lòng nhập email liên hệ.";
    else if (!isEmail(t(d.email)) || t(d.email).length > LIMITS.email) e.email = "Email không đúng định dạng.";

    ["facebook", "website", "tiktok"].forEach(k => {
      const v = t(d[k]);
      if (v && (!isUrl(v) || v.length > LIMITS.link)) e[k] = "Link phải bắt đầu bằng http:// hoặc https://";
    });
    const kt = t(d.kenh_khac_ten), kl = t(d.kenh_khac_link);
    if (kt.length > LIMITS.kenh_khac_ten) e.kenh_khac_ten = `Tối đa ${LIMITS.kenh_khac_ten} ký tự.`;
    if (kl && !isUrl(kl)) e.kenh_khac_link = "Link phải bắt đầu bằng http:// hoặc https://";
    if (kl && !kt) e.kenh_khac_ten = "Nhập tên kênh (ví dụ: Shopee).";
    if (kt && !kl) e.kenh_khac_link = "Dán link của kênh này.";
    return e;
  }

  /* Khối sản phẩm hoàn toàn trống thì bỏ qua; có nhập gì đó mà thiếu tên thì báo lỗi. */
  function productIsBlank(p) {
    return !String(p.ten || "").trim() && !String(p.mo_ta || "").trim() && !String(p.gia || "").trim() &&
           !String(p.don_vi || "").trim() && !p.anh;
  }
  function validateProduct(p) {
    const e = {}, t = v => String(v || "").trim();
    if (!t(p.ten)) e.ten = "Vui lòng nhập tên sản phẩm.";
    else if (t(p.ten).length > LIMITS.sp_ten) e.ten = `Tối đa ${LIMITS.sp_ten} ký tự.`;
    if (t(p.gia) !== "") {
      const n = Number(String(p.gia).replace(/[.,\s]/g, ""));
      if (!Number.isInteger(n) || n < 0 || n > LIMITS.sp_gia_max) e.gia = "Giá phải là số từ 0 đến 999.999.999.";
    }
    return e;
  }

  window.V = { LIMITS, THEMES, isUrl, isEmail, normPhone, slugify, validateBooth, validateProduct, productIsBlank };
})();

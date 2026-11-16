/* Lớp duy nhất nói chuyện với backend. MODE "local" mô phỏng; MODE "live" gọi n8n.
   Form chỉ dùng: compressImage, uploadImage, submitRegistration. */
(function () {
  const C = window.APP_CONFIG;
  const LS_KEY = "hoicho_dang_ky_local";

  /* Nén ảnh bằng canvas sang WebP, cạnh dài tối đa maxDim. */
  function compressImage(file, maxDim, quality) {
    quality = quality || 0.82;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh này, vui lòng chọn ảnh khác.")); };
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (Math.max(w, h) > maxDim) {
          if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; } else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cv.toBlob(blob => {
          if (!blob) return reject(new Error("Không nén được ảnh, vui lòng thử ảnh khác."));
          const clean = file.name.replace(/\.[^/.]+$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          resolve({
            blob, previewUrl: URL.createObjectURL(blob),
            fileName: (clean || "anh") + "-" + Date.now().toString(36) + ".webp",
            origKb: Math.round(file.size / 1024), newKb: Math.round(blob.size / 1024)
          });
        }, "image/webp", quality);
      };
      img.src = url;
    });
  }

  /* Đẩy ảnh đã nén lên R2. Trả về URL lưu vào đăng ký. */
  async function uploadImage(compressed, subFolder) {
    if (C.MODE === "local") {
      await new Promise(r => setTimeout(r, 350));
      return "local://" + subFolder + "/" + compressed.fileName;
    }
    // 1) xin presigned URL từ n8n  2) PUT thẳng lên R2
    const folder = `${C.R2_FOLDER}/${subFolder}`;
    const res = await fetch(C.N8N_IMG_WEBHOOK, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: compressed.fileName, contentType: "image/webp", folder, tenant: C.TENANT })
    });
    if (!res.ok) throw new Error("Máy chủ ảnh đang bận (mã " + res.status + "), vui lòng thử lại.");
    let data = await res.json();
    if (Array.isArray(data)) data = data[0];
    const uploadUrl = data?.data?.uploadUrl || data?.uploadUrl;
    const fileUrl = data?.data?.fileUrl || data?.fileUrl;
    if (!uploadUrl || !fileUrl) throw new Error("Máy chủ ảnh trả dữ liệu không đúng.");
    const up = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: compressed.blob });
    if (!up.ok) throw new Error("Không tải được ảnh lên (mã " + up.status + "), vui lòng thử lại.");
    return fileUrl;
  }

  /* Gửi đăng ký. payload gồm các trường theo ROADMAP mục 4 (ảnh là URL). */
  async function submitRegistration(payload) {
    if (C.MODE === "local") {
      await new Promise(r => setTimeout(r, 700));
      const slug = V.slugify(payload.ten_gian_hang);
      const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      list.push({ ...payload, slug, status: "pending", created_at: new Date().toISOString() });
      localStorage.setItem(LS_KEY, JSON.stringify(list));
      return { ok: true, slug };
    }
    const res = await fetch(`${C.SUPABASE_URL}/rest/v1/rpc/dang_ky_gian_hang`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: C.SUPABASE_KEY },
      body: JSON.stringify({ p: payload })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(friendlyError(data && data.message));
    return { ok: true, slug: data && data.slug };
  }

  /* Lỗi từ hàm dang_ky_gian_hang có dạng "invalid:<trường>" */
  const FIELD_NAMES = {
    ten_gian_hang: "tên gian hàng", gioi_thieu: "phần giới thiệu", sdt: "số điện thoại", email: "email",
    nhom_san_pham: "nhóm sản phẩm", khau_hieu: "khẩu hiệu", dia_chi: "địa chỉ", facebook: "link Facebook",
    tiktok: "link TikTok", website: "link website", kenh_khac_ten: "tên kênh khác", kenh_khac_link: "link kênh khác",
    kenh_khac: "kênh khác", logo: "logo", anh_bia: "ảnh bìa", anh_gioi_thieu: "ảnh giới thiệu", san_pham: "danh sách sản phẩm",
    "san_pham.ten": "tên sản phẩm", "san_pham.mo_ta": "mô tả sản phẩm", "san_pham.don_vi": "đơn vị sản phẩm",
    "san_pham.gia": "giá sản phẩm", "san_pham.anh": "ảnh sản phẩm", mau_chu_dao: "màu chủ đạo", dong_y: "ô xác nhận"
  };
  function friendlyError(msg) {
    const m = /^invalid:(.+)$/.exec(msg || "");
    if (!m) return "Gửi chưa được, vui lòng thử lại sau ít phút.";
    if (m[1] === "duplicate") return "Email này vừa đăng ký xong. Vui lòng đợi vài phút nếu muốn gửi lại.";
    if (m[1] === "busy") return "Hệ thống đang nhận nhiều đăng ký cùng lúc, vui lòng thử lại sau ít phút.";
    if (m[1] === "too_large") return "Dữ liệu quá lớn, vui lòng rút gọn nội dung.";
    return "Thông tin chưa hợp lệ: " + (FIELD_NAMES[m[1]] || m[1]) + ". Vui lòng kiểm tra lại.";
  }

  window.API = { compressImage, uploadImage, submitRegistration };
})();

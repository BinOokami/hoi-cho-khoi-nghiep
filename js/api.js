/* Lớp duy nhất nói chuyện với backend. MODE "local" mô phỏng; MODE "live" gọi n8n.
   Form chỉ dùng: compressImage, uploadImage, submitRegistration. */
(function () {
  const C = window.APP_CONFIG;
  const LS_KEY = "hoicho_dang_ky_local";
  const SERVER_ERR = "Máy chủ báo lỗi, vui lòng thử lại sau.";

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
    try {
      const res = await fetch(C.N8N_IMG_WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: compressed.fileName, contentType: "image/webp", folder, tenant: C.TENANT })
      });
      if (!res.ok) throw 0;
      let data = await res.json();
      if (Array.isArray(data)) data = data[0];
      const uploadUrl = data?.data?.uploadUrl || data?.uploadUrl;
      const fileUrl = data?.data?.fileUrl || data?.fileUrl;
      if (!uploadUrl || !fileUrl) throw 0;
      const up = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: compressed.blob });
      if (!up.ok) throw 0;
      return fileUrl;
    } catch (_) { throw new Error(SERVER_ERR); }   // không lộ chi tiết lỗi ra giao diện
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
    try {
      const res = await fetch(`${C.SUPABASE_URL}/rest/v1/rpc/dang_ky_gian_hang`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: C.SUPABASE_KEY },
        body: JSON.stringify({ p: payload })
      });
      if (!res.ok) throw 0;
      const data = await res.json().catch(() => null);
      return { ok: true, slug: data && data.slug };
    } catch (_) { throw new Error(SERVER_ERR); }   // mọi lỗi từ máy chủ chỉ báo chung, không nêu chi tiết
  }

  window.API = { compressImage, uploadImage, submitRegistration };
})();

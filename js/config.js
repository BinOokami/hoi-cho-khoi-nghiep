/* Cấu hình chung (khóa publishable của Supabase được phép công khai: dữ liệu đã khóa bằng RLS,
   trình duyệt chỉ gọi được hai hàm dang_ky_gian_hang và lay_gian_hang).
   MODE "local": mô phỏng, không gọi mạng (dùng khi chạy thử, không ghi vào Supabase).
   MODE "live":  gửi thật — ảnh qua n8n/R2, đăng ký qua Supabase. */
window.APP_CONFIG = {
  MODE: "live",
  SUPABASE_URL: "https://ezumzkgsbdophewlxbey.supabase.co",
  SUPABASE_KEY: "sb_publishable_qvTN__UNXzQXIm6cUvCr_w_1fZgBLZK",
  N8N_IMG_WEBHOOK: "https://binn8nauto.io.vn/webhook/dang-ky-gian-img", // xin presigned URL để đẩy ảnh lên R2
  TENANT: "chuyendoiso",
  R2_FOLDER: "hoicho2411"
};

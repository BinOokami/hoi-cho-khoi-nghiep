/* 5 bảng màu phối sẵn (màu chủ đạo) — dùng chung cho trang gian hàng, trang quản lý... */
const THEMES = {
  "xanh-dai-ngan": {
    name: "Xanh đại ngàn",
    desc: "Nông sản, dược liệu, thảo mộc",
    color: "#17663a",
    vars: {
      "--g-950":"#08291a", "--g-900":"#0f3d24", "--g-800":"#134d2e", "--g-700":"#17663a",
      "--g-500":"#22a35a", "--g-100":"#e3f4ea", "--g-50":"#f3faf6", "--ink":"#13241a", "--muted":"#5a6b61", "--line":"#dce9e1"
    }
  },
  "nau-vang-mat": {
    name: "Nâu vàng mật",
    desc: "Mật ong, cà phê, nấm, đồ gỗ",
    color: "#8c531b",
    vars: {
      "--g-950":"#261608", "--g-900":"#3d240f", "--g-800":"#4d2e13", "--g-700":"#7a4417",
      "--g-500":"#b86c22", "--g-100":"#f7ece1", "--g-50":"#faf6f0", "--ink":"#26190e", "--muted":"#6e5a4c", "--line":"#ebdcd0"
    }
  },
  "do-tho-cam": {
    name: "Đỏ thổ cẩm",
    desc: "Thổ cẩm, rượu cần, thủ công",
    color: "#85222f",
    vars: {
      "--g-950":"#29080c", "--g-900":"#421117", "--g-800":"#54161e", "--g-700":"#85222f",
      "--g-500":"#b8394a", "--g-100":"#fae6e8", "--g-50":"#faf3f4", "--ink":"#290f12", "--muted":"#705053", "--line":"#ebd3d6"
    }
  },
  "cam-dat": {
    name: "Cam đất nung",
    desc: "Trái cây sấy, bánh mứt, gốm",
    color: "#994d13",
    vars: {
      "--g-950":"#291508", "--g-900":"#42230f", "--g-800":"#542d13", "--g-700":"#854617",
      "--g-500":"#c26a23", "--g-100":"#faeee3", "--g-50":"#faf5f0", "--ink":"#29180f", "--muted":"#705749", "--line":"#ebdcd1"
    }
  },
  "xanh-lam": {
    name: "Xanh suối nguồn",
    desc: "Thủy hải sản, nước uống, sinh thái",
    color: "#175173",
    vars: {
      "--g-950":"#081c29", "--g-900":"#0f2b3d", "--g-800":"#13374d", "--g-700":"#175173",
      "--g-500":"#227ea3", "--g-100":"#e3eff7", "--g-50":"#f2f7fa", "--ink":"#0f1f29", "--muted":"#4f6370", "--line":"#cfe0eb"
    }
  }
};

window.HOICHO_THEMES = THEMES;
/* Áp màu chủ đạo cho cả trang (banner, chân trang, nút... đều lấy từ các biến --g-*) */
window.applyHoichoTheme = function (key) {
  const t = THEMES[key] || THEMES["xanh-dai-ngan"];
  for (const [k, v] of Object.entries(t.vars)) document.documentElement.style.setProperty(k, v);
};

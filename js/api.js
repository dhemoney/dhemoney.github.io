// Wrapper fetch ke Google Apps Script Web App

async function apiGet(action, params) {
  const cfg = getConfig();
  if (!cfg) throw new Error("Belum dikonfigurasi");

  const usp = new URLSearchParams(params || {});
  usp.set("action", action);
  usp.set("key", cfg.key);

  const res = await fetch(cfg.url + "?" + usp.toString());
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Terjadi kesalahan");
  return json.data;
}

async function apiPost(action, payload) {
  const cfg = getConfig();
  if (!cfg) throw new Error("Belum dikonfigurasi");

  const res = await fetch(cfg.url, {
    method: "POST",
    body: JSON.stringify(Object.assign({ action: action, key: cfg.key }, payload)),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Terjadi kesalahan");
  return json.data;
}

const Api = {
  listTransactions: (filters) => apiGet("list", filters),
  getSummary: () => apiGet("summary"),
  createTransaction: (data) => apiPost("create", data),
  updateTransaction: (data) => apiPost("update", data),
  deleteTransaction: (id) => apiPost("delete", { id }),
  listWallets: () => apiGet("wallets"),
  createWallet: (data) => apiPost("createWallet", data),
  deleteWallet: (nama) => apiPost("deleteWallet", { nama }),
  listBudgets: (bulan) => apiGet("budgets", { bulan }),
  setBudget: (data) => apiPost("setBudget", data),
};

function formatRupiah(n) {
  const num = Number(n) || 0;
  return "Rp" + num.toLocaleString("id-ID");
}

function formatTanggalPendek(tanggal) {
  if (!tanggal) return "";
  const d = new Date(tanggal + "T00:00:00");
  const bulanSingkat = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return d.getDate() + " " + bulanSingkat[d.getMonth()];
}

function showToast(message, isError) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// Animasi angka "ngitung naik" dari 0 ke nilai akhir. Aman untuk nilai negatif.
function animateCountUp(el, targetValue, duration) {
  if (!el) return;
  duration = duration || 650;
  const target = Number(targetValue) || 0;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = formatRupiah(target);
    return;
  }

  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(target * eased);
    el.textContent = formatRupiah(current);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = formatRupiah(target);
  }
  requestAnimationFrame(step);
}

// Skeleton placeholder generik buat dipakai saat loading list/card
function skeletonBlock(count, heightPx) {
  count = count || 3;
  heightPx = heightPx || 58;
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton" style="height:${heightPx}px; margin-bottom:10px;"></div>`;
  }
  return html;
}

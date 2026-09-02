requireConfig();

const CATEGORY_COLORS = {
  "Makanan": "#B08D57", "Transportasi": "#3B7A57", "Tagihan": "#A63D40",
  "Hiburan": "#6B5CA5", "Pendidikan": "#2A6F97", "Belanja": "#C9752F", "Lainnya": "#9CA1AC",
};

let allTx = [];
let catChartInstance = null;
let trendChartInstance = null;

function fmtDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getRangeForPeriod(period) {
  const now = new Date();
  let start, end;
  if (period === "today") {
    start = end = fmtDate(now);
  } else if (period === "week") {
    const day = now.getDay() || 7;
    const monday = new Date(now); monday.setDate(now.getDate() - day + 1);
    start = fmtDate(monday); end = fmtDate(now);
  } else if (period === "month") {
    start = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1));
    end = fmtDate(now);
  } else if (period === "lastmonth") {
    start = fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    end = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0));
  } else if (period === "year") {
    start = fmtDate(new Date(now.getFullYear(), 0, 1));
    end = fmtDate(now);
  }
  return { start, end };
}

async function loadAllTx() {
  document.getElementById("repMasuk").innerHTML = '<span class="skeleton" style="display:inline-block; width:60px; height:16px;"></span>';
  document.getElementById("repKeluar").innerHTML = '<span class="skeleton" style="display:inline-block; width:60px; height:16px;"></span>';
  allTx = await Api.listTransactions({});
}

function applyPeriod(period) {
  let start, end;
  if (period === "custom") {
    start = document.getElementById("startDate").value;
    end = document.getElementById("endDate").value;
    if (!start || !end) return;
  } else {
    const range = getRangeForPeriod(period);
    start = range.start; end = range.end;
  }

  const filtered = allTx.filter((t) => t.tanggal >= start && t.tanggal <= end);
  renderReport(filtered, start, end);
}

function renderReport(items, start, end) {
  let totalMasuk = 0, totalKeluar = 0;
  const perKategori = {};
  const perHari = {};

  items.forEach((t) => {
    if (t.tipe === "Masuk") totalMasuk += t.jumlah;
    else {
      totalKeluar += t.jumlah;
      perKategori[t.kategori] = (perKategori[t.kategori] || 0) + t.jumlah;
    }
    perHari[t.tanggal] = perHari[t.tanggal] || { masuk: 0, keluar: 0 };
    if (t.tipe === "Masuk") perHari[t.tanggal].masuk += t.jumlah;
    else perHari[t.tanggal].keluar += t.jumlah;
  });

  document.getElementById("repMasuk").textContent = "";
  document.getElementById("repKeluar").textContent = "";
  animateCountUp(document.getElementById("repMasuk"), totalMasuk, 550);
  animateCountUp(document.getElementById("repKeluar"), totalKeluar, 550);
  const net = totalMasuk - totalKeluar;
  const netEl = document.getElementById("repNet");
  netEl.className = "value " + (net >= 0 ? "pos" : "neg");
  animateCountUp(netEl, net, 550);

  renderCategoryChart(perKategori);
  renderTrendChart(perHari, start, end);
}

function renderCategoryChart(perKategori) {
  const labels = Object.keys(perKategori);
  const canvas = document.getElementById("repCategoryChart");
  const emptyEl = document.getElementById("repChartEmpty");

  if (catChartInstance) catChartInstance.destroy();

  if (!labels.length) {
    canvas.style.display = "none";
    emptyEl.style.display = "block";
    return;
  }
  canvas.style.display = "block";
  emptyEl.style.display = "none";

  const values = labels.map((l) => perKategori[l]);
  const colors = labels.map((l) => CATEGORY_COLORS[l] || "#9CA1AC");

  catChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#FFFFFF" }] },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { font: { family: "Inter", size: 11 }, padding: 12, boxWidth: 10 } } },
      cutout: "62%",
    },
  });
}

function renderTrendChart(perHari, start, end) {
  const canvas = document.getElementById("trendChart");
  if (trendChartInstance) trendChartInstance.destroy();

  const days = [];
  let cursor = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (cursor <= endDate && days.length < 90) {
    days.push(fmtDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const masukData = days.map((d) => (perHari[d] ? perHari[d].masuk : 0));
  const keluarData = days.map((d) => (perHari[d] ? perHari[d].keluar : 0));
  const labels = days.map((d) => formatTanggalPendek(d));

  trendChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Masuk", data: masukData, borderColor: "#3B7A57", backgroundColor: "rgba(59,122,87,0.1)", fill: true, tension: 0.3, pointRadius: 0 },
        { label: "Keluar", data: keluarData, borderColor: "#A63D40", backgroundColor: "rgba(166,61,64,0.1)", fill: true, tension: 0.3, pointRadius: 0 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { font: { family: "Inter", size: 11 }, boxWidth: 10 } } },
      scales: {
        x: { ticks: { font: { size: 10 }, maxTicksLimit: 8 }, grid: { display: false } },
        y: { ticks: { font: { size: 10 } } },
      },
    },
  });
}

document.getElementById("periodChips").querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#periodChips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    const period = chip.dataset.period;
    document.getElementById("customRange").style.display = period === "custom" ? "flex" : "none";
    if (period !== "custom") applyPeriod(period);
  });
});

document.getElementById("startDate").addEventListener("change", () => applyPeriod("custom"));
document.getElementById("endDate").addEventListener("change", () => applyPeriod("custom"));

// ============ BUDGET ============
const BUDGET_ICONS = { "Makanan": "🍜", "Transportasi": "⛽", "Tagihan": "🧾", "Hiburan": "🎮", "Pendidikan": "📚", "Belanja": "🛍️", "Lainnya": "💳" };

function currentBulanStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

async function loadBudgets() {
  document.getElementById("budgetList").innerHTML = skeletonBlock(2, 84);
  try {
    const budgets = await Api.listBudgets(currentBulanStr());
    renderBudgets(budgets);
  } catch (err) {
    document.getElementById("budgetList").innerHTML =
      '<div class="error-state"><div class="icon">⚠️</div><div class="title">Gagal memuat budget</div><div class="desc">' + err.message + '</div></div>';
  }
}

function renderBudgets(budgets) {
  const el = document.getElementById("budgetList");
  if (!budgets.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🎯</div><div class="title">Belum ada budget bulan ini</div><div class="desc">Tap "Set Budget" untuk mulai pantau pengeluaran</div></div>';
    return;
  }
  el.innerHTML = budgets.map(budgetCardHtml).join("");

  // Animasikan progress bar dari 0 ke nilai target (dijeda 1 frame supaya transition CSS kepicu)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.querySelectorAll(".budget-fill").forEach((bar) => {
        bar.style.width = bar.dataset.targetWidth;
      });
    });
  });
}

function budgetCardHtml(b) {
  const level = b.persen >= 100 ? "danger" : b.persen >= 80 ? "warn" : "ok";
  const width = Math.min(b.persen, 100);
  return `
    <div class="budget-card">
      <div class="budget-top">
        <div class="budget-cat">${BUDGET_ICONS[b.kategori] || "💳"} ${b.kategori}</div>
        <div class="budget-amounts">${formatRupiah(b.terpakai)} / ${formatRupiah(b.limit)}</div>
      </div>
      <div class="budget-track"><div class="budget-fill ${level}" style="width:0%" data-target-width="${width}%"></div></div>
      <div class="budget-msg">${b.pesan}</div>
    </div>`;
}

const budgetSheet = document.getElementById("budgetSheet");

document.getElementById("setBudgetLink").addEventListener("click", () => {
  document.getElementById("budgetForm").reset();
  budgetSheet.classList.add("open");
});

document.getElementById("budgetCancelBtn").addEventListener("click", () => {
  budgetSheet.classList.remove("open");
});

budgetSheet.addEventListener("click", (e) => {
  if (e.target === budgetSheet) budgetSheet.classList.remove("open");
});

document.getElementById("budgetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const kategori = document.getElementById("bKategori").value;
  const limit = Number(document.getElementById("bLimit").value);

  try {
    await Api.setBudget({ bulan: currentBulanStr(), kategori, limit });
    showToast("Budget disimpan");
    budgetSheet.classList.remove("open");
    loadBudgets();
  } catch (err) {
    showToast(err.message, true);
  }
});

loadBudgets();
loadAllTx().then(() => applyPeriod("month")).catch((err) => showToast(err.message, true));

requireConfig();

const CATEGORY_COLORS = {
  "Makanan": "#B08D57",
  "Transportasi": "#3B7A57",
  "Tagihan": "#A63D40",
  "Hiburan": "#6B5CA5",
  "Pendidikan": "#2A6F97",
  "Belanja": "#C9752F",
  "Lainnya": "#9CA1AC",
};

function iconFor(kategori) {
  const map = {
    "Makanan": "🍜", "Transportasi": "⛽", "Tagihan": "🧾",
    "Hiburan": "🎮", "Pendidikan": "📚", "Belanja": "🛍️", "Lainnya": "💳"
  };
  return map[kategori] || "💳";
}

async function loadDashboard() {
  document.getElementById("recentList").innerHTML = skeletonBlock(3, 66);
  document.getElementById("walletScroll").innerHTML =
    '<div class="skeleton" style="min-width:128px; height:58px;"></div><div class="skeleton" style="min-width:128px; height:58px;"></div>';

  try {
    const [summary, recent, wallets] = await Promise.all([
      Api.getSummary(),
      Api.listTransactions({}),
      Api.listWallets(),
    ]);

    animateCountUp(document.getElementById("saldoAmount"), summary.saldo, 750);
    animateCountUp(document.getElementById("miniMasuk"), summary.totalPemasukan, 600);
    animateCountUp(document.getElementById("miniKeluar"), summary.totalPengeluaran, 600);
    animateCountUp(document.getElementById("bulanMasuk"), summary.pemasukanBulanIni, 600);
    animateCountUp(document.getElementById("bulanKeluar"), summary.pengeluaranBulanIni, 600);

    const sisaEl = document.getElementById("sisaBulan");
    sisaEl.className = "value " + (summary.sisaBulanIni >= 0 ? "pos" : "neg");
    animateCountUp(sisaEl, summary.sisaBulanIni, 600);

    document.getElementById("jumlahTx").textContent = summary.jumlahTransaksi;

    renderCategoryChart(summary.perKategori);
    renderRecentList(recent.slice(0, 5));
    renderWalletScroll(wallets);
  } catch (err) {
    showToast(err.message, true);
    document.getElementById("recentList").innerHTML =
      '<div class="error-state"><div class="icon">⚠️</div><div class="title">Gagal memuat data</div><div class="desc">' + err.message + '</div></div>';
  }
}

const WALLET_ICONS = { "Bank": "🏦", "E-Wallet": "📱", "Tunai": "💵", "Lainnya": "👛" };

function renderWalletScroll(wallets) {
  const el = document.getElementById("walletScroll");
  if (!wallets.length) {
    el.innerHTML = '<a href="dompet.html" class="wallet-mini" style="display:flex; align-items:center; justify-content:center; color:var(--ink-faint); font-size:12.5px;">+ Tambah dompet</a>';
    return;
  }
  el.innerHTML = wallets.map((w) => `
    <div class="wallet-mini">
      <div class="wm-name">${WALLET_ICONS[w.tipe] || "👛"} ${escapeHtml(w.nama)}</div>
      <div class="wm-saldo" data-saldo="${w.saldo}">Rp0</div>
    </div>`).join("");
  el.querySelectorAll(".wm-saldo").forEach((saldoEl) => {
    animateCountUp(saldoEl, Number(saldoEl.dataset.saldo), 500);
  });
}

function renderCategoryChart(perKategori) {
  const labels = Object.keys(perKategori || {});
  const canvas = document.getElementById("categoryChart");
  const emptyEl = document.getElementById("chartEmpty");

  if (!labels.length) {
    canvas.style.display = "none";
    emptyEl.style.display = "block";
    return;
  }
  canvas.style.display = "block";
  emptyEl.style.display = "none";

  const values = labels.map((l) => perKategori[l]);
  const colors = labels.map((l) => CATEGORY_COLORS[l] || "#9CA1AC");

  new Chart(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#FFFFFF" }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { family: "Inter", size: 11 }, padding: 12, boxWidth: 10 } },
      },
      cutout: "62%",
    },
  });
}

function renderRecentList(items) {
  const el = document.getElementById("recentList");
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📖</div><div class="title">Belum ada transaksi</div><div class="desc">Tap tombol + untuk mulai mencatat</div></div>';
    return;
  }
  el.innerHTML = items.map(rowHtml).join("");
}

function rowHtml(t) {
  const isIn = t.tipe === "Masuk";
  return `
    <a class="ledger-row" href="transaksi.html?edit=${t.id}">
      <div class="ledger-icon ${isIn ? "in" : "out"}">${iconFor(t.kategori)}</div>
      <div class="ledger-info">
        <div class="ledger-desc">${escapeHtml(t.keterangan || "(tanpa catatan)")}</div>
        <div class="ledger-meta">
          <span>${formatTanggalPendek(t.tanggal)}</span>
          <span class="category-stamp">${t.kategori}</span>
        </div>
      </div>
      <div class="ledger-amount ${isIn ? "in" : "out"}">${isIn ? "+" : "-"}${formatRupiah(t.jumlah)}</div>
    </a>`;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

loadDashboard();

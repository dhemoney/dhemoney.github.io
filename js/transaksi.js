requireConfig();

const KATEGORI_LIST = ["Makanan", "Transportasi", "Tagihan", "Hiburan", "Pendidikan", "Belanja", "Lainnya"];
const ICONS = { "Makanan": "🍜", "Transportasi": "⛽", "Tagihan": "🧾", "Hiburan": "🎮", "Pendidikan": "📚", "Belanja": "🛍️", "Lainnya": "💳" };

let allTx = [];
let allWallets = [];
let filters = { type: "", category: "", search: "", dompet: "" };
let currentEditId = null;
let selectedDompet = null;

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---------- render kategori chips ----------
function renderCategoryChips() {
  const el = document.getElementById("categoryChips");
  el.innerHTML =
    '<button class="chip active" data-cat="">Semua Kategori</button>' +
    KATEGORI_LIST.map((k) => `<button class="chip" data-cat="${k}">${ICONS[k]} ${k}</button>`).join("");

  el.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      el.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      filters.category = chip.dataset.cat;
      applyFilters();
    });
  });
}

document.getElementById("typeChips").querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#typeChips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filters.type = chip.dataset.type;
    applyFilters();
  });
});

function renderWalletFilterChips() {
  const el = document.getElementById("walletChips");
  el.innerHTML =
    '<button class="chip active" data-wallet="">Semua Dompet</button>' +
    allWallets.map((w) => `<button class="chip" data-wallet="${w.nama}">${w.nama}</button>`).join("");

  el.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      el.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      filters.dompet = chip.dataset.wallet;
      applyFilters();
    });
  });
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  filters.search = e.target.value.toLowerCase();
  applyFilters();
});

// ---------- load & render list ----------
async function loadTransaksi() {
  document.getElementById("txList").innerHTML = skeletonBlock(5, 66);
  try {
    const [tx, wallets] = await Promise.all([Api.listTransactions({}), Api.listWallets()]);
    allTx = tx;
    allWallets = wallets;
    renderWalletFilterChips();
    renderWalletSelectRow();
    applyFilters();
  } catch (err) {
    showToast(err.message, true);
    document.getElementById("txList").innerHTML =
      '<div class="error-state"><div class="icon">⚠️</div><div class="title">Gagal memuat data</div><div class="desc">' + err.message + '</div></div>';
  }
}

function applyFilters() {
  let list = allTx;
  if (filters.type) list = list.filter((t) => t.tipe === filters.type);
  if (filters.category) list = list.filter((t) => t.kategori === filters.category);
  if (filters.dompet) list = list.filter((t) => t.dompet === filters.dompet);
  if (filters.search) list = list.filter((t) => (t.keterangan || "").toLowerCase().includes(filters.search));
  renderList(list);
}

function renderList(items) {
  const el = document.getElementById("txList");
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><div class="title">Tidak ada transaksi</div><div class="desc">Coba ubah filter atau kata kunci pencarian</div></div>';
    return;
  }
  el.innerHTML = items.map(rowHtml).join("");
  el.querySelectorAll(".ledger-row").forEach((row) => {
    row.addEventListener("click", () => openEditSheet(row.dataset.id));
  });
}

function rowHtml(t) {
  const isIn = t.tipe === "Masuk";
  return `
    <div class="ledger-row" data-id="${t.id}" style="cursor:pointer;">
      <div class="ledger-icon ${isIn ? "in" : "out"}">${ICONS[t.kategori] || "💳"}</div>
      <div class="ledger-info">
        <div class="ledger-desc">${escapeHtml(t.keterangan || "(tanpa catatan)")}</div>
        <div class="ledger-meta">
          <span>${formatTanggalPendek(t.tanggal)}</span>
          <span class="category-stamp">${t.kategori}</span>
          <span>· ${escapeHtml(t.dompet)}</span>
        </div>
      </div>
      <div class="ledger-amount ${isIn ? "in" : "out"}">${isIn ? "+" : "-"}${formatRupiah(t.jumlah)}</div>
    </div>`;
}

// ---------- sheet: tambah/edit ----------
const sheet = document.getElementById("txSheet");
const form = document.getElementById("txForm");

function openAddSheet() {
  currentEditId = null;
  document.getElementById("sheetTitle").textContent = "Tambah Transaksi";
  document.getElementById("txId").value = "";
  document.getElementById("fJumlah").value = "";
  document.getElementById("fTanggal").value = todayStr();
  document.getElementById("fKeterangan").value = "";
  setTipeActive("Masuk");
  setDompetActive(allWallets.length ? allWallets[0].nama : null);
  document.getElementById("deleteBtn").style.display = "none";
  sheet.classList.add("open");
}

function openEditSheet(id) {
  const t = allTx.find((x) => x.id === id);
  if (!t) return;
  currentEditId = id;
  document.getElementById("sheetTitle").textContent = "Edit Transaksi";
  document.getElementById("txId").value = id;
  document.getElementById("fJumlah").value = t.jumlah;
  document.getElementById("fTanggal").value = t.tanggal;
  document.getElementById("fKeterangan").value = t.keterangan;
  setTipeActive(t.tipe);
  setDompetActive(t.dompet);
  document.getElementById("deleteBtn").style.display = "block";
  sheet.classList.add("open");
}

function closeSheet() {
  sheet.classList.remove("open");
}

function renderWalletSelectRow() {
  const el = document.getElementById("walletSelectRow");
  if (!allWallets.length) {
    el.innerHTML = '<span style="font-size:12.5px; color:var(--ink-faint);">Belum ada dompet — tambah dulu di halaman Dompet</span>';
    return;
  }
  el.innerHTML = allWallets.map((w) => `<button type="button" data-wallet="${w.nama}">${w.nama}</button>`).join("");
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => setDompetActive(btn.dataset.wallet));
  });
}

function setDompetActive(nama) {
  selectedDompet = nama;
  document.querySelectorAll("#walletSelectRow button").forEach((b) => {
    b.classList.toggle("active", b.dataset.wallet === nama);
  });
}

function setTipeActive(tipe) {
  document.querySelectorAll(".type-toggle button").forEach((b) => {
    b.classList.remove("active", "in", "out");
    if (b.dataset.tipe === tipe) b.classList.add("active", tipe === "Masuk" ? "in" : "out");
  });
  form.dataset.tipe = tipe;
}

document.querySelectorAll(".type-toggle button").forEach((b) => {
  b.addEventListener("click", () => setTipeActive(b.dataset.tipe));
});

document.getElementById("fabAdd").addEventListener("click", openAddSheet);
document.getElementById("cancelBtn").addEventListener("click", closeSheet);
sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  const payload = {
    tipe: form.dataset.tipe,
    jumlah: Number(document.getElementById("fJumlah").value),
    tanggal: document.getElementById("fTanggal").value,
    keterangan: document.getElementById("fKeterangan").value.trim(),
    dompet: selectedDompet || "Belum Ditentukan",
  };

  try {
    if (currentEditId) {
      payload.id = currentEditId;
      await Api.updateTransaction(payload);
      showToast("Transaksi berhasil diperbarui");
    } else {
      await Api.createTransaction(payload);
      showToast("Transaksi berhasil ditambahkan");
    }
    closeSheet();
    await loadTransaksi();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Simpan";
  }
});

document.getElementById("deleteBtn").addEventListener("click", async () => {
  if (!currentEditId) return;
  if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
  try {
    await Api.deleteTransaction(currentEditId);
    showToast("Transaksi dihapus");
    closeSheet();
    await loadTransaksi();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- deep link: ?add=1 atau ?edit=ID ----------
function handleDeepLink() {
  const params = new URLSearchParams(location.search);
  if (params.get("add")) openAddSheet();
  if (params.get("edit")) {
    const id = params.get("edit");
    const wait = setInterval(() => {
      if (allTx.length) {
        clearInterval(wait);
        openEditSheet(id);
      }
    }, 100);
    setTimeout(() => clearInterval(wait), 3000);
  }
}

renderCategoryChips();
loadTransaksi().then(handleDeepLink);

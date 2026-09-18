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

// ---------- Batch input ----------
let batchRowIdx = 0;

function batchRowTemplate(defaultTanggal) {
  batchRowIdx++;
  const idx = batchRowIdx;
  const walletOptions = allWallets.length
    ? allWallets.map((w) => `<option value="${w.nama}">${w.nama}</option>`).join("")
    : '<option value="Belum Ditentukan">Belum Ditentukan</option>';
  return `
    <div class="batch-row" data-tipe="Keluar">
      <div class="batch-row-header">
        <span class="batch-row-title">Transaksi #${idx}</span>
        <button type="button" class="batch-row-remove" data-remove-batch aria-label="Hapus baris">✕</button>
      </div>
      <div class="type-toggle">
        <button type="button" class="active out" data-batch-tipe="Keluar">↑ Keluar</button>
        <button type="button" data-batch-tipe="Masuk">↓ Masuk</button>
      </div>
      <div class="batch-field-row">
        <div class="field"><input type="number" placeholder="Nominal" class="batch-jumlah" min="1" inputmode="numeric"></div>
        <div class="field"><input type="date" class="batch-tanggal" value="${defaultTanggal}"></div>
      </div>
      <div class="batch-field-row">
        <div class="field" style="flex:1.4;"><input type="text" placeholder="Catatan" class="batch-keterangan" maxlength="200"></div>
        <div class="field"><select class="batch-dompet">${walletOptions}</select></div>
      </div>
    </div>`;
}

function addBatchRow() {
  const container = document.getElementById("batchRows");
  const wrapper = document.createElement("div");
  wrapper.innerHTML = batchRowTemplate(todayStr());
  container.appendChild(wrapper.firstElementChild);
  updateBatchCount();
}

function updateBatchCount() {
  const count = document.querySelectorAll("#batchRows .batch-row").length;
  document.getElementById("batchCountLabel").textContent = count + " baris (isi nominal & catatan untuk yang mau disimpan)";
}

function openBatchSheet() {
  if (!allWallets.length) {
    showToast("Tambahkan dompet dulu di halaman Dompet sebelum input banyak", true);
    return;
  }
  document.getElementById("batchRows").innerHTML = "";
  batchRowIdx = 0;
  addBatchRow();
  addBatchRow();
  addBatchRow();
  document.getElementById("batchSheet").classList.add("open");
}

document.getElementById("openBatchLink").addEventListener("click", openBatchSheet);
document.getElementById("addBatchRowBtn").addEventListener("click", addBatchRow);
document.getElementById("batchCancelBtn").addEventListener("click", () => {
  document.getElementById("batchSheet").classList.remove("open");
});
document.getElementById("batchSheet").addEventListener("click", (e) => {
  if (e.target.id === "batchSheet") document.getElementById("batchSheet").classList.remove("open");
});

document.getElementById("batchRows").addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-batch]");
  if (removeBtn) {
    removeBtn.closest(".batch-row").remove();
    updateBatchCount();
    return;
  }
  const typeBtn = e.target.closest("[data-batch-tipe]");
  if (typeBtn) {
    const row = typeBtn.closest(".batch-row");
    row.querySelectorAll(".type-toggle button").forEach((b) => b.classList.remove("active", "in", "out"));
    const tipe = typeBtn.dataset.batchTipe;
    typeBtn.classList.add("active", tipe === "Masuk" ? "in" : "out");
    row.dataset.tipe = tipe;
  }
});

document.getElementById("saveBatchBtn").addEventListener("click", async () => {
  const rows = document.querySelectorAll("#batchRows .batch-row");
  const items = [];
  rows.forEach((row) => {
    const jumlah = Number(row.querySelector(".batch-jumlah").value);
    const keterangan = row.querySelector(".batch-keterangan").value.trim();
    const tanggal = row.querySelector(".batch-tanggal").value;
    const dompet = row.querySelector(".batch-dompet").value;
    const tipe = row.dataset.tipe || "Keluar";
    if (jumlah > 0 && keterangan) {
      items.push({ tipe, jumlah, keterangan, tanggal, dompet });
    }
  });

  if (!items.length) {
    showToast("Isi minimal 1 baris dengan nominal & catatan", true);
    return;
  }

  const saveBtn = document.getElementById("saveBatchBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Menyimpan...";

  try {
    const result = await Api.createBatchTransactions(items);
    showToast(`${result.count} transaksi berhasil ditambahkan`);
    document.getElementById("batchSheet").classList.remove("open");
    await loadTransaksi();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Simpan Semua";
  }
});

renderCategoryChips();
loadTransaksi().then(handleDeepLink);

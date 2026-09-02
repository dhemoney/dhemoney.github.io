requireConfig();

const WALLET_ICONS = { "Bank": "🏦", "E-Wallet": "📱", "Tunai": "💵", "Lainnya": "👛" };

async function loadWallets() {
  document.getElementById("walletList").innerHTML = skeletonBlock(3, 76);
  try {
    const wallets = await Api.listWallets();
    renderWallets(wallets);
  } catch (err) {
    showToast(err.message, true);
    document.getElementById("walletList").innerHTML =
      '<div class="error-state"><div class="icon">⚠️</div><div class="title">Gagal memuat data</div><div class="desc">' + err.message + '</div></div>';
  }
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function renderWallets(wallets) {
  const el = document.getElementById("walletList");
  if (!wallets.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">👛</div><div class="title">Belum ada dompet</div><div class="desc">Tambahkan dompet pertama Anda di bawah</div></div>';
    return;
  }
  el.innerHTML = wallets.map(walletCardHtml).join("");
  el.querySelectorAll(".wallet-card-saldo").forEach((saldoEl) => {
    const target = Number(saldoEl.dataset.saldo);
    animateCountUp(saldoEl, target, 550);
  });
  el.querySelectorAll(".wallet-card-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const nama = btn.dataset.nama;
      if (!confirm(`Hapus dompet "${nama}"? Transaksi yang sudah tercatat dengan dompet ini tidak akan terhapus, tapi jadi belum ditentukan.`)) return;
      try {
        await Api.deleteWallet(nama);
        showToast("Dompet dihapus");
        loadWallets();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

function walletCardHtml(w) {
  const isNeg = w.saldo < 0;
  return `
    <div class="wallet-card">
      <div class="wallet-card-icon">${WALLET_ICONS[w.tipe] || "👛"}</div>
      <div class="wallet-card-info">
        <div class="wallet-card-name">${escapeHtml(w.nama)}</div>
        <div class="wallet-card-type">${escapeHtml(w.tipe)}</div>
      </div>
      <div class="wallet-card-saldo ${isNeg ? "neg" : ""}" data-saldo="${w.saldo}">Rp0</div>
      <button class="wallet-card-delete" data-nama="${escapeHtml(w.nama)}" aria-label="Hapus dompet">🗑</button>
    </div>`;
}

// ---------- sheet: tambah dompet ----------
const walletSheet = document.getElementById("walletSheet");

document.getElementById("addWalletBtn").addEventListener("click", () => {
  document.getElementById("walletForm").reset();
  walletSheet.classList.add("open");
});

document.getElementById("walletCancelBtn").addEventListener("click", () => {
  walletSheet.classList.remove("open");
});

walletSheet.addEventListener("click", (e) => {
  if (e.target === walletSheet) walletSheet.classList.remove("open");
});

document.getElementById("walletForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nama = document.getElementById("wNama").value.trim();
  const tipe = document.getElementById("wTipe").value;

  try {
    await Api.createWallet({ nama, tipe });
    showToast("Dompet ditambahkan");
    walletSheet.classList.remove("open");
    loadWallets();
  } catch (err) {
    showToast(err.message, true);
  }
});

loadWallets();

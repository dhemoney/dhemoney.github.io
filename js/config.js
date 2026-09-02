// Menyimpan URL Web App GAS + secret key di localStorage browser pengguna.
// Ini AMAN untuk kasus ini: yang tersimpan cuma URL endpoint & key milik
// pemilik web app sendiri, di browser pemilik sendiri. Tidak ada rahasia
// pihak lain yang tersimpan di sini.

const CONFIG_KEY = "dhemoney_config";

function getConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setConfig(url, key) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
}

function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

function isConfigured() {
  const c = getConfig();
  return !!(c && c.url && c.key);
}

// Redirect ke setup.html kalau belum dikonfigurasi, kecuali sedang di setup.html
function requireConfig() {
  if (!isConfigured() && !location.pathname.endsWith("setup.html")) {
    location.href = "setup.html";
  }
}

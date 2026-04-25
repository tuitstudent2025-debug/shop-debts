
import { storage } from './storage';
window.storage = storage;

// Дальше идёт твой код без изменений (начиная с import { useState, useEffect, ... })
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Helpers ────────────────────────────────────────────────────
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));
const now = () => new Date().toISOString();
const ago = (iso) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "hozir";
  if (d < 3600) return `${Math.floor(d / 60)} min oldin`;
  if (d < 86400) return `${Math.floor(d / 3600)} soat oldin`;
  if (d < 2592000) return `${Math.floor(d / 86400)} kun oldin`;
  return new Date(iso).toLocaleDateString("ru-RU");
};

// ─── Storage Layer ──────────────────────────────────────────────
const STORAGE_KEY = "shop-debts-v1";

async function loadData() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}

async function saveData(data) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { console.error("Save failed", e); }
}

const emptyState = () => ({ debtors: [], debts: [], payments: [] });

// ─── Icons (inline SVG) ────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d={d} />
  </svg>
);
const Icons = {
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  plus: "M12 5v14M5 12h14",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  back: "M19 12H5M12 19l-7-7 7-7",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  money: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  x: "M18 6L6 18M6 6l12 12",
  chevDown: "M6 9l6 6 6-6",
};

// ─── Fonts ──────────────────────────────────────────────────────
const fontLink = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap";

// ─── Palette ────────────────────────────────────────────────────
const C = {
  bg: "#F0F2F5",
  card: "#FFFFFF",
  active: "#FF6B35",
  partial: "#4A90D9",
  paid: "#2ECC71",
  danger: "#E74C3C",
  primary: "#2D6A4F",
  primaryLight: "#40916C",
  text: "#1A1A2E",
  textSec: "#8E8E93",
  border: "#E5E5EA",
  shadow: "0 2px 12px rgba(0,0,0,0.08)",
  shadowLg: "0 8px 30px rgba(0,0,0,0.12)",
};

// ─── Base Styles ────────────────────────────────────────────────
const S = {
  app: {
    fontFamily: "'Nunito', sans-serif",
    background: C.bg,
    minHeight: "100vh",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
    paddingBottom: 80,
    color: C.text,
  },
  header: {
    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
    color: "#fff",
    padding: "20px 20px 16px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerTitle: { fontSize: 22, fontWeight: 800, margin: 0 },
  headerSub: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  searchBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(255,255,255,0.2)", borderRadius: 12,
    padding: "8px 12px", marginTop: 12,
  },
  searchInput: {
    flex: 1, border: "none", background: "transparent", color: "#fff",
    fontSize: 15, outline: "none", fontFamily: "inherit",
  },
  tabs: {
    display: "flex", gap: 6, padding: "12px 20px 0",
  },
  tab: (active) => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700,
    border: "none", cursor: "pointer", transition: "all .2s",
    background: active ? C.primary : "transparent",
    color: active ? "#fff" : C.textSec,
  }),
  card: {
    background: C.card, borderRadius: 16, margin: "8px 16px",
    padding: "14px 16px", boxShadow: C.shadow, position: "relative",
    overflow: "hidden", transition: "transform .15s",
    cursor: "pointer",
  },
  statusBar: (status) => ({
    position: "absolute", left: 0, top: 0, bottom: 0, width: 5,
    background: status === "active" ? C.active : status === "partial" ? C.partial : C.paid,
    borderRadius: "16px 0 0 16px",
  }),
  cardName: { fontSize: 17, fontWeight: 700, marginBottom: 2 },
  cardPhone: { fontSize: 12, color: C.textSec },
  cardDesc: { fontSize: 13, color: C.textSec, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  cardDate: { fontSize: 12, color: C.textSec },
  cardAmount: (paid) => ({ fontSize: 20, fontWeight: 800, color: paid ? C.paid : C.active }),
  badge: (color) => ({
    display: "inline-block", fontSize: 11, fontWeight: 700,
    padding: "2px 8px", borderRadius: 10,
    background: color + "20", color,
  }),
  nav: {
    position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 480,
    background: C.card, borderTop: `1px solid ${C.border}`,
    display: "flex", justifyContent: "space-around", alignItems: "center",
    padding: "8px 0 env(safe-area-inset-bottom, 8px)", zIndex: 200,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
  },
  navBtn: (active) => ({
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    background: "none", border: "none", cursor: "pointer", padding: "4px 16px",
    color: active ? C.primary : C.textSec, fontSize: 11, fontWeight: 600,
    fontFamily: "inherit",
  }),
  navCenter: {
    width: 52, height: 52, borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", boxShadow: "0 4px 15px rgba(45,106,79,0.4)",
    marginTop: -20,
  },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: `2px solid ${C.border}`, fontSize: 15, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", transition: "border .2s",
  },
  inputFocus: { borderColor: C.primary },
  label: { fontSize: 13, fontWeight: 700, color: C.textSec, marginBottom: 6, display: "block" },
  btnPrimary: {
    width: "100%", padding: "14px", borderRadius: 14, border: "none",
    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
    color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", boxShadow: "0 4px 15px rgba(45,106,79,0.3)",
  },
  btnDanger: {
    padding: "10px 20px", borderRadius: 12, border: "none",
    background: C.danger, color: "#fff", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  },
  btnOutline: {
    padding: "10px 20px", borderRadius: 12,
    border: `2px solid ${C.border}`, background: "transparent",
    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    color: C.text,
  },
  empty: {
    textAlign: "center", padding: "60px 20px", color: C.textSec,
  },
  modal: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 300,
  },
  modalContent: {
    background: C.card, borderRadius: "24px 24px 0 0", width: "100%",
    maxWidth: 480, padding: "24px 20px env(safe-area-inset-bottom, 20px)",
    maxHeight: "80vh", overflowY: "auto",
  },
  statsCard: {
    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`,
    borderRadius: 16, padding: "20px", margin: "8px 16px",
    color: "#fff", display: "flex", justifyContent: "space-around",
    textAlign: "center",
  },
  statNum: { fontSize: 24, fontWeight: 800 },
  statLabel: { fontSize: 12, opacity: 0.8, marginTop: 2 },
};

// ─── Main App ───────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(emptyState());
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("debts"); // debts | add | debtors | debtorDetail | debtDetail
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load
  useEffect(() => {
    loadData().then((d) => {
      if (d) setData(d);
      setLoaded(true);
    });
  }, []);

  // Save on change
  useEffect(() => {
    if (loaded) saveData(data);
  }, [data, loaded]);

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  }, []);

  // ── Derived ───
  const getDebtorName = (id) => data.debtors.find((d) => d.id === id)?.name || "?";
  const getDebtor = (id) => data.debtors.find((d) => d.id === id);
  const getDebtPayments = (debtId) => data.payments.filter((p) => p.debtId === debtId);
  const paidSum = (debtId) => getDebtPayments(debtId).reduce((s, p) => s + p.amount, 0);
  const remaining = (debt) => debt.amount - paidSum(debt.id);
  const debtStatus = (debt) => {
    const p = paidSum(debt.id);
    if (p >= debt.amount) return "paid";
    if (p > 0) return "partial";
    return "active";
  };
  const totalActive = data.debts.filter((d) => debtStatus(d) !== "paid").reduce((s, d) => s + remaining(d), 0);
  const activeCount = data.debts.filter((d) => debtStatus(d) !== "paid").length;

  // Filtered debts
  const filteredDebts = data.debts
    .filter((d) => {
      const st = debtStatus(d);
      if (filter === "active") return st !== "paid";
      if (filter === "paid") return st === "paid";
      return true;
    })
    .filter((d) => {
      if (!search) return true;
      const name = getDebtorName(d.debtorId).toLowerCase();
      return name.includes(search.toLowerCase());
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // ── Add debt handler ──
  const addDebt = (debtorId, amount, description, newDebtor) => {
    update((d) => {
      let dId = debtorId;
      if (newDebtor) {
        const nd = { id: genId(), name: newDebtor.name, phone: newDebtor.phone || "", note: newDebtor.note || "", createdAt: now() };
        d.debtors.push(nd);
        dId = nd.id;
      }
      d.debts.push({ id: genId(), debtorId: dId, amount: parseFloat(amount), description: description || "", status: "active", createdAt: now() });
    });
    setScreen("debts");
  };

  // ── Pay handler ──
  const addPayment = (debtId, amount) => {
    update((d) => {
      d.payments.push({ id: genId(), debtId, amount: parseFloat(amount), paidAt: now(), method: "cash" });
    });
    setPayModal(null);
  };

  // ── Delete debt ──
  const deleteDebt = (debtId) => {
    update((d) => {
      d.debts = d.debts.filter((x) => x.id !== debtId);
      d.payments = d.payments.filter((p) => p.debtId !== debtId);
    });
    setConfirmDelete(null);
    if (screen === "debtDetail") setScreen("debts");
  };

  // ── Delete debtor ──
  const deleteDebtor = (debtorId) => {
    const hasDebts = data.debts.some((d) => d.debtorId === debtorId && debtStatus(d) !== "paid");
    if (hasDebts) { alert("O'chirib bo'lmaydi — faol qarzlar mavjud!"); return; }
    update((d) => {
      const debtIds = d.debts.filter((x) => x.debtorId === debtorId).map((x) => x.id);
      d.payments = d.payments.filter((p) => !debtIds.includes(p.debtId));
      d.debts = d.debts.filter((x) => x.debtorId !== debtorId);
      d.debtors = d.debtors.filter((x) => x.id !== debtorId);
    });
    setConfirmDelete(null);
    setScreen("debtors");
  };

  if (!loaded) return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}><link href={fontLink} rel="stylesheet" /><p style={{ color: C.textSec }}>Yuklanmoqda...</p></div>;

  return (
    <div style={S.app}>
      <link href={fontLink} rel="stylesheet" />

      {/* ── SCREENS ── */}
      {screen === "debts" && <DebtsScreen {...{ filteredDebts, search, setSearch, filter, setFilter, totalActive, activeCount, getDebtorName, getDebtor, debtStatus, remaining, paidSum, setPayModal, setSelectedDebt, setSelectedDebtor, setScreen }} />}
      {screen === "add" && <AddDebtScreen debtors={data.debtors} onAdd={addDebt} onBack={() => setScreen("debts")} />}
      {screen === "debtors" && <DebtorsScreen debtors={data.debtors} debts={data.debts} debtStatus={debtStatus} remaining={remaining} onSelect={(d) => { setSelectedDebtor(d); setScreen("debtorDetail"); }} onBack={() => setScreen("debts")} />}
      {screen === "debtorDetail" && selectedDebtor && (
        <DebtorDetailScreen
          debtor={data.debtors.find((d) => d.id === selectedDebtor.id) || selectedDebtor}
          debts={data.debts.filter((d) => d.debtorId === selectedDebtor.id)}
          debtStatus={debtStatus} remaining={remaining} paidSum={paidSum}
          onPay={setPayModal}
          onDeleteDebtor={() => setConfirmDelete({ type: "debtor", id: selectedDebtor.id })}
          onBack={() => setScreen("debtors")}
        />
      )}
      {screen === "debtDetail" && selectedDebt && (
        <DebtDetailScreen
          debt={data.debts.find((d) => d.id === selectedDebt.id) || selectedDebt}
          debtor={getDebtor(selectedDebt.debtorId)}
          payments={getDebtPayments(selectedDebt.id)}
          debtStatus={debtStatus} remaining={remaining} paidSum={paidSum}
          onPay={() => setPayModal(selectedDebt)}
          onDelete={() => setConfirmDelete({ type: "debt", id: selectedDebt.id })}
          onBack={() => setScreen("debts")}
        />
      )}

      {/* ── Pay Modal ── */}
      {payModal && (
        <PayModal
          debt={payModal}
          remaining={remaining(payModal)}
          onPay={addPayment}
          onClose={() => setPayModal(null)}
        />
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div style={S.modal} onClick={() => setConfirmDelete(null)}>
          <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Ishonchingiz komilmi?</p>
            <p style={{ fontSize: 14, color: C.textSec, marginBottom: 20 }}>
              {confirmDelete.type === "debt" ? "Qarz qaytarib bo'lmas tarzda o'chiriladi." : "Qarzdor va uning barcha to'langan qarzlari o'chiriladi."}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={S.btnOutline} onClick={() => setConfirmDelete(null)}>Bekor qilish</button>
              <button style={S.btnDanger} onClick={() => confirmDelete.type === "debt" ? deleteDebt(confirmDelete.id) : deleteDebtor(confirmDelete.id)}>O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div style={S.nav}>
        <button style={S.navBtn(screen === "debts")} onClick={() => setScreen("debts")}>
          <Icon d={Icons.list} size={22} />
          <span>Qarzlar</span>
        </button>
        <button style={S.navCenter} onClick={() => setScreen("add")}>
          <Icon d={Icons.plus} size={26} color="#fff" />
        </button>
        <button style={S.navBtn(screen === "debtors")} onClick={() => setScreen("debtors")}>
          <Icon d={Icons.users} size={22} />
          <span>Qarzdorlar</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Debts Screen
// ═══════════════════════════════════════════════════════════════
function DebtsScreen({ filteredDebts, search, setSearch, filter, setFilter, totalActive, activeCount, getDebtorName, getDebtor, debtStatus, remaining, paidSum, setPayModal, setSelectedDebt, setScreen }) {
  return (
    <>
      <div style={S.header}>
        <h1 style={S.headerTitle}>Do'kon qarzlari</h1>
        <p style={S.headerSub}>Barcha qarzlarni oson boshqaring</p>
        <div style={S.searchBox}>
          <Icon d={Icons.search} size={18} color="rgba(255,255,255,0.7)" />
          <input
            style={S.searchInput}
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setSearch("")}><Icon d={Icons.x} size={16} color="rgba(255,255,255,0.7)" /></button>}
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsCard}>
        <div>
          <div style={S.statNum}>{fmt(totalActive)} so'm</div>
          <div style={S.statLabel}>Jami qarz</div>
        </div>
        <div>
          <div style={S.statNum}>{activeCount}</div>
          <div style={S.statLabel}>Faol qarzlar</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[["active", "Faol"], ["paid", "To'langan"], ["all", "Barchasi"]].map(([v, l]) => (
          <button key={v} style={S.tab(filter === v)} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "4px 0" }}>
        {filteredDebts.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Qarzlar yo'q</p>
            <p style={{ fontSize: 13 }}>Yangi qarz qo'shish uchun "+" tugmasini bosing</p>
          </div>
        )}
        {filteredDebts.map((debt) => {
          const st = debtStatus(debt);
          const debtor = getDebtor(debt.debtorId);
          const rem = remaining(debt);
          return (
            <div key={debt.id} style={S.card} onClick={() => { setSelectedDebt(debt); setScreen("debtDetail"); }}>
              <div style={S.statusBar(st)} />
              <div style={{ paddingLeft: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={S.cardName}>{debtor?.name || "?"}</div>
                    {debtor?.phone && (
                      <a href={`tel:${debtor.phone}`} style={S.cardPhone} onClick={(e) => e.stopPropagation()}>
                        📞 {debtor.phone}
                      </a>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={S.cardAmount(st === "paid")}>{fmt(rem)} so'm</div>
                    <span style={S.badge(st === "active" ? C.active : st === "partial" ? C.partial : C.paid)}>
                      {st === "active" ? "Faol" : st === "partial" ? "Qisman" : "To'langan"}
                    </span>
                  </div>
                </div>
                {debt.description && <div style={S.cardDesc}>{debt.description}</div>}
                <div style={S.cardBottom}>
                  <span style={S.cardDate}>{ago(debt.createdAt)}</span>
                  {st !== "paid" && (
                    <button
                      style={{ ...S.btnOutline, padding: "6px 14px", fontSize: 12, borderColor: C.primary, color: C.primary }}
                      onClick={(e) => { e.stopPropagation(); setPayModal(debt); }}
                    >
                      💰 To'lash
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Add Debt Screen
// ═══════════════════════════════════════════════════════════════
function AddDebtScreen({ debtors, onAdd, onBack }) {
  const [mode, setMode] = useState("existing"); // existing | new
  const [debtorId, setDebtorId] = useState("");
  const [debtorSearch, setDebtorSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNote, setNewNote] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const dropRef = useRef(null);

  const filtered = debtors.filter((d) => d.name.toLowerCase().includes(debtorSearch.toLowerCase()));
  const selectedDebtor = debtors.find((d) => d.id === debtorId);

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { alert("Qarz summasini kiriting!"); return; }
    if (mode === "existing" && !debtorId) { alert("Qarzdorni tanlang!"); return; }
    if (mode === "new" && !newName.trim()) { alert("Ismni kiriting!"); return; }
    if (mode === "existing") onAdd(debtorId, amt, desc);
    else onAdd(null, amt, desc, { name: newName.trim(), phone: newPhone, note: newNote });
  };

  return (
    <>
      <div style={{ ...S.header, display: "flex", alignItems: "center", gap: 12 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}>
          <Icon d={Icons.back} size={22} color="#fff" />
        </button>
        <h1 style={{ ...S.headerTitle, fontSize: 20 }}>Qarz qo'shish</h1>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Toggle existing / new */}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.tab(mode === "existing")} onClick={() => setMode("existing")}>Mavjud qarzdor</button>
          <button style={S.tab(mode === "new")} onClick={() => setMode("new")}>+ Yangi qarzdor</button>
        </div>

        {mode === "existing" ? (
          <div style={{ position: "relative" }} ref={dropRef}>
            <label style={S.label}>Qarzdor</label>
            {selectedDebtor ? (
              <div style={{ ...S.input, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => { setDebtorId(""); setShowDropdown(true); }}>
                <span style={{ fontWeight: 700 }}>{selectedDebtor.name}</span>
                <Icon d={Icons.x} size={16} color={C.textSec} />
              </div>
            ) : (
              <>
                <input
                  style={S.input}
                  placeholder="Ismni yozing..."
                  value={debtorSearch}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => { setDebtorSearch(e.target.value); setShowDropdown(true); }}
                />
                {showDropdown && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                    background: C.card, borderRadius: 12, boxShadow: C.shadowLg,
                    maxHeight: 200, overflowY: "auto", marginTop: 4,
                  }}>
                    {filtered.length === 0 && <div style={{ padding: 12, color: C.textSec, fontSize: 14 }}>Topilmadi</div>}
                    {filtered.map((d) => (
                      <div key={d.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, fontSize: 15 }}
                        onClick={() => { setDebtorId(d.id); setShowDropdown(false); setDebtorSearch(""); }}>
                        <span style={{ fontWeight: 600 }}>{d.name}</span>
                        {d.phone && <span style={{ color: C.textSec, marginLeft: 8, fontSize: 12 }}>{d.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div>
              <label style={S.label}>Ismi *</label>
              <input style={S.input} placeholder="To'liq ism" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Telefon</label>
              <input style={S.input} placeholder="+998 90 123 45 67" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} type="tel" />
            </div>
            <div>
              <label style={S.label}>Izoh</label>
              <input style={S.input} placeholder="Manzil, ma'lumot..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label style={S.label}>Qarz summasi *</label>
          <input style={{ ...S.input, fontSize: 22, fontWeight: 800, textAlign: "center" }}
            placeholder="0" type="number" inputMode="numeric" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div>
          <label style={S.label}>Nima uchun</label>
          <input style={S.input} placeholder="Non, sut, ..." value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>

        <button style={S.btnPrimary} onClick={submit}>✅ Qarzni yozish</button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Debtors Screen
// ═══════════════════════════════════════════════════════════════
function DebtorsScreen({ debtors, debts, debtStatus, remaining, onSelect, onBack }) {
  const [search, setSearch] = useState("");
  const filtered = debtors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const debtorTotal = (id) => {
    return debts.filter((d) => d.debtorId === id && debtStatus(d) !== "paid").reduce((s, d) => s + remaining(d), 0);
  };
  const debtorCount = (id) => debts.filter((d) => d.debtorId === id && debtStatus(d) !== "paid").length;

  return (
    <>
      <div style={S.header}>
        <h1 style={S.headerTitle}>Qarzdorlar</h1>
        <div style={S.searchBox}>
          <Icon d={Icons.search} size={18} color="rgba(255,255,255,0.7)" />
          <input style={S.searchInput} placeholder="Ism bo'yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div style={{ padding: "8px 0" }}>
        {filtered.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <p style={{ fontWeight: 700 }}>Qarzdorlar yo'q</p>
          </div>
        )}
        {filtered.map((d) => {
          const total = debtorTotal(d.id);
          const count = debtorCount(d.id);
          return (
            <div key={d.id} style={S.card} onClick={() => onSelect(d)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={S.cardName}>{d.name}</div>
                  {d.phone && <div style={S.cardPhone}>📞 {d.phone}</div>}
                  {d.note && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{d.note}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {count > 0 ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.active }}>{fmt(total)} so'm</div>
                      <div style={{ fontSize: 12, color: C.textSec }}>{count} ta qarz</div>
                    </>
                  ) : (
                    <span style={S.badge(C.paid)}>Qarzi yo'q</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Debtor Detail Screen
// ═══════════════════════════════════════════════════════════════
function DebtorDetailScreen({ debtor, debts, debtStatus, remaining, paidSum, onPay, onDeleteDebtor, onBack }) {
  const totalActive = debts.filter((d) => debtStatus(d) !== "paid").reduce((s, d) => s + remaining(d), 0);
  return (
    <>
      <div style={{ ...S.header, display: "flex", alignItems: "center", gap: 12 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}>
          <Icon d={Icons.back} size={22} color="#fff" />
        </button>
        <div>
          <h1 style={{ ...S.headerTitle, fontSize: 20 }}>{debtor.name}</h1>
          {debtor.phone && <p style={S.headerSub}>📞 <a href={`tel:${debtor.phone}`} style={{ color: "inherit" }}>{debtor.phone}</a></p>}
        </div>
      </div>

      <div style={S.statsCard}>
        <div>
          <div style={S.statNum}>{fmt(totalActive)} so'm</div>
          <div style={S.statLabel}>Jami qarzi</div>
        </div>
        <div>
          <div style={S.statNum}>{debts.length}</div>
          <div style={S.statLabel}>Barcha qarzlar</div>
        </div>
      </div>

      {debtor.note && <div style={{ margin: "0 16px", padding: "10px 14px", background: C.card, borderRadius: 12, fontSize: 14, color: C.textSec }}>📝 {debtor.note}</div>}

      <div style={{ padding: "8px 0" }}>
        {debts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((debt) => {
          const st = debtStatus(debt);
          const rem = remaining(debt);
          return (
            <div key={debt.id} style={S.card}>
              <div style={S.statusBar(st)} />
              <div style={{ paddingLeft: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    {debt.description && <div style={{ fontSize: 14, fontWeight: 600 }}>{debt.description}</div>}
                    <div style={S.cardDate}>{ago(debt.createdAt)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={S.cardAmount(st === "paid")}>{fmt(rem)} so'm</div>
                    <span style={S.badge(st === "active" ? C.active : st === "partial" ? C.partial : C.paid)}>
                      {st === "active" ? "Faol" : st === "partial" ? "Qisman" : "To'langan"}
                    </span>
                  </div>
                </div>
                {st !== "paid" && (
                  <div style={{ marginTop: 8, textAlign: "right" }}>
                    <button
                      style={{ ...S.btnOutline, padding: "6px 14px", fontSize: 12, borderColor: C.primary, color: C.primary }}
                      onClick={() => onPay(debt)}
                    >💰 To'lash</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "16px 20px" }}>
        <button style={{ ...S.btnDanger, width: "100%" }} onClick={onDeleteDebtor}>🗑 Qarzdorni o'chirish</button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Debt Detail Screen
// ═══════════════════════════════════════════════════════════════
function DebtDetailScreen({ debt, debtor, payments, debtStatus, remaining, paidSum, onPay, onDelete, onBack }) {
  const st = debtStatus(debt);
  const rem = remaining(debt);
  const paid = paidSum(debt.id);
  const pct = Math.min(100, Math.round((paid / debt.amount) * 100));

  return (
    <>
      <div style={{ ...S.header, display: "flex", alignItems: "center", gap: 12 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} onClick={onBack}>
          <Icon d={Icons.back} size={22} color="#fff" />
        </button>
        <h1 style={{ ...S.headerTitle, fontSize: 20 }}>Qarz tafsiloti</h1>
      </div>

      <div style={{ margin: "12px 16px", background: C.card, borderRadius: 16, padding: 20, boxShadow: C.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, color: C.textSec }}>Qarzdor</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{debtor?.name || "?"}</div>
          </div>
          <span style={S.badge(st === "active" ? C.active : st === "partial" ? C.partial : C.paid)}>
            {st === "active" ? "Faol" : st === "partial" ? "Qisman" : "To'langan"}
          </span>
        </div>

        {debt.description && <div style={{ fontSize: 14, color: C.textSec, marginBottom: 12 }}>📦 {debt.description}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: C.textSec }}>Umumiy qarz</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt(debt.amount)} so'm</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: C.textSec }}>To'langan</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.paid }}>{fmt(paid)} so'm</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Qolgan</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: rem > 0 ? C.active : C.paid }}>{fmt(rem)} so'm</span>
        </div>

        {/* Progress bar */}
        <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.primary}, ${C.paid})`, borderRadius: 8, transition: "width .5s" }} />
        </div>
        <div style={{ fontSize: 12, color: C.textSec, textAlign: "right", marginTop: 4 }}>{pct}% to'langan</div>

        <div style={{ fontSize: 12, color: C.textSec, marginTop: 8 }}>📅 {ago(debt.createdAt)}</div>
      </div>

      {/* Payments history */}
      {payments.length > 0 && (
        <div style={{ margin: "0 16px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, marginLeft: 4 }}>To'lovlar tarixi</h3>
          {payments.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).map((p) => (
            <div key={p.id} style={{ background: C.card, borderRadius: 12, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.paid }}>+{fmt(p.amount)} so'm</div>
                <div style={{ fontSize: 11, color: C.textSec }}>{ago(p.paidAt)}</div>
              </div>
              <span style={{ fontSize: 12, color: C.textSec }}>💵 naqd</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: "16px 20px", display: "flex", gap: 12 }}>
        {st !== "paid" && <button style={{ ...S.btnPrimary, flex: 1 }} onClick={onPay}>💰 To'lash</button>}
        <button style={{ ...S.btnDanger, flex: st === "paid" ? 1 : 0 }} onClick={onDelete}>🗑</button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Pay Modal
// ═══════════════════════════════════════════════════════════════
function PayModal({ debt, remaining: rem, onPay, onClose }) {
  const [amount, setAmount] = useState(rem.toString());
  const handlePay = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { alert("Summani kiriting!"); return; }
    if (a > rem) { alert("Summa qarzdan oshib ketdi!"); return; }
    onPay(debt.id, a);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>To'lov qabul qilish</h2>
          <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={onClose}>
            <Icon d={Icons.x} size={22} color={C.textSec} />
          </button>
        </div>

        <div style={{ background: C.bg, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: C.textSec }}>Qolgan qarz</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.active }}>{fmt(rem)} so'm</span>
          </div>
        </div>

        <label style={S.label}>To'lov summasi</label>
        <input
          style={{ ...S.input, fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 16 }}
          type="number" inputMode="numeric" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[0.25, 0.5, 1].map((pct) => (
            <button key={pct} style={{ ...S.btnOutline, flex: 1, fontSize: 13 }}
              onClick={() => setAmount(Math.round(rem * pct).toString())}>
              {pct === 1 ? "To'liq" : `${pct * 100}%`}
            </button>
          ))}
        </div>

        <button style={S.btnPrimary} onClick={handlePay}>✅ To'lovni tasdiqlash</button>
      </div>
    </div>
  );
} 
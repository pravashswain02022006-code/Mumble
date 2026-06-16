(function () {
  const { useEffect, useMemo, useState } = React;
  const h = React.createElement;

  const appName = "Mumble";

  // ── Supabase config ────────────────────────────────────────────────────────
  const SUPABASE_URL = "https://qjfnytssuyhtkxdgszdg.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZm55dHNzdXlodGt4ZGdzemRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI3MjYsImV4cCI6MjA5NjM4ODcyNn0.ZWgVN7ucLKalBvMpmM8gH_ICpI4j0xide_tk0FvOMTE";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Map Supabase rows (snake_case) → app objects (camelCase)
  function mapTxFromDb(row) {
    return { id: row.id, amount: Number(row.amount || 0), vpa: row.vpa || "", payer: row.payer || "", remark: row.remark || "", date: row.date || "", clientId: row.client_id || "usr-001", addedByMaster: !!row.added_by_master, isDeleted: !!row.is_deleted, deletedAt: row.deleted_at || "", editHistory: row.edit_history || [] };
  }
  function mapStFromDb(row) {
    return { id: row.id, amount: Number(row.amount || 0), commission: row.commission || "3%", commissionAmount: Number(row.commission_amount || 0), paid: Number(row.paid || 0), remark: row.remark || "", date: row.date || "", clientId: row.client_id || "usr-001", addedByMaster: !!row.added_by_master, isDeleted: !!row.is_deleted, deletedAt: row.deleted_at || "", editHistory: row.edit_history || [] };
  }
  // Map app objects → Supabase rows
  function mapTxToDb(r) {
    return { id: r.id, amount: Number(r.amount || 0), vpa: r.vpa, payer: r.payer, remark: r.remark, date: r.date, client_id: r.clientId, added_by_master: !!r.addedByMaster, edit_history: r.editHistory || [] };
  }
  function mapStToDb(r) {
    return { id: r.id, amount: Number(r.amount || 0), commission: r.commission, commission_amount: Number(r.commissionAmount || 0), paid: Number(r.paid || 0), remark: r.remark, date: r.date, client_id: r.clientId, added_by_master: !!r.addedByMaster, edit_history: r.editHistory || [] };
  }
  // Map admin rows
  function mapAdminFromDb(row) {
    return { id: row.id, username: row.username || "", password: row.password || "", role: row.role || "admin", date: row.date || "" };
  }
  function mapAdminToDb(r) {
    return { id: r.id, username: r.username, password: r.password, role: r.role || "admin", date: r.date };
  }
  // Map user (client) rows
  function mapUserFromDb(row) {
    return { id: row.id, username: row.username || "", password: row.password || "", role: row.role || "user", date: row.date || "" };
  }
  function mapUserToDb(r) {
    return { id: r.id, username: r.username, password: r.password, role: r.role || "user", date: r.date };
  }

  // ── Master credentials helpers (Supabase-backed) ────────────────────────
  async function fetchMasterCreds() {
    const { data, error } = await supabase.from("master_config").select("*").eq("id", "master").single();
    if (error || !data) return { username: "masterLead", password: "Mumb!e@999" };
    return { username: data.username, password: data.password };
  }

  async function saveMasterCredsToDb(creds) {
    const { error } = await supabase.from("master_config").upsert(
      { id: "master", username: creds.username, password: creds.password },
      { onConflict: "id" }
    );
    if (error) throw new Error("master_config: " + error.message);
  }

  async function fetchAll() {
    const [txRes, stRes, admRes, usrRes] = await Promise.all([
      supabase.from("transactions").select("*"),
      supabase.from("settlements").select("*"),
      supabase.from("admins").select("*"),
      supabase.from("users").select("*"),
    ]);
    if (txRes.error)  throw new Error("transactions: " + txRes.error.message);
    if (stRes.error)  throw new Error("settlements: " + stRes.error.message);
    if (admRes.error) throw new Error("admins: " + admRes.error.message);
    if (usrRes.error) throw new Error("users: " + usrRes.error.message);

    let masterRow = { username: "masterLead", password: "Mumb!e@999" };
    try {
      const masterRes = await supabase.from("master_config").select("*").eq("id", "master").single();
      if (masterRes.data) masterRow = masterRes.data;
    } catch (_) {}

    // Audit log — optional, only if table exists
    let auditLog = [];
    try {
      const auditRes = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (!auditRes.error) auditLog = auditRes.data || [];
    } catch (_) {}

    // Separate soft-deleted records (if is_deleted column exists)
    const allTx  = (txRes.data  || []).map(mapTxFromDb);
    const allSt  = (stRes.data  || []).map(mapStFromDb);
    const liveTx = allTx.filter(r => !r.isDeleted);
    const liveSt = allSt.filter(r => !r.isDeleted);
    const deletedTx = allTx.filter(r => r.isDeleted);
    const deletedSt = allSt.filter(r => r.isDeleted);

    return {
      transactions:  liveTx,
      settlements:   liveSt,
      deletedTransactions: deletedTx,
      deletedSettlements:  deletedSt,
      admins:        (admRes.data || []).map(mapAdminFromDb),
      users:         (usrRes.data || []).map(mapUserFromDb),
      masterCreds:   { username: masterRow.username, password: masterRow.password },
      auditLog,
    };
  }


  const defaultTransactions = [
    { amount: 40808, id: "#42136985742", vpa: "1short entry darshan 02/06/26", payer: "Ab", remark: "", date: "June 2nd, 2026 11:35:00 PM" },
    { amount: 44902, id: "#232145698753", vpa: "1short entry darshan 02/06/26", payer: "An", remark: "", date: "June 2nd, 2026 11:34:00 PM" },
    { amount: 264862, id: "#75236985421", vpa: "1short entry darshan 02/06/26", payer: "Ab", remark: "", date: "June 2nd, 2026 11:34:00 PM" },
    { amount: 246046, id: "#86523698547", vpa: "1short entry siva 02/06/26", payer: "Ab", remark: "", date: "June 2nd, 2026 11:33:00 PM" },
    { amount: 184102, id: "#89653214753", vpa: "1short entry darshan 02/06/26", payer: "Ab", remark: "", date: "June 2nd, 2026 11:32:00 PM" },
    { amount: 41952, id: "#53698523147", vpa: "1short entry siva 02/06/26", payer: "Ab", remark: "", date: "June 2nd, 2026 11:32:00 PM" },
    { amount: 13832, id: "#96352145678", vpa: "1short entry darshan 01/06/026", payer: "Ab", remark: "", date: "June 1st, 2026 11:54:00 PM" },
    { amount: 195047, id: "#2369875641", vpa: "1short entry siva 01/06/26", payer: "Ab", remark: "", date: "June 1st, 2026 11:43:00 PM" },
    { amount: 2002, id: "#236985421365", vpa: "1short entry nargana", payer: "Ab", remark: "", date: "June 1st, 2026 11:39:00 PM" },
    { amount: 40882, id: "#34649785421", vpa: "1short entry darshan 01/06/26", payer: "Ab", remark: "", date: "June 1st, 2026 10:43:00 PM" },
    { amount: 76000, id: "#9874512365", vpa: "1short entry siva 31/05/26", payer: "Sv", remark: "verified", date: "May 31st, 2026 09:22:00 PM" },
    { amount: 11850, id: "#4587963214", vpa: "1short entry darshan 31/05/26", payer: "Dr", remark: "manual", date: "May 31st, 2026 07:40:00 PM" },
  ];

  const defaultSettlements = [
    { amount: 36050, id: "#615400874861", commission: "3%", commissionAmount: 1050, paid: 35000, remark: "", date: "June 3rd, 2026 12:37:00 AM" },
    { amount: 6695, id: "#6153230871864", commission: "3%", commissionAmount: 195, paid: 6500, remark: "", date: "June 3rd, 2026 12:10:00 AM" },
    { amount: 12020.1, id: "#615400873452", commission: "3%", commissionAmount: 350.1, paid: 11670, remark: "", date: "June 3rd, 2026 12:09:00 AM" },
    { amount: 6180, id: "#615400873506", commission: "3%", commissionAmount: 180, paid: 6000, remark: "", date: "June 3rd, 2026 12:09:00 AM" },
    { amount: 8240, id: "#615400873562", commission: "3%", commissionAmount: 240, paid: 8000, remark: "", date: "June 3rd, 2026 12:09:00 AM" },
    { amount: 25750, id: "#615400873620", commission: "3%", commissionAmount: 750, paid: 25000, remark: "", date: "June 3rd, 2026 12:09:00 AM" },
    { amount: 22459.15, id: "#615311827308", commission: "3%", commissionAmount: 654.15, paid: 21805, remark: "", date: "June 2nd, 2026 11:49:00 PM" },
    { amount: 20600, id: "#615311827418", commission: "3%", commissionAmount: 600, paid: 20000, remark: "", date: "June 2nd, 2026 11:49:00 PM" },
    { amount: 14420, id: "#615311829443", commission: "3%", commissionAmount: 420, paid: 14000, remark: "", date: "June 2nd, 2026 11:48:00 PM" },
    { amount: 17510, id: "#615312829551", commission: "3%", commissionAmount: 510, paid: 17000, remark: "", date: "June 2nd, 2026 11:48:00 PM" },
    { amount: 9270, id: "#615312830144", commission: "3%", commissionAmount: 270, paid: 9000, remark: "batched", date: "June 2nd, 2026 10:20:00 PM" },
    { amount: 51500, id: "#615312831002", commission: "3%", commissionAmount: 1500, paid: 50000, remark: "priority", date: "June 2nd, 2026 10:03:00 PM" },
  ];

  const defaultAdmins = [
    { id: "adm-001", username: "adminA", password: "Adm1n#Alpha", role: "admin", date: "June 7th, 2026 07:00:00 PM" },
    { id: "adm-002", username: "adminB", password: "Beta$Adm22", role: "admin", date: "June 7th, 2026 07:00:00 PM" },
    { id: "adm-003", username: "adminC", password: "Gamm@Adm33", role: "admin", date: "June 7th, 2026 07:00:00 PM" },
  ];

  const defaultUsers = [
    { id: "usr-001", username: "clientOne", password: "Cl1ent!One", role: "user", date: "June 7th, 2026 07:00:00 PM" },
    { id: "usr-002", username: "clientTwo", password: "Cl1ent@Two", role: "user", date: "June 7th, 2026 07:00:00 PM" },
    { id: "usr-003", username: "clientThree", password: "Cl1ent#Thr", role: "user", date: "June 7th, 2026 07:00:00 PM" },
  ];



  function cx() {
    return Array.from(arguments).filter(Boolean).join(" ");
  }

  function money(value, rupee) {
    const formatted = Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return rupee ? "₹" + formatted : formatted;
  }

  function nowLabel() {
    return new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function sortableValue(row, key) {
    if (key === "date") {
      const cleaned = String(row.date || "")
        .replace(" at ", " ")
        .replace(/(\d+)(st|nd|rd|th)/, "$1");
      const parsed = Date.parse(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return row[key];
  }

  function validatePassword(pw) {
    if (typeof pw !== "string") return "Password is required";
    if (pw.length < 8) return "Min 8 characters";
    if (pw.length > 16) return "Max 16 characters";
    if (/\s/.test(pw)) return "No spaces allowed";
    if (!/[A-Z]/.test(pw)) return "Need 1 uppercase letter";
    if (!/[a-z]/.test(pw)) return "Need 1 lowercase letter";
    if (!/[0-9]/.test(pw)) return "Need 1 number";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Need 1 special character";
    return "";
  }

  function navigate(route) {
    window.history.pushState({}, "", route);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function useRoute() {
    const [route, setRoute] = useState(window.location.pathname);
    useEffect(() => {
      const onPop = () => setRoute(window.location.pathname);
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }, []);
    return route;
  }

  // One-time purge of old localStorage data cache — Supabase is now the single source of truth.
  // This cleans up any stale cached data from the previous implementation.
  (function purgeStaleLocalStorage() {
    localStorage.removeItem("mumble-local-db");
    localStorage.removeItem("mumble-master-creds");
  })();


  function csvEscape(value) {
    const text = String(value == null ? "" : value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function downloadCsv(filename, headers, rows) {
    const csv = [headers.join(",")].concat(rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // ── Parse the stored date string into a JS timestamp ───────────────────────
  function parseDateLabel(str) {
    const cleaned = String(str || "").replace(" at ", " ").replace(/(\d+)(st|nd|rd|th)/, "$1");
    const ts = Date.parse(cleaned);
    return isNaN(ts) ? null : ts;
  }

  // ── Date-range download modal ───────────────────────────────────────────────
  function DateRangeModal({ onClose, onDownload, label }) {
    const today = new Date().toISOString().slice(0, 10);
    const [from, setFrom] = useState("");
    const [to, setTo]     = useState(today);
    const [err, setErr]   = useState("");

    function handleDownload() {
      if (!from) { setErr("Please select a From date."); return; }
      if (!to)   { setErr("Please select a To date.");   return; }
      if (from > to) { setErr("From date must be before To date."); return; }
      onDownload(from, to);
      onClose();
    }

    return h("div", { className: "drm-overlay", onClick: (e) => { if (e.target === e.currentTarget) onClose(); } },
      h("div", { className: "drm-box" },
        h("div", { className: "drm-header" },
          h("h3", null, "\uD83D\uDCE5 Download " + label),
          h("button", { className: "drm-close", onClick: onClose }, "\u2715")
        ),
        h("p", { className: "drm-sub" }, "Select a date range to export records as an Excel-compatible sheet."),
        h("div", { className: "drm-fields" },
          h("label", null, "From date",
            h("input", { type: "date", value: from, max: to || today, onChange: (e) => { setFrom(e.target.value); setErr(""); } })
          ),
          h("label", null, "To date",
            h("input", { type: "date", value: to, min: from, max: today, onChange: (e) => { setTo(e.target.value); setErr(""); } })
          )
        ),
        err && h("p", { className: "drm-error" }, err),
        h("div", { className: "drm-actions" },
          h("button", { className: "secondary-button", onClick: onClose }, "Cancel"),
          h("button", { className: "primary-button", onClick: handleDownload }, "\u2B07 Download")
        )
      )
    );
  }

  // ── Universal Search (master admin only) ────────────────────────────────────
  function UniversalSearch({ transactions, settlements, users, onSelectClient }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const q = query.trim().toLowerCase();

    const txResults = q.length < 2 ? [] : transactions.filter(r => {
      return Object.values(r).join(" ").toLowerCase().includes(q);
    }).slice(0, 5);
    const stResults = q.length < 2 ? [] : settlements.filter(r => {
      return Object.values(r).join(" ").toLowerCase().includes(q);
    }).slice(0, 5);
    const hasResults = txResults.length > 0 || stResults.length > 0;
    const CLIENT_COLORS = ["#1d4ed8","#15803d","#a16207","#9d174d","#6d28d9","#c2410c","#0369a1","#334155"];
    function clientColor(clientId, allUsers) {
      const idx = (allUsers || []).findIndex(u => u.id === clientId);
      return CLIENT_COLORS[Math.max(0,idx) % CLIENT_COLORS.length];
    }
    function clientName(clientId) {
      const u = (users || []).find(u => u.id === clientId);
      return u ? u.username : clientId;
    }

    return h("div", { className: "universal-search-wrap" },
      h("div", { className: "universal-search-bar" },
        h("span", { className: "usearch-icon" }, "\uD83D\uDD0D"),
        h("input", {
          className: "usearch-input",
          placeholder: "Search all clients, transactions, settlements...",
          value: query,
          onChange: e => { setQuery(e.target.value); setOpen(true); },
          onFocus: () => setOpen(true),
          onBlur: () => setTimeout(() => setOpen(false), 180),
        })
      ),
      open && q.length >= 2 && h("div", { className: "universal-results" },
        !hasResults && h("p", { className: "ures-empty" }, "No results for \"" + query + "\""),
        txResults.length > 0 && h("div", null,
          h("div", { className: "ures-group-label" }, "Transactions"),
          txResults.map(r => h("button", {
            key: r.id, className: "ures-item",
            onMouseDown: () => { onSelectClient(r.clientId); setQuery(""); setOpen(false); }
          },
            h("span", { className: "ures-client-chip", style: { background: clientColor(r.clientId, users) } }, clientName(r.clientId)),
            h("span", { className: "ures-id" }, r.id),
            h("span", { className: "ures-amount" }, money(r.amount, true))
          ))
        ),
        stResults.length > 0 && h("div", null,
          h("div", { className: "ures-group-label" }, "Settlements"),
          stResults.map(r => h("button", {
            key: r.id, className: "ures-item",
            onMouseDown: () => { onSelectClient(r.clientId); setQuery(""); setOpen(false); }
          },
            h("span", { className: "ures-client-chip", style: { background: clientColor(r.clientId, users) } }, clientName(r.clientId)),
            h("span", { className: "ures-id" }, r.id),
            h("span", { className: "ures-amount text-red" }, money(r.paid || r.amount, true))
          ))
        )
      )
    );
  }

  // ── Edit History Modal ──────────────────────────────────────────────────────
  function EditHistoryModal({ record, onClose }) {
    const history = record.editHistory || [];
    return h("div", { className: "drm-overlay", onClick: e => { if (e.target === e.currentTarget) onClose(); } },
      h("div", { className: "drm-box history-modal" },
        h("div", { className: "drm-header" },
          h("h3", null, "\uD83D\uDCCB Edit History — " + record.id),
          h("button", { className: "drm-close", onClick: onClose }, "\u2715")
        ),
        history.length === 0
          ? h("p", { className: "drm-sub" }, "No edit history yet. Edits will appear here after the audit columns are added in Supabase.")
          : h("div", { className: "history-timeline" },
              history.slice().reverse().map((entry, i) =>
                h("div", { key: i, className: "history-entry" },
                  h("div", { className: "history-meta" },
                    h("span", { className: "history-actor" }, entry.by || "master"),
                    h("span", { className: "history-ts" }, entry.at || "")
                  ),
                  entry.before && entry.after && h("div", { className: "history-diff" },
                    Object.keys(entry.after).filter(k => String(entry.before[k]) !== String(entry.after[k])).map(k =>
                      h("div", { key: k, className: "history-diff-row" },
                        h("span", { className: "diff-key" }, k),
                        h("span", { className: "diff-before" }, String(entry.before[k] ?? "")),
                        h("span", { className: "diff-arrow" }, "→"),
                        h("span", { className: "diff-after" }, String(entry.after[k] ?? ""))
                      )
                    )
                  )
                )
              )
            ),
        h("div", { className: "drm-actions" },
          h("button", { className: "secondary-button", onClick: onClose }, "Close")
        )
      )
    );
  }

  // ── Activity Feed ───────────────────────────────────────────────────────────
  function ActivityFeed({ auditLog, users }) {
    const [filter, setFilter] = useState("all");
    const [clientFilter, setClientFilter] = useState("");
    const [open, setOpen] = useState(true);
    const log = (auditLog || []).filter(e => {
      if (filter !== "all" && e.action !== filter) return false;
      if (clientFilter && e.client_id !== clientFilter) return false;
      return true;
    });
    const actionIcon = { add: "\u2795", edit: "\u270F\uFE0F", delete: "\uD83D\uDDD1\uFE0F", restore: "\u21A9\uFE0F" };
    const actionColor = { add: "#15803d", edit: "#1d4ed8", delete: "#dc2626", restore: "#d97706" };
    function clientName(id) { const u = (users||[]).find(u=>u.id===id); return u?u.username:id; }

    return h("section", { className: "admin-card activity-feed-card" },
      h("div", { className: "panel-title" },
        h("div", { className: "panel-title-left" },
          h("span", { className: "panel-type-dot", style:{background:"#6d28d9"} }),
          h("h2", null, "\uD83D\uDD53 Activity Log")
        ),
        h("button", { className: "secondary-button", onClick: () => setOpen(o=>!o) }, open ? "\u2303 Collapse" : "\u2304 Expand")
      ),
      open && h("div", null,
        h("div", { className: "feed-filters" },
          h("select", { value: filter, onChange: e=>setFilter(e.target.value) },
            h("option", { value: "all" }, "All Actions"),
            h("option", { value: "add" }, "Add"),
            h("option", { value: "edit" }, "Edit"),
            h("option", { value: "delete" }, "Delete"),
            h("option", { value: "restore" }, "Restore")
          ),
          h("select", { value: clientFilter, onChange: e=>setClientFilter(e.target.value) },
            h("option", { value: "" }, "All Clients"),
            (users||[]).map(u => h("option", { key: u.id, value: u.id }, u.username))
          )
        ),
        auditLog && auditLog.length === 0
          ? h("p", { className: "feed-empty" }, "No activity yet. Actions will appear here once the audit_log table is created in Supabase.")
          : h("div", { className: "feed-list" },
              log.length === 0
                ? h("p", { className: "feed-empty" }, "No matching entries.")
                : log.map((entry, i) =>
                    h("div", { key: i, className: "feed-entry" },
                      h("span", { className: "feed-action-badge", style: { background: actionColor[entry.action] || "#6b7280" } },
                        (actionIcon[entry.action] || "\u2022") + " " + (entry.action || "").toUpperCase()
                      ),
                      h("span", { className: "feed-desc" },
                        (entry.record_type || "") + " " + (entry.record_id || "") +
                        (entry.client_id ? " — " + clientName(entry.client_id) : "")
                      ),
                      h("span", { className: "feed-time" }, new Date(entry.created_at).toLocaleString("en-IN", { day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" }))
                    )
                  )
            )
      )
    );
  }

  // ── Loading / Error UI ─────────────────────────────────────────────────────
  function LoadingScreen() {
    return h("div", { className: "loading-screen" },
      h("div", { className: "loading-spinner" }),
      h("p", null, "Connecting to Supabase…")
    );
  }

  function ErrorBanner({ message, onDismiss }) {
    return h("div", { className: "db-error-banner" },
      h("span", { className: "db-error-icon" }, "⚠"),
      h("span", null, "Supabase unreachable — showing cached local data. ", h("strong", null, message)),
      h("button", { onClick: onDismiss, "aria-label": "Dismiss" }, "✕")
    );
  }

  // ── Toast Notification System ──────────────────────────────────────────────
  function useToast() {
    const [toasts, setToasts] = useState([]);
    function showToast(message, type) {
      const id = Date.now() + Math.random();
      setToasts(function(prev) { return prev.concat({ id, message, type: type || "success" }); });
      setTimeout(function() {
        setToasts(function(prev) { return prev.filter(function(t) { return t.id !== id; }); });
      }, 3500);
    }
    return { toasts, showToast };
  }

  function ToastContainer({ toasts }) {
    if (!toasts || toasts.length === 0) return null;
    return h("div", { className: "toast-container", "aria-live": "polite" },
      toasts.map(function(t) {
        return h("div", { key: t.id, className: "toast toast-" + t.type },
          h("span", { className: "toast-icon" }, t.type === "success" ? "✓" : t.type === "error" ? "✗" : "ℹ"),
          h("span", { className: "toast-message" }, t.message)
        );
      })
    );
  }

  // ── Table Hook ─────────────────────────────────────────────────────────────
  function useTable(records, type, defaults) {
    const [filters, setFilters] = useState({ amount: "", id: "", query: "" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sort, setSort] = useState({ key: "date", direction: "desc" });
    const [refreshedAt, setRefreshedAt] = useState(new Date());

    const filtered = useMemo(() => {
      const minAmount = Number(filters.amount || 0);
      const idQuery = filters.id.trim().toLowerCase();
      const textQuery = filters.query.trim().toLowerCase();
      return records.filter((row) => {
        const rowText = Object.values(row).join(" ").toLowerCase();
        return (!minAmount || row.amount >= minAmount)
          && (!idQuery || row.id.toLowerCase().includes(idQuery.replace(/^#/, "")) || row.id.toLowerCase().includes(idQuery))
          && (!textQuery || rowText.includes(textQuery));
      });
    }, [records, filters]);

    const sorted = useMemo(() => filtered.slice().sort((a, b) => {
      const left = sortableValue(a, sort.key);
      const right = sortableValue(b, sort.key);
      const aValue = typeof left === "number" ? left : String(left);
      const bValue = typeof right === "number" ? right : String(right);
      if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      return 0;
    }), [filtered, sort]);

    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, pages);
    const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
    const totals = useMemo(() => {
      const amount = filtered.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const commission = type === "settlement" ? filtered.reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0) : 0;
      const paid = type === "settlement" ? filtered.reduce((sum, row) => sum + Number(row.paid || 0), 0) : 0;
      return {
        count: defaults.count || filtered.length,
        amount: defaults.amount || amount,
        commission: defaults.commission || commission,
        paid: defaults.paid || paid,
        balance: defaults.balance,
        filteredCount: filtered.length,
      };
    }, [filtered, defaults, type]);

    function updateFilter(name, value) {
      setFilters((current) => ({ ...current, [name]: value }));
      setPage(1);
    }

    return {
      filters,
      updateFilter,
      clear: () => {
        setFilters({ amount: "", id: "", query: "" });
        setPage(1);
      },
      refresh: () => setRefreshedAt(new Date()),
      refreshedAt,
      sort,
      toggleSort: (key) => setSort((current) => ({
        key,
        direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
      })),
      setSortDirection: (direction) => setSort((current) => ({ ...current, direction })),
      page: safePage,
      setPage,
      pageSize,
      setPageSize: (size) => {
        setPageSize(Number(size));
        setPage(1);
      },
      pages,
      rows,
      allRows: sorted,
      totals,
    };
  }

  function IconButton({ label, children, active, onClick }) {
    return h("button", { className: cx("icon-button", active && "active"), title: label, "aria-label": label, onClick }, children);
  }

  function Logo() {
    return h("div", { className: "brand-mark", "aria-label": appName }, h("span", null), h("span", null));
  }

  function Login({ onLogin, admins, users, masterCreds }) {
    const [loginRole, setLoginRole] = useState("user");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const titles = { user: "Welcome Back", admin: "Admin Access", masteradmin: "Master Admin" };
    const subtitles = { user: "Please sign in to continue", admin: "Sign in to manage records", masteradmin: "Full control access" };

    function submit(e) {
      e.preventDefault();
      if (loginRole === "masteradmin") {
        // masterCreds comes from Supabase master_config table
        const mc = masterCreds || { username: "masterLead", password: "Mumb!e@999" };
        if (username === mc.username && password === mc.password) {
          setError("");
          onLogin("masteradmin");
          navigate("/admin");
        } else {
          setError("Invalid ID or password");
        }
      } else if (loginRole === "admin") {
        // Check Supabase admin list only
        const found = (admins || []).find(function (adm) {
          return adm.username === username && adm.password === password;
        });
        if (found) {
          setError("");
          onLogin("admin");
          navigate("/admin");
        } else {
          setError("Invalid ID or password");
        }
      } else {
        // Client/User login checking database users
        const found = (users || []).find(function (usr) {
          return usr.username === username && usr.password === password;
        });
        if (found) {
          setError("");
          onLogin("user", found.id);
          navigate("/dashboards/home");
        } else {
          setError("Invalid ID or password");
        }
      }
    }

    return h("main", { className: cx("login-page", "bg-" + loginRole) },
      h("div", { className: "role-selector-wrap" },
        h("div", { className: "role-selector" },
          h("select", { value: loginRole, onChange: (e) => { setLoginRole(e.target.value); setError(""); } },
            h("option", { value: "user" }, "User"),
            h("option", { value: "admin" }, "Admin"),
            h("option", { value: "masteradmin" }, "Master Admin")
          ),
          h("div", { className: cx("role-display", "role-display-" + loginRole), "aria-hidden": true },
            loginRole === "user" ? "User" : loginRole === "admin" ? "Admin" : "Master Admin",
            h("svg", { className: "role-chevron", width: "18", height: "12", viewBox: "0 0 18 12", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
              h("path", { d: "M2 2.5L9 9.5L16 2.5", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" })
            )
          )
        )
      ),
      h("form", { className: "login-card", onSubmit: submit },
        h(Logo),
        h("h1", null, appName),
        h("h2", { className: "title-" + loginRole }, titles[loginRole] || "Sign In"),
        h("p", null, subtitles[loginRole] || ""),
        h("label", null, "User ID", h("input", {
          autoComplete: "username",
          placeholder: "Enter User ID",
          value: username,
          onChange: (e) => setUsername(e.target.value),
        })),
        h("label", null, "Password", h("input", {
          autoComplete: "current-password",
          type: "password",
          placeholder: "Enter Password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
        })),
        error && h("div", { className: "error" }, error),
        h("button", { className: "primary-button" }, "Sign In"),
        h("div", { className: "legal-links" },
          h("a", { href: "##" }, "Privacy Notice")
        )
      )
    );
  }

  function Shell({ route, data, onLogout, onResetDb, onRefreshData, dbError, onDismissError, currentUser }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [compact, setCompact] = useState(localStorage.getItem("mumble-density") === "compact");
    const isSettings = route.startsWith("/settings");
    const nav = [
      ["/dashboards/home", "Home"],
      ["/dashboards/userRole/transaction", "Recent Transactions"],
      ["/dashboards/userRole/settlement", "Recent Settlement"],
      ["/dashboards/userRole/history/transaction", "Transaction History"],
      ["/dashboards/userRole/history/settlement", "Settlement History"],
    ];
    const displayName = currentUser ? currentUser.username : "User";
    const initials = displayName.slice(0, 2).toUpperCase();

    function toggleDensity() {
      const next = !compact;
      setCompact(next);
      localStorage.setItem("mumble-density", next ? "compact" : "comfortable");
    }

    // Block browser back gesture — push a dummy state so swipe-back needs 2 gestures
    useEffect(function() {
      window.history.pushState({ noBack: true }, "");
      function onPop(e) {
        // Immediately re-push so the user stays on the current page
        window.history.pushState({ noBack: true }, "");
      }
      window.addEventListener("popstate", onPop);
      return function() { window.removeEventListener("popstate", onPop); };
    }, [route]);

    return h("div", { className: cx("app-shell", compact && "compact") },
      h("aside", { className: "rail" },
        h(Logo),
        h("div", { className: "rail-stack" },
          IconButton({ label: "Dashboard", active: !isSettings, onClick: () => navigate("/dashboards/home"), children: "⌂" }),
          IconButton({ label: "Settings", active: isSettings, onClick: () => navigate("/settings/appearance"), children: "⚙" })
        ),
        h("button", { className: "avatar-dot", title: displayName, onClick: () => setProfileOpen(!profileOpen) }, initials)
      ),
      h("aside", { className: "sidebar" },
        h("h1", null, isSettings ? "Settings" : appName),
        h("div", { className: "sidebar-user-chip" },
          h("span", { className: "sidebar-user-name" }, displayName)
        ),
        isSettings
          ? h(React.Fragment, null,
              h("button", { className: "side-link active", onClick: () => navigate("/settings/appearance") }, "Appearance"),
              h("a", { className: "side-link", href: "mailto:help@mumble.local" }, "Ask a Question")
            )
          : nav.map(([href, label]) => h("button", {
              key: href,
              className: cx("side-link", route === href && "active"),
              onClick: () => navigate(href),
            }, label)),
        h("div", { className: "sidebar-bottom" },
          h("button", { className: cx("mode", !compact && "active"), onClick: toggleDensity }, "Comfort"),
          h("button", { className: cx("mode", compact && "active"), onClick: toggleDensity }, "Compact")
        )
      ),
      h("header", { className: "topbar" },
        h("div", { className: "topbar-user" },
          h("span", { className: "topbar-username" }, displayName)
        ),
        h("button", { className: "header-avatar", onClick: () => setProfileOpen(!profileOpen), "aria-expanded": profileOpen }, initials)
      ),
      profileOpen && h(ProfileMenu, { onLogout, currentUser }),
      dbError && h(ErrorBanner, { message: dbError, onDismiss: onDismissError }),
      h("main", { className: "content" },
        route === "/dashboards/home" && h(Home, { currentUser, onRefreshData }),
        route === "/dashboards/userRole/transaction" && h(TransactionPage, { mode: "recent", records: data.transactions, allTransactions: data.transactions, allSettlements: data.settlements, onRefreshData, currentUser }),
        route === "/dashboards/userRole/settlement" && h(SettlementPage, { mode: "recent", records: data.settlements, allTransactions: data.transactions, allSettlements: data.settlements, onRefreshData, currentUser }),
        route === "/dashboards/userRole/history/transaction" && h(TransactionPage, { mode: "history", records: data.transactions, allTransactions: data.transactions, allSettlements: data.settlements, onRefreshData, currentUser }),
        route === "/dashboards/userRole/history/settlement" && h(SettlementPage, { mode: "history", records: data.settlements, allTransactions: data.transactions, allSettlements: data.settlements, onRefreshData, currentUser }),
        isSettings && h(Appearance, { compact, toggleDensity, onResetDb }),
        !isSettings && !route.startsWith("/dashboards") && h(NotFound)
      )
    );
  }

  function ProfileMenu({ onLogout, currentUser }) {
    const displayName = currentUser ? currentUser.username : "User";
    const initials = displayName.slice(0, 2).toUpperCase();
    return h("section", { className: "profile-menu" },
      h("div", { className: "profile-head" },
        h("div", { className: "profile-pic" }, initials),
        h("div", { className: "profile-head-info" },
          h("span", { className: "profile-display-name" }, displayName)
        )
      ),
      h("button", { onClick: () => navigate("/dashboards/userRole/settlement") },
        h("span", { className: "tile-icon" }, "₹"),
        h("strong", null, "Billing"),
        h("small", null, "Settlement ledger")
      ),
      h("button", { onClick: () => navigate("/settings/appearance") },
        h("span", { className: "tile-icon" }, "⚙"),
        h("strong", null, "Settings"),
        h("small", null, "Webapp settings")
      ),
      h("button", { className: "logout", onClick: onLogout }, "↪ Logout")
    );
  }

  function Breadcrumb({ current }) {
    return h("nav", { className: "crumbs" },
      h("button", { onClick: () => navigate("/dashboards/home") }, appName),
      h("span", null, "›"),
      h("span", null, current)
    );
  }

  function Home({ currentUser, onRefreshData }) {
    const [refreshing, setRefreshing] = useState(false);
    const displayName = currentUser ? currentUser.username : "User";
    const userId = currentUser ? currentUser.id : "";

    async function handleRefresh() {
      setRefreshing(true);
      if (onRefreshData) await onRefreshData();
      setRefreshing(false);
    }

    return h("section", { className: "home-grid" },
      h("div", { className: "home-title" },
        h("div", { className: "home-user-badge" },
          h("span", { className: "home-welcome" }, "Welcome back,"),
          h("strong", { className: "home-username" }, displayName)
        ),
        h("h2", null, "Payment and settlement control panel"),
        h("button", {
          className: "refresh-btn",
          onClick: handleRefresh,
          disabled: refreshing,
          title: "Refresh data from server"
        }, refreshing ? "↺ Refreshing…" : "↺ Refresh Data")
      ),
      h("div", { className: "home-cards" },
        h("button", { className: "home-card-tx", onClick: () => navigate("/dashboards/userRole/transaction") },
          h("span", { className: "home-card-icon" }, "💳"),
          h("strong", null, "Recent Transactions"),
          h("span", null, "Review incoming payment entries")
        ),
        h("button", { className: "home-card-st", onClick: () => navigate("/dashboards/userRole/settlement") },
          h("span", { className: "home-card-icon" }, "₹"),
          h("strong", null, "Recent Settlement"),
          h("span", null, "Track commission and payout lines")
        ),
        h("button", { className: "home-card-hist", onClick: () => navigate("/dashboards/userRole/history/transaction") },
          h("span", { className: "home-card-icon" }, "🔍"),
          h("strong", null, "History Search"),
          h("span", null, "Filter by amount or transaction ID")
        )
      )
    );
  }

  function Stat({ label, value, tone }) {
    let icon = "";
    if (label.includes("Count")) icon = "💳 ";
    if (label.includes("Amount")) icon = "₹ ";
    return h("div", { className: cx("stat", tone) }, h("span", null, icon + label), h("strong", null, value));
  }

  // Shared summary shown on both Recent Transaction and Recent Settlement pages
  function SummaryStats({ type, allTransactions, allSettlements }) {
    const txTotal  = allTransactions.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const stTotal  = allSettlements.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const balance  = txTotal - stTotal;
    const countLabel = type === "transaction" ? "Transaction Count" : "Settlement Count";
    const countValue = type === "transaction" ? allTransactions.length : allSettlements.length;
    
    return h("div", { className: "stats summary-stats" },
      h(Stat, { label: countLabel,           value: countValue + " records", tone: "orange" }),
      h(Stat, { label: "Transaction Amount", value: money(txTotal, false),  tone: "green" }),
      h(Stat, { label: "Balance Amount",     value: money(balance, false),  tone: "red" })
    );
  }

  function Controls({ table, showQuery, onDownload, onRefreshData }) {
    return h("div", { className: "search-grid" },
      h("label", null, "Amount", h("input", {
        inputMode: "numeric",
        placeholder: "Minimum amount",
        value: table.filters.amount,
        onChange: (e) => table.updateFilter("amount", e.target.value),
      })),
      h("label", null, "Transaction Id", h("input", {
        placeholder: "Enter Transaction Id",
        value: table.filters.id,
        onChange: (e) => table.updateFilter("id", e.target.value),
      })),
      showQuery && h("label", null, "Search Text", h("input", {
        placeholder: "Payer, remark or VPA",
        value: table.filters.query,
        onChange: (e) => table.updateFilter("query", e.target.value),
      })),
      h("label", null, "Date Range", h("input", { value: "2026-05-04 to 2026-06-04", readOnly: true })),
      h("div", { className: "control-actions" },
        h("button", { className: "secondary-button", onClick: onDownload }, "Download Sheet")
      )
    );
  }

  function Pager({ table }) {
    // Sliding window of 5 pages around the current page
    let startPage = Math.max(1, table.page - 2);
    let endPage = Math.min(table.pages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    const pageButtons = [];
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(i);
    }

    return h("div", { className: "pager" },
      h("span", null, "Rows per page:"),
      h("select", { value: table.pageSize, onChange: (e) => table.setPageSize(e.target.value) },
        [5, 10, 20, 50, 100].map((size) => h("option", { key: size, value: size }, size))
      ),
      h("button", { disabled: table.page === 1, onClick: () => table.setPage(1) }, "«"),
      h("button", { disabled: table.page === 1, onClick: () => table.setPage(table.page - 1) }, "‹"),
      pageButtons.map((n) => h("button", { key: n, className: n === table.page ? "active" : "", onClick: () => table.setPage(n) }, n)),
      h("button", { disabled: table.page === table.pages, onClick: () => table.setPage(table.page + 1) }, "›"),
      h("button", { disabled: table.page === table.pages, onClick: () => table.setPage(table.pages) }, "»"),
      h("span", { className: "pager-info" }, `Page ${table.page} of ${table.pages}`)
    );
  }

  function SortHeader({ label, keyName, table }) {
    const active = table.sort.key === keyName;
    return h("button", { className: cx("sort-head", active && "active"), onClick: () => table.toggleSort(keyName) },
      label, active ? (table.sort.direction === "asc" ? " ↑" : " ↓") : ""
    );
  }

  function DataTable({ type, table }) {
    const heads = type === "transaction"
      ? [["Amount", "amount"], ["Transaction Id", "id"], ["VPA", "vpa"], ["Payer Name", "payer"], ["Remark", "remark"], ["Entry Date", "date"]]
      : [["Amount", "amount"], ["Transaction Id", "id"], ["Paid Amount", "paid"], ["Remark", "remark"], ["Entry Date", "date"]];

    return h("div", { className: "table-wrap" },
      h("table", null,
        h("thead", null, h("tr", null, heads.map(([label, key]) => h("th", { key }, h(SortHeader, { label, keyName: key, table }))))),
        h("tbody", null,
          table.rows.length === 0
            ? h("tr", null, h("td", { colSpan: heads.length, className: "empty-row" }, "No records match the current filters."))
            : table.rows.map((row) => type === "transaction"
                ? h("tr", { key: row.id },
                    h("td", { className: "text-green" }, money(row.amount, true)),
                    h("td", { className: "transaction-id" }, row.id),
                    h("td", null, row.vpa),
                    h("td", null, row.payer),
                    h("td", null, row.remark || "—"),
                    h("td", null, row.date)
                  )
                : h("tr", { key: row.id },
                    h("td", { className: "text-green" }, money(row.amount, false)),
                    h("td", { className: "transaction-id" }, row.id),
                    h("td", { className: "text-red" }, money(row.paid, true)),
                    h("td", null, row.remark || "—"),
                    h("td", null, row.date)
                  )
              )
        )
      )
    );
  }

  function LastUpdated({ table }) {
    return h("p", { className: "updated" }, "Last refreshed: " + table.refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }

  function TransactionPage({ mode, records, allTransactions, allSettlements, onRefreshData, currentUser }) {
    const [refreshing, setRefreshing] = useState(false);
    const table = useTable(records, "transaction", { count: records.length, amount: records.reduce((sum, row) => sum + Number(row.amount || 0), 0) });
    const title = mode === "recent" ? "Recent Transactions" : "Search Transaction History";

    async function handleRefresh() {
      setRefreshing(true);
      table.refresh();
      if (onRefreshData) await onRefreshData();
      setRefreshing(false);
    }

    const [showDlModal, setShowDlModal] = useState(false);

    function download(from, to) {
      const fromTs = from ? new Date(from).setHours(0, 0, 0, 0) : null;
      const toTs   = to   ? new Date(to).setHours(23, 59, 59, 999) : null;
      const source = (from || to) ? table.allRows.filter((row) => {
        const ts = parseDateLabel(row.date);
        if (ts === null) return false;
        if (fromTs && ts < fromTs) return false;
        if (toTs   && ts > toTs)   return false;
        return true;
      }) : table.allRows;
      const rows = source.map((row) => ({
        Amount: money(row.amount, true),
        "Transaction Id": row.id,
        VPA: row.vpa,
        "Payer Name": row.payer,
        Remark: row.remark,
        "Entry Date": row.date,
      }));
      downloadCsv("mumble-transactions.csv", ["Amount", "Transaction Id", "VPA", "Payer Name", "Remark", "Entry Date"], rows);
    }

    return h("section", null,
      showDlModal && h(DateRangeModal, { label: "Transactions", onClose: () => setShowDlModal(false), onDownload: download }),
      h(Breadcrumb, { current: mode === "recent" ? "Recent Transactions" : "Transaction History" }),
      currentUser && h("div", { className: "page-client-banner tx-banner" },
        h("span", { className: "page-client-label" }, "Viewing data for"),
        h("strong", { className: "page-client-name" }, currentUser.username)
      ),
      h("div", { className: "panel panel-tx" },
        h("div", { className: "panel-title" },
          h("div", { className: "panel-title-left" },
            h("span", { className: "panel-type-dot tx-dot" }),
            h("h2", null, title)
          ),
          h("div", { className: "panel-title-actions" },
            mode === "recent" && h("select", {
              className: "sort-select",
              value: table.sort.direction,
              onChange: (e) => table.setSortDirection(e.target.value)
            },
              h("option", { value: "desc" }, "Newest to Oldest"),
              h("option", { value: "asc" }, "Oldest to Newest")
            ),
            h("button", {
              className: cx("refresh-btn", refreshing && "refreshing"),
              onClick: handleRefresh,
              disabled: refreshing,
              title: "Refresh from server"
            }, refreshing ? "↺…" : "↺ Refresh"),
            h(LastUpdated, { table }),
            h("button", { className: "dl-range-btn", onClick: () => setShowDlModal(true) }, "⬇ Download Records")
          )
        ),
        mode === "recent"
          ? h(SummaryStats, { type: "transaction", allTransactions, allSettlements })
          : h("div", { className: "stats history-stats" },
              h(Stat, { label: "Transaction Count",  value: table.totals.filteredCount + " records", tone: "orange" }),
              h(Stat, { label: "Transaction Amount", value: money(table.totals.amount, false), tone: "green" })
            ),
        h(Controls, { table, showQuery: mode === "history", onDownload: download, onRefreshData }),
        h(DataTable, { type: "transaction", table }),
        h(Pager, { table })
      )
    );
  }

  function SettlementPage({ mode, records, allTransactions, allSettlements, onRefreshData, currentUser }) {
    const [refreshing, setRefreshing] = useState(false);
    const totalCommission = records.reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0);
    const totalPaid       = records.reduce((sum, row) => sum + Number(row.paid || 0), 0);
    const table = useTable(records, "settlement", { count: records.length, commission: totalCommission, paid: totalPaid });
    const title = mode === "recent" ? "Recent Settlements" : "Search Settlement History";

    async function handleRefresh() {
      setRefreshing(true);
      table.refresh();
      if (onRefreshData) await onRefreshData();
      setRefreshing(false);
    }

    const [showDlModal, setShowDlModal] = useState(false);

    function download(from, to) {
      const fromTs = from ? new Date(from).setHours(0, 0, 0, 0) : null;
      const toTs   = to   ? new Date(to).setHours(23, 59, 59, 999) : null;
      const source = (from || to) ? table.allRows.filter((row) => {
        const ts = parseDateLabel(row.date);
        if (ts === null) return false;
        if (fromTs && ts < fromTs) return false;
        if (toTs   && ts > toTs)   return false;
        return true;
      }) : table.allRows;
      const rows = source.map((row) => ({
        Amount: money(row.amount, false),
        "Transaction Id": row.id,
        "Paid Amount": money(row.paid, true),
        Remark: row.remark,
        "Entry Date": row.date,
      }));
      downloadCsv("mumble-settlements.csv", ["Amount", "Transaction Id", "Paid Amount", "Remark", "Entry Date"], rows);
    }

    return h("section", null,
      showDlModal && h(DateRangeModal, { label: "Settlements", onClose: () => setShowDlModal(false), onDownload: download }),
      h(Breadcrumb, { current: mode === "recent" ? "Recent Settlements" : "Settlement History" }),
      currentUser && h("div", { className: "page-client-banner st-banner" },
        h("span", { className: "page-client-label" }, "Viewing data for"),
        h("strong", { className: "page-client-name" }, currentUser.username)
      ),
      h("div", { className: "panel panel-st" },
        h("div", { className: "panel-title" },
          h("div", { className: "panel-title-left" },
            h("span", { className: "panel-type-dot st-dot" }),
            h("h2", null, title)
          ),
          h("div", { className: "panel-title-actions" },
            mode === "recent" && h("select", {
              className: "sort-select",
              value: table.sort.direction,
              onChange: (e) => table.setSortDirection(e.target.value)
            },
              h("option", { value: "desc" }, "Newest to Oldest"),
              h("option", { value: "asc" }, "Oldest to Newest")
            ),
            h("button", {
              className: cx("refresh-btn", refreshing && "refreshing"),
              onClick: handleRefresh,
              disabled: refreshing,
              title: "Refresh from server"
            }, refreshing ? "↺…" : "↺ Refresh"),
            h(LastUpdated, { table }),
            h("button", { className: "dl-range-btn", onClick: () => setShowDlModal(true) }, "⬇ Download Records")
          )
        ),
        mode === "recent"
          ? h(SummaryStats, { type: "settlement", allTransactions, allSettlements })
          : h("div", { className: cx("stats history-stats", "three") },
              h(Stat, { label: "Settlement Count",   value: table.totals.filteredCount + " records", tone: "orange" }),
              h(Stat, { label: "Settlement Amount",  value: money(table.totals.paid, false), tone: "green" })
            ),
        h(Controls, { table, showQuery: mode === "history", onDownload: download, onRefreshData }),
        h(DataTable, { type: "settlement", table }),
        h(Pager, { table })
      )
    );
  }

  function recordValue(record, key) {
    return record[key] == null ? "" : String(record[key]);
  }

  function parseCommissionRate(commissionStr) {
    // Accepts "3%", "3.5%", "3", "3.5" — returns a fraction (e.g. 0.03)
    const raw = String(commissionStr || "").replace(/[^0-9.]/g, "");
    const num = parseFloat(raw);
    return isNaN(num) ? 0 : num / 100;
  }

  function calcCommissionAmount(amount, commission) {
    const amt = parseFloat(amount) || 0;
    const rate = parseCommissionRate(commission);
    return parseFloat((amt * rate).toFixed(2));
  }

  function CrudManager({ type, records, deletedRecords, onSave, onDelete, onRestore, canEdit, canDelete, isMaster, users, showToast, onAuditLog }) {
    const emptyTransaction = { clientId: "", amount: "", id: "", vpa: "", payer: "", remark: "", date: nowLabel() };
    const emptySettlement = { clientId: "", amount: "", id: "", commission: "3", paid: "", remark: "", date: nowLabel() };
    const empty = type === "transaction" ? emptyTransaction : emptySettlement;
    const [form, setForm] = useState(empty);
    const [editingId, setEditingId] = useState("");
    const [saveError, setSaveError] = useState("");
    const [saving, setSaving] = useState(false);
    const [showSuccessAnim, setShowSuccessAnim] = useState(false);
    const [commissionUnlocked, setCommissionUnlocked] = useState(false);
    const [showDlModal, setShowDlModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [historyRecord, setHistoryRecord] = useState(null);
    const [bulkExporting, setBulkExporting] = useState(false);

    const allSelected = records.length > 0 && records.every(r => selectedIds.has(r.id));
    function toggleSelect(id) { setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
    function toggleSelectAll() { setSelectedIds(allSelected ? new Set() : new Set(records.map(r => r.id))); }

    function downloadRange(from, to) {
      const fromTs = from ? new Date(from).setHours(0, 0, 0, 0) : null;
      const toTs   = to   ? new Date(to).setHours(23, 59, 59, 999) : null;
      const source = records.filter((row) => {
        if (!from && !to) return true;
        const ts = parseDateLabel(row.date);
        if (ts === null) return false;
        if (fromTs && ts < fromTs) return false;
        if (toTs   && ts > toTs)   return false;
        return true;
      });
      const isT = type === "transaction";
      const headers = isT
        ? ["Amount", "Transaction Id", "VPA", "Payer Name", "Remark", "Entry Date"]
        : ["Amount", "Transaction Id", "Paid Amount", "Remark", "Entry Date"];
      const rows = source.map((row) => isT ? ({
        Amount: money(row.amount, true),
        "Transaction Id": row.id,
        VPA: row.vpa,
        "Payer Name": row.payer,
        Remark: row.remark,
        "Entry Date": row.date,
      }) : ({
        Amount: money(row.amount, false),
        "Transaction Id": row.id,
        "Paid Amount": money(row.paid, true),
        Remark: row.remark,
        "Entry Date": row.date,
      }));
      downloadCsv("mumble-" + type + "s.csv", headers, rows);
    }

    const sectionClass = type === "transaction" ? "admin-card admin-card-tx" : "admin-card admin-card-st";
    const typeLabel = type === "transaction" ? "Transaction" : "Settlement";

    // Editable fields
    const baseTxFields = [["amount", "Amount"], ["id", "Transaction Id"], ["vpa", "VPA"], ["payer", "Payer Name"], ["remark", "Remark"], ["date", "Entry Date"]];
    const baseStFields = [["paid", "Paid Amount"], ["id", "Transaction Id"], ["commission", "Commission"], ["remark", "Remark"], ["date", "Entry Date"]];
    const fields = type === "transaction"
      ? (isMaster ? [["clientId", "Client"]].concat(baseTxFields) : baseTxFields)
      : (isMaster ? [["clientId", "Client"]].concat(baseStFields) : baseStFields);

    const baseTxTableFields = [["amount", "Amount"], ["id", "Transaction Id"], ["vpa", "VPA"], ["payer", "Payer Name"], ["remark", "Remark"], ["date", "Entry Date"]];
    const baseStTableFields = [["amount", "Amount"], ["id", "Transaction Id"], ["commission", "Commission"], ["commissionAmount", "Commission Amount"], ["paid", "Paid Amount"], ["remark", "Remark"], ["date", "Entry Date"]];
    const tableFields = type === "transaction"
      ? (isMaster ? [["clientId", "Client"]].concat(baseTxTableFields) : baseTxTableFields)
      : (isMaster ? [["clientId", "Client"]].concat(baseStTableFields) : baseStTableFields);

    function update(name, value) {
      setForm((current) => ({ ...current, [name]: value }));
    }

    async function submit(e) {
      e.preventDefault();
      setSaveError("");
      setSaving(true);
      const prepared = Object.assign({}, form);
      if (type === "settlement") {
        const commNum = String(form.commission || "0").replace(/[^0-9.]/g, "");
        prepared.commission = commNum + "%";
        prepared.paid = Number(form.paid || 0);
        prepared.commissionAmount = calcCommissionAmount(form.paid, commNum + "%");
        prepared.amount = prepared.paid + prepared.commissionAmount;
      } else {
        prepared.amount = Number(form.amount || 0);
      }
      // Always stamp the current time on new records
      if (!editingId) prepared.date = nowLabel();
      prepared.id = prepared.id.startsWith("#") ? prepared.id : "#" + prepared.id;
      try {
        await onSave(prepared, editingId);
        setForm(empty);
        const wasEditing = !!editingId;
        setEditingId("");
        if (!wasEditing) {
          setShowSuccessAnim(true);
          setTimeout(() => setShowSuccessAnim(false), 2000);
          if (onAuditLog) onAuditLog({ action: "add", record_type: type, record_id: prepared.id, client_id: prepared.clientId });
        } else {
          if (showToast) showToast(typeLabel + " updated successfully!", "success");
          if (onAuditLog) onAuditLog({ action: "edit", record_type: type, record_id: prepared.id, client_id: prepared.clientId });
        }
      } catch (err) {
        let msg = err.message;
        if (msg.includes("duplicate key value violates unique constraint")) {
          msg = "Transaction ID already exists. Please check the Transaction ID field.";
        } else if (msg.includes("null value in column")) {
          msg = "A required field is missing. Please check all fields.";
        } else if (msg.includes("invalid input syntax")) {
          msg = "Invalid format in one of the fields (e.g., amount must be a valid number).";
        } else if (msg.includes("foreign key constraint")) {
          msg = "The selected Client does not exist or is invalid.";
        }
        setSaveError(msg);
        if (showToast) showToast("Failed to save: " + msg, "error");
      } finally {
        setSaving(false);
      }
    }

    function edit(record) {
      setEditingId(record.id);
      setSaveError("");
      const rec = Object.assign({}, record);
      if (type === "settlement" && rec.commission) {
        rec.commission = String(rec.commission).replace(/[^0-9.]/g, "");
      }
      setForm(rec);
    }

    const autoCommission = type === "settlement" ? calcCommissionAmount(form.paid, form.commission) : 0;
    const autoAmount    = type === "settlement" ? (Number(form.paid || 0) + autoCommission) : 0;

    return h("section", { className: sectionClass },
      showDlModal && h(DateRangeModal, { label: typeLabel + "s", onClose: () => setShowDlModal(false), onDownload: downloadRange }),
      historyRecord && h(EditHistoryModal, { record: historyRecord, onClose: () => setHistoryRecord(null) }),
      h("div", { className: "panel-title" },
        h("div", { className: "panel-title-left" },
          h("span", { className: type === "transaction" ? "panel-type-dot tx-dot" : "panel-type-dot st-dot" }),
          h("h2", null, type === "transaction" ? "Transactions" : "Settlements")
        ),
        h("div", { className: "panel-title-right" },
          h("button", { className: "dl-range-btn", onClick: () => setShowDlModal(true) }, "⬇ Download"),
          canEdit && editingId && h("button", { className: "secondary-button", onClick: () => { setEditingId(""); setForm(empty); setSaveError(""); } }, "Cancel Edit")
        )
      ),
      h("form", { className: cx("admin-form", type === "settlement" && "admin-form-settlement"), onSubmit: submit },
        fields.map(([key, label]) => {
          if (key === "clientId") {
            return h("label", { key }, label, h("select", {
              value: recordValue(form, key),
              onChange: (e) => update(key, e.target.value),
              required: true
            },
              h("option", { value: "" }, "Select Client..."),
              (users || []).map(u => h("option", { key: u.id, value: u.id }, u.username + " (" + u.id + ")"))
            ));
          }
          if (key === "commission") {
            return h("label", { key },
              h("span", { className: "commission-label-row" },
                label,
                h("button", {
                  type: "button",
                  className: "commission-lock-btn",
                  title: commissionUnlocked ? "Lock commission" : "Unlock to edit commission",
                  onClick: () => setCommissionUnlocked(u => !u)
                }, commissionUnlocked ? "🔓 Unlock" : "🔒 Locked")
              ),
              h("div", { className: "percent-input-wrap" },
                h("input", {
                  className: "percent-input",
                  type: "number",
                  inputMode: "decimal",
                  min: "0",
                  max: "100",
                  step: "0.01",
                  required: true,
                  readOnly: !commissionUnlocked,
                  placeholder: "e.g. 3",
                  value: recordValue(form, key),
                  onChange: (e) => {
                    if (!commissionUnlocked) return;
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    update(key, raw);
                  },
                }),
                h("span", { className: "percent-suffix" }, "%")
              )
            );
          }
          if (key === "date") {
            return h("label", { key },
              label,
              h("input", {
                value: recordValue(form, key),
                readOnly: true,
                className: "calc-field",
                tabIndex: -1,
                title: "Date is set automatically to the current time",
              })
            );
          }
          // UTR / Transaction ID: exactly 12 digits after the '#'
          if (key === "id") {
            return h("label", { key }, label, h("input", {
              required: true,
              value: recordValue(form, key),
              inputMode: "numeric",
              maxLength: 12,
              pattern: "[0-9]{12}",
              title: "Must be exactly 12 digits",
              placeholder: "12-digit UTR number",
              onChange: (e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 12);
                update(key, raw);
              },
            }));
          }
          if (key === "clientId") {
            return h("label", { key }, label, h("select", {
              required: true,
              value: recordValue(form, key),
              onChange: (e) => update(key, e.target.value)
            },
              h("option", { value: "", disabled: true }, "Select a Client"),
              (users || []).map(u => h("option", { key: u.id, value: u.id }, u.username))
            ));
          }
          return h("label", { key }, label, h("input", {
            required: key === "amount" || key === "paid",
            value: recordValue(form, key),
            onChange: (e) => update(key, e.target.value),
          }));
        }),
        type === "settlement" && h("label", { key: "commissionAmount" },
          "Commission Amount",
          h("input", {
            value: autoCommission > 0 || parseFloat(form.paid) > 0 ? autoCommission.toFixed(2) : "",
            readOnly: true,
            className: "calc-field",
            placeholder: "Auto-calculated",
            tabIndex: -1,
          })
        ),
        type === "settlement" && h("label", { key: "totalAmount" },
          "Total Amount",
          h("input", {
            value: autoAmount > 0 || parseFloat(form.paid) > 0 ? autoAmount.toFixed(2) : "",
            readOnly: true,
            className: "calc-field",
            placeholder: "Auto-calculated",
            tabIndex: -1,
          })
        ),
        h("button", { className: "primary-button", disabled: saving }, saving ? "Saving…" : (canEdit && editingId ? "Update Record" : "Add Record")),
        saveError && h("div", { className: "admin-pw-error" }, saveError)
      ),
      h("div", { className: "admin-table-wrap" },
        isMaster && records.length > 0 && h("div", { className: "bulk-action-bar", style: { display: selectedIds.size > 0 ? "flex" : "none" } },
          h("span", null, selectedIds.size + " selected"),
          h("button", { className: "dl-range-btn", onClick: () => {
            const sel = records.filter(r => selectedIds.has(r.id));
            const isT = type === "transaction";
            const headers = isT ? ["Amount","Transaction Id","VPA","Payer Name","Remark","Entry Date"] : ["Amount","Transaction Id","Paid Amount","Remark","Entry Date"];
            const rows = sel.map(r => isT ? ({Amount:money(r.amount,true),"Transaction Id":r.id,VPA:r.vpa,"Payer Name":r.payer,Remark:r.remark,"Entry Date":r.date}) : ({Amount:money(r.amount,false),"Transaction Id":r.id,"Paid Amount":money(r.paid,true),Remark:r.remark,"Entry Date":r.date}));
            downloadCsv("mumble-selected-" + type + "s.csv", headers, rows);
          }}, "⬇ Export Selected"),
          h("button", { className: "danger-button", onClick: () => {
            if (window.confirm("Delete " + selectedIds.size + " record(s)?")) {
              Array.from(selectedIds).forEach(id => onDelete(id));
              setSelectedIds(new Set());
            }
          }}, "🗑 Delete Selected"),
          h("button", { className: "secondary-button", onClick: () => setSelectedIds(new Set()) }, "Clear")
        ),
        h("table", null,
          h("thead", null, h("tr", null,
            isMaster && h("th", null, h("input", { type: "checkbox", checked: allSelected, onChange: toggleSelectAll })),
            tableFields.map((field) => h("th", { key: field[0] }, field[1])),
            (canEdit || canDelete) && h("th", null, "Actions")
          )),
          h("tbody", null, records.map((record) => {
            const isDeleted = record.isDeleted;
            const isEdited = record.editHistory && record.editHistory.length > 0;
            let rowClass = selectedIds.has(record.id) ? "row-selected " : "";
            if (isDeleted) rowClass += "deleted-row-highlight ";
            else if (isEdited) rowClass += "edited-row-highlight ";

            return h("tr", { key: record.id, className: rowClass.trim() },
              isMaster && h("td", null, h("input", { type: "checkbox", checked: selectedIds.has(record.id), onChange: () => toggleSelect(record.id) })),
              tableFields.map(([key]) => {
                let val = key === "amount" || key === "commissionAmount" || key === "paid" ? money(record[key], key === "paid") : (key === "clientId" ? (users.find(u => u.id === record.clientId)?.username || record.clientId) : recordValue(record, key));
                return h("td", { key }, val);
              }),
              (canEdit || canDelete) && h("td", { className: "row-actions" },
                isDeleted ? (
                  isMaster && h("button", { className: "primary-button", onClick: () => onRestore(record.id) }, "Restore")
                ) : (
                  h(React.Fragment, null,
                    isEdited && isMaster && h("button", { className: "secondary-button", onClick: () => setHistoryRecord(record) }, "History"),
                    canEdit && h("button", { className: "secondary-button", onClick: () => edit(record) }, "Edit"),
                    canDelete && h("button", { className: "danger-button", onClick: () => onDelete(record.id) }, "Delete")
                  )
                )
              )
            );
          }))
        )
      ),
      showSuccessAnim && h("div", { className: "center-popup-overlay" },
        h("div", { className: "center-popup-box" },
          h("div", { className: "center-popup-content" },
            h("span", { className: "center-popup-icon" }, "🎉"),
            h("span", null, typeLabel + " successfully added")
          ),
          h("div", { className: "center-popup-bar" })
        )
      )
    );
  }

  // Color palette for client avatars
  const CLIENT_COLORS = [
    { bg: "#dbeafe", accent: "#1d4ed8" }, // blue
    { bg: "#dcfce7", accent: "#15803d" }, // green
    { bg: "#fef9c3", accent: "#a16207" }, // yellow
    { bg: "#fce7f3", accent: "#9d174d" }, // pink
    { bg: "#ede9fe", accent: "#6d28d9" }, // purple
    { bg: "#ffedd5", accent: "#c2410c" }, // orange
    { bg: "#e0f2fe", accent: "#0369a1" }, // sky
    { bg: "#f1f5f9", accent: "#334155" }, // slate
  ];

  function ClientSelection({ clients, onSelect, onLogout, role }) {
    return h("main", { className: "client-select-page" },
      h("div", { className: "client-select-card" },
        h(Logo),
        h("h1", null, appName),
        h("h2", null, "Select Client"),
        h("p", null, "Choose a client to manage transactions and settlements"),
        h("div", { className: "client-list" },
          clients.length === 0
            ? h("p", { className: "empty-clients" }, "No clients found. Please contact Master Admin to create clients.")
            : clients.map((c, idx) => {
                const col = CLIENT_COLORS[idx % CLIENT_COLORS.length];
                const initials = (c.username || "?").split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
                return h("button", {
                  key: c.id,
                  className: "client-select-btn",
                  style: { borderColor: col.accent, background: col.bg },
                  onClick: () => onSelect(c.id)
                },
                  h("span", { className: "client-avatar", style: { background: col.accent, color: "#fff" } }, initials),
                  h("span", { className: "client-info" },
                    h("span", { className: "client-name", style: { color: col.accent } }, c.username)
                  ),
                  h("span", { className: "client-arrow", style: { color: col.accent } }, "→")
                );
              })
        ),
        h("div", { className: "client-select-footer" },
          h("button", { className: "secondary-button", onClick: onLogout }, "Logout")
        )
      )
    );
  }

  function AdminPage({ data, setData, onLogout, dbError, onDismissError, role, selectedClientId, onSelectClient, onMasterCredsUpdated }) {
    const [saving, setSaving] = useState(false);
    const isMaster = role === "masteradmin";
    const { toasts, showToast } = useToast();
    const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("mumble-sidebar") === "1");

    function toggleSidebar() {
      setSidebarOpen(prev => {
        const next = !prev;
        localStorage.setItem("mumble-sidebar", next ? "1" : "0");
        return next;
      });
    }

    const sortedTransactions = useMemo(() => {
      const list = isMaster ? [...(data.transactions || []), ...(data.deletedTransactions || [])] : (data.transactions || []);
      return list
        .filter((t) => isMaster ? (!selectedClientId || t.clientId === selectedClientId) : t.clientId === selectedClientId)
        .slice()
        .sort((a, b) => { const aVal = sortableValue(a, "date"); const bVal = sortableValue(b, "date"); return bVal - aVal; });
    }, [data.transactions, data.deletedTransactions, selectedClientId, isMaster]);

    const sortedSettlements = useMemo(() => {
      const list = isMaster ? [...(data.settlements || []), ...(data.deletedSettlements || [])] : (data.settlements || []);
      return list
        .filter((s) => isMaster ? (!selectedClientId || s.clientId === selectedClientId) : s.clientId === selectedClientId)
        .slice()
        .sort((a, b) => { const aVal = sortableValue(a, "date"); const bVal = sortableValue(b, "date"); return bVal - aVal; });
    }, [data.settlements, data.deletedSettlements, selectedClientId, isMaster]);

    // Global totals across ALL clients (master admin only) — live records only
    const globalTxTotal = useMemo(() => (data.transactions || []).filter(t => !t.isDeleted).reduce((s, t) => s + Number(t.amount || 0), 0), [data.transactions]);
    const globalStTotal = useMemo(() => (data.settlements || []).filter(s => !s.isDeleted).reduce((s, t) => s + Number(t.amount || 0), 0), [data.settlements]);
    const globalBalance = globalTxTotal - globalStTotal;

    // Total Commission Amount card — sum of commissionAmount column, filterable by client
    const [commCardClient, setCommCardClient] = useState("");
    const commCardSettlements = useMemo(() => {
      const base = data.settlements || [];
      return commCardClient ? base.filter(s => s.clientId === commCardClient) : base;
    }, [data.settlements, commCardClient]);
    const commCardTotalCommission = useMemo(() => commCardSettlements.reduce((s, r) => s + Number(r.commissionAmount || 0), 0), [commCardSettlements]);

    // Per-client health data — live records only
    const clientHealth = useMemo(() => {
      return (data.users || []).map(u => {
        const cTx = (data.transactions || []).filter(t => t.clientId === u.id && !t.isDeleted);
        const cSt = (data.settlements || []).filter(s => s.clientId === u.id && !s.isDeleted);
        const cTxTotal = cTx.reduce((s, t) => s + Number(t.amount || 0), 0);
        const cStTotal = cSt.reduce((s, t) => s + Number(t.amount || 0), 0);
        const lastTx = cTx.slice().sort((a, b) => sortableValue(b, "date") - sortableValue(a, "date"))[0];
        return { user: u, txTotal: cTxTotal, stTotal: cStTotal, balance: cTxTotal - cStTotal, lastTx };
      });
    }, [data.users, data.transactions, data.settlements]);

    if (!selectedClientId && !isMaster) {
      return h(ClientSelection, {
        clients: data.users || [],
        onSelect: onSelectClient,
        onLogout,
        role
      });
    }

    const clientObj = (data.users || []).find(u => u.id === selectedClientId) || { username: selectedClientId };

    async function saveRecord(kind, record, editingId) {
      const prepared = Object.assign({}, record, { clientId: record.clientId || selectedClientId || "usr-001" });
      if (isMaster && !editingId) {
        prepared.addedByMaster = true;
      }
      if (editingId) {
        // Push edit history without creating a circular reference
        const oldRecord = (data[kind] || []).find(r => r.id === editingId);
        if (oldRecord) {
          const snapshot = Object.assign({}, prepared);
          delete snapshot.editHistory; // Prevent circular JSON
          const entry = { at: new Date().toISOString(), by: "masteradmin", before: oldRecord, after: snapshot };
          prepared.editHistory = (oldRecord.editHistory || []).concat([entry]);
        }
      }
      const table = kind === "transactions" ? "transactions" : "settlements";
      const dbRecord = kind === "transactions" ? mapTxToDb(prepared) : mapStToDb(prepared);
      // Optimistic update
      setData((current) => {
        const list = current[kind] || [];
        const exists = list.some((item) => item.id === editingId || item.id === prepared.id);
        const nextList = exists
          ? list.map((item) => item.id === (editingId || prepared.id) ? prepared : item)
          : [prepared].concat(list);
        return Object.assign({}, current, { [kind]: nextList });
      });
      setSaving(true);
      try {
        const { error } = await supabase.from(table).upsert(dbRecord);
        if (error) throw new Error(error.message);
      } catch (err) {
        throw err; // re-throw so CrudManager can catch it
      } finally {
        setSaving(false);
      }
    }

    async function deleteRecord(kind, id) {
      const table = kind === "transactions" ? "transactions" : "settlements";
      // Try soft delete first (requires is_deleted column); fall back to hard delete
      try {
        const { error: softErr } = await supabase.from(table)
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: "masteradmin" })
          .eq("id", id);
        if (softErr && softErr.message.includes("is_deleted")) {
          // Column doesn't exist yet — do a hard delete
          await supabase.from(table).delete().eq("id", id);
        }
      } catch (_) {
        await supabase.from(table).delete().eq("id", id);
      }
      setData(current => Object.assign({}, current, { [kind]: current[kind].filter(item => item.id !== id) }));
      showToast("Record deleted", "success");
      // Insert audit log
      try { await supabase.from("audit_log").insert({ action: "delete", record_type: kind.slice(0, -1), record_id: id, performed_by: "masteradmin" }); } catch (_) {}
    }

    async function restoreRecord(kind, id) {
      const table = kind === "transactions" ? "transactions" : "settlements";
      try {
        await supabase.from(table).update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq("id", id);
        setData(current => {
          const deleted = (current[(kind === "transactions" ? "deletedTransactions" : "deletedSettlements")] || []);
          const restored = deleted.find(r => r.id === id);
          if (!restored) return current;
          const live = [{ ...restored, isDeleted: false }].concat(current[kind] || []);
          return Object.assign({}, current, {
            [kind]: live,
            [(kind === "transactions" ? "deletedTransactions" : "deletedSettlements")]: deleted.filter(r => r.id !== id)
          });
        });
        showToast("Record restored!", "success");
        try { await supabase.from("audit_log").insert({ action: "restore", record_type: kind.slice(0, -1), record_id: id, performed_by: "masteradmin" }); } catch (_) {}
      } catch (err) { showToast("Restore failed: " + err.message, "error"); }
    }

    async function addAuditLog(entry) {
      try { await supabase.from("audit_log").insert(Object.assign({ performed_by: "masteradmin" }, entry)); } catch (_) {}
    }

    // Global stats strip for master admin
    const globalStats = isMaster && h("div", { className: "master-global-stats" },
      h("div", { className: "mgs-card" }, h("span", null, "\uD83D\uDCB3 Grand Transactions"), h("strong", { className: "text-green" }, money(globalTxTotal, true))),
      h("div", { className: "mgs-card" }, h("span", null, "\u20B9 Grand Settlements"), h("strong", { className: "text-orange" }, money(globalStTotal, true))),
      h("div", { className: "mgs-card" }, h("span", null, "\u2696 Grand Balance"), h("strong", { className: "text-red" }, money(globalBalance, true))),
      h("div", { className: "mgs-card" }, h("span", null, "\uD83D\uDC65 Clients"), h("strong", null, (data.users || []).length)),
      h("div", { className: "mgs-card mgs-card-commission" },
        h("div", { className: "mgs-comm-header" },
          h("span", null, "\uD83D\uDCCA Total Commission Amount"),
          h("select", {
            className: "mgs-comm-filter",
            value: commCardClient,
            onChange: e => setCommCardClient(e.target.value),
            title: "Filter by client"
          },
            h("option", { value: "" }, "All Clients"),
            (data.users || []).map(u => h("option", { key: u.id, value: u.id }, u.username))
          )
        ),
        h("strong", { className: "text-purple" }, money(commCardTotalCommission, true))
      )
    );

    // Client health strip
    const healthStrip = isMaster && h("div", { className: "client-health-strip" },
      clientHealth.map((ch, idx) => {
        const col = CLIENT_COLORS[idx % CLIENT_COLORS.length];
        const initials = (ch.user.username || "?").slice(0, 2).toUpperCase();
        return h("button", {
          key: ch.user.id,
          className: cx("client-health-card", selectedClientId === ch.user.id && "chc-active"),
          style: { borderColor: col.accent },
          onClick: () => onSelectClient(ch.user.id)
        },
          h("div", { className: "chc-top" },
            h("span", { className: "chc-avatar", style: { background: col.accent } }, initials),
            h("div", null,
              h("strong", { className: "chc-name" }, ch.user.username),
              ch.lastTx && h("span", { className: "chc-last" }, "Last: " + ch.lastTx.date.slice(0, 20))
            )
          ),
          h("div", { className: "chc-stats" },
            h("span", { className: "text-green" }, money(ch.txTotal, true)),
            h("span", { className: "chc-sep" }, "|"),
            h("span", { className: "text-red" }, money(ch.balance, true))
          )
        );
      })
    );

    // Quick Action Sidebar
    const quickSidebar = isMaster && h(React.Fragment, null,
      h("button", { className: "sidebar-toggle-btn", onClick: toggleSidebar, title: sidebarOpen ? "Close Sidebar" : "Quick Actions" },
        sidebarOpen ? "\u00D7" : "\u26A1"
      ),
      sidebarOpen && h("div", { className: "quick-sidebar" },
        h("div", { className: "qs-header" },
          h("h3", null, "\u26A1 Quick Actions"),
          h("button", { className: "drm-close", onClick: toggleSidebar }, "\u00D7")
        ),
        h("div", { className: "qs-section" },
          h("p", { className: "qs-label" }, "Switch Client"),
          h("select", {
            className: "secondary-button qs-select",
            value: selectedClientId,
            onChange: e => onSelectClient(e.target.value)
          },
            h("option", { value: "" }, "All Clients"),
            (data.users || []).map(u => h("option", { key: u.id, value: u.id }, u.username))
          )
        ),
        h("div", { className: "qs-section" },
          h("p", { className: "qs-label" }, "Stats Overview"),
          h("div", { className: "qs-stats" },
            h("div", null, h("span", null, "TX Total"), h("strong", { className: "text-green" }, money(globalTxTotal, true))),
            h("div", null, h("span", null, "ST Total"), h("strong", { className: "text-orange" }, money(globalStTotal, true))),
            h("div", null, h("span", null, "Balance"), h("strong", { className: "text-red" }, money(globalBalance, true)))
          )
        )
      )
    );
    // Live-only subsets for per-client summary totals (excludes soft-deleted rows)
    const liveSortedTransactions = sortedTransactions.filter(t => !t.isDeleted);
    const liveSortedSettlements  = sortedSettlements.filter(s => !s.isDeleted);
    const txTotal = liveSortedTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const stTotal = liveSortedSettlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const balance = txTotal - stTotal;

    // Working-day window: 5AM → next day 5AM
    // If current time is before 5AM, working day started yesterday at 5AM
    const now = new Date();
    const workDayStart = new Date(now);
    workDayStart.setSeconds(0, 0);
    workDayStart.setMinutes(0);
    workDayStart.setHours(5);
    if (now.getHours() < 5) {
      workDayStart.setDate(workDayStart.getDate() - 1);
    }
    const workDayEnd = new Date(workDayStart);
    workDayEnd.setDate(workDayEnd.getDate() + 1); // +24h
    const todayTxs = liveSortedTransactions.filter((t) => {
      const cleaned = String(t.date || "").replace(" at ", " ").replace(/(\d+)(st|nd|rd|th)/, "$1");
      const ts = Date.parse(cleaned);
      if (isNaN(ts)) return false;
      return ts >= workDayStart.getTime() && ts < workDayEnd.getTime();
    });
    const todayTxTotal = todayTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const summaryCards = (!isMaster || selectedClientId) ? h("div", { className: "admin-summary-cards" },
      h("div", { className: "admin-stat-card stat-card-tx" }, h("h3", null, "Total Transactions"), h("p", { className: "text-green" }, money(txTotal, true))),
      h("div", { className: "admin-stat-card stat-card-st" }, h("h3", null, "Total Settlements"), h("p", { className: "text-orange" }, money(stTotal, true))),
      h("div", { className: "admin-stat-card stat-card-bal" }, h("h3", null, "Balance Amount"), h("p", { className: "text-red" }, money(balance, true))),
      h("div", { className: "admin-stat-card stat-card-today" },
        h("h3", null, "Today's Working Day"),
        h("p", { className: "text-green" }, money(todayTxTotal, true)),
        h("div", { className: "today-meta" },
          h("span", { className: "today-badge" }, todayTxs.length + " txn" + (todayTxs.length !== 1 ? "s" : "")),
          h("span", { className: "today-window" },
            "⏱ " +
            workDayStart.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) +
            " → " +
            workDayEnd.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) +
            ", " + workDayEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          )
        ),
        h("p", { className: "today-reset-note" }, "🔄 Resets tomorrow at 5:00 AM")
      )
    ) : null;

    return h("main", { className: cx("admin-page", sidebarOpen && "with-sidebar") },
      quickSidebar,
      h(ToastContainer, { toasts }),
      h("header", { className: "admin-header" },
        h("div", null, h(Logo), h("div", null,
          h("p", null, appName),
          h("h1", null, isMaster ? "Master Admin Control" : "Admin Panel")
        )),
        h("div", { className: "admin-header-actions" },
          isMaster && h(UniversalSearch, { transactions: data.transactions || [], settlements: data.settlements || [], users: data.users || [], onSelectClient }),
          isMaster && h("select", {
            className: "secondary-button client-dropdown",
            value: selectedClientId,
            onChange: (e) => onSelectClient(e.target.value)
          },
            h("option", { value: "" }, "All Clients"),
            (data.users || []).map(u => h("option", { key: u.id, value: u.id }, u.username))
          ),
          !isMaster && h("div", { className: "client-info-block" },
            h("span", { className: "client-info-label" }, "Client:"),
            h("strong", { className: "client-info-name" }, clientObj.username || "None")
          ),
          !isMaster && h("button", { className: "switch-client-btn", onClick: () => onSelectClient("") },
            h("span", { className: "scb-label" }, "\u21C4 Switch Client")
          ),
          isMaster && h("span", { className: "role-badge master" }, "Master Admin"),
          !isMaster && h("span", { className: "role-badge" }, "Admin"),
          saving && h("span", { className: "saving-indicator" }, "Saving\u2026"),
          h("button", { className: "secondary-button", onClick: () => onLogout() }, "User Portal"),
          h("button", { className: "primary-button", onClick: onLogout }, "Logout")
        )
      ),
      dbError && h(ErrorBanner, { message: dbError, onDismiss: onDismissError }),
      isMaster && globalStats,
      isMaster && healthStrip,
      summaryCards,
      h("div", { className: "admin-grid" },
        h(CrudManager, {
          type: "transaction",
          records: sortedTransactions,
          deletedRecords: data.deletedTransactions || [],
          onSave: (record, editingId) => saveRecord("transactions", record, editingId),
          onDelete: (id) => deleteRecord("transactions", id),
          onRestore: isMaster ? (id) => restoreRecord("transactions", id) : null,
          canEdit: isMaster,
          canDelete: isMaster,
          isMaster,
          users: data.users || [],
          showToast,
          onAuditLog: isMaster ? addAuditLog : null
        }),
        h(CrudManager, {
          type: "settlement",
          records: sortedSettlements,
          deletedRecords: data.deletedSettlements || [],
          onSave: (record, editingId) => saveRecord("settlements", record, editingId),
          onDelete: (id) => deleteRecord("settlements", id),
          onRestore: isMaster ? (id) => restoreRecord("settlements", id) : null,
          canEdit: isMaster,
          canDelete: isMaster,
          isMaster,
          users: data.users || [],
          showToast,
          onAuditLog: isMaster ? addAuditLog : null
        }),
        isMaster && h(AdminManager, { admins: data.admins || [], setData }),
        isMaster && h(UserManager, { users: data.users || [], setData }),
        isMaster && h(ActivityFeed, { auditLog: data.auditLog || [], users: data.users || [] }),
        isMaster && h(MasterAdminSettings, { masterCreds: data.masterCreds, onMasterCredsUpdated })
      )
    );
  }

  // ── Admin Manager (Master Admin only) ───────────────────────────────────
  function AdminManager({ admins, setData }) {
    const emptyAdmin = { username: "", password: "", date: nowLabel() };
    const [form, setForm] = useState(emptyAdmin);
    const [editingId, setEditingId] = useState("");
    const [error, setError] = useState("");
    const [showPasswords, setShowPasswords] = useState({});

    const sortedAdmins = useMemo(() => {
      return admins.slice().sort((a, b) => {
        const aVal = sortableValue(a, "date");
        const bVal = sortableValue(b, "date");
        return bVal - aVal;
      });
    }, [admins]);

    function nextId() {
      let max = 0;
      admins.forEach(function (a) {
        const num = parseInt(String(a.id).replace("adm-", ""), 10);
        if (!isNaN(num) && num > max) max = num;
      });
      return "adm-" + String(max + 1).padStart(3, "0");
    }

    function update(name, value) {
      setForm((current) => ({ ...current, [name]: value }));
      if (name === "password") setError("");
    }

    async function submit(e) {
      e.preventDefault();
      const pwError = validatePassword(form.password);
      if (pwError) { setError(pwError); return; }
      if (!form.username.trim()) { setError("Username is required"); return; }
      const dup = admins.find(function (a) {
        return a.username === form.username.trim() && a.id !== editingId;
      });
      if (dup) { setError("Username already exists"); return; }

      const record = {
        id: editingId || nextId(),
        username: form.username.trim(),
        password: form.password,
        role: "admin",
        date: editingId ? (admins.find(function (a) { return a.id === editingId; }) || {}).date || form.date : nowLabel(),
      };
      // Write to Supabase FIRST — only update UI on success
      try {
        const { error: dbErr } = await supabase.from("admins").upsert(mapAdminToDb(record));
        if (dbErr) throw new Error(dbErr.message);
        setData(function (current) {
          const list = current.admins || [];
          const exists = list.some(function (item) { return item.id === record.id; });
          const nextList = exists
            ? list.map(function (item) { return item.id === record.id ? record : item; })
            : [record].concat(list);
          return Object.assign({}, current, { admins: nextList });
        });
        setForm(emptyAdmin);
        setEditingId("");
        setError("");
      } catch (err) {
        setError("Save failed: " + err.message);
      }
    }

    function edit(admin) {
      setEditingId(admin.id);
      setForm({ username: admin.username, password: admin.password, date: admin.date });
      setError("");
    }

    async function remove(id) {
      // Delete from Supabase first — update UI only on success
      try {
        const { error: dbErr } = await supabase.from("admins").delete().eq("id", id);
        if (dbErr) throw new Error(dbErr.message);
        setData(function (current) {
          return Object.assign({}, current, { admins: (current.admins || []).filter(function (item) { return item.id !== id; }) });
        });
      } catch (err) {
        setError("Delete failed: " + err.message);
      }
    }

    function togglePassword(id) {
      setShowPasswords(function (prev) {
        var next = Object.assign({}, prev);
        next[id] = !next[id];
        return next;
      });
    }

    return h("section", { className: "admin-card admin-manager-card" },
      h("div", { className: "panel-title" },
        h("h2", null, "Manage Admins"),
        editingId && h("button", { className: "secondary-button", onClick: function () { setEditingId(""); setForm(emptyAdmin); setError(""); } }, "Cancel Edit")
      ),
      h("form", { className: "admin-form admin-manager-form", onSubmit: submit },
        h("label", null, "Username", h("input", {
          required: true,
          placeholder: "e.g. admin004",
          value: form.username,
          onChange: function (e) { update("username", e.target.value); },
        })),
        h("label", null, "Password", h("input", {
          required: true,
          placeholder: "Min 8 chars, mixed case, digit, special",
          value: form.password,
          onChange: function (e) { update("password", e.target.value); },
        })),
        h("button", { className: "primary-button" }, editingId ? "Update Admin" : "Add Admin"),
        error && h("div", { className: "admin-pw-error" }, error)
      ),
      h("div", { className: "admin-table-wrap" },
        h("table", null,
          h("thead", null, h("tr", null,
            h("th", null, "Username"),
            h("th", null, "Password"),
            h("th", null, "Created"),
            h("th", null, "Actions")
          )),
          h("tbody", null, sortedAdmins.map(function (admin) {
            return h("tr", { key: admin.id },
              h("td", null, admin.username),
              h("td", { className: "password-cell" },
                h("span", null, showPasswords[admin.id] ? admin.password : "••••••••"),
                h("button", {
                  type: "button",
                  className: "toggle-pw-btn",
                  onClick: function () { togglePassword(admin.id); },
                  title: showPasswords[admin.id] ? "Hide" : "Show"
                }, showPasswords[admin.id] ? "🙈" : "👁")
              ),
              h("td", null, admin.date),
              h("td", { className: "row-actions" },
                h("button", { className: "secondary-button", onClick: function () { edit(admin); } }, "Edit"),
                h("button", { className: "danger-button", onClick: function () { remove(admin.id); } }, "Delete")
              )
            );
          }))
        )
      )
    );
  }

  // ── User Manager (Master Admin only) ───────────────────────────────────
  function UserManager({ users, setData }) {
    const emptyUser = { username: "", password: "", date: nowLabel() };
    const [form, setForm] = useState(emptyUser);
    const [editingId, setEditingId] = useState("");
    const [error, setError] = useState("");
    const [showPasswords, setShowPasswords] = useState({});

    const sortedUsers = useMemo(() => {
      return users.slice().sort((a, b) => {
        const aVal = sortableValue(a, "date");
        const bVal = sortableValue(b, "date");
        return bVal - aVal;
      });
    }, [users]);

    function nextId() {
      let max = 0;
      users.forEach(function (u) {
        const num = parseInt(String(u.id).replace("usr-", ""), 10);
        if (!isNaN(num) && num > max) max = num;
      });
      return "usr-" + String(max + 1).padStart(3, "0");
    }

    function update(name, value) {
      setForm((current) => ({ ...current, [name]: value }));
      if (name === "password") setError("");
    }

    async function submit(e) {
      e.preventDefault();
      const pwError = validatePassword(form.password);
      if (pwError) { setError(pwError); return; }
      if (!form.username.trim()) { setError("Username is required"); return; }
      const dup = users.find(function (u) {
        return u.username === form.username.trim() && u.id !== editingId;
      });
      if (dup) { setError("Username already exists"); return; }

      const record = {
        id: editingId || nextId(),
        username: form.username.trim(),
        password: form.password,
        role: "user",
        date: editingId ? (users.find(function (u) { return u.id === editingId; }) || {}).date || form.date : nowLabel(),
      };
      // Write to Supabase FIRST — only update UI on success
      try {
        const { error: dbErr } = await supabase.from("users").upsert(mapUserToDb(record));
        if (dbErr) throw new Error(dbErr.message);
        setData(function (current) {
          const list = current.users || [];
          const exists = list.some(function (item) { return item.id === record.id; });
          const nextList = exists
            ? list.map(function (item) { return item.id === record.id ? record : item; })
            : [record].concat(list);
          return Object.assign({}, current, { users: nextList });
        });
        setForm(emptyUser);
        setEditingId("");
        setError("");
      } catch (err) {
        setError("Save failed: " + err.message);
      }
    }

    function edit(user) {
      setEditingId(user.id);
      setForm({ username: user.username, password: user.password, date: user.date });
      setError("");
    }

    async function remove(id) {
      // Delete from Supabase first — update UI only on success
      try {
        const { error: dbErr } = await supabase.from("users").delete().eq("id", id);
        if (dbErr) throw new Error(dbErr.message);
        setData(function (current) {
          return Object.assign({}, current, { users: (current.users || []).filter(function (item) { return item.id !== id; }) });
        });
      } catch (err) {
        setError("Delete failed: " + err.message);
      }
    }

    function togglePassword(id) {
      setShowPasswords(function (prev) {
        var next = Object.assign({}, prev);
        next[id] = !next[id];
        return next;
      });
    }

    return h("section", { className: "admin-card admin-manager-card" },
      h("div", { className: "panel-title" },
        h("h2", null, "Manage Clients"),
        editingId && h("button", { className: "secondary-button", onClick: function () { setEditingId(""); setForm(emptyUser); setError(""); } }, "Cancel Edit")
      ),
      h("form", { className: "admin-form admin-manager-form", onSubmit: submit },
        h("label", null, "Username", h("input", {
          required: true,
          placeholder: "e.g. user433",
          value: form.username,
          onChange: function (e) { update("username", e.target.value); },
        })),
        h("label", null, "Password", h("input", {
          required: true,
          placeholder: "Min 8 chars, mixed case, digit, special",
          value: form.password,
          onChange: function (e) { update("password", e.target.value); },
        })),
        h("button", { className: "primary-button" }, editingId ? "Update Client" : "Add Client"),
        error && h("div", { className: "admin-pw-error" }, error)
      ),
      h("div", { className: "admin-table-wrap" },
        h("table", null,
          h("thead", null, h("tr", null,
            h("th", null, "Username"),
            h("th", null, "Password"),
            h("th", null, "Created"),
            h("th", null, "Actions")
          )),
          h("tbody", null, sortedUsers.map(function (user) {
            return h("tr", { key: user.id },
              h("td", null, user.username),
              h("td", { className: "password-cell" },
                h("span", null, showPasswords[user.id] ? user.password : "••••••••"),
                h("button", {
                  type: "button",
                  className: "toggle-pw-btn",
                  onClick: function () { togglePassword(user.id); },
                  title: showPasswords[user.id] ? "Hide" : "Show"
                }, showPasswords[user.id] ? "🙈" : "👁")
              ),
              h("td", null, user.date),
              h("td", { className: "row-actions" },
                h("button", { className: "secondary-button", onClick: function () { edit(user); } }, "Edit"),
                h("button", { className: "danger-button", onClick: function () { remove(user.id); } }, "Delete")
              )
            );
          }))
        )
      )
    );
  }


  // ── Master Admin Settings (change own username / password) ───────────────
  function MasterAdminSettings({ masterCreds, onMasterCredsUpdated }) {
    const [form, setForm] = useState(function() {
      const c = masterCreds || { username: "masterLead", password: "" };
      return { username: c.username, password: c.password, confirmPassword: "" };
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [saving, setSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);

    function update(name, value) {
      setForm(function(cur) { return Object.assign({}, cur, { [name]: value }); });
      setError(""); setSuccess("");
    }

    function submit(e) {
      e.preventDefault();
      if (!form.username.trim()) { setError("Username is required"); return; }
      const pwErr = validatePassword(form.password);
      if (pwErr) { setError(pwErr); return; }
      if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
      setSaving(true);
      const newCreds = { username: form.username.trim(), password: form.password };
      saveMasterCredsToDb(newCreds)
        .then(function() {
          setSuccess("Master admin credentials saved to Supabase! New credentials take effect immediately.");
          setError("");
          if (onMasterCredsUpdated) onMasterCredsUpdated(newCreds);
        })
        .catch(function(err) {
          setError("Failed to save: " + err.message);
        })
        .finally(function() { setSaving(false); });
    }

    return h("section", { className: "admin-card admin-manager-card" },
      h("div", { className: "panel-title" },
        h("h2", null, "Master Admin Settings"),
        h("p", { style: { margin: 0, fontSize: "0.85rem", opacity: 0.6 } }, "Change your own login credentials")
      ),
      h("form", { className: "admin-form admin-manager-form", onSubmit: submit },
        h("label", null, "New Username",
          h("input", {
            required: true,
            placeholder: "Enter new username",
            value: form.username,
            onChange: function(e) { update("username", e.target.value); }
          })
        ),
        h("label", null, "New Password",
          h("div", { style: { position: "relative" } },
            h("input", {
              required: true,
              type: showPw ? "text" : "password",
              placeholder: "Min 8 chars, mixed case, digit, special",
              value: form.password,
              style: { paddingRight: "2.5rem", width: "100%", boxSizing: "border-box" },
              onChange: function(e) { update("password", e.target.value); }
            }),
            h("button", {
              type: "button",
              className: "toggle-pw-btn",
              style: { position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem" },
              onClick: function() { setShowPw(function(p) { return !p; }); },
              title: showPw ? "Hide" : "Show"
            }, showPw ? "🙈" : "👁")
          )
        ),
        h("label", null, "Confirm Password",
          h("input", {
            required: true,
            type: "password",
            placeholder: "Re-enter new password",
            value: form.confirmPassword,
            onChange: function(e) { update("confirmPassword", e.target.value); }
          })
        ),
        h("button", { className: "primary-button", disabled: saving }, saving ? "Saving…" : "Update My Credentials"),
        error && h("div", { className: "admin-pw-error" }, error),
        success && h("div", { className: "admin-pw-success" }, success)
      )
    );
  }

  function Appearance({ compact, toggleDensity, onResetDb }) {
    const [notifications, setNotifications] = useState(localStorage.getItem("mumble-notifications") || "Stacked");
    const [position, setPosition] = useState(localStorage.getItem("mumble-position") || "Top Right");

    function setStored(key, setter, value) {
      setter(value);
      localStorage.setItem(key, value);
    }

    return h("section", { className: "appearance" },
      h("div", { className: "settings-panel" },
        h("h2", null, "Appearance"),
        h("p", null, "Mumble uses a black and white theme. Accent colors are reserved for positive, warning, and negative states."),
        h("div", { className: "divider" }),
        h("h3", null, "Theme"),
        h("div", { className: "theme-cards" },
          ["Black", "White"].map((name) => h("button", { key: name, className: "theme-card selected" },
            h("span", { className: cx("preview", name.toLowerCase()) }),
            h("strong", null, name)
          ))
        ),
        h("h3", null, "Density"),
        h("div", { className: "control-grid" },
          h("button", { className: !compact ? "selected" : "", onClick: compact ? toggleDensity : undefined }, "Comfortable"),
          h("button", { className: compact ? "selected" : "", onClick: compact ? undefined : toggleDensity }, "Compact")
        ),
        h("h3", null, "Notification"),
        h("p", null, "Choose notification position and group style for your application."),
        h("div", { className: "control-grid" },
          ["Stacked", "Expanded"].map((value) => h("button", {
            key: value,
            className: notifications === value ? "selected" : "",
            onClick: () => setStored("mumble-notifications", setNotifications, value),
          }, value)),
          ["Top Right", "Bottom Right"].map((value) => h("button", {
            key: value,
            className: position === value ? "selected" : "",
            onClick: () => setStored("mumble-position", setPosition, value),
          }, value))
        ),
        h("button", { className: "reset", onClick: onResetDb }, "Reset Local Data")
      )
    );
  }

  function NotFound() {
    return h("section", { className: "not-found" },
      h("div", { className: "four-oh-four" }, "404"),
      h("h2", null, "Oops. This Page Not Found."),
      h("p", null, "This page is not available. Please go back to home."),
      h("button", { className: "primary-button", onClick: () => navigate("/dashboards/home") }, "Back to home")
    );
  }

  function App() {
    const route = useRoute();
    // data now includes masterCreds from Supabase master_config
    const [data, setData] = useState(() => ({ transactions: [], settlements: [], admins: [], users: [], masterCreds: null }));
    const [loading, setLoading] = useState(true);
    const [dbError, setDbError] = useState(null);
    // Session state — stored in localStorage only for tab continuity (not as data cache)
    const [role, setRole] = useState(() => localStorage.getItem("mumble-role") || "");
    const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem("mumble-current-user-id") || "");
    const [selectedClientId, setSelectedClientId] = useState(() => localStorage.getItem("mumble-selected-client-id") || "");

    // Derive the current user object from loaded data
    const currentUser = useMemo(function() {
      if (!currentUserId) return null;
      return (data.users || []).find(function(u) { return u.id === currentUserId; }) || null;
    }, [data.users, currentUserId]);

    // Keep session state in sync with localStorage (tab continuity only)
    useEffect(() => {
      if (role) localStorage.setItem("mumble-role", role);
      else localStorage.removeItem("mumble-role");
    }, [role]);

    useEffect(() => {
      if (currentUserId) localStorage.setItem("mumble-current-user-id", currentUserId);
      else localStorage.removeItem("mumble-current-user-id");
    }, [currentUserId]);

    useEffect(() => {
      if (selectedClientId) localStorage.setItem("mumble-selected-client-id", selectedClientId);
      else localStorage.removeItem("mumble-selected-client-id");
    }, [selectedClientId]);

    // Initial fetch from Supabase — no localStorage fallback; Supabase is the single source of truth
    async function refreshData() {
      try {
        const fresh = await fetchAll();
        setData(fresh);
        setDbError(null);
      } catch (err) {
        setDbError(err.message);
        // On error just keep whatever data we already have in state
      }
    }

    useEffect(() => {
      refreshData().finally(() => setLoading(false));
    }, []);

    // Supabase Realtime — auto-refresh on any DB change
    useEffect(() => {
      const channel = supabase
        .channel("mumble-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => refreshData())
        .on("postgres_changes", { event: "*", schema: "public", table: "settlements" }, () => refreshData())
        .on("postgres_changes", { event: "*", schema: "public", table: "admins" }, () => refreshData())
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => refreshData())
        .on("postgres_changes", { event: "*", schema: "public", table: "master_config" }, () => refreshData())
        .on("postgres_changes", { event: "*", schema: "public", table: "audit_log" }, () => refreshData())
        .subscribe();
      return () => supabase.removeChannel(channel);
    }, []);

    const isAdmin = role === "admin" || role === "masteradmin";

    const normalizedRoute = useMemo(() => {
      if (route === "/") return isAdmin ? "/admin" : role === "user" ? "/dashboards/home" : "/login";
      if (route === "/user") return "/not-found";
      return route;
    }, [route, role, isAdmin]);

    useEffect(() => {
      document.title = appName;
      if (route === "/" || (route === "/login" && role)) {
        navigate(isAdmin ? "/admin" : role === "user" ? "/dashboards/home" : "/login");
      }
    }, [route, role, isAdmin]);

    function login(nextRole, userId) {
      setRole(nextRole);
      if (nextRole === "user" && userId) {
        setCurrentUserId(userId);
      }
    }
    
    function logout() {
      setRole("");
      setCurrentUserId("");
      setSelectedClientId("");
      localStorage.removeItem("mumble-role");
      localStorage.removeItem("mumble-current-user-id");
      localStorage.removeItem("mumble-selected-client-id");
      navigate("/login");
    }

    function resetDb() {
      // Supabase is source of truth — just re-fetch fresh data.
      refreshData();
    }

    // Callback when master creds are updated from MasterAdminSettings
    function onMasterCredsUpdated(newCreds) {
      setData(function(prev) { return Object.assign({}, prev, { masterCreds: newCreds }); });
    }

    // Filter transactions and settlements shown to user/client
    const filteredDataForClient = useMemo(() => {
      const uId = role === "user" ? currentUserId : selectedClientId;
      return {
        transactions: (data.transactions || []).filter((t) => t.clientId === uId),
        settlements: (data.settlements || []).filter((s) => s.clientId === uId),
        admins: data.admins,
        users: data.users
      };
    }, [data, role, currentUserId, selectedClientId]);

    if (loading) return h(LoadingScreen);

    // Admin dashboard (both masteradmin and admin land here after login)
    if (normalizedRoute.startsWith("/admin")) {
      if (!isAdmin) return h(Login, { onLogin: login, admins: data.admins, users: data.users, masterCreds: data.masterCreds });
      return h(AdminPage, {
        data,
        setData,
        onLogout: logout,
        dbError,
        onDismissError: () => setDbError(null),
        role,
        selectedClientId,
        onSelectClient: setSelectedClientId,
        onMasterCredsUpdated
      });
    }

    if (!role || normalizedRoute === "/login") return h(Login, { onLogin: login, admins: data.admins, users: data.users, masterCreds: data.masterCreds });
    if (normalizedRoute === "/not-found") return h(NotFound);

    return h(Shell, {
      route: normalizedRoute,
      data: filteredDataForClient,
      onLogout: logout,
      onResetDb: resetDb,
      onRefreshData: refreshData,
      dbError,
      onDismissError: () => setDbError(null),
      currentUser,
    });
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();

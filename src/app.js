(function () {
  const { useEffect, useMemo, useState } = React;
  const h = React.createElement;

  const appName = "Mumble";
  const userCredentials = { username: "master432", password: "master432" };
  const adminCredentials = { username: "admin777", password: "admin777" };
  const dbKey = "mumble-local-db";

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
    if (key === "date") return Date.parse(String(row.date).replace(/(\d+)(st|nd|rd|th)/, "$1"));
    return row[key];
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

  function loadDb() {
    try {
      const stored = JSON.parse(localStorage.getItem(dbKey) || "null");
      if (stored && Array.isArray(stored.transactions) && Array.isArray(stored.settlements)) return stored;
    } catch (error) {}
    return { transactions: defaultTransactions, settlements: defaultSettlements };
  }

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

  function Login({ role, onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const expected = role === "admin" ? adminCredentials : userCredentials;
    const title = role === "admin" ? "Admin Access" : "Welcome Back";

    function submit(e) {
      e.preventDefault();
      if (username === expected.username && password === expected.password) {
        setError("");
        onLogin(role);
        navigate(role === "admin" ? "/admin" : "/not-found");
      } else {
        setError("Invalid ID or password");
      }
    }

    return h("main", { className: "login-page" },
      h("form", { className: "login-card", onSubmit: submit },
        h(Logo),
        h("h1", null, appName),
        h("h2", null, title),
        h("p", null, role === "admin" ? "Sign in to manage records" : "Please sign in to continue"),
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
          role === "admin"
            ? h("button", { type: "button", onClick: () => navigate("/login") }, "User Login")
            : h("button", { type: "button", onClick: () => navigate("/admin") }, "Admin Login"),
          h("a", { href: "##" }, "Privacy Notice")
        )
      )
    );
  }

  function Shell({ route, data, onLogout, onResetDb }) {
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

    function toggleDensity() {
      const next = !compact;
      setCompact(next);
      localStorage.setItem("mumble-density", next ? "compact" : "comfortable");
    }

    return h("div", { className: cx("app-shell", compact && "compact") },
      h("aside", { className: "rail" },
        h(Logo),
        h("div", { className: "rail-stack" },
          IconButton({ label: "Dashboard", active: !isSettings, onClick: () => navigate("/dashboards/home"), children: "⌂" }),
          IconButton({ label: "Settings", active: isSettings, onClick: () => navigate("/settings/appearance"), children: "⚙" })
        ),
        h("button", { className: "avatar-dot", onClick: () => setProfileOpen(!profileOpen) }, "MU")
      ),
      h("aside", { className: "sidebar" },
        h("h1", null, isSettings ? "Settings" : appName),
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
        h("button", { className: "back-button", onClick: () => history.back(), title: "Back" }, "‹"),
        h("button", { className: "header-avatar", onClick: () => setProfileOpen(!profileOpen), "aria-expanded": profileOpen }, "MU")
      ),
      profileOpen && h(ProfileMenu, { onLogout }),
      h("main", { className: "content" },
        route === "/dashboards/home" && h(Home),
        route === "/dashboards/userRole/transaction" && h(TransactionPage, { mode: "recent", records: data.transactions }),
        route === "/dashboards/userRole/settlement" && h(SettlementPage, { mode: "recent", records: data.settlements }),
        route === "/dashboards/userRole/history/transaction" && h(TransactionPage, { mode: "history", records: data.transactions }),
        route === "/dashboards/userRole/history/settlement" && h(SettlementPage, { mode: "history", records: data.settlements }),
        isSettings && h(Appearance, { compact, toggleDensity, onResetDb }),
        !isSettings && !route.startsWith("/dashboards") && h(NotFound)
      )
    );
  }

  function ProfileMenu({ onLogout }) {
    return h("section", { className: "profile-menu" },
      h("div", { className: "profile-head" },
        h("div", { className: "profile-pic" }, "MU"),
        h("span", null, "Mumble User")
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

  function Home() {
    return h("section", { className: "home-grid" },
      h("div", { className: "home-title" },
        h("p", null, "Mumble user workspace"),
        h("h2", null, "Payment and settlement control panel")
      ),
      h("div", { className: "home-cards" },
        h("button", { onClick: () => navigate("/dashboards/userRole/transaction") }, h("strong", null, "Recent Transactions"), h("span", null, "Review incoming payment entries")),
        h("button", { onClick: () => navigate("/dashboards/userRole/settlement") }, h("strong", null, "Recent Settlement"), h("span", null, "Track commission and payout lines")),
        h("button", { onClick: () => navigate("/dashboards/userRole/history/transaction") }, h("strong", null, "History Search"), h("span", null, "Filter by amount or transaction ID"))
      )
    );
  }

  function Stat({ label, value, tone }) {
    return h("div", { className: cx("stat", tone) }, h("span", null, label), h("strong", null, value));
  }

  function Controls({ table, showQuery, onDownload }) {
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
        h("button", { className: "primary-button", onClick: table.refresh }, "Refresh"),
        h("button", { className: "secondary-button", onClick: table.clear }, "Clear"),
        h("button", { className: "secondary-button", onClick: onDownload }, "Download Sheet")
      )
    );
  }

  function Pager({ table }) {
    const pageButtons = Array.from({ length: Math.min(table.pages, 5) }, (_, index) => index + 1);
    return h("div", { className: "pager" },
      h("span", null, "Rows per page:"),
      h("select", { value: table.pageSize, onChange: (e) => table.setPageSize(e.target.value) },
        [5, 10, 20, 50, 100].map((size) => h("option", { key: size, value: size }, size))
      ),
      h("button", { disabled: table.page === 1, onClick: () => table.setPage(table.page - 1) }, "‹"),
      pageButtons.map((n) => h("button", { key: n, className: n === table.page ? "active" : "", onClick: () => table.setPage(n) }, n)),
      table.pages > 5 && h("button", { onClick: () => table.setPage(table.pages), className: table.page === table.pages ? "active" : "" }, table.pages),
      h("button", { disabled: table.page === table.pages, onClick: () => table.setPage(table.page + 1) }, "›")
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
      : [["Amount", "amount"], ["Transaction Id", "id"], ["Commission", "commission"], ["Commission Amount", "commissionAmount"], ["Paid Amount", "paid"], ["Remark", "remark"], ["Entry Date", "date"]];

    return h("div", { className: "table-wrap" },
      h("table", null,
        h("thead", null, h("tr", null, heads.map(([label, key]) => h("th", { key }, h(SortHeader, { label, keyName: key, table }))))),
        h("tbody", null,
          table.rows.length === 0
            ? h("tr", null, h("td", { colSpan: heads.length, className: "empty-row" }, "No records match the current filters."))
            : table.rows.map((row) => type === "transaction"
                ? h("tr", { key: row.id },
                    h("td", null, money(row.amount, true)),
                    h("td", { className: "transaction-id" }, row.id),
                    h("td", null, row.vpa),
                    h("td", null, row.payer),
                    h("td", null, row.remark || "—"),
                    h("td", null, row.date)
                  )
                : h("tr", { key: row.id },
                    h("td", null, money(row.amount, false)),
                    h("td", { className: "transaction-id" }, row.id),
                    h("td", null, row.commission),
                    h("td", null, money(row.commissionAmount, false)),
                    h("td", null, money(row.paid, true)),
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

  function TransactionPage({ mode, records }) {
    const table = useTable(records, "transaction", mode === "recent"
      ? { count: records.length, amount: records.reduce((sum, row) => sum + Number(row.amount || 0), 0), balance: 6705.6 }
      : { count: records.length, amount: records.reduce((sum, row) => sum + Number(row.amount || 0), 0), balance: -46050.13 });
    const title = mode === "recent" ? "Recent Transaction" : "Search Transaction History";

    function download() {
      const rows = table.allRows.map((row) => ({
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
      h(Breadcrumb, { current: mode === "recent" ? "Recent Transaction" : "Transaction History" }),
      h("div", { className: "panel" },
        h("div", { className: "panel-title" }, h("h2", null, title), h(LastUpdated, { table })),
        h(Controls, { table, showQuery: true, onDownload: download }),
        h("div", { className: "stats history-stats" },
          h(Stat, { label: "Transaction Count", value: table.totals.filteredCount + " local", tone: "neutral" }),
          h(Stat, { label: "Transaction Amount", value: money(table.totals.amount, false), tone: "neutral" }),
          h(Stat, { label: "Balance Amount", value: money(table.totals.balance, false), tone: table.totals.balance < 0 ? "danger" : "success" })
        ),
        h(DataTable, { type: "transaction", table }),
        h(Pager, { table })
      )
    );
  }

  function SettlementPage({ mode, records }) {
    const totalAmount = records.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const totalCommission = records.reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0);
    const totalPaid = records.reduce((sum, row) => sum + Number(row.paid || 0), 0);
    const table = useTable(records, "settlement", mode === "recent"
      ? { count: records.length, amount: totalAmount, balance: 6705.6 }
      : { count: records.length, commission: totalCommission, paid: totalPaid, balance: -46050.13 });
    const title = mode === "recent" ? "Recent Settlement" : "Search Settlement History";

    function download() {
      const rows = table.allRows.map((row) => ({
        Amount: money(row.amount, false),
        "Transaction Id": row.id,
        Commission: row.commission,
        "Commission Amount": money(row.commissionAmount, false),
        "Paid Amount": money(row.paid, true),
        Remark: row.remark,
        "Entry Date": row.date,
      }));
      downloadCsv("mumble-settlements.csv", ["Amount", "Transaction Id", "Commission", "Commission Amount", "Paid Amount", "Remark", "Entry Date"], rows);
    }

    return h("section", null,
      h(Breadcrumb, { current: mode === "recent" ? "Recent Settlement" : "Settlement History" }),
      h("div", { className: "panel" },
        h("div", { className: "panel-title" }, h("h2", null, title), h(LastUpdated, { table })),
        h(Controls, { table, showQuery: false, onDownload: download }),
        h("div", { className: cx("stats history-stats", mode === "history" && "four") },
          h(Stat, { label: mode === "history" ? "Settlement Count" : "Transaction Count", value: table.totals.filteredCount + " local", tone: "neutral" }),
          h(Stat, { label: mode === "history" ? "Commission Amount" : "Transaction Amount", value: money(mode === "history" ? table.totals.commission : table.totals.amount, false), tone: "neutral" }),
          mode === "history" && h(Stat, { label: "Settlement Amount", value: money(table.totals.paid, false), tone: "neutral" }),
          h(Stat, { label: "Balance Amount", value: money(table.totals.balance, false), tone: table.totals.balance < 0 ? "danger" : "success" })
        ),
        h(DataTable, { type: "settlement", table }),
        h(Pager, { table })
      )
    );
  }

  function recordValue(record, key) {
    return record[key] == null ? "" : String(record[key]);
  }

  function CrudManager({ type, records, onSave, onDelete }) {
    const emptyTransaction = { amount: "", id: "", vpa: "", payer: "", remark: "", date: nowLabel() };
    const emptySettlement = { amount: "", id: "", commission: "3%", commissionAmount: "", paid: "", remark: "", date: nowLabel() };
    const empty = type === "transaction" ? emptyTransaction : emptySettlement;
    const [form, setForm] = useState(empty);
    const [editingId, setEditingId] = useState("");
    const fields = type === "transaction"
      ? [["amount", "Amount"], ["id", "Transaction Id"], ["vpa", "VPA"], ["payer", "Payer Name"], ["remark", "Remark"], ["date", "Entry Date"]]
      : [["amount", "Amount"], ["id", "Transaction Id"], ["commission", "Commission"], ["commissionAmount", "Commission Amount"], ["paid", "Paid Amount"], ["remark", "Remark"], ["date", "Entry Date"]];

    function update(name, value) {
      setForm((current) => ({ ...current, [name]: value }));
    }

    function submit(e) {
      e.preventDefault();
      const prepared = Object.assign({}, form, {
        amount: Number(form.amount || 0),
      });
      if (type === "settlement") {
        prepared.commissionAmount = Number(form.commissionAmount || 0);
        prepared.paid = Number(form.paid || 0);
      }
      prepared.id = prepared.id.startsWith("#") ? prepared.id : "#" + prepared.id;
      onSave(prepared, editingId);
      setForm(empty);
      setEditingId("");
    }

    function edit(record) {
      setEditingId(record.id);
      setForm(Object.assign({}, record));
    }

    return h("section", { className: "admin-card" },
      h("div", { className: "panel-title" },
        h("h2", null, type === "transaction" ? "Transactions" : "Settlement"),
        editingId && h("button", { className: "secondary-button", onClick: () => { setEditingId(""); setForm(empty); } }, "Cancel Edit")
      ),
      h("form", { className: "admin-form", onSubmit: submit },
        fields.map(([key, label]) => h("label", { key }, label, h("input", {
          required: key === "amount" || key === "id",
          value: recordValue(form, key),
          onChange: (e) => update(key, e.target.value),
        }))),
        h("button", { className: "primary-button" }, editingId ? "Update Record" : "Add Record")
      ),
      h("div", { className: "admin-table-wrap" },
        h("table", null,
          h("thead", null, h("tr", null,
            fields.map((field) => h("th", { key: field[0] }, field[1])),
            h("th", null, "Actions")
          )),
          h("tbody", null, records.map((record) => h("tr", { key: record.id },
            fields.map(([key]) => h("td", { key }, key === "amount" || key === "commissionAmount" || key === "paid" ? money(record[key], key === "paid") : recordValue(record, key))),
            h("td", { className: "row-actions" },
              h("button", { className: "secondary-button", onClick: () => edit(record) }, "Edit"),
              h("button", { className: "danger-button", onClick: () => onDelete(record.id) }, "Delete")
            )
          )))
        )
      )
    );
  }

  function AdminPage({ data, setData, onLogout }) {
    function saveRecord(kind, record, editingId) {
      setData((current) => {
        const list = current[kind];
        const exists = list.some((item) => item.id === editingId || item.id === record.id);
        const nextList = exists
          ? list.map((item) => item.id === (editingId || record.id) ? record : item)
          : [record].concat(list);
        return Object.assign({}, current, { [kind]: nextList });
      });
    }

    function deleteRecord(kind, id) {
      setData((current) => Object.assign({}, current, { [kind]: current[kind].filter((item) => item.id !== id) }));
    }

    return h("main", { className: "admin-page" },
      h("header", { className: "admin-header" },
        h("div", null, h(Logo), h("div", null, h("p", null, appName), h("h1", null, "Admin Control"))),
        h("div", { className: "admin-header-actions" },
          h("button", { className: "secondary-button", onClick: () => navigate("/dashboards/home") }, "User App"),
          h("button", { className: "primary-button", onClick: onLogout }, "Logout")
        )
      ),
      h("div", { className: "admin-grid" },
        h(CrudManager, {
          type: "transaction",
          records: data.transactions,
          onSave: (record, editingId) => saveRecord("transactions", record, editingId),
          onDelete: (id) => deleteRecord("transactions", id),
        }),
        h(CrudManager, {
          type: "settlement",
          records: data.settlements,
          onSave: (record, editingId) => saveRecord("settlements", record, editingId),
          onDelete: (id) => deleteRecord("settlements", id),
        })
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
    const [data, setData] = useState(loadDb);
    const [role, setRole] = useState("");

    useEffect(() => {
      localStorage.setItem(dbKey, JSON.stringify(data));
    }, [data]);

    const normalizedRoute = useMemo(() => {
      if (route === "/") return role === "admin" ? "/admin" : role === "user" ? "/dashboards/home" : "/login";
      if (route === "/user") return "/not-found";
      return route;
    }, [route, role]);

    useEffect(() => {
      document.title = appName;
      localStorage.removeItem("mumble-role");
      if (route === "/" || (route === "/login" && role === "user")) navigate(role === "admin" ? "/admin" : role === "user" ? "/not-found" : "/login");
    }, [route, role]);

    function login(nextRole) {
      setRole(nextRole);
    }

    function logout() {
      setRole("");
      navigate("/login");
    }

    function resetDb() {
      const fresh = { transactions: defaultTransactions, settlements: defaultSettlements };
      setData(fresh);
      localStorage.setItem(dbKey, JSON.stringify(fresh));
    }

    if (normalizedRoute.startsWith("/admin")) {
      if (role !== "admin") return h(Login, { role: "admin", onLogin: login });
      return h(AdminPage, { data, setData, onLogout: logout });
    }

    if (!role || normalizedRoute === "/login") return h(Login, { role: "user", onLogin: login });
    if (normalizedRoute === "/not-found") return h(NotFound);
    return h(Shell, { route: normalizedRoute, data, onLogout: logout, onResetDb: resetDb });
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();

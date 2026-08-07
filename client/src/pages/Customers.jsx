import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatIndianCurrency } from "../utils/format";
import { Search, Printer, Users, Coins, ArrowLeftRight, User, CalendarClock } from "lucide-react";

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Indian financial year (April 1 - March 31) for a given date.
// e.g. a customer added in Apr 2024 or Jan 2025 both fall in FY "2024-25".
const getFinancialYear = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const year = dt.getFullYear();
  const startYear = dt.getMonth() >= 3 ? year : year - 1; // month index 3 = April
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [financialYear, setFinancialYear] = useState("all");
  const [storeFY, setStoreFY] = useState(null); // { start, end, label }
  const [selectedId, setSelectedId] = useState("");
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch the store's configured financial year from Company settings
  const loadStoreFY = async () => {
    try {
      const userRes = await axios.get("/api/auth/me");
      const compRes = await axios.get("/api/companies");
      const activeComp = compRes.data.find((c) => c._id === userRes.data.companyId) || compRes.data[0];
      if (activeComp && activeComp.financialYearStart) {
        const fyLabel = getFinancialYear(activeComp.financialYearStart);
        setStoreFY({ start: activeComp.financialYearStart, end: activeComp.financialYearEnd, label: fyLabel });
        // Default filter to the store's configured FY
        if (fyLabel) setFinancialYear(fyLabel);
      }
    } catch (err) {
      console.error("Error loading store FY:", err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await axios.get("/api/customers?limit=1000");
      setCustomers(res.data.customers || []);
    } catch (err) {
      setError("Failed to load customers.");
    }
  };

  useEffect(() => {
    loadStoreFY();
    loadCustomers();
  }, []);

  const loadStatement = async (id) => {
    setSelectedId(id);
    setLoading(true);
    setError("");
    setStatement(null);
    try {
      const res = await axios.get(`/api/reports/customer-statement/${id}`);
      setStatement(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load customer statement.");
    } finally {
      setLoading(false);
    }
  };

  // Distinct financial years present in the customer set, newest first.
  // A customer's FY = its stored financialYear tag, falling back to the
  // creation-date-derived FY for legacy records that predate the tag.
  const custFY = (c) => c.financialYear || getFinancialYear(c.createdAt);

  // Build FY filter options: from customer tags, the store FY, and 2020..current year.
  const financialYears = (() => {
    const list = customers.map((c) => custFY(c)).filter(Boolean);
    if (storeFY && storeFY.label) list.push(storeFY.label);
    const currentYear = new Date().getFullYear();
    for (let y = 2020; y <= currentYear; y++) {
      list.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`);
    }
    return [...new Set(list)].sort((a, b) => b.localeCompare(a));
  })();

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.toLowerCase().includes(q)) ||
      (c.idProofNumber && c.idProofNumber.toLowerCase().includes(q)) ||
      (c.customerCode && c.customerCode.toString().includes(q));
    const matchesFY = financialYear === "all" || custFY(c) === financialYear;
    return matchesSearch && matchesFY;
  });

  // Clean printable PDF export of the customer statement
  const handleDownloadPdf = () => {
    if (!statement) return;
    const { customer, deals, transactions, summary } = statement;

    const dealRows = (deals || [])
      .map(
        (d) => `
        <tr>
          <td class="mono">${d.dealNo || ""}</td>
          <td>${fmtDate(d.dealDate)}</td>
          <td class="mono">${d.refNo || ""}</td>
          <td class="right mono">\u20B9${formatIndianCurrency(d.dealAmount)}</td>
          <td>${d.interestRatePerMonth || 0}%/mo</td>
          <td style="text-transform:capitalize;">${d.status || ""}</td>
        </tr>`
      )
      .join("");

    const txRows = (transactions || [])
      .map(
        (t) => `
        <tr>
          <td class="mono">${t.transactionNo || ""}</td>
          <td>${fmtDate(t.tranDate)}</td>
          <td class="mono">${t.dealId?.dealNo || ""}</td>
          <td class="right mono">\u20B9${formatIndianCurrency(t.principle?.amountPaid || 0)}</td>
          <td class="right mono">\u20B9${formatIndianCurrency(t.compound?.amountPaid || 0)}</td>
          <td class="right mono">\u20B9${formatIndianCurrency(t.discount || 0)}</td>
          <td class="right mono">\u20B9${formatIndianCurrency(t.totalPaid || 0)}</td>
        </tr>`
      )
      .join("");

    // Year-wise value breakdown for deals older than a year
    const longDeals = (deals || []).filter((d) => d.yearlyBreakdown && d.yearlyBreakdown.length > 0);
    const yearlyHtml = longDeals
      .map((d) => {
        const rows = d.yearlyBreakdown
          .map(
            (y) => `
            <tr>
              <td>${y.label}</td>
              <td>${fmtDate(y.asOf)}</td>
              <td class="right mono">\u20B9${formatIndianCurrency(y.interestAmount)}</td>
              <td class="right mono">\u20B9${formatIndianCurrency(y.totalAmount)}</td>
            </tr>`
          )
          .join("");
        return `
          <h3 style="font-size:12px;margin:14px 0 4px;">Deal ${d.dealNo} — Loan \u20B9${formatIndianCurrency(d.dealAmount)} (${fmtDate(d.dealDate)})</h3>
          <table>
            <thead><tr><th>Period</th><th>As of</th><th class="right">Interest</th><th class="right">Total Value</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
      })
      .join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Customer Statement - ${customer.name}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #1a1a1a; }
            h1 { font-size: 20px; margin: 0; }
            h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
            .sub { color:#555; font-size:12px; margin-top:4px; }
            .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #333; padding-bottom:12px; margin-bottom:12px; }
            .cards { display:flex; gap:12px; margin:12px 0; flex-wrap:wrap; }
            .card { flex:1; min-width:130px; border:1px solid #ddd; border-radius:8px; padding:10px 12px; }
            .card .label { font-size:10px; text-transform:uppercase; color:#777; letter-spacing:.5px; }
            .card .value { font-size:15px; font-weight:bold; margin-top:4px; }
            table { width:100%; border-collapse:collapse; margin-top:6px; }
            th, td { border:1px solid #ccc; padding:7px 9px; font-size:12px; text-align:left; }
            th { background:#f3f3f3; text-transform:uppercase; font-size:10px; letter-spacing:.4px; }
            .right { text-align:right; }
            .mono { font-family:'Courier New', monospace; }
            @media print { @page { size: A4; margin: 12mm; } }
          </style>
        </head>
        <body>
          <div class="head">
            <div>
              <h1>${customer.name}</h1>
              <div class="sub">Code: #${customer.customerCode || ""} &nbsp;|&nbsp; Mobile: ${customer.mobile || "-"} &nbsp;|&nbsp; ID: ${customer.idProofNumber || "-"}</div>
              <div class="sub">${[customer.area, customer.city, customer.state].filter(Boolean).join(", ")}</div>
            </div>
            <div class="sub" style="text-align:right;">
              <div><strong>Customer Statement</strong></div>
              <div>Generated: ${new Date().toLocaleDateString("en-IN")}</div>
            </div>
          </div>

          <div class="cards">
            <div class="card"><div class="label">Total Deals</div><div class="value">${summary.dealCount} (${summary.activeDeals} active)</div></div>
            <div class="card"><div class="label">Total Loan Amount</div><div class="value">\u20B9${formatIndianCurrency(summary.totalDealAmount)}</div></div>
            <div class="card"><div class="label">Principal Paid</div><div class="value">\u20B9${formatIndianCurrency(summary.totalPrincipalPaid)}</div></div>
            <div class="card"><div class="label">Interest Paid</div><div class="value">\u20B9${formatIndianCurrency(summary.totalInterestPaid)}</div></div>
            <div class="card"><div class="label">Outstanding Principal</div><div class="value">\u20B9${formatIndianCurrency(summary.outstandingPrincipal)}</div></div>
          </div>

          <h2>Deals</h2>
          <table>
            <thead>
              <tr><th>Deal No</th><th>Date</th><th>Ref No</th><th class="right">Amount</th><th>Interest</th><th>Status</th></tr>
            </thead>
            <tbody>${dealRows || '<tr><td colspan="6" style="text-align:center;">No deals.</td></tr>'}</tbody>
          </table>

          ${longDeals.length > 0 ? `<h2>Year-wise Value (deals older than 1 year)</h2>${yearlyHtml}` : ""}

          <h2>Transactions</h2>
          <table>
            <thead>
              <tr><th>Txn No</th><th>Date</th><th>Deal</th><th class="right">Principal</th><th class="right">Interest</th><th class="right">Discount</th><th class="right">Total Paid</th></tr>
            </thead>
            <tbody>${txRows || '<tr><td colspan="7" style="text-align:center;">No transactions.</td></tr>'}</tbody>
          </table>

          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-500" /> Customers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            View a customer&apos;s complete deals &amp; transactions history and download a PDF statement.
          </p>
        </div>
        {statement && (
          <button
            onClick={handleDownloadPdf}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Printer className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Customer list */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, mobile, ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none"
            />
          </div>

          {/* Financial year filter (based on customer creation date) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <CalendarClock className="h-4 w-4" />
            </div>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Financial Years</option>
              {financialYears.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}{storeFY && storeFY.label === fy ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[10px] text-slate-500 px-1">
            Showing {filtered.length} of {customers.length} customers
          </div>

          <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-850 pr-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 italic">No customers found.</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c._id}
                  onClick={() => loadStatement(c._id)}
                  className={`w-full text-left p-3 rounded-lg text-xs flex justify-between items-center transition-colors ${
                    selectedId === c._id ? "bg-primary-600/20 text-white" : "hover:bg-slate-800/40 text-slate-300"
                  }`}
                >
                  <div>
                    <span className="font-semibold block text-slate-200">{c.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{c.mobile || "No mobile"}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-amber-500 text-[10px] font-bold">#{c.customerCode}</span>
                    {custFY(c) && (
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-900/60 border border-slate-800 rounded px-1.5 py-0.5">
                        FY {custFY(c)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="bg-rose-900/20 border border-rose-800/40 rounded-xl px-4 py-3 text-rose-400 text-xs">{error}</div>
          )}

          {!selectedId && !loading && (
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center space-y-3">
              <User className="h-12 w-12 text-slate-700 mx-auto" />
              <p className="text-slate-400 font-semibold text-sm">Select a customer to view details</p>
            </div>
          )}

          {loading && (
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center">
              <p className="text-slate-500 italic text-sm">Loading customer statement...</p>
            </div>
          )}

          {statement && !loading && (
            <>
              {/* Customer header */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                <h2 className="text-lg font-bold text-slate-100">{statement.customer.name}</h2>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span>#{statement.customer.customerCode}</span>
                  <span>{statement.customer.mobile || "-"}</span>
                  <span>ID: {statement.customer.idProofNumber || "-"}</span>
                  <span>{[statement.customer.area, statement.customer.city].filter(Boolean).join(", ")}</span>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Deals</span>
                  <span className="text-lg font-bold text-slate-200 mt-1 block">{statement.summary.dealCount}</span>
                  <span className="text-[10px] text-slate-500">{statement.summary.activeDeals} active</span>
                </div>
                <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Loan Amount</span>
                  <span className="text-lg font-bold text-amber-500 mt-1 block">&#8377;{formatIndianCurrency(statement.summary.totalDealAmount)}</span>
                </div>
                <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Paid</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">&#8377;{formatIndianCurrency(statement.summary.totalPaid)}</span>
                </div>
                <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl">
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Outstanding</span>
                  <span className="text-lg font-bold text-rose-400 mt-1 block">&#8377;{formatIndianCurrency(statement.summary.outstandingPrincipal)}</span>
                </div>
              </div>

              {/* Deals table */}
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary-400" />
                  <h3 className="text-sm font-bold text-slate-200">Deals</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-4">Deal No</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Ref No</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                        <th className="py-2.5 px-4">Interest</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {statement.deals.length === 0 ? (
                        <tr><td colSpan="6" className="py-4 text-center text-slate-500 italic">No deals.</td></tr>
                      ) : (
                        statement.deals.map((d) => (
                          <tr key={d._id} className="hover:bg-slate-900/20">
                            <td className="py-2.5 px-4 font-mono text-amber-500 font-bold">{d.dealNo}</td>
                            <td className="py-2.5 px-4">{fmtDate(d.dealDate)}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-400">{d.refNo || "-"}</td>
                            <td className="py-2.5 px-4 text-right font-mono">&#8377;{formatIndianCurrency(d.dealAmount)}</td>
                            <td className="py-2.5 px-4">{d.interestRatePerMonth}%/mo</td>
                            <td className="py-2.5 px-4 capitalize">{d.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Year-wise breakdown for deals older than a year */}
              {statement.deals.some((d) => d.yearlyBreakdown && d.yearlyBreakdown.length > 0) && (
                <div className="glass-panel rounded-2xl border border-amber-500/30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 bg-amber-950/10">
                    <CalendarClock className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-amber-300">Year-wise Value (deals older than 1 year)</h3>
                  </div>
                  <div className="p-4 space-y-5">
                    {statement.deals
                      .filter((d) => d.yearlyBreakdown && d.yearlyBreakdown.length > 0)
                      .map((d) => (
                        <div key={d._id} className="space-y-2">
                          <div className="text-xs font-bold text-slate-300 flex flex-wrap gap-x-3">
                            <span className="font-mono text-amber-500">Deal {d.dealNo}</span>
                            <span className="text-slate-400">Loan &#8377;{formatIndianCurrency(d.dealAmount)}</span>
                            <span className="text-slate-500 font-mono">{fmtDate(d.dealDate)}</span>
                          </div>
                          <div className="overflow-x-auto border border-slate-850 rounded-lg">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                                  <th className="py-2 px-3">Period</th>
                                  <th className="py-2 px-3">As of</th>
                                  <th className="py-2 px-3 text-right">Interest</th>
                                  <th className="py-2 px-3 text-right">Total Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-850 text-slate-300 font-mono">
                                {d.yearlyBreakdown.map((y) => (
                                  <tr key={`${d._id}-${y.label}`} className={y.label === 'Current' ? 'bg-amber-950/10' : ''}>
                                    <td className={`py-2 px-3 font-sans font-semibold ${y.label === 'Current' ? 'text-amber-400' : 'text-slate-300'}`}>{y.label}</td>
                                    <td className="py-2 px-3">{fmtDate(y.asOf)}</td>
                                    <td className="py-2 px-3 text-right text-primary-400">&#8377;{formatIndianCurrency(y.interestAmount)}</td>
                                    <td className="py-2 px-3 text-right font-bold text-amber-500">&#8377;{formatIndianCurrency(y.totalAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Transactions table */}
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-primary-400" />
                  <h3 className="text-sm font-bold text-slate-200">Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-4">Txn No</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Deal</th>
                        <th className="py-2.5 px-4 text-right">Principal</th>
                        <th className="py-2.5 px-4 text-right">Interest</th>
                        <th className="py-2.5 px-4 text-right">Discount</th>
                        <th className="py-2.5 px-4 text-right">Total Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300 font-mono">
                      {statement.transactions.length === 0 ? (
                        <tr><td colSpan="7" className="py-4 text-center text-slate-500 italic font-sans">No transactions.</td></tr>
                      ) : (
                        statement.transactions.map((t) => (
                          <tr key={t._id} className="hover:bg-slate-900/20">
                            <td className="py-2.5 px-4 text-amber-500 font-bold">#{t.transactionNo}</td>
                            <td className="py-2.5 px-4">{fmtDate(t.tranDate)}</td>
                            <td className="py-2.5 px-4">{t.dealId?.dealNo || "-"}</td>
                            <td className="py-2.5 px-4 text-right">&#8377;{formatIndianCurrency(t.principle?.amountPaid || 0)}</td>
                            <td className="py-2.5 px-4 text-right">&#8377;{formatIndianCurrency(t.compound?.amountPaid || 0)}</td>
                            <td className="py-2.5 px-4 text-right">&#8377;{formatIndianCurrency(t.discount || 0)}</td>
                            <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">&#8377;{formatIndianCurrency(t.totalPaid || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Customers;

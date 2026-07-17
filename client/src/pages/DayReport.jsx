import React, { useState } from "react";
import axios from "axios";
import { formatIndianCurrency } from "../utils/format";
import { CalendarDays, FileText, Printer, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const DayReport = () => {
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    if (!date) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await axios.get("/api/reports/day-report", { params: { date } });
      setReport(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch day report.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    const printWin = window.open("", "_blank", "width=1100,height=800");
    const rows = report.rows || [];
    const totals = report.totals || {};
    const fmtP = (n) => "Rs." + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const tableRows = rows.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">No transactions on this date.</td></tr>`
      : rows.map((r) =>
          `<tr>
            <td>${r.serial}</td>
            <td>${r.customerName} <span class="${r.type === "Deal" ? "bd" : "br"}">${r.type}</span></td>
            <td>${r.refNo1}</td>
            <td class="n">${r.principalAmt > 0 ? fmtP(r.principalAmt) : "&ndash;"}</td>
            <td class="n">${r.interestAmt > 0 ? fmtP(r.interestAmt) : "&ndash;"}</td>
            <td class="n">${r.payAmt > 0 ? fmtP(r.payAmt) : "&ndash;"}</td>
            <td class="n" style="font-weight:700">${fmtP(r.balance)}</td>
          </tr>`
        ).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Day Report - ${fmtDate(report.date)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;padding:32px 40px;font-size:13px}
    .ht{font-size:22px;font-weight:800;border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:20px}
    .mr{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
    .mb{background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px 16px;flex:1;min-width:180px}
    .ml{font-size:10px;text-transform:uppercase;font-weight:700;color:#64748b;letter-spacing:0.5px}
    .mv{font-size:16px;font-weight:800;font-family:monospace;margin-top:4px;color:#0f172a}
    table{width:100%;border-collapse:collapse;border:1.5px solid #0f172a;margin-top:20px}
    thead tr{background:#0f172a !important;color:#ffffff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    th{padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:left;border:1px solid #cbd5e1;color:#ffffff}
    th.n,td.n{text-align:right}
    td{padding:9px 12px;font-size:12px;border:1px solid #cbd5e1}
    td.n{font-family:monospace}
    tr:nth-child(even){background:#f8fafc}
    .bd{background:#e8f5e9;color:#2e7d32;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700}
    .br{background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700}
    .tr{background:#f1f5f9 !important;color:#0f172a !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-weight:700}
    .tr td{border:1px solid #cbd5e1;color:#0f172a !important}
    .fn{margin-top:36px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px}
  </style>
</head>
<body>
  <div class="ht">Day Closing Report &mdash; Daily Audit &amp; Transaction Summary</div>
  <div class="mr">
    <div class="mb"><div class="ml">Opening Balance</div><div class="mv">${fmtP(report.openingBalance)}</div></div>
    <div class="mb"><div class="ml">Total Received (+)</div><div class="mv" style="color:#16a34a">${fmtP(totals.principalAmt + totals.interestAmt)}</div></div>
    <div class="mb"><div class="ml">Total Paid Out (-)</div><div class="mv" style="color:#dc2626">${fmtP(totals.payAmt)}</div></div>
    <div class="mb"><div class="ml">Closing Balance</div><div class="mv" style="color:#d97706">${fmtP(report.closingBalance)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Sr.</th><th>Customer Name</th><th>Ref No.</th>
        <th class="n">Principal Amt</th><th class="n">Interest Amt</th><th class="n">Pay Amount</th><th class="n">Balance</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr class="tr">
        <td colspan="3" style="padding-left:12px;font-size:12px">TOTAL</td>
        <td class="n">${fmtP(totals.principalAmt)}</td>
        <td class="n">${fmtP(totals.interestAmt)}</td>
        <td class="n">${fmtP(totals.payAmt)}</td>
        <td class="n">${fmtP(report.closingBalance)}</td>
      </tr>
      <tr style="background:#f8fafc;font-weight:700;border-top:1.5px solid #0f172a;">
        <td colspan="5" style="padding-left:12px;padding-top:10px;padding-bottom:10px;font-size:12px">CLOSING BALANCE</td>
        <td colspan="2" class="n" style="padding-top:10px;padding-bottom:10px;font-size:14px;padding-right:12px">${fmtP(report.closingBalance)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="fn">Generated on ${new Date().toLocaleString("en-IN")} | Girvi Gold & Silver Mortgage System</div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="space-y-6 font-sans">

      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Day Report</h1>
          <p className="text-xs text-slate-400 mt-1">
            Daily audit — transactions, opening &amp; closing balance summary for a selected date.
          </p>
        </div>
        {report && (
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Export PDF</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/40 p-5 border border-slate-850 rounded-2xl space-y-4 no-print">
        <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center space-x-2">
          <CalendarDays className="h-4 w-4 text-primary-405" />
          <span>Report Filter Parameters</span>
        </h4>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 text-xs">Select Date:</label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none focus:border-primary-500 font-mono"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading || !date}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-md text-xs"
          >
            {loading ? "Compiling..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center space-x-2 bg-rose-900/20 border border-rose-800/40 rounded-xl px-4 py-3 text-rose-400 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Area */}
      {report && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0">

          {/* Report Header */}
          <div className="flex justify-between items-start border-b border-slate-850 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-205 print:text-black">Day Closing Report</h2>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Date: <span className="font-mono font-bold text-slate-300">{fmtDate(report.date)}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-slate-600 space-y-1">
              <p className="font-bold text-slate-350 print:text-black">Daily Transaction Audit</p>
              <p className="font-mono text-primary-400 print:text-primary-600">
                Generated: {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          {/* Balance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs">
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
              <span className="text-slate-500 block uppercase font-bold text-[10px]">Opening Balance</span>
              <span className="text-lg font-bold text-slate-200 print:text-black mt-1 block">
                &#8377;{formatIndianCurrency(report.openingBalance)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Start of {fmtDate(report.date)}</span>
            </div>
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
              <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Received (+)</span>
              <span className="text-lg font-bold text-emerald-400 print:text-emerald-600 mt-1 block">
                &#8377;{formatIndianCurrency(report.totals?.principalAmt + report.totals?.interestAmt)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Principal: &#8377;{formatIndianCurrency(report.totals?.principalAmt)} | Interest: &#8377;{formatIndianCurrency(report.totals?.interestAmt)}
              </span>
            </div>
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
              <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Paid Out (-)</span>
              <span className="text-lg font-bold text-rose-400 print:text-rose-650 mt-1 block">
                &#8377;{formatIndianCurrency(report.totals?.payAmt)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">New mortgage loans given</span>
            </div>
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
              <span className="text-slate-500 block uppercase font-bold text-[10px]">Closing Balance</span>
              <span className="text-lg font-bold text-amber-500 print:text-amber-600 mt-1 block">
                &#8377;{formatIndianCurrency(report.closingBalance)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">End of day cash position</span>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-slate-850 rounded-xl print:border-slate-300 print:rounded-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider print:bg-slate-100 print:text-black print:border-slate-305">
                  <th className="py-3 px-4">Sr No.</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Ref No.</th>
                  <th className="py-3 px-4 text-right">Principal Amt</th>
                  <th className="py-3 px-4 text-right">Interest Amt</th>
                  <th className="py-3 px-4 text-right">Pay Amount</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs text-slate-300 print:divide-slate-200 print:text-black">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 italic">Compiling day report...</td>
                  </tr>
                ) : !report.rows || report.rows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 italic">No transactions or deals found for this date.</td>
                  </tr>
                ) : (
                  report.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{row.serial}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200 print:text-black">{row.customerName}</span>
                        {" "}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.type === "Deal"
                            ? "bg-rose-900/30 text-rose-400 border border-rose-900/50 print:bg-rose-100 print:text-rose-700"
                            : "bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 print:bg-emerald-100 print:text-emerald-700"
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-350 print:text-black">{row.refNo1}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-400 print:text-rose-600">
                        {row.principalAmt > 0 ? `\u20B9${formatIndianCurrency(row.principalAmt)}` : "\u2014"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-primary-400 print:text-primary-600">
                        {row.interestAmt > 0 ? `\u20B9${formatIndianCurrency(row.interestAmt)}` : "\u2014"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 print:text-emerald-600">
                        {row.payAmt > 0 ? `\u20B9${formatIndianCurrency(row.payAmt)}` : "\u2014"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-500 print:text-amber-600">
                        &#8377;{formatIndianCurrency(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {report.rows && report.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900/60 border-t-2 border-slate-800 text-xs font-bold">
                    <td colSpan="3" className="py-3 px-4 text-slate-450 uppercase tracking-wider">Day Total</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400">
                      &#8377;{formatIndianCurrency(report.totals?.principalAmt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-primary-400">
                      &#8377;{formatIndianCurrency(report.totals?.interestAmt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      &#8377;{formatIndianCurrency(report.totals?.payAmt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-500">
                      &#8377;{formatIndianCurrency(report.closingBalance)}
                    </td>
                  </tr>
                  <tr className="bg-amber-900/10 border-t border-amber-900/30 text-xs font-bold">
                    <td colSpan="5" className="py-3 px-4 text-amber-500 uppercase tracking-wider">
                      Closing Balance
                    </td>
                    <td colSpan="2" className="py-3 px-4 text-right font-mono text-lg text-amber-400 print:text-amber-600 font-black">
                      &#8377;{formatIndianCurrency(report.closingBalance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && !error && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center space-y-3 shadow-xl">
          <CalendarDays className="h-12 w-12 text-slate-700 mx-auto" />
          <p className="text-slate-400 font-semibold text-sm">Select a date and click Generate Report</p>
          <p className="text-slate-600 text-xs">
            The report will show all deals and transactions for that day along with opening and closing balances.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center shadow-xl">
          <p className="text-slate-500 italic text-sm">Compiling day report...</p>
        </div>
      )}
    </div>
  );
};

export default DayReport;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatIndianCurrency } from "../utils/format";
import { 
  CalendarDays, 
  Printer, 
  AlertCircle, 
  ArrowLeft, 
  Download, 
  RefreshCw,
  X
} from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ---- Date range helpers ----
const toISO = (d) => d.toISOString().split("T")[0];

// Monday-Sunday week containing the given date
const getWeekRange = (dateStr) => {
  const d = new Date(dateStr);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toISO(start), end: toISO(end) };
};

// First-last day of the month (month string "YYYY-MM")
const getMonthRange = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start: toISO(start), end: toISO(end) };
};

const DayReport = () => {
  const [mode, setMode] = useState("daily"); // daily | weekly | monthly | custom
  const [date, setDate] = useState(today());
  const [weekDate, setWeekDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());

  const [report, setReport] = useState(null);
  const [rangeLabel, setRangeLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyDetails, setCompanyDetails] = useState(null);

  // Preview & Export states
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    // Preload html2pdf library
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const fetchCompany = async () => {
      try {
        const userRes = await axios.get('/api/auth/me');
        const compListRes = await axios.get('/api/companies');
        let activeComp = compListRes.data.find(c => c._id === userRes.data.companyId);
        if (!activeComp && compListRes.data.length > 0) activeComp = compListRes.data[0];
        setCompanyDetails(activeComp);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCompany();
  }, []);

  // Resolve the active start/end based on the selected mode
  const resolveRange = () => {
    if (mode === "daily") return { start: date, end: date };
    if (mode === "weekly") return getWeekRange(weekDate);
    if (mode === "monthly") return getMonthRange(month);
    return { start: fromDate, end: toDate };
  };

  const fetchReport = async () => {
    const { start, end } = resolveRange();
    if (!start || !end) return;
    if (new Date(end) < new Date(start)) {
      setError("End date cannot be before start date.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);
    try {
      let res;
      if (mode === "daily") {
        res = await axios.get("/api/reports/day-report", { params: { date: start } });
      } else {
        res = await axios.get("/api/reports/period-report", {
          params: { startDate: start, endDate: end, reportType: mode },
        });
      }
      setReport(res.data);
      setRangeLabel(
        mode === "daily" ? fmtDate(start) : `${fmtDate(start)}  —  ${fmtDate(end)}`
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch report.");
    } finally {
      setLoading(false);
    }
  };

  const modeTitle = {
    daily: "Day Closing Report",
    weekly: "Weekly Report",
    monthly: "Monthly Report",
    custom: "Period Report",
  }[mode];

  const handleOpenPreview = () => {
    if (!report) return;
    setIsPreviewMode(true);
  };

  // Dedicated Print window/dialog trigger for 100% device compatibility
  const handleDirectPrint = () => {
    if (!report) {
      window.print();
      return;
    }
    const compName = companyDetails?.name || 'JEWELLERY MORTGAGE STORE';
    const compAddr = companyDetails?.address || '';
    const compPhone = companyDetails?.mobile || companyDetails?.phone || '';

    const rowsHtml = (report.rows || [])
      .map(
        (row) => `
          <tr>
            <td style="text-align:center;">${row.serial}</td>
            <td><strong>${row.customerName || ""}</strong> <span class="tag ${row.type === "Deal" ? "tag-deal" : "tag-receipt"}">${row.type}</span></td>
            <td class="mono">${row.refNo1 || ""}</td>
            <td class="mono right">${row.principalAmt > 0 ? "₹" + formatIndianCurrency(row.principalAmt) : "—"}</td>
            <td class="mono right">${row.interestAmt > 0 ? "₹" + formatIndianCurrency(row.interestAmt) : "—"}</td>
            <td class="mono right">${row.payAmt > 0 ? "₹" + formatIndianCurrency(row.payAmt) : "—"}</td>
            <td class="mono right bold">₹${formatIndianCurrency(Math.abs(row.balance || 0))}</td>
          </tr>`
      )
      .join("");

    const emptyRow = `<tr><td colspan="7" style="text-align:center;padding:16px;">No transactions or deals found for this period.</td></tr>`;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${modeTitle} - ${rangeLabel}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: sans-serif; padding: 15px; color: #000; font-size: 11px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
              .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
              .title-bar { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 12px; background: #eee; padding: 6px 10px; border: 1px solid #ccc; }
              .cards { display: table; width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              .cards td { border: 1px solid #000; padding: 6px; text-align: center; width: 25%; background: #f9f9f9; }
              .card-lbl { font-size: 9px; text-transform: uppercase; color: #555; font-weight: bold; }
              .card-val { font-size: 12px; font-weight: bold; font-family: monospace; }
              table.data { width: 100%; border-collapse: collapse; }
              table.data th, table.data td { border: 1px solid #333; padding: 5px 6px; font-size: 10px; }
              table.data th { background: #e0e0e0; text-transform: uppercase; font-size: 9px; }
              .right { text-align: right; }
              .mono { font-family: monospace; }
              .bold { font-weight: bold; }
              tfoot td { font-weight: bold; background: #f0f0f0; border-top: 2px solid #000; }
              .tag { font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; }
              .tag-deal { background: #fee2e2; color: #991b1b; }
              .tag-receipt { background: #dcfce7; color: #166534; }
              @media print { @page { size: A4 portrait; margin: 8mm; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">${compName}</div>
              <div style="font-size:10px;">${compAddr} ${compPhone ? '| Ph: ' + compPhone : ''}</div>
            </div>
            <div class="title-bar">
              <span>${modeTitle}</span>
              <span>Period: ${rangeLabel}</span>
            </div>
            <table class="cards">
              <tr>
                <td><div class="card-lbl">Opening Balance</div><div class="card-val">₹${formatIndianCurrency(Math.abs(report.openingBalance || 0))}</div></td>
                <td><div class="card-lbl">Total Received (+)</div><div class="card-val" style="color:#15803d;">₹${formatIndianCurrency((report.totals?.principalAmt || 0) + (report.totals?.interestAmt || 0))}</div></td>
                <td><div class="card-lbl">Total Paid Out (-)</div><div class="card-val" style="color:#b91c1c;">₹${formatIndianCurrency(Math.abs(report.totals?.payAmt || 0))}</div></td>
                <td><div class="card-lbl">Closing Balance</div><div class="card-val" style="color:#b45309;">₹${formatIndianCurrency(Math.abs(report.closingBalance || 0))}</div></td>
              </tr>
            </table>
            <table class="data">
              <thead>
                <tr>
                  <th style="width:5%;text-align:center;">Sr</th>
                  <th style="width:30%;">Customer Name</th>
                  <th style="width:17%;">Ref / Deal No.</th>
                  <th style="width:12%;text-align:right;">Principal</th>
                  <th style="width:12%;text-align:right;">Interest</th>
                  <th style="width:12%;text-align:right;">Pay Amount</th>
                  <th style="width:14%;text-align:right;">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${(report.rows && report.rows.length > 0) ? rowsHtml : emptyRow}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align:right;padding-right:8px;">TOTAL:</td>
                  <td class="mono right">₹${formatIndianCurrency(report.totals?.principalAmt)}</td>
                  <td class="mono right">₹${formatIndianCurrency(report.totals?.interestAmt)}</td>
                  <td class="mono right">₹${formatIndianCurrency(report.totals?.payAmt)}</td>
                  <td class="mono right bold">₹${formatIndianCurrency(Math.abs(report.closingBalance || 0))}</td>
                </tr>
              </tfoot>
            </table>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  // Reliable PDF Export with Blob file fallback
  const handleDownloadPDF = () => {
    const element = document.getElementById('report-pdf-document');
    if (!element) return;
    setDownloadingPDF(true);

    const cleanFileName = `${modeTitle}_${rangeLabel}`.replace(/[^a-zA-Z0-9]/g, '_');

    const downloadBlob = () => {
      const compName = companyDetails?.name || 'JEWELLERY MORTGAGE STORE';
      const compAddr = companyDetails?.address || '';
      const compPhone = companyDetails?.mobile || companyDetails?.phone || '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${modeTitle} - ${rangeLabel}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #000; font-size: 12px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .company { font-size: 20px; font-weight: bold; text-transform: uppercase; }
              .title-bar { display: flex; justify-content: space-between; font-weight: bold; background: #eee; padding: 8px; border: 1px solid #ccc; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #333; padding: 6px 8px; font-size: 11px; }
              th { background: #f0f0f0; text-transform: uppercase; }
              .right { text-align: right; }
              .mono { font-family: monospace; }
              .bold { font-weight: bold; }
              tfoot td { font-weight: bold; background: #f5f5f5; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company">${compName}</div>
              <div>${compAddr} ${compPhone ? '| Ph: ' + compPhone : ''}</div>
            </div>
            <div class="title-bar">
              <span>${modeTitle}</span>
              <span>Period: ${rangeLabel}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:5%;">Sr</th>
                  <th style="width:30%;">Customer Name</th>
                  <th style="width:17%;">Ref / Deal No.</th>
                  <th style="width:12%;text-align:right;">Principal</th>
                  <th style="width:12%;text-align:right;">Interest</th>
                  <th style="width:12%;text-align:right;">Pay Amount</th>
                  <th style="width:14%;text-align:right;">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${(report.rows || []).map(r => `
                  <tr>
                    <td style="text-align:center;">${r.serial}</td>
                    <td><strong>${r.customerName || ''}</strong> (${r.type})</td>
                    <td class="mono">${r.refNo1 || ''}</td>
                    <td class="mono right">${r.principalAmt > 0 ? '₹' + formatIndianCurrency(r.principalAmt) : '—'}</td>
                    <td class="mono right">${r.interestAmt > 0 ? '₹' + formatIndianCurrency(r.interestAmt) : '—'}</td>
                    <td class="mono right">${r.payAmt > 0 ? '₹' + formatIndianCurrency(r.payAmt) : '—'}</td>
                    <td class="mono right bold">₹${formatIndianCurrency(Math.abs(r.balance || 0))}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align:right;">TOTAL:</td>
                  <td class="mono right">₹${formatIndianCurrency(report.totals?.principalAmt)}</td>
                  <td class="mono right">₹${formatIndianCurrency(report.totals?.interestAmt)}</td>
                  <td class="mono right">₹${formatIndianCurrency(report.totals?.payAmt)}</td>
                  <td class="mono right bold">₹${formatIndianCurrency(Math.abs(report.closingBalance || 0))}</td>
                </tr>
              </tfoot>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadingPDF(false);
    };

    if (window.html2pdf) {
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `${cleanFileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().set(opt).from(element).save().then(() => {
        setDownloadingPDF(false);
      }).catch((err) => {
        console.error('PDF Export Error:', err);
        downloadBlob();
      });
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        const opt = {
          margin: [6, 6, 6, 6],
          filename: `${cleanFileName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        window.html2pdf().set(opt).from(element).save().then(() => {
          setDownloadingPDF(false);
        }).catch(() => {
          downloadBlob();
        });
      };
      script.onerror = () => {
        downloadBlob();
      };
      document.body.appendChild(script);
    }
  };

  // If Preview Mode is active, render responsive document view with Back, Cancel & Download buttons
  if (isPreviewMode && report) {
    const compName = companyDetails?.name || 'JEWELLERY MORTGAGE STORE';
    const compAddr = companyDetails?.address || '';
    const compPhone = companyDetails?.mobile || companyDetails?.phone || '';

    return (
      <div className="space-y-4 font-sans text-slate-100 min-h-screen">
        {/* Top Control Bar with Back, Cancel, Download & Print */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl no-print">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPreviewMode(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:text-white rounded-xl text-xs font-bold transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => { setIsPreviewMode(false); setReport(null); }}
              className="flex items-center space-x-2 px-4 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-bold transition-all"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {downloadingPDF ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handleDirectPrint}
              className="flex items-center space-x-2 px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Responsive Report Document Preview */}
        <div className="w-full overflow-x-auto p-1 sm:p-2 flex justify-center">
          <div
            id="report-pdf-document"
            className="bg-white text-black p-4 sm:p-8 rounded-xl shadow-2xl w-full max-w-4xl text-xs font-sans space-y-4 print:p-0 print:shadow-none print:w-full min-w-[300px]"
          >
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3">
              <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-black">{compName}</h1>
              <p className="text-[10px] text-gray-700 mt-0.5">{compAddr} {compPhone ? `| Phone: ${compPhone}` : ''}</p>
            </div>

            {/* Title & Date Bar */}
            <div className="flex flex-wrap justify-between items-center bg-gray-100 border border-gray-300 p-2.5 rounded-lg text-xs gap-2">
              <span className="font-bold uppercase text-black text-xs sm:text-sm">{modeTitle}</span>
              <span className="font-mono text-gray-700 text-[10px] sm:text-xs">Period: <strong>{rangeLabel}</strong> | Date: {new Date().toLocaleDateString("en-IN")}</span>
            </div>

            {/* Responsive Summary Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-black p-2 rounded-lg bg-gray-50 text-center font-mono">
              <div className="p-1">
                <div className="text-[9px] uppercase text-gray-600 font-bold font-sans">
                  Opening Balance {
                    report.openingBalanceMode === 'bank' ? '(🏦 Bank)' :
                    report.openingBalanceMode === 'both' ? '(🔀 Cash + Bank)' :
                    report.openingBalanceMode === 'other' ? `(💼 ${report.openingBalanceCustomSource || 'Other'})` :
                    '(💵 Cash)'
                  }
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-black mt-0.5">₹{formatIndianCurrency(Math.abs(report.openingBalance || 0))}</div>
                {report.openingBalanceMode === 'both' && (report.openingCashBalance !== undefined || report.openingBankBalance !== undefined) && (
                  <div className="text-[8px] text-gray-700 font-sans mt-0.5">
                    Cash: ₹{formatIndianCurrency(report.openingCashBalance || 0)} | Bank: ₹{formatIndianCurrency(report.openingBankBalance || 0)}
                  </div>
                )}
              </div>
              <div className="p-1">
                <div className="text-[9px] uppercase text-gray-600 font-bold font-sans">Total Received (+)</div>
                <div className="text-xs sm:text-sm font-extrabold text-emerald-700 mt-0.5">₹{formatIndianCurrency((report.totals?.principalAmt || 0) + (report.totals?.interestAmt || 0))}</div>
              </div>
              <div className="p-1">
                <div className="text-[9px] uppercase text-gray-600 font-bold font-sans">Total Paid Out (-)</div>
                <div className="text-xs sm:text-sm font-extrabold text-red-700 mt-0.5">₹{formatIndianCurrency(Math.abs(report.totals?.payAmt || 0))}</div>
              </div>
              <div className="p-1">
                <div className="text-[9px] uppercase text-gray-600 font-bold font-sans">Closing Balance</div>
                <div className="text-xs sm:text-sm font-extrabold text-amber-700 mt-0.5">₹{formatIndianCurrency(Math.abs(report.closingBalance || 0))}</div>
              </div>
            </div>

            {/* Responsive Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-left text-[10px] sm:text-[11px]">
                <thead>
                  <tr className="bg-gray-100 text-black font-bold uppercase text-[9px] sm:text-[9.5px]">
                    <th className="border border-black p-1.5 text-center w-[5%]">Sr</th>
                    <th className="border border-black p-1.5 w-[28%]">Customer Name</th>
                    <th className="border border-black p-1.5 w-[17%]">Ref / Deal No.</th>
                    <th className="border border-black p-1.5 text-right w-[12.5%]">Principal</th>
                    <th className="border border-black p-1.5 text-right w-[12.5%]">Interest</th>
                    <th className="border border-black p-1.5 text-right w-[12.5%]">Pay Amount</th>
                    <th className="border border-black p-1.5 text-right w-[12.5%]">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {!report.rows || report.rows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-4 text-center text-gray-500 italic font-sans">No transactions or deals found for this period.</td>
                    </tr>
                  ) : (
                    report.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-400 p-1.5 text-center font-mono">{row.serial}</td>
                        <td className="border border-gray-400 p-1.5 font-bold">
                          {row.customerName || ""}
                          <span className={`ml-1 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold ${row.type === "Deal" ? "bg-rose-900 text-white border border-rose-700" : "bg-emerald-900 text-white border border-emerald-700"}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="border border-gray-400 p-1.5 font-mono">{row.refNo1 || ""}</td>
                        <td className="border border-gray-400 p-1.5 text-right font-mono">{row.principalAmt > 0 ? `₹${formatIndianCurrency(row.principalAmt)}` : "—"}</td>
                        <td className="border border-gray-400 p-1.5 text-right font-mono">{row.interestAmt > 0 ? `₹${formatIndianCurrency(row.interestAmt)}` : "—"}</td>
                        <td className="border border-gray-400 p-1.5 text-right font-mono">{row.payAmt > 0 ? `₹${formatIndianCurrency(row.payAmt)}` : "—"}</td>
                        <td className="border border-gray-400 p-1.5 text-right font-mono font-bold">₹{formatIndianCurrency(Math.abs(row.balance || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {report.rows && report.rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-black">
                      <td colSpan="3" className="border border-black p-1.5 text-right pr-3 uppercase">Period Total:</td>
                      <td className="border border-black p-1.5 text-right font-mono">₹{formatIndianCurrency(report.totals?.principalAmt)}</td>
                      <td className="border border-black p-1.5 text-right font-mono">₹{formatIndianCurrency(report.totals?.interestAmt)}</td>
                      <td className="border border-black p-1.5 text-right font-mono">₹{formatIndianCurrency(report.totals?.payAmt)}</td>
                      <td className="border border-black p-1.5 text-right font-mono font-extrabold text-amber-800">₹{formatIndianCurrency(Math.abs(report.closingBalance || 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Day Report</h1>
          <p className="text-xs text-slate-400 mt-1">
            Daily, weekly, monthly &amp; custom period audits with opening &amp; closing balances.
          </p>
        </div>
        {report && (
          <button
            onClick={handleOpenPreview}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
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

        {/* Mode selector */}
        <div className="flex flex-wrap gap-2">
          {[
            { k: "daily", label: "Daily" },
            { k: "weekly", label: "Weekly" },
            { k: "monthly", label: "Monthly" },
            { k: "custom", label: "From — To" },
          ].map((m) => (
            <button
              key={m.k}
              onClick={() => { setMode(m.k); setReport(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === m.k
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {mode === "daily" && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-xs">Select Date:</label>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none focus:border-primary-500 font-mono"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          )}

          {mode === "weekly" && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-xs">Pick any date in the week:</label>
              <input
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none focus:border-primary-500 font-mono"
                style={{ colorScheme: 'dark' }}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Week: {fmtDate(getWeekRange(weekDate).start)} — {fmtDate(getWeekRange(weekDate).end)}
              </p>
            </div>
          )}

          {mode === "monthly" && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 text-xs">Select Month:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none focus:border-primary-500 font-mono"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          )}

          {mode === "custom" && (
            <>
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 text-xs">From Date:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none focus:border-primary-500 font-mono"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 text-xs">To Date:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-250 focus:outline-none focus:border-primary-500 font-mono"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
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
          <div className="flex justify-between items-start border-b border-slate-855 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-205 print:text-black">{modeTitle}</h2>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Period: <span className="font-mono font-bold text-slate-300">{rangeLabel}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-slate-600 space-y-1">
              <p className="font-bold text-slate-350 print:text-black">Daily / Period Audit</p>
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
                &#8377;{formatIndianCurrency(Math.abs(report.openingBalance || 0))}
              </span>
            </div>
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
              <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Received (+)</span>
              <span className="text-lg font-bold text-emerald-400 print:text-emerald-600 mt-1 block">
                &#8377;{formatIndianCurrency((report.totals?.principalAmt || 0) + (report.totals?.interestAmt || 0))}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Principal: &#8377;{formatIndianCurrency(report.totals?.principalAmt)} | Interest: &#8377;{formatIndianCurrency(report.totals?.interestAmt)}
              </span>
            </div>
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
              <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Paid Out (-)</span>
              <span className="text-lg font-bold text-rose-400 print:text-rose-650 mt-1 block">
                &#8377;{formatIndianCurrency(Math.abs(report.totals?.payAmt || 0))}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">New mortgage loans given</span>
            </div>
            <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-xl print:border-slate-300">
              <span className="text-slate-500 block uppercase font-bold text-[10px]">Closing Balance</span>
              <span className="text-lg font-bold text-amber-500 print:text-amber-600 mt-1 block">
                &#8377;{formatIndianCurrency(Math.abs(report.closingBalance || 0))}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">End of period cash position</span>
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
                {!report.rows || report.rows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 italic">No transactions or deals found for this period.</td>
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
                        &#8377;{formatIndianCurrency(Math.abs(row.balance || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {report.rows && report.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900/60 border-t-2 border-slate-800 text-xs font-bold">
                    <td colSpan="3" className="py-3 px-4 text-slate-450 uppercase tracking-wider">Period Total</td>
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
                      &#8377;{formatIndianCurrency(Math.abs(report.closingBalance || 0))}
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
          <p className="text-slate-400 font-semibold text-sm">Choose a period and click Generate Report</p>
          <p className="text-slate-600 text-xs">
            Reports show all deals and transactions for the selected period along with opening and closing balances.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-16 text-center shadow-xl">
          <p className="text-slate-500 italic text-sm">Compiling report...</p>
        </div>
      )}
    </div>
  );
};

export default DayReport;

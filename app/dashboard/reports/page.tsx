"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Download, AlertTriangle, CheckCircle, Clock, MoreHorizontal, Loader2, Search } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from "@/components/LanguageProvider"; // Import language hook

export default function ReportsPage() {
  const { t } = useLanguage(); // Use language hook
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchReports(date);
  }, [date]);

  const fetchReports = async (selectedDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/reports?date=${selectedDate}`);
      const json = await res.json();
      if (json.error) {
        console.error("API Error:", json.error);
        alert(`Error Loading Data: ${json.error}`); // Temporary Alert for debugging
      } else {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.monthlySummary) return;

    const headers = ["Employee", "Role", "Days Present", "Late Count", "Status"];
    const rows = data.monthlySummary.map((emp: any) => [
      emp.name,
      emp.role,
      emp.days_present,
      emp.late_count,
      emp.late_count === 0 ? "Excellent" : "Needs Improvement"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendance_report_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!data?.monthlySummary) return;

    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(date), "MMMM dd, yyyy")}`, 14, 28);

    const tableColumn = ["Employee", "Role", "Days Present", "Late Count", "Status"];
    const tableRows = data.monthlySummary.map((emp: any) => [
      emp.name,
      emp.role,
      String(emp.days_present),
      String(emp.late_count),
      emp.late_count === 0 ? "Excellent" : "Needs Improvement"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
    });

    doc.save(`attendance_report_${date}.pdf`);
  };

  if (loading && !data) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
            <Loader2 className="h-8 w-8 animate-spin text-[#13ec6d]" />
            <span className="ml-2">Loading reports...</span>
        </div>
    );
  }

  const { metrics, pieChart, monthlySummary } = data || {};

  const filteredSummary = monthlySummary?.filter((emp: any) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.role.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white gap-2 flex items-center pl-10 lg:pl-0">
             {t('attendanceOverview')}
           </h1>
           <p className="text-zinc-400 mt-1">{t('attendanceOverviewDesc')}</p>
        </div>

      <div className="flex gap-3">
           <div className="relative flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:border-zinc-700 transition-colors group">
              <Calendar className="h-4 w-4 text-zinc-500 z-10 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20"
              />
              <span className="font-medium text-white pointer-events-none z-10">{format(new Date(date), "MMM dd, yyyy")}</span>
           </div>

           <div className="flex gap-2">
            <Button
                onClick={handleExportPDF}
                className="bg-red-600 text-white hover:bg-red-700 font-bold"
            >
                <Download className="h-4 w-4 mr-2" />
                PDF
            </Button>
            <Button
                onClick={handleExportCSV}
                className="bg-[#13ec6d] text-black hover:bg-[#13ec6d]/90 font-bold"
            >
                <Download className="h-4 w-4 mr-2" />
                CSV
            </Button>
           </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-zinc-900 border-zinc-800 rounded-xl p-6 relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-zinc-400 text-sm font-medium">{t('totalEmployees')}</p>
              <div className="flex items-baseline gap-3 mt-2">
                 <span className="text-4xl font-bold text-white">{metrics?.totalEmployees || 0}</span>
              </div>
           </div>
           <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
              <div className="flex gap-1">
                 <div className="h-16 w-8 bg-[#13ec6d] rounded-t-lg"></div>
                 <div className="h-10 w-8 bg-[#13ec6d] rounded-t-lg"></div>
                 <div className="h-12 w-8 bg-[#13ec6d] rounded-t-lg"></div>
              </div>
           </div>
        </div>

        <div className="bg-zinc-900 border-zinc-800 rounded-xl p-6">
           <p className="text-zinc-400 text-sm font-medium">{t('avgCheckIn')}</p>
           <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl font-bold text-white">{metrics?.avgTime || 'N/A'}</span>
              <span className="text-zinc-500 text-sm">Today</span>
           </div>
        </div>

        <div className="bg-zinc-900 border-zinc-800 rounded-xl p-6 relative">
            <p className="text-zinc-400 text-sm font-medium">Absent Today</p>
            <div className="flex items-baseline gap-3 mt-2">
               <span className="text-4xl font-bold text-white">{metrics?.absentToday || 0}</span>
               <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded font-medium">{t('unaccounted')}</span>
            </div>
            <AlertTriangle className="absolute right-6 top-6 h-12 w-12 text-amber-500/10" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Daily Volume Bar Chart (Mocked Visual for now as historical API is complex) */}
         <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-lg font-bold text-white">{t('dailyVolume')}</h3>
                  <p className="text-zinc-400 text-xs">{t('visualTrend')}</p>
               </div>
               <div className="flex gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#13ec6d]"></div> Present</div>
               </div>
            </div>

            <div className="h-64 flex items-end justify-between px-4 pb-4 border-b border-zinc-800 gap-4">
               {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const height = [60, 80, 75, 95, 55, 20, 10][i];
                   return (
                      <div key={day} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                         <div className="w-full max-w-[40px] bg-zinc-800 rounded-t-md relative h-full flex items-end overflow-hidden transition-all hover:opacity-80">
                            <div className="w-full bg-[#13ec6d] rounded-t-md transition-all duration-500" style={{ height: `${height}%` }}></div>
                         </div>
                         <span className="text-xs text-zinc-500 font-medium group-hover:text-white transition-colors">{day}</span>
                      </div>
                   )
               })}
            </div>
         </div>

         {/* Punctuality Donut Chart (Real Data) */}
         <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6">{t('todaysPunctuality')}</h3>

            <div className="flex-1 flex items-center justify-center relative">
               {/* CSS Conic Gradient Donut based on Real Data */}
               <div className="w-48 h-48 rounded-full"
                  style={{
                     background: `conic-gradient(
                        #13ec6d 0% ${ pieChart && (pieChart.onTime + pieChart.late + pieChart.absent) > 0 ? (pieChart.onTime / (pieChart.onTime + pieChart.late + pieChart.absent)) * 100 : 0 }%,
                        #eab308 ${ pieChart && (pieChart.onTime + pieChart.late + pieChart.absent) > 0 ? (pieChart.onTime / (pieChart.onTime + pieChart.late + pieChart.absent)) * 100 : 0 }% ${ pieChart && (pieChart.onTime + pieChart.late + pieChart.absent) > 0 ? ((pieChart.onTime + pieChart.late) / (pieChart.onTime + pieChart.late + pieChart.absent)) * 100 : 0 }%,
                        #ef4444 ${ pieChart && (pieChart.onTime + pieChart.late + pieChart.absent) > 0 ? ((pieChart.onTime + pieChart.late) / (pieChart.onTime + pieChart.late + pieChart.absent)) * 100 : 0 }% 100%
                     )`,
                     mask: "radial-gradient(transparent 60%, black 61%)",
                     WebkitMask: "radial-gradient(transparent 60%, black 61%)"
                  }}
               />
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-bold text-white">
                    {pieChart && (pieChart.onTime + pieChart.late + pieChart.absent) > 0 ?
                        Math.round((pieChart.onTime / (pieChart.onTime + pieChart.late + pieChart.absent)) * 100)
                        : 0}%
                  </span>
                  <span className="text-zinc-400 text-xs mt-1">{t('onTime')}</span>
               </div>
            </div>

            <div className="mt-8 space-y-3">
               <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                     <div className="w-2 h-2 rounded-full bg-[#13ec6d]"></div> {t('onTime')}
                  </div>
                  <span className="font-bold text-white">{pieChart?.onTime || 0}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                     <div className="w-2 h-2 rounded-full bg-amber-500"></div> {t('late')}
                  </div>
                  <span className="font-bold text-white">{pieChart?.late || 0}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                     <div className="w-2 h-2 rounded-full bg-red-500"></div> {t('absent')}
                  </div>
                  <span className="font-bold text-white">{pieChart?.absent || 0}</span>
               </div>
            </div>
         </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">{t('monthlySummary')}</h3>
            <div className="relative w-64">
               <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
               <Input
                 placeholder={t('searchEmployee')}
                 className="bg-zinc-900 border-zinc-800 rounded-lg pl-9"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
            </div>
         </div>

         <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
            <table className="w-full text-left text-sm">
               <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs uppercase font-semibold text-zinc-400">
                  <tr>
                     <th className="px-6 py-4">{t('employee')}</th>
                     <th className="px-6 py-4">{t('role')}</th>
                     <th className="px-6 py-4 text-center">{t('daysPresent')}</th>
                     <th className="px-6 py-4 text-center">{t('lateArrivals')}</th>
                     <th className="px-6 py-4 text-center">{t('status')}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-800">
                  {filteredSummary.length > 0 ? (
                      filteredSummary.map((emp: any) => (
                        <tr key={emp.id} className="group hover:bg-zinc-800/20 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {emp.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium text-white">{emp.name}</p>
                                    <p className="text-xs text-zinc-500">ID: {emp.id.substring(0,6)}</p>
                                </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-300 capitalize">{emp.role}</td>
                            <td className="px-6 py-4 text-center"><span className="text-white font-bold">{emp.days_present}</span></td>
                            <td className="px-6 py-4 text-center"><span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full text-xs">{emp.late_count}</span></td>
                            <td className="px-6 py-4 text-center">
                                <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                    emp.late_count === 0 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                )}>
                                ● {emp.late_count === 0 ? t('statusExcellent') : t('statusNeedsImp')}
                                </span>
                            </td>
                        </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">{t('noAttendanceData')}</td>
                      </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

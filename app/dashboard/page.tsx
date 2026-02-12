"use client";

import { StatsCard } from "@/components/StatsCard";
import { Users, CheckCircle, XCircle, Clock, Plus, Search, MoreHorizontal, Bell, Loader2, Trash2, ChevronLeft, ChevronRight, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { useLanguage } from "@/components/LanguageProvider"; // Import Language Hook

export default function DashboardPage() {
  const { t } = useLanguage(); // Use Language Hook
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1
  });

  useEffect(() => {
    fetchStats(pagination.page, pagination.limit);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
        setPagination(prev => ({ ...prev, page: newPage }));
        fetchStats(newPage, pagination.limit);
    }
  };

  const handleLimitChange = (value: string) => {
      const newLimit = parseInt(value);
      setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
      fetchStats(1, newLimit);
  };

  const fetchStats = async (page = 1, limit = 5) => {
    try {
      const res = await fetch(`/api/dashboard/stats?page=${page}&limit=${limit}`);
      const data = await res.json();

      // Handle the data structure returned by the API (checking both styles seen in previous contexts)
      const summary = data.summary || data; // Fallback if data is the summary itself

      setStats({
          totalEmployees: summary.totalEmployees || 0,
          presentToday: summary.presentToday || summary.presentCount || 0,
          lateToday: summary.lateToday || summary.lateCount || 0,
          absentToday: summary.absentToday || summary.absentCount || 0,
          attendanceRate: summary.attendanceRate || 0,
          presentCount: summary.presentCount || summary.presentToday || 0,
          lateCount: summary.lateCount || summary.lateToday || 0,
          absentCount: summary.absentCount || summary.absentToday || 0
      });

      if (data.recentAttendance || data.recentActivity) {
          const activityData = data.recentAttendance?.data || data.recentActivity || [];
          setRecentActivity(activityData);

          const paginationData = data.recentAttendance?.pagination || data.pagination;
          if (paginationData) {
              setPagination(prev => ({ ...prev, ...paginationData }));
          }
      } else {
        setRecentActivity([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if(!confirm("Are you sure you want to delete this attendance record?")) return;

    try {
        const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Record deleted successfully");
            fetchStats(pagination.page, pagination.limit);
        } else {
            const err = await res.json();
            alert(`Failed to delete record: ${err.error || 'Unknown error'}`);
        }
    } catch (error) {
        alert("Error deleting record");
    }
  };

  return (
    <>
        {/* Top Header */}
        <header className="px-8 py-6 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="w-96">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <Input
                placeholder={t('searchEmployee')}
                className="pl-9 bg-zinc-900 border-zinc-800 rounded-full focus-visible:ring-1 focus-visible:ring-[#13ec6d]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
            {/* Notification Bell */}
            <div className="relative">
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-zinc-400 hover:text-white transition-colors"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-[#13ec6d] rounded-full"></span>
                </button>

                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="p-3 border-b border-zinc-800">
                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notifications</h4>
                        </div>
                        <div className="p-2">
                             <div className="px-3 py-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer transition-colors">
                                <p className="text-sm text-white font-medium">New Employee Registered</p>
                                <p className="text-xs text-zinc-500 mt-0.5">2 minutes ago</p>
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
                <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#13ec6d] to-emerald-600 p-[2px] transition-transform hover:scale-105"
                >
                    <div className="h-full w-full rounded-full bg-zinc-900 overflow-hidden">
                        <img src="https://github.com/shadcn.png" alt="Admin" />
                    </div>
                </button>

                {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
                            <p className="text-sm font-medium text-white">Super Admin</p>
                            <p className="text-xs text-zinc-500">admin@company.com</p>
                        </div>
                        <div className="p-1">
                            <Link href="/dashboard/settings">
                                <button className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
                                    Settings
                                </button>
                            </Link>
                            <button
                                onClick={() => {
                                    if(confirm("Are you sure you want to logout?")) {
                                        window.location.href = '/login';
                                    }
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                            >
                                {t('logout')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 min-h-screen bg-zinc-950 text-white">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{t('dashboardOverview')}</h1>
              <p className="text-zinc-400 mt-1">{t('welcome')}</p>
            </div>
            <Link href="/dashboard/employees">
                <Button className="bg-[#13ec6d] text-black font-semibold hover:bg-[#13ec6d]/90 rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" />
                {t('addEmployee')}
                </Button>
            </Link>
          </div>

          {loading ? (
             <div className="flex h-40 items-center justify-center text-zinc-500">
                <Loader2 className="h-8 w-8 animate-spin mr-2"/> Loading dashboard data...
             </div>
          ) : (
            <>
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatsCard
                      title={t('totalEmployees')}
                      value={stats.totalEmployees || 0}
                      icon={Users}
                      description="Registered"
                    />
                    <StatsCard
                      title={t('presentToday')}
                      value={stats.presentCount || 0}
                      icon={CheckCircle}
                      description={`${stats.attendanceRate || 0}% Attendance Rate`}
                      trend="up"
                      trendValue="12%"
                    />
                    <StatsCard
                      title={t('lateAbsent')}
                      value={stats.lateCount || 0}
                      icon={AlertCircle}
                      description={`${stats.lateCount || 0} Late, ${stats.absentCount || 0} Absent`}
                      trend="down"
                      trendValue="5%"
                    />
                </div>

                {/* Recent Attendance Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">{t('recentAttendance')}</h2>
                        <Button variant="ghost" className="text-[#13ec6d] hover:text-[#13ec6d]/80 hover:bg-[#13ec6d]/10" asChild>
                            <Link href="/dashboard/reports">
                            {t('viewAll')}
                            </Link>
                        </Button>
                    </div>

                    <div className="rounded-xl border border-zinc-900 bg-zinc-900/50 overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                            <span className="text-zinc-400 text-sm">Showing recent logs</span>
                        </div>

                        {recentActivity.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">
                                {t('noAttendanceData')}
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs uppercase font-semibold text-zinc-400">
                                    <tr>
                                        <th className="px-6 py-4">{t('employee')}</th>
                                        <th className="px-6 py-4">TIME IN</th>
                                        <th className="px-6 py-4">SELFIE</th>
                                        <th className="px-6 py-4">{t('status')}</th>
                                        <th className="px-6 py-4 text-right">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {recentActivity.map((log) => (
                                        <tr key={log.id} className="group hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center text-white font-bold">
                                                        <User className="h-5 w-5 text-zinc-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{log.users?.name || log.name || 'Unknown'}</p>
                                                        <p className="text-xs text-zinc-500 uppercase">{log.users?.role || log.role || 'EMPLOYEE'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-white font-mono">
                                                        {log.check_in_time || log.timestamp ? format(new Date(log.check_in_time || log.timestamp), "hh:mm a") : '-'}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {log.check_in_time || log.timestamp ? `about ${Math.floor((new Date().getTime() - new Date(log.check_in_time || log.timestamp).getTime()) / (1000 * 60 * 60))} hours ago` : ''}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-12 w-20 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 relative group-hover:border-[#13ec6d]/50 transition-colors">
                                                    {log.selfie_url || log.image_url ? (
                                                        <img src={log.selfie_url || log.image_url} alt="Selfie" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-xs text-zinc-600">No Img</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                                                    ${(log.status === 'LATE' || log.status === 'late')
                                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                        : 'bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/20'
                                                    }
                                                `}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${(log.status === 'LATE' || log.status === 'late') ? 'bg-amber-500' : 'bg-[#13ec6d]'}`}></span>
                                                    {log.status === 'on_time' ? t('onTime') : log.status === 'late' ? t('late') : log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteAttendance(log.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-400">{t('rowsPerPage')}:</span>
                                <select
                                    className="h-8 w-[70px] bg-zinc-950 border border-zinc-800 rounded px-2 text-sm text-white focus:outline-none focus:border-[#13ec6d]"
                                    value={pagination.limit}
                                    onChange={(e) => handleLimitChange(e.target.value)}
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                                <span>
                                    {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} {t('of')} {pagination.total}
                                </span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 bg-zinc-950 border-zinc-800"
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 bg-zinc-950 border-zinc-800"
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
          )}
        </div>
    </>
  );
}

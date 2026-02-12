import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Fetch reports with date filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const today = dateParam || new Date().toISOString().split('T')[0];

    const client = await pool.connect();

    // 1. Employee Count (Total registered doesn't change by date, typically)
    const empRes = await client.query('SELECT COUNT(*) FROM users WHERE role = \'employee\'');
    const totalEmployees = parseInt(empRes.rows[0].count);

    // 2. Avg Check-In Time (Filtered by Date)
    // Adjust to WIB (UTC+7) manually since DB is likely UTC
    const avgRes = await client.query(`
        SELECT TO_CHAR(AVG(check_in_time::time) + interval '7 hours', 'HH24:MI') as avg_time
        FROM attendance_logs
        WHERE DATE(check_in_time) = $1
    `, [today]);
    let avgTime = "N/A";
    if (avgRes.rows[0]?.avg_time) {
        avgTime = avgRes.rows[0].avg_time;
    }

    // 3. Status Counts (Filtered by Date) & Unique Presence
    // First, get strict unique present count to calculate "Absent" correctly
    const uniquePresentRes = await client.query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM attendance_logs
        WHERE DATE(check_in_time) = $1
    `, [today]);
    const uniquePresent = parseInt(uniquePresentRes.rows[0].count);

    // Calculate Absent (Prevent negative numbers)
    const absent = Math.max(0, totalEmployees - uniquePresent);

    // Get distribution of statuses (counting logs is fine for distribution trends,
    // strictly speaking we might want unique status but let's keep it simple for now)
    const statusRes = await client.query(`
        SELECT status, COUNT(*) as count
        FROM attendance_logs
        WHERE DATE(check_in_time) = $1
        GROUP BY status
    `, [today]);

    let onTime = 0;
    let late = 0;

    statusRes.rows.forEach((row: any) => {
        if (row.status === 'on_time') onTime = parseInt(row.count);
        if (row.status === 'late') late = parseInt(row.count);
    });

    // 4. Monthly Summary (All Users) - KEEP THIS AS MONTHLY/ALL TIME or FILTER?
    // User asked to select "Today" date. The table says "Monthly Summary".
    // Let's filter the table's "Days Present" and "Late Count" to be relevant to the MONTH of the selected date.
    const selectedDateObj = new Date(today);
    const monthStart = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth() + 1, 0).toISOString().split('T')[0];

    const summaryRes = await client.query(`
        SELECT u.id, u.name, u.role,
               COUNT(a.id) as days_present,
               SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count
        FROM users u
        LEFT JOIN attendance_logs a ON u.id = a.user_id
          AND DATE(a.check_in_time) >= $1 AND DATE(a.check_in_time) <= $2
        WHERE u.role = 'employee'
        GROUP BY u.id
    `, [monthStart, monthEnd]);

    client.release();

    return NextResponse.json({
      date: today,
      metrics: {
        totalEmployees,
        avgTime,
        absentToday: absent
      },
      pieChart: {
        onTime,
        late,
        absent
      },
      monthlySummary: summaryRes.rows
    });
  } catch (error: any) {
    console.error('Reports API Detailed Error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

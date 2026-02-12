import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    // Total Employees
    const empResult = await client.query('SELECT COUNT(*) FROM users WHERE role = \'employee\'');
    const totalEmployees = parseInt(empResult.rows[0].count);

    // Today's date in WIB (UTC+8)
    const now = new Date();
    const wibDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const today = wibDate.toISOString().split('T')[0]; // YYYY-MM-DD in WIB

    const presentResult = await client.query(
        `SELECT COUNT(DISTINCT user_id) FROM attendance_logs WHERE DATE(check_in_time + interval '8 hours') = $1`,
        [today]
    );
    const presentToday = parseInt(presentResult.rows[0].count);

    const lateResult = await client.query(
        `SELECT COUNT(*) FROM attendance_logs WHERE DATE(check_in_time + interval '8 hours') = $1 AND status = 'late'`,
        [today]
    );
    const lateToday = parseInt(lateResult.rows[0].count);

    // Attendance Rate
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    // Total Logs Count (for pagination)
    const totalLogsResult = await client.query('SELECT COUNT(*) FROM attendance_logs');
    const totalLogs = parseInt(totalLogsResult.rows[0].count);

    // Recent Logs with Pagination
    const recentLogs = await client.query(`
        SELECT a.id, u.name, u.role, a.check_in_time, a.status, a.selfie_url
        FROM attendance_logs a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.check_in_time DESC
        LIMIT $1 OFFSET $2
    `, [limit, offset]);

    client.release();

    return NextResponse.json({
      summary: {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday: Math.max(0, totalEmployees - presentToday),
        attendanceRate
      },
      recentActivity: recentLogs.rows,
      pagination: {
        page,
        limit,
        total: totalLogs,
        totalPages: Math.ceil(totalLogs / limit)
      }
    });
  } catch (error) {
    console.error('Stats Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM attendance_logs');
      return NextResponse.json({
        message: 'All attendance records deleted successfully',
        deletedCount: result.rowCount || 0,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete All Attendance Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

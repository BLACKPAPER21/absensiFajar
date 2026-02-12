import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15+
  ) {
    try {
      const { id } = await params; // Await params to unlock the value
      console.log("API: DELETE /api/attendance/[id] - ID:", id);

      if (!id || id === 'undefined') {
          console.error("API Error: Invalid ID provided");
          return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }

      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM attendance_logs WHERE id = $1 RETURNING id', [id]);
        console.log("API: Delete Result RowCount:", result.rowCount);

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Attendance log not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Attendance deleted successfully' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete Attendance Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

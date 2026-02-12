import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await params;

      const client = await pool.connect();
      try {
        // Prevent deleting default roles
        const check = await client.query('SELECT is_default FROM roles WHERE id = $1', [id]);
        if (check.rowCount === 0) {
             return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }
        if (check.rows[0].is_default) {
            return NextResponse.json({ error: 'Cannot delete default system roles' }, { status: 403 });
        }

        // Delete
        await client.query('DELETE FROM roles WHERE id = $1', [id]);
        return NextResponse.json({ message: 'Role deleted successfully' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete Role Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

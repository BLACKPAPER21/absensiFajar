import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET: Fetch single employee (Optional, but useful)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, name, email, role, created_at, face_descriptor FROM users WHERE id = $1',
      [id]
    );
    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update employee
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, role, faceDescriptor, password } = body;

    const client = await pool.connect();

    try {
      // Dynamic update query construction
      let query = 'UPDATE users SET name = $1, email = $2, role = $3';
      const values: any[] = [name, email, role];
      let paramIndex = 4;

      if (faceDescriptor) {
        query += `, face_descriptor = $${paramIndex}`;
        values.push(JSON.stringify(faceDescriptor));
        paramIndex++;
      }

      // Bug #6 Fix: Handle password updates
      if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += `, password_hash = $${paramIndex}`;
        values.push(hashedPassword);
        paramIndex++;
      }

      query += ` WHERE id = $${paramIndex} RETURNING id, name, email, role, created_at`;
      values.push(id);

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Update Error:', error);
    if (error.code === '23505') {
       return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete employee
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await params;
      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Employee deleted successfully' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

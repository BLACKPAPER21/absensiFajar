import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    // Order: Default roles first, then alphabetical
    const result = await client.query('SELECT * FROM roles ORDER BY is_default DESC, name ASC');
    client.release();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch Roles Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || name.trim() === '') {
        return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase(); // Normalize to lowercase

    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO roles (name) VALUES ($1) RETURNING *',
            [cleanName]
        );
        return NextResponse.json(result.rows[0], { status: 201 });
    } finally {
        client.release();
    }
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Role already exists' }, { status: 409 });
    }
    console.error('Create Role Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

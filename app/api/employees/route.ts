import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';


export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, name, email, role, created_at, face_descriptor FROM users ORDER BY created_at DESC'
    );
    client.release();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log("----------------------------------------------");
    console.log("API: POST /api/employees - Request Received");

    // Check Env
    if (!process.env.DATABASE_URL) {
      console.error("API CRITICAL: DATABASE_URL is undefined!");
      return NextResponse.json({ error: 'Server Config Error: Missing DB URL' }, { status: 500 });
    }

    const body = await request.json();
    console.log("API: Request Body parsed. Name:", body.name, "Email:", body.email, "Role:", body.role);
    console.log("API: Face Descriptor present?", !!body.faceDescriptor, "Length:", body.faceDescriptor?.length);

    const { name, email, role, faceDescriptor, password } = body;

    if (!name || !email || !role) {
      console.warn("API: Missing required fields");
      return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 });
    }

    if (!password && !request.body) { // Simple check, usually handled by frontend
        // If creating new, password is essentially required, but we can fallback if absolutely needed
    }

    // Hash password properly with bcryptjs
    const finalPassword = password || 'employee123';
    const passwordHash = await bcrypt.hash(finalPassword, 10);

    console.log("API: Attempting DB connection...");
    const client = await pool.connect();
    console.log("API: DB Connected. Preparing Insert...");

    try {
      const result = await client.query(
        `INSERT INTO users (name, email, role, password_hash, face_descriptor)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role`,
        [name, email, role, passwordHash, JSON.stringify(faceDescriptor || null)]
      );
      console.log("API: Insert executed. Result ID:", result.rows[0]?.id);

      return NextResponse.json(result.rows[0], { status: 201 });
    } finally {
      client.release();
      console.log("API: DB Client released.");
    }
  } catch (error: any) {
    console.error('API EXCEPTION:', error);
    // Log the full error object structure
    console.dir(error, { depth: null });

    if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    // Return the actual error message to the client for debugging
    return NextResponse.json({ error: 'Server Error: ' + (error.message || 'Unknown') }, { status: 500 });
  }
}

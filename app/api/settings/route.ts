import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Fetch all settings
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM settings');
    client.release();

    // Convert array of {key, value} to object {key: value}
    const settings = result.rows.reduce((acc: Record<string, string>, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Update settings results
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settingsToUpdate = Object.entries(body);

    if (settingsToUpdate.length === 0) {
      return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const [key, value] of settingsToUpdate) {
            await client.query(
                `INSERT INTO settings (key, value)
                 VALUES ($1, $2)
                 ON CONFLICT (key)
                 DO UPDATE SET value = EXCLUDED.value`,
                [key, String(value)]
            );
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: 'Settings updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('Settings Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

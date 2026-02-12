import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const OFFICE_COORDS = {
  lat: -5.13648916306921,
  lng: 119.44168603184485,
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const { userId, lat, lng, selfieUrl, confidenceScore } = await request.json();

    if (!userId || !lat || !lng || !selfieUrl) {
      return NextResponse.json({ error: 'Missing check-in data' }, { status: 400 });
    }

    // --- Bug #3 Fix: Read check_in_radius from DB settings ---
    let maxDistance = 100; // default fallback
    let officeStartHour = 8;
    let officeStartMinute = 0;
    let lateTolerance = 15;

    try {
      const settingsRes = await client.query(
        `SELECT key, value FROM settings WHERE key IN ('check_in_radius', 'office_start_time', 'late_tolerance')`
      );
      for (const row of settingsRes.rows) {
        if (row.key === 'check_in_radius') {
          maxDistance = parseInt(row.value) || 100;
        }
        if (row.key === 'office_start_time') {
          const timeStr = row.value;
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (match) {
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const period = match[3]?.toUpperCase();
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            officeStartHour = h;
            officeStartMinute = m;
          }
        }
        if (row.key === 'late_tolerance') {
          lateTolerance = parseInt(row.value) || 15;
        }
      }
    } catch (e) {
      console.warn('Could not fetch settings, using defaults', e);
    }

    // Server-side Geolocation Validation
    const distance = calculateDistance(lat, lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);

    if (distance > maxDistance) {
      return NextResponse.json({ error: `Too far from office (${distance.toFixed(0)}m). Max: ${maxDistance}m` }, { status: 403 });
    }

    // --- Bug #4 Fix: Duplicate check-in prevention ---
    const now = new Date();
    const wibOffset = 8 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);

    // Calculate today's date in WIB
    const wibDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayWIB = wibDate.toISOString().split('T')[0];

    const existingLog = await client.query(
      `SELECT id FROM attendance_logs WHERE user_id = $1 AND DATE(check_in_time + interval '8 hours') = $2`,
      [userId, todayWIB]
    );

    if (existingLog.rows.length > 0) {
      return NextResponse.json(
        { error: 'You have already checked in today.' },
        { status: 409 }
      );
    }

    // --- Time Status Logic ---
    const deadlineMinutes = officeStartHour * 60 + officeStartMinute + lateTolerance;
    const status = wibMinutes <= deadlineMinutes ? 'on_time' : 'late';

    console.log(`Check-in: WIB ${Math.floor(wibMinutes/60)}:${String(wibMinutes%60).padStart(2,'0')}, Deadline: ${Math.floor(deadlineMinutes/60)}:${String(deadlineMinutes%60).padStart(2,'0')}, Radius: ${maxDistance}m → ${status}`);

    const result = await client.query(
      `INSERT INTO attendance_logs (user_id, location_lat, location_lng, selfie_url, status, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, check_in_time, status`,
      [userId, lat, lng, selfieUrl, status, confidenceScore || 0]
    );

    return NextResponse.json({
        success: true,
        data: result.rows[0],
        distance: distance
    });

  } catch (error) {
    console.error('Check-in Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    // --- Bug #7 Fix: Always release client ---
    client.release();
  }
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const MAX_DISTANCE_METERS = 100;
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
  try {
    const { userId, lat, lng, selfieUrl, confidenceScore } = await request.json();

    if (!userId || !lat || !lng || !selfieUrl) {
      return NextResponse.json({ error: 'Missing check-in data' }, { status: 400 });
    }

    // Server-side Geolocation Validation
    const distance = calculateDistance(lat, lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);

    // Determine status
    // For now, simple logic: if distance > MAX => Reject (or mark as invalid? Frontend blocks it, but backend should too)
    if (distance > MAX_DISTANCE_METERS) {
        return NextResponse.json({ error: `Too far from office (${distance.toFixed(0)}m)` }, { status: 403 });
    }

    // Time Status Logic (Simple 9 AM rule)
    const now = new Date();
    const hour = now.getHours();
    const status = hour < 9 ? 'on_time' : 'late'; // Example rule

    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO attendance_logs (user_id, location_lat, location_lng, selfie_url, status, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, check_in_time, status`,
      [userId, lat, lng, selfieUrl, status, confidenceScore || 0]
    );
    client.release();

    return NextResponse.json({
        success: true,
        data: result.rows[0],
        distance: distance
    });

  } catch (error) {
    console.error('Check-in Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, RefreshCw, Camera, Loader2, CheckCircle, XCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import * as faceapi from 'face-api.js';

const OFFICE_COORDS = {
  lat: -5.13648916306921,
  lng: 119.44168603184485,
};

const MAX_DISTANCE_METERS = 100;

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

export default function AttendancePage() {
  const webcamRef = useRef<Webcam>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Auth & AI State
  const [employees, setEmployees] = useState<any[]>([]); // Store ALL employees
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [identifiedUser, setIdentifiedUser] = useState<any>(null); // Who did we find?

  // 1. Initialize System
  useEffect(() => {
    loadModels();
    fetchAllEmployees();
    refreshLocation();
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (err) {
      console.error("Failed to load AI models", err);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data && Array.isArray(data)) {
        // Filter only those with descriptors
        const validEmployees = data.filter((u: any) => u.face_descriptor);
        setEmployees(validEmployees);
        console.log(`Loaded ${validEmployees.length} valid face profiles.`);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const refreshLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });

        const dist = calculateDistance(
          latitude,
          longitude,
          OFFICE_COORDS.lat,
          OFFICE_COORDS.lng
        );
        setDistance(dist);
        setLoading(false);
      },
      (err) => {
        console.error("Geo Error:", err);
        let msg = "Unable to retrieve location.";
        if (err.code === 1) msg = "Location Access Denied. Please enable it in browser settings.";
        if (err.code === 2) msg = "Location Unavailable (GPS signal lost).";
        if (err.code === 3) msg = "Location Timeout. Please refresh.";

        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setVerificationStatus('idle');
      setIdentifiedUser(null);
    }
  }, [webcamRef]);

  const handleCheckIn = async () => {
    if (!distance || distance > MAX_DISTANCE_METERS) return;
    if (!capturedImage) return;
    if (employees.length === 0) {
      alert("System has no registered faces to match against. Please ask Admin to register employees.");
      return;
    }

    setCheckingIn(true);
    setVerificationStatus('verifying');

    try {
      // 1. Convert Capture
      const img = await faceapi.fetchImage(capturedImage);

      // 2. Detect Face
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setVerificationStatus('failed');
        alert("No face detected! Please ensure your face is clearly visible.");
        setCheckingIn(false);
        return;
      }

      // 3. IDENTIFY User (1:N Matching)
      // Create Labeled Descriptors for ALL employees
      const labeledDescriptors = employees.map(emp => {
        const descriptor = new Float32Array(emp.face_descriptor);
        return new faceapi.LabeledFaceDescriptors(emp.id.toString(), [descriptor]);
      });

      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.45); // Strict 0.45 threshold
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

      console.log("Identification Result:", bestMatch.toString());

      if (bestMatch.label === 'unknown') {
        setVerificationStatus('failed');
        alert(`Wajah Tidak Terdaftar!\n(Face Not Registered)\n\nScore: ${bestMatch.distance.toFixed(2)}`);
        setCheckingIn(false);
        return;
      }

      // Match Found! Get Employee Details
      const matchedUserId = bestMatch.label;
      const matchedEmployee = employees.find(e => e.id.toString() === matchedUserId);

      if (!matchedEmployee) {
          throw new Error("Matched ID not found in local state");
      }

      setIdentifiedUser(matchedEmployee);

      // 4. Submit to Backend
      setVerificationStatus('success');

      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: matchedUserId,
          lat: location?.lat,
          lng: location?.lng,
          selfieUrl: capturedImage,
          confidenceScore: bestMatch.distance
        })
      });

      if (res.ok) {
        const result = await res.json();
        const successSound = new Audio('/success.mp3'); // Optional
        successSound.play().catch(() => {});

        // Delay alert slightly to let UI update
        setTimeout(() => {
            alert(`✅ Welcome, ${matchedEmployee.name}!\n\nStatus: ${result.data.status?.toUpperCase()}`);
            setCapturedImage(null);
            setVerificationStatus('idle');
            setIdentifiedUser(null);
        }, 1000);
      } else {
        const err = await res.json();
        alert("Check-in Error: " + err.error);
        setVerificationStatus('failed');
      }

    } catch (error: any) {
      console.error(error);
      alert("An unexpected error occurred during check-in.");
      setVerificationStatus('failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const isTooFar = distance !== null && distance > MAX_DISTANCE_METERS;
  const canCheckIn = !loading && location && !isTooFar && capturedImage && modelsLoaded;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 p-4 text-white font-sans">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Attendance</h1>
          <p className="text-zinc-400 text-sm">Face Kiosk Mode</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            <Users className="h-5 w-5 text-zinc-400" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center gap-6">

        {/* Camera Section */}
        <Card className={cn(
            "relative overflow-hidden w-full aspect-[3/4] max-w-md bg-black border-2 transition-colors",
            verificationStatus === 'success' ? "border-[#13ec6d]" :
            verificationStatus === 'failed' ? "border-red-500" : "border-zinc-800"
        )}>
          {capturedImage ? (
            <img src={capturedImage} alt="Selfie" className="h-full w-full object-cover transform scale-x-[-1]" />
          ) : (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user" }}
              className="h-full w-full object-cover transform scale-x-[-1]"
              mirrored={true}
            />
          )}

          {/* Overlays */}
          {verificationStatus === 'verifying' && (
             <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-[#13ec6d]">
                <Loader2 className="h-12 w-12 animate-spin mb-2" />
                <span className="font-mono text-lg animate-pulse">IDENTIFYING...</span>
             </div>
          )}

          {verificationStatus === 'success' && identifiedUser && (
             <div className="absolute inset-0 bg-[#13ec6d]/80 flex flex-col items-center justify-center text-black p-4 text-center animate-in fade-in zoom-in duration-300">
                <CheckCircle className="h-16 w-16 mb-2 drop-shadow-md" />
                <h2 className="text-2xl font-bold">{identifiedUser.name}</h2>
                <p className="font-medium opacity-80">{identifiedUser.role}</p>
                <div className="mt-4 bg-black/20 px-4 py-1 rounded-full text-xs font-mono">
                    ID: {identifiedUser.id.substring(0,8)}...
                </div>
             </div>
          )}

          {verificationStatus === 'failed' && (
             <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center p-4 text-center">
                <XCircle className="h-16 w-16 text-red-500 mb-2 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                <h3 className="text-xl font-bold text-red-100">Access Denied</h3>
             </div>
          )}

          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
             {!capturedImage && (
               <Button
                onClick={capture}
                disabled={!modelsLoaded}
                size="icon"
                className="h-16 w-16 rounded-full bg-white text-black hover:bg-zinc-200 border-4 border-zinc-900 ring-2 ring-white"
               >
                 <Camera className="h-8 w-8" />
               </Button>
             )}
             {capturedImage && verificationStatus !== 'success' && (
               <Button onClick={() => { setCapturedImage(null); setVerificationStatus('idle'); }} variant="destructive" className="rounded-full px-6 shadow-lg">
                 Retake Photo
               </Button>
             )}
          </div>
        </Card>

        {/* Location Info */}
        <div className="w-full max-w-md space-y-3 text-center">
          <div className={`flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-full border ${isTooFar ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
            <MapPin className="h-4 w-4" />
            <span>
              {loading ? "Locating..." : location ? `${distance?.toFixed(0)}m from Office` : "Location unknown"}
            </span>
            <button onClick={refreshLocation} className="ml-2 text-[#13ec6d] hover:text-white">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>

          {error && (
            <div className="flex flex-col items-center gap-2">
               <p className="text-xs text-red-500">{error}</p>
               <Button
                variant="outline"
                size="sm"
                onClick={() => {
                    setLocation(OFFICE_COORDS);
                    setDistance(0);
                    setError(null);
                    setLoading(false);
                }}
                className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
               >
                  📍 Use Office Location (Test Mode)
               </Button>
            </div>
          )}
          {isTooFar && <p className="text-xs text-red-500 font-bold shake">You are too far from the office!</p>}
        </div>

        {/* Check In Button */}
        {verificationStatus !== 'success' && (
             <Button
             onClick={handleCheckIn}
             disabled={!canCheckIn || checkingIn}
             className={cn(
               "w-full max-w-xs h-14 rounded-xl text-lg font-bold shadow-lg transition-all transform",
               canCheckIn
                 ? "bg-[#13ec6d] text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(19,236,109,0.4)]"
                 : "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
             )}
           >
             {checkingIn ? "Scanning Faces..." : "Identify Me & Check In"}
           </Button>
        )}

      </div>

      {!modelsLoaded && (
          <div className="fixed bottom-4 left-4 right-4 bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex items-center gap-3 text-xs text-zinc-400">
             <Loader2 className="h-4 w-4 animate-spin text-[#13ec6d]" />
             Downloading Face Database...
          </div>
      )}
    </div>
  );
}

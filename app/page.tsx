export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <h1 className="text-4xl font-bold mb-8 text-[#13ec6d]">Absensi Fajar</h1>
      <div className="flex gap-4">
        <a href="/login?role=admin" className="px-6 py-3 bg-[#13ec6d] text-black rounded-lg hover:bg-[#13ec6d]/90">
          Login as Admin
        </a>
        <a href="/attendance" className="px-6 py-3 border border-zinc-800 rounded-lg hover:bg-zinc-800">
          Login as Employee
        </a>
      </div>
    </main>
  );
}

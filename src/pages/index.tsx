import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Portada({ session }: { session: any }) {
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/lobby');
  }, [session, router]);

  const loginConGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/lobby' },
    });
    if (error) console.error('Error:', error.message);
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Fondo */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/backgrounds/portada.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/80" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fadeIn">

        {/* Título — dos líneas como el mock */}
        <div style={{ filter: 'drop-shadow(0 0 30px rgba(255,0,255,0.9)) drop-shadow(0 0 60px rgba(0,255,255,0.4))' }}>
          <h1 className="font-black italic leading-none text-transparent bg-clip-text bg-gradient-to-r from-neonPink via-white to-neonCyan"
              style={{ fontSize: 'clamp(4rem, 18vw, 9rem)', lineHeight: 0.9 }}>
            ¿QUIÉN
          </h1>
          <h1 className="font-black italic leading-none text-transparent bg-clip-text bg-gradient-to-r from-neonPink via-white to-neonCyan"
              style={{ fontSize: 'clamp(4rem, 18vw, 9rem)', lineHeight: 0.9 }}>
            LA SABE?
          </h1>
        </div>

        <p className="text-white/60 font-bold tracking-[0.35em] mt-5 mb-12 uppercase text-xs md:text-sm">
          El desafío musical definitivo
        </p>

        {/* Botón Google — igual al mock */}
        <button
          onClick={loginConGoogle}
          className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black text-base rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_30px_rgba(255,255,255,0.25)] w-72 justify-center mb-4"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          LOG IN CON GOOGLE
        </button>

        {/* Botón unirse — outlined como el mock */}
        <button
          onClick={() => router.push('/lobby')}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-transparent text-white font-black text-base rounded-2xl border-2 border-white/40 hover:border-white hover:scale-105 active:scale-95 transition-all w-72"
        >
          UNIRSE A PARTIDA
        </button>

      </div>
    </main>
  );
}

import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Portada({ session }: { session: any }) {
  const router = useRouter();

  // Si ya inició sesión, lo mandamos directo al Lobby
  useEffect(() => {
    if (session) {
      router.push('/lobby');
    }
  }, [session, router]);

  const loginConGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/lobby',
      },
    });
    if (error) console.error("Error al entrar:", error.message);
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-darkBg">
      {/* El fondo con el mosaico de discos */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 grayscale-[0.2]"
        style={{ backgroundImage: "url('/backgrounds/portada.jpg')" }}
      />
      
      {/* Capa de oscuridad para que se lea el texto */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-darkBg/70 to-darkBg" />

      <div className="relative z-20 flex flex-col items-center text-center animate-fadeIn">
        <div className="mb-4" style={{ filter: 'drop-shadow(0 0 25px rgba(255,0,255,0.8))' }}>
          <h1 className="text-6xl md:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-neonPink to-neonCyan px-3 py-2 leading-tight">
            ¿QUIÉN LA SABE?
          </h1>
        </div>
        
        <p className="text-neonCyan font-bold tracking-[0.4em] mb-12 uppercase text-sm md:text-base">
          El desafío musical definitivo
        </p>

        <button
          onClick={loginConGoogle}
          className="flex items-center gap-4 px-10 py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          ENTRAR CON GOOGLE
        </button>

        <div className="mt-16 flex gap-10 opacity-50 grayscale">
            <div className="text-center">
                <p className="text-2xl font-bold">5s</p>
                <p className="text-[10px] uppercase tracking-widest">Preview</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-bold">4-5</p>
                <p className="text-[10px] uppercase tracking-widest">Jugadores</p>
            </div>
        </div>
      </div>
    </main>
  );
}

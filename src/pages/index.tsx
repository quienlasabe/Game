import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Portada({ session }: { session: any }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    if (session) {
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => {
          setPerfil(data);
          setTimeout(() => router.push('/lobby'), 1800);
        });
    }
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

      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-fadeIn gap-6">

        {/* Título neon sign */}
        <div>
          <div className="neon-title" style={{ fontSize: 'clamp(3.5rem, 18vw, 8rem)' }}>¿Quién</div>
          <div className="neon-title" style={{ fontSize: 'clamp(3.5rem, 18vw, 8rem)' }}>la Sabe?</div>
        </div>

        {/* Card de perfil si ya está logueado */}
        {session && perfil ? (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/15"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)' }}>
              <div className="relative">
                <div style={{ background: 'conic-gradient(from 0deg, #ff00ff, #ff88ff, #ff00ff)', padding: 3, borderRadius: '50%', boxShadow: '0 0 12px rgba(255,0,255,0.6)', display: 'inline-block' }}>
                  <img src={perfil.avatar_url} style={{ width: 52, height: 52, borderRadius: '50%', display: 'block' }} />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-black" />
              </div>
              <div className="text-left">
                <p className="text-[9px] uppercase tracking-widest text-white/40">Jugando como</p>
                <p className="font-black text-base text-white">{perfil.username}</p>
                <p className="text-[10px] text-neonCyan font-bold mt-0.5">Redirigiendo al lobby...</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-white/60 font-bold tracking-[0.35em] uppercase text-xs md:text-sm -mt-2">
              El desafío musical definitivo
            </p>

            {/* Botón Google — outlined como el mock */}
            <button
              onClick={loginConGoogle}
              className="flex items-center gap-3 px-8 py-4 font-black text-base rounded-2xl hover:scale-105 active:scale-95 transition-all w-72 justify-center border-2 border-white/40 hover:border-white/80"
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', color: '#fff' }}
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              LOG IN CON GOOGLE
            </button>

            {/* Botón unirse */}
            <button
              onClick={() => router.push('/lobby')}
              className="flex items-center justify-center gap-3 px-8 py-4 font-black text-base rounded-2xl hover:scale-105 active:scale-95 transition-all w-72"
              style={{ background: 'transparent', border: '2px solid rgba(0,255,255,0.45)', color: '#00ffff', textShadow: '0 0 8px rgba(0,255,255,0.5)', boxShadow: '0 0 12px rgba(0,255,255,0.15)' }}
            >
              UNIRSE A PARTIDA
            </button>
          </>
        )}
      </div>
    </main>
  );
}

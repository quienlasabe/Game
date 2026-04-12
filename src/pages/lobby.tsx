import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Lobby({ session, user }: { session: any, user: any }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [codigoSala, setCodigoSala] = useState('');

  useEffect(() => {
    if (!session) {
      router.push('/');
      return;
    }

    const cargarPerfil = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setPerfil(data);
    };

    cargarPerfil();
  }, [session, user, router]);

  const crearSala = async () => {
    const nuevoCodigo = Math.random().toString(36).substring(2, 7).toUpperCase();

    const { data, error } = await supabase
      .from('salas')
      .insert([{
        host_id: user.id,
        codigo_acceso: nuevoCodigo,
        estado: 'esperando',
        tematica: 'Rock'
      }])
      .select()
      .single();

    if (error) { alert("Error al crear sala"); return; }

    // Agregar al host como jugador
    await supabase.from('sala_jugadores').insert([{ sala_id: data.id, user_id: user.id }]);
    router.push(`/sala/${nuevoCodigo}`);
  };

  const unirseASala = async () => {
    if (!codigoSala) return;
    const { data } = await supabase
      .from('salas')
      .select('id')
      .eq('codigo_acceso', codigoSala)
      .single();

    if (!data) { alert("Sala no encontrada"); return; }

    // Agregar al jugador si no está ya
    await supabase
      .from('sala_jugadores')
      .upsert([{ sala_id: data.id, user_id: user.id }], { onConflict: 'sala_id,user_id' });

    router.push(`/sala/${codigoSala}`);
  };

  if (!perfil) return <div className="bg-darkBg min-h-screen" />;

  return (
    <main className="min-h-screen bg-darkBg text-white p-6 md:p-12 flex flex-col items-center bg-cover bg-center"
          style={{ backgroundImage: "linear-gradient(rgba(10,10,10,0.85), rgba(10,10,10,0.85)), url('/backgrounds/portada.jpg')" }}>
      
      <div className="w-full max-w-4xl">
        {/* Header de Perfil */}
        <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10 mb-12 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-5">
            <img src={perfil.avatar_url} className="w-20 h-20 rounded-full border-4 border-neonCyan shadow-neon-cyan" alt="Avatar" />
            <div>
              <h2 className="text-3xl font-black italic">{perfil.username}</h2>
              <p className="text-neonCyan text-xs font-bold tracking-[0.2em] uppercase">Rango: {perfil.rango}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Victorias</p>
            <p className="text-5xl font-black text-neonPink drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]">{perfil.partidas_ganadas}</p>
          </div>
        </div>

        {/* Acciones Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Botón Crear */}
          <button 
            onClick={crearSala}
            className="h-72 border-2 border-dashed border-neonCyan/40 rounded-3xl flex flex-col items-center justify-center hover:bg-neonCyan/10 hover:border-neonCyan transition-all group"
          >
            <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🎸</span>
            <span className="text-2xl font-black tracking-tighter">CREAR SALA</span>
            <p className="text-gray-500 text-xs mt-2 uppercase">Vos elegís la música</p>
          </button>

          {/* Input Unirse */}
          <div className="h-72 bg-white/5 rounded-3xl p-10 flex flex-col items-center justify-center border border-white/10 backdrop-blur-md">
            <span className="text-5xl mb-4">🎟️</span>
            <input 
              type="text" 
              placeholder="CÓDIGO"
              value={codigoSala}
              onChange={(e) => setCodigoSala(e.target.value.toUpperCase())}
              className="bg-transparent border-b-4 border-neonPink text-center text-4xl font-black focus:outline-none mb-8 w-full placeholder:opacity-20 text-neonPink"
            />
            <button 
              onClick={unirseASala}
              className="bg-neonPink w-full py-4 rounded-full font-black text-lg shadow-neon-pink hover:scale-105 transition-all active:scale-95"
            >
              UNIRSE A PARTIDA
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

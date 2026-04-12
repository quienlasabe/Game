import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function PantallaSala({ session, user }: any) {
  const router = useRouter();
  const { codigo } = router.query;
  const [sala, setSala] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [estaSonando, setEstaSonando] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Imágenes vinculadas a la temática
  const fondos: any = {
    'Rock': '/backgrounds/Rock.jpg',
    'Pop': '/backgrounds/pop.jpg',
    '80s': '/backgrounds/80s.jpg',
    '90s': '/backgrounds/90s.jpg',
    'Metal': '/backgrounds/Metal.jpg',
    'Blues': '/backgrounds/blues.jpg'
  };

  useEffect(() => {
    if (!codigo) return;

    // 1. Cargar datos iniciales de la sala
    const cargarSala = async () => {
      const { data } = await supabase.from('salas').select('*').eq('codigo', codigo).single();
      if (data) setSala(data);
    };

    cargarSala();

    // 2. Suscribirse a cambios en tiempo real
    const canal = supabase
      .channel(`sala:${codigo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas', filter: `codigo=eq.${codigo}` }, 
        (payload) => setSala(payload.new)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_jugadores' }, 
        async () => {
          const { data } = await supabase.from('sala_jugadores').select('*, profiles(username, avatar_url)').eq('sala_id', sala?.id);
          if (data) setJugadores(data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [codigo, sala?.id]);

  // Lógica para reproducir el snippet de Spotify
  useEffect(() => {
    if (sala?.cancion_actual_preview && !estaSonando) {
      audioRef.current = new Audio(sala.cancion_actual_preview);
      audioRef.current.play();
      setEstaSonando(true);
      
      setTimeout(() => {
        audioRef.current?.pause();
        setEstaSonando(false);
      }, (sala.tiempo_preview || 5) * 1000);
    }
  }, [sala?.cancion_actual_preview]);

  const handleBuzzer = async () => {
    if (sala?.quien_presiono || estaSonando === false) return;
    await supabase.from('salas').update({ quien_presiono: user.id }).eq('id', sala.id);
  };

  if (!sala) return <div className="bg-darkBg min-h-screen" />;

  return (
    <main className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between p-8"
          style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${fondos[sala.tematica] || '/backgrounds/portada.jpg'})` }}>
      
      {/* Info de Sala */}
      <div className="w-full flex justify-between items-start">
        <div className="bg-black/50 p-4 rounded-xl border border-neonCyan/30 backdrop-blur-md">
          <p className="text-neonCyan text-[10px] font-bold uppercase tracking-widest">Código de Sala</p>
          <h2 className="text-2xl font-black text-white">{codigo}</h2>
        </div>
        <div className="text-right bg-black/50 p-4 rounded-xl border border-neonPink/30 backdrop-blur-md">
          <p className="text-neonPink text-[10px] font-bold uppercase tracking-widest">Temática</p>
          <h2 className="text-2xl font-black text-white">{sala.tematica}</h2>
        </div>
      </div>

      {/* Círculo Central / Buzzer */}
      <div className="flex flex-col items-center">
        <div className={`relative w-64 h-64 md:w-80 md:h-80 rounded-full border-8 transition-all duration-500 flex items-center justify-center bg-black/20 backdrop-blur-sm
          ${estaSonando ? 'border-neonPink shadow-neon-pink scale-105' : 'border-white/10'}`}>
          
          <div className="text-center">
            <h3 className="text-neonCyan font-black text-4xl italic leading-none">¿QUIÉN LA</h3>
            <h3 className="text-neonPink font-black text-4xl italic leading-none">SABE?</h3>
          </div>

          {/* Animación de ondas cuando suena */}
          {estaSonando && (
            <div className="absolute inset-0 rounded-full border-4 border-neonPink animate-ping opacity-20"></div>
          )}
        </div>

        <button 
          onClick={handleBuzzer}
          disabled={!estaSonando || !!sala.quien_presiono}
          className={`mt-12 px-20 py-6 rounded-2xl text-3xl font-black transition-all transform active:scale-90
            ${!estaSonando || !!sala.quien_presiono 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-neonPink text-white shadow-neon-pink hover:scale-110'}`}
        >
          {sala.quien_presiono ? '¡BLOQUEADO!' : '¡BUZZER!'}
        </button>
      </div>

      {/* Lista de Jugadores (Abajo) */}
      <div className="w-full max-w-5xl flex gap-4 overflow-x-auto pb-4 justify-center">
        {jugadores.map((j) => (
          <div key={j.user_id} className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all
            ${sala.quien_presiono === j.user_id ? 'border-neonCyan bg-neonCyan/20 scale-110' : 'border-transparent bg-white/5'}`}>
            <img src={j.profiles.avatar_url} className="w-12 h-12 rounded-full mb-2" />
            <p className="text-[10px] font-bold truncate w-20 text-center">{j.profiles.username}</p>
            <p className="text-neonCyan font-black">{j.puntos} pts</p>
          </div>
        ))}
      </div>
    </main>
  );
}

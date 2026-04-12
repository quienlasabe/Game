import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const fondos: Record<string, string> = {
  'Rock':  '/backgrounds/Rock.jpg',
  'Pop':   '/backgrounds/pop.jpg',
  '80s':   '/backgrounds/80s.jpg',
  '90s':   '/backgrounds/90s.jpg',
  'Metal': '/backgrounds/Metal.jpg',
  'Blues': '/backgrounds/blues.jpg',
};

export default function PantallaSala({ session, user }: any) {
  const router   = useRouter();
  const { codigo } = router.query as { codigo: string };

  const [sala,      setSala]      = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [estaSonando, setEstaSonando] = useState(false);
  const [cargandoCancion, setCargandoCancion] = useState(false);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [trackInfo, setTrackInfo] = useState<{ name: string; artist: string; image: string } | null>(null);

  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const salaIdRef = useRef<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const esHost = sala && user && sala.host_id === user.id;

  // ── Helpers ──────────────────────────────────────────────
  const cargarJugadores = async (salaId: string) => {
    const { data } = await supabase
      .from('sala_jugadores')
      .select('*, profiles(username, avatar_url)')
      .eq('sala_id', salaId);
    if (data) setJugadores(data);
  };

  // ── Carga inicial + realtime ──────────────────────────────
  useEffect(() => {
    if (!codigo) return;

    const cargarSala = async () => {
      const { data } = await supabase
        .from('salas').select('*').eq('codigo_acceso', codigo).single();
      if (data) {
        setSala(data);
        salaIdRef.current = data.id;
        cargarJugadores(data.id);
      }
    };
    cargarSala();

    const canal = supabase.channel(`sala:${codigo}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'salas', filter: `codigo_acceso=eq.${codigo}` },
        (payload) => setSala(payload.new)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sala_jugadores' },
        () => { if (salaIdRef.current) cargarJugadores(salaIdRef.current); }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [codigo]);

  // ── Reproducir cuando cambia la canción ──────────────────
  useEffect(() => {
    if (!sala?.cancion_actual_url) return;
    if (sala.cancion_actual_url === prevUrlRef.current) return;
    prevUrlRef.current = sala.cancion_actual_url;

    audioRef.current?.pause();
    const audio = new Audio(sala.cancion_actual_url);
    audioRef.current = audio;
    audio.play().catch(() => {});
    setEstaSonando(true);
    setMostrarRespuesta(false);

    const timer = setTimeout(() => {
      audio.pause();
      setEstaSonando(false);
    }, (sala.tiempo_preview || 30) * 1000);

    return () => { clearTimeout(timer); audio.pause(); };
  }, [sala?.cancion_actual_url]);

  // Resetear sonando si la sala limpia la canción
  useEffect(() => {
    if (!sala?.cancion_actual_url) {
      audioRef.current?.pause();
      setEstaSonando(false);
      prevUrlRef.current = null;
    }
  }, [sala?.cancion_actual_url]);

  // ── Acciones del HOST ─────────────────────────────────────
  const siguienteCancion = async () => {
    if (!sala) return;
    setCargandoCancion(true);
    setMostrarRespuesta(false);

    // Resetear estado de la sala primero
    await supabase.from('salas').update({
      cancion_actual_url: null,
      respuesta_correcta: null,
      quien_presiono:     null,
      estado:             'jugando',
    }).eq('id', sala.id);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bright-worker`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tematica: sala.tematica }),
      });
      const track = await res.json();
      if (track.error) throw new Error(track.error);

      setTrackInfo({ name: track.name, artist: track.artist, image: track.image });

      await supabase.from('salas').update({
        cancion_actual_url: track.preview_url,
        respuesta_correcta: `${track.name} — ${track.artist}`,
      }).eq('id', sala.id);

    } catch (e: any) {
      alert('Error al cargar canción: ' + e.message);
    } finally {
      setCargandoCancion(false);
    }
  };

  const verRespuesta = () => setMostrarRespuesta(v => !v);

  const resolverBuzzer = async (correcto: boolean) => {
    if (!sala?.quien_presiono) return;

    if (correcto) {
      // Sumar punto al jugador que presionó
      const jugador = jugadores.find(j => j.user_id === sala.quien_presiono);
      if (jugador) {
        await supabase.from('sala_jugadores')
          .update({ puntos: (jugador.puntos ?? 0) + 1 })
          .eq('id', jugador.id);
      }
    }
    // Liberar buzzer
    await supabase.from('salas').update({ quien_presiono: null }).eq('id', sala.id);
  };

  const detenerAudio = async () => {
    audioRef.current?.pause();
    setEstaSonando(false);
    await supabase.from('salas').update({ quien_presiono: null }).eq('id', sala.id);
  };

  // ── Acciones del JUGADOR ──────────────────────────────────
  const handleBuzzer = async () => {
    if (!estaSonando || sala?.quien_presiono) return;
    await supabase.from('salas').update({ quien_presiono: user.id }).eq('id', sala.id);
  };

  // ── Jugador que presionó ──────────────────────────────────
  const jugadorQuePresionio = jugadores.find(j => j.user_id === sala?.quien_presiono);

  if (!sala) return <div className="bg-darkBg min-h-screen" />;

  const fondo = fondos[sala.tematica] || '/backgrounds/portada.jpg';

  return (
    <main
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between p-6 gap-6"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)), url(${fondo})` }}
    >
      {/* ── Header ── */}
      <div className="w-full flex justify-between items-start">
        <div className="bg-black/50 px-4 py-3 rounded-xl border border-neonCyan/30 backdrop-blur-md">
          <p className="text-neonCyan text-[10px] font-bold uppercase tracking-widest">Código</p>
          <h2 className="text-2xl font-black text-white">{codigo}</h2>
        </div>
        <div className="text-right bg-black/50 px-4 py-3 rounded-xl border border-neonPink/30 backdrop-blur-md">
          <p className="text-neonPink text-[10px] font-bold uppercase tracking-widest">Temática</p>
          <h2 className="text-2xl font-black text-white">{sala.tematica}</h2>
        </div>
      </div>

      {/* ── Centro: buzzer / info canción ── */}
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">

        {/* Portada de la canción (si hay info) */}
        {trackInfo?.image && (
          <img
            src={trackInfo.image}
            alt="album"
            className={`w-28 h-28 rounded-2xl shadow-2xl transition-all duration-500 ${estaSonando ? 'scale-110 shadow-neon-pink' : 'opacity-50'}`}
          />
        )}

        {/* Círculo buzzer */}
        <div className={`relative w-56 h-56 md:w-64 md:h-64 rounded-full border-8 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-all duration-500
          ${estaSonando ? 'border-neonPink shadow-neon-pink scale-105' : sala?.quien_presiono ? 'border-neonCyan shadow-neon-cyan' : 'border-white/10'}`}>

          {sala?.quien_presiono ? (
            <div className="text-center px-4">
              <img src={jugadorQuePresionio?.profiles?.avatar_url} className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-neonCyan" />
              <p className="text-neonCyan font-black text-sm truncate">{jugadorQuePresionio?.profiles?.username}</p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1">BUZZED!</p>
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-neonCyan font-black text-3xl italic leading-none">¿QUIÉN LA</h3>
              <h3 className="text-neonPink font-black text-3xl italic leading-none">SABE?</h3>
            </div>
          )}

          {estaSonando && (
            <div className="absolute inset-0 rounded-full border-4 border-neonPink animate-ping opacity-20 pointer-events-none" />
          )}
        </div>

        {/* Botón buzzer (jugadores) */}
        {!esHost && (
          <button
            onClick={handleBuzzer}
            disabled={!estaSonando || !!sala.quien_presiono}
            className={`w-full py-5 rounded-2xl text-2xl font-black transition-all active:scale-90
              ${!estaSonando || !!sala.quien_presiono
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-neonPink text-white shadow-neon-pink hover:scale-105'}`}
          >
            {sala.quien_presiono ? '¡BLOQUEADO!' : '¡BUZZER!'}
          </button>
        )}

        {/* Controles del HOST */}
        {esHost && (
          <div className="w-full flex flex-col gap-3">

            {/* Siguiente canción */}
            <button
              onClick={siguienteCancion}
              disabled={cargandoCancion}
              className="w-full py-4 rounded-2xl text-lg font-black bg-neonCyan text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-neon-cyan"
            >
              {cargandoCancion ? '⏳ Buscando...' : '🎵 SIGUIENTE CANCIÓN'}
            </button>

            {/* Ver / ocultar respuesta */}
            {sala.respuesta_correcta && (
              <button
                onClick={verRespuesta}
                className="w-full py-3 rounded-xl text-sm font-black bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
              >
                {mostrarRespuesta ? '🙈 Ocultar respuesta' : '👁 Ver respuesta'}
              </button>
            )}

            {mostrarRespuesta && sala.respuesta_correcta && (
              <div className="bg-black/60 border border-neonYellow/50 rounded-xl p-4 text-center">
                <p className="text-neonYellow font-black text-lg">{sala.respuesta_correcta}</p>
              </div>
            )}

            {/* Resolver buzzer */}
            {sala.quien_presiono && (
              <div className="flex gap-3">
                <button
                  onClick={() => resolverBuzzer(true)}
                  className="flex-1 py-3 rounded-xl font-black text-black bg-green-400 hover:scale-105 active:scale-95 transition-all text-lg"
                >
                  ✓ CORRECTO
                </button>
                <button
                  onClick={() => resolverBuzzer(false)}
                  className="flex-1 py-3 rounded-xl font-black text-white bg-red-500 hover:scale-105 active:scale-95 transition-all text-lg"
                >
                  ✗ MAL
                </button>
              </div>
            )}

            {/* Detener audio manualmente */}
            {estaSonando && (
              <button
                onClick={detenerAudio}
                className="w-full py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 transition-all"
              >
                ⏹ Detener audio
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Jugadores ── */}
      <div className="w-full max-w-2xl flex gap-3 overflow-x-auto pb-2 justify-center flex-wrap">
        {jugadores.map((j) => (
          <div
            key={j.user_id}
            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[72px]
              ${sala.quien_presiono === j.user_id ? 'border-neonCyan bg-neonCyan/20 scale-110' : 'border-transparent bg-white/5'}`}
          >
            <img src={j.profiles?.avatar_url} className="w-10 h-10 rounded-full mb-1" />
            <p className="text-[10px] font-bold truncate w-16 text-center">{j.profiles?.username}</p>
            <p className="text-neonCyan font-black text-sm">{j.puntos ?? 0} pts</p>
          </div>
        ))}
        {jugadores.length === 0 && (
          <p className="text-white/30 text-sm">Esperando jugadores...</p>
        )}
      </div>
    </main>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const FONDOS: Record<string, string> = {
  Rock:  '/backgrounds/Rock.jpg',
  Pop:   '/backgrounds/pop.jpg',
  '80s': '/backgrounds/80s.jpg',
  '90s': '/backgrounds/90s.jpg',
  Metal: '/backgrounds/Metal.jpg',
  Blues: '/backgrounds/blues.jpg',
};

// ─────────────────────────────────────────────────────────────────────────────
// SALA DE ESPERA
// ─────────────────────────────────────────────────────────────────────────────
function SalaEspera({ sala, jugadores, user, onEmpezar }: any) {
  const esHost = sala.host_id === user?.id;
  const tematicas: string[] = sala.tematica?.split(',') ?? [];
  const miJugador = jugadores.find((j: any) => j.user_id === user?.id);
  const todosListos = jugadores.length > 0 && jugadores.every((j: any) => j.confirmado);

  const marcarListo = async () => {
    if (!miJugador) return;
    await supabase.from('sala_jugadores').update({ confirmado: true }).eq('id', miJugador.id);
  };

  return (
    <main
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between p-6 gap-6"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.82), rgba(0,0,0,0.82)), url(${FONDOS[tematicas[0]] ?? '/backgrounds/portada.jpg'})` }}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-center">
        <div>
          <p className="text-neonCyan text-[10px] font-bold uppercase tracking-widest">Código de sala</p>
          <h1 className="text-4xl font-black text-white">{sala.codigo_acceso}</h1>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Esperando jugadores</p>
          <p className="text-white font-black">{jugadores.length} / {sala.max_jugadores ?? '?'}</p>
        </div>
      </div>

      {/* Config de sala */}
      <div className="w-full max-w-sm bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col gap-4 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Temáticas</p>
          <div className="flex flex-wrap gap-2">
            {tematicas.map((t: string) => (
              <span key={t} className="px-3 py-1 rounded-full text-xs font-black bg-neonPink/20 border border-neonPink/50 text-neonPink">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Preview</p>
            <p className="text-white font-black">{sala.tiempo_preview ?? 15}s</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Jugadores</p>
            <p className="text-white font-black">Máx. {sala.max_jugadores ?? 5}</p>
          </div>
        </div>
      </div>

      {/* Lista de jugadores */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Jugadores</p>
        {jugadores.map((j: any) => (
          <div key={j.user_id} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
            <div className="flex items-center gap-3">
              <img src={j.profiles?.avatar_url} className="w-10 h-10 rounded-full border-2 border-white/20" />
              <div>
                <p className="font-black text-sm">{j.profiles?.username}</p>
                {sala.host_id === j.user_id && (
                  <p className="text-neonCyan text-[10px] uppercase tracking-widest">Host</p>
                )}
              </div>
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${j.confirmado ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-white/5 text-white/30 border border-white/10'}`}>
              {j.confirmado ? '✓ LISTO' : 'Esperando'}
            </span>
          </div>
        ))}
        {jugadores.length === 0 && (
          <p className="text-white/30 text-sm text-center py-4">Compartí el código para que se unan</p>
        )}
      </div>

      {/* Botones */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {!esHost && !miJugador?.confirmado && (
          <button onClick={marcarListo}
            className="w-full py-4 rounded-2xl font-black text-lg bg-neonCyan text-black hover:scale-105 active:scale-95 transition-all shadow-neon-cyan">
            ✓ ESTOY LISTO
          </button>
        )}
        {esHost && (
          <button
            onClick={onEmpezar}
            className={`w-full py-4 rounded-2xl font-black text-xl transition-all
              ${todosListos || jugadores.length >= 1
                ? 'bg-neonPink text-white shadow-neon-pink hover:scale-105 active:scale-95'
                : 'bg-white/10 text-white/30 cursor-default'}`}
          >
            🎮 EMPEZAR JUEGO
          </button>
        )}
        {esHost && !todosListos && jugadores.length > 1 && (
          <p className="text-center text-white/30 text-xs">No todos están listos — podés empezar igual</p>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO
// ─────────────────────────────────────────────────────────────────────────────
function PantallaJuego({ sala, jugadores, user }: any) {
  const [estaSonando, setEstaSonando]         = useState(false);
  const [cargandoCancion, setCargandoCancion] = useState(false);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [timerSegundos, setTimerSegundos]     = useState(0);
  const [trackInfo, setTrackInfo]             = useState<any>(null);
  const [fondoActual, setFondoActual]         = useState('/backgrounds/portada.jpg');

  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const prevUrlRef = useRef<string | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const esHost  = sala.host_id === user?.id;
  const tematicasDisponibles: string[] = sala.tematica?.split(',') ?? ['Rock'];

  // Reproducir cuando cambia la URL en la sala
  useEffect(() => {
    if (!sala?.cancion_actual_url) {
      audioRef.current?.pause();
      setEstaSonando(false);
      setTimerSegundos(0);
      if (timerRef.current) clearInterval(timerRef.current);
      prevUrlRef.current = null;
      return;
    }
    if (sala.cancion_actual_url === prevUrlRef.current) return;
    prevUrlRef.current = sala.cancion_actual_url;

    audioRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);

    const audio = new Audio(sala.cancion_actual_url);
    audioRef.current = audio;
    const duracion = sala.tiempo_preview ?? 15;
    setTimerSegundos(duracion);
    setEstaSonando(true);
    setMostrarRespuesta(false);

    audio.play().catch(() => {});

    let restante = duracion;
    timerRef.current = setInterval(() => {
      restante -= 1;
      setTimerSegundos(restante);
      if (restante <= 0) {
        clearInterval(timerRef.current!);
        audio.pause();
        setEstaSonando(false);
      }
    }, 1000);

    return () => { clearInterval(timerRef.current!); audio.pause(); };
  }, [sala?.cancion_actual_url]);

  // Acciones host
  const siguienteCancion = async () => {
    setCargandoCancion(true);
    setMostrarRespuesta(false);
    await supabase.from('salas').update({
      cancion_actual_url: null,
      respuesta_correcta: null,
      quien_presiono:     null,
    }).eq('id', sala.id);

    const tematica = tematicasDisponibles[Math.floor(Math.random() * tematicasDisponibles.length)];
    setFondoActual(FONDOS[tematica] ?? '/backgrounds/portada.jpg');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bright-worker`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tematica }),
      });
      const track = await res.json();
      if (track.error) throw new Error(track.error);
      setTrackInfo(track);
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

  const resolverBuzzer = async (correcto: boolean) => {
    if (correcto) {
      const j = jugadores.find((j: any) => j.user_id === sala.quien_presiono);
      if (j) await supabase.from('sala_jugadores').update({ puntos: (j.puntos ?? 0) + 1 }).eq('id', j.id);
    }
    audioRef.current?.pause();
    setEstaSonando(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase.from('salas').update({ quien_presiono: null, cancion_actual_url: null }).eq('id', sala.id);
  };

  const handleBuzzer = async () => {
    if (!estaSonando || sala?.quien_presiono) return;
    await supabase.from('salas').update({ quien_presiono: user.id }).eq('id', sala.id);
  };

  const jugadorQuePresionio = jugadores.find((j: any) => j.user_id === sala?.quien_presiono);

  return (
    <main
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-between p-6 gap-4 transition-all duration-700"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)), url(${fondoActual})` }}
    >
      {/* Header */}
      <div className="w-full flex justify-between items-start">
        <div className="bg-black/50 px-4 py-2 rounded-xl border border-neonCyan/30">
          <p className="text-neonCyan text-[10px] font-bold uppercase tracking-widest">Sala</p>
          <p className="text-white font-black">{sala.codigo_acceso}</p>
        </div>

        {/* Timer */}
        {estaSonando && (
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-black text-2xl transition-colors
              ${timerSegundos <= 3 ? 'border-red-500 text-red-400' : 'border-neonCyan text-neonCyan'}`}>
              {timerSegundos}
            </div>
          </div>
        )}

        <div className="bg-black/50 px-4 py-2 rounded-xl border border-neonPink/30 text-right">
          <p className="text-neonPink text-[10px] font-bold uppercase tracking-widest">Temáticas</p>
          <p className="text-white font-black text-xs">{tematicasDisponibles.join(' · ')}</p>
        </div>
      </div>

      {/* Centro */}
      <div className="flex flex-col items-center gap-5 w-full max-w-sm">

        {/* Portada del álbum */}
        {trackInfo?.image && (
          <img src={trackInfo.image} alt="album"
            className={`w-24 h-24 rounded-2xl shadow-2xl transition-all duration-500 ${estaSonando ? 'scale-110' : 'opacity-40'}`} />
        )}

        {/* Círculo central */}
        <div className={`relative w-52 h-52 rounded-full border-8 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-all duration-500
          ${estaSonando && !sala?.quien_presiono ? 'border-neonPink shadow-neon-pink scale-105 animate-pulse'
            : sala?.quien_presiono ? 'border-neonCyan shadow-neon-cyan scale-105'
            : 'border-white/10'}`}>

          {sala?.quien_presiono ? (
            <div className="text-center px-2">
              <img src={jugadorQuePresionio?.profiles?.avatar_url} className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-neonCyan" />
              <p className="text-neonCyan font-black text-sm truncate max-w-[120px]">{jugadorQuePresionio?.profiles?.username}</p>
              <p className="text-white/50 text-[9px] uppercase tracking-widest">BUZZED!</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-neonCyan font-black text-2xl italic leading-tight">¿QUIÉN LA</p>
              <p className="text-neonPink font-black text-2xl italic leading-tight">SABE?</p>
              {!estaSonando && !cargandoCancion && !esHost && (
                <p className="text-white/30 text-[9px] mt-2 uppercase tracking-widest">Esperando canción...</p>
              )}
            </div>
          )}

          {estaSonando && !sala?.quien_presiono && (
            <div className="absolute inset-0 rounded-full border-4 border-neonPink animate-ping opacity-20 pointer-events-none" />
          )}
        </div>

        {/* BUZZER — jugadores */}
        {!esHost && (
          <button onClick={handleBuzzer}
            disabled={!estaSonando || !!sala.quien_presiono}
            className={`w-full py-5 rounded-2xl text-2xl font-black transition-all active:scale-90
              ${estaSonando && !sala.quien_presiono
                ? 'bg-neonPink text-white shadow-neon-pink hover:scale-105'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
            {sala.quien_presiono ? '¡BLOQUEADO!' : '¡BUZZER!'}
          </button>
        )}

        {/* Controles HOST */}
        {esHost && (
          <div className="w-full flex flex-col gap-3">

            <button onClick={siguienteCancion} disabled={cargandoCancion || estaSonando}
              className="w-full py-4 rounded-2xl font-black text-lg bg-neonCyan text-black shadow-neon-cyan hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {cargandoCancion ? '⏳ Buscando...' : '🎵 SIGUIENTE CANCIÓN'}
            </button>

            {sala.respuesta_correcta && (
              <>
                <button onClick={() => setMostrarRespuesta(v => !v)}
                  className="w-full py-3 rounded-xl text-sm font-black bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all">
                  {mostrarRespuesta ? '🙈 Ocultar' : '👁 Ver respuesta'}
                </button>
                {mostrarRespuesta && (
                  <div className="bg-black/70 border border-neonYellow/50 rounded-xl p-3 text-center">
                    <p className="text-neonYellow font-black">{sala.respuesta_correcta}</p>
                  </div>
                )}
              </>
            )}

            {sala.quien_presiono && (
              <div className="flex gap-3">
                <button onClick={() => resolverBuzzer(true)}
                  className="flex-1 py-3 rounded-xl font-black text-black bg-green-400 hover:scale-105 active:scale-95 transition-all text-lg">
                  ✓ CORRECTO
                </button>
                <button onClick={() => resolverBuzzer(false)}
                  className="flex-1 py-3 rounded-xl font-black text-white bg-red-500 hover:scale-105 active:scale-95 transition-all text-lg">
                  ✗ MAL
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Jugadores */}
      <div className="w-full max-w-2xl flex gap-3 justify-center flex-wrap">
        {jugadores.map((j: any) => (
          <div key={j.user_id}
            className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all min-w-[64px]
              ${sala.quien_presiono === j.user_id ? 'border-neonCyan bg-neonCyan/20 scale-110' : 'border-transparent bg-white/5'}`}>
            <img src={j.profiles?.avatar_url} className="w-9 h-9 rounded-full mb-1" />
            <p className="text-[9px] font-bold truncate w-14 text-center">{j.profiles?.username}</p>
            <p className="text-neonCyan font-black text-xs">{j.puntos ?? 0} pts</p>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function PantallaSala({ session, user }: any) {
  const router = useRouter();
  const { codigo } = router.query as { codigo: string };

  const [sala,      setSala]      = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const salaIdRef = useRef<string | null>(null);

  const cargarJugadores = async (salaId: string) => {
    const { data } = await supabase.from('sala_jugadores')
      .select('*, profiles(username, avatar_url)').eq('sala_id', salaId);
    if (data) setJugadores(data);
  };

  useEffect(() => {
    if (!codigo) return;
    const cargar = async () => {
      const { data } = await supabase.from('salas').select('*').eq('codigo_acceso', codigo).single();
      if (data) { setSala(data); salaIdRef.current = data.id; cargarJugadores(data.id); }
    };
    cargar();

    const canal = supabase.channel(`sala:${codigo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas', filter: `codigo_acceso=eq.${codigo}` },
        payload => setSala(payload.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_jugadores' },
        () => { if (salaIdRef.current) cargarJugadores(salaIdRef.current); })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [codigo]);

  const empezarJuego = async () => {
    await supabase.from('salas').update({ estado: 'jugando' }).eq('id', sala.id);
  };

  if (!sala) return <div className="bg-darkBg min-h-screen" />;

  if (sala.estado === 'esperando') {
    return <SalaEspera sala={sala} jugadores={jugadores} user={user} onEmpezar={empezarJuego} />;
  }

  return <PantallaJuego sala={sala} jugadores={jugadores} user={user} />;
}

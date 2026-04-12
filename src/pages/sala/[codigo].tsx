import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY         = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TIMER_RESPUESTA  = 15;

const FONDOS: Record<string, string> = {
  Rock:  '/backgrounds/Rock.jpg',
  Pop:   '/backgrounds/pop.jpg',
  '80s': '/backgrounds/80s.jpg',
  '90s': '/backgrounds/90s.jpg',
  Metal: '/backgrounds/Metal.jpg',
  Blues: '/backgrounds/blues.jpg',
};

function Fondo({ src }: { src: string }) {
  return (
    <div className="fixed inset-0 -z-10 transition-all duration-700"
      style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/72" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALA DE ESPERA
// ─────────────────────────────────────────────────────────────────────────────
function SalaEspera({ sala, jugadores, user, onEmpezar, onSalir }: any) {
  const esHost    = sala.host_id === user?.id;
  const tematicas: string[] = sala.tematica?.split(',') ?? [];
  const miJugador = jugadores.find((j: any) => j.user_id === user?.id);
  const todosListos = jugadores.length > 0 && jugadores.every((j: any) => j.confirmado);
  const fondo = FONDOS[tematicas[0]] ?? '/backgrounds/portada.jpg';

  const marcarListo = async () => {
    if (!miJugador) return;
    await supabase.from('sala_jugadores').update({ confirmado: true }).eq('id', miJugador.id);
  };

  return (
    <div className="min-h-screen text-white">
      <Fondo src={fondo} />

      {/* Buzzer fantasma */}
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none select-none opacity-20">
        <div className="w-52 h-52 rounded-full border-8 border-neonPink flex items-center justify-center">
          <div className="text-center">
            <p className="text-neonCyan font-black text-2xl italic">¿QUIÉN LA</p>
            <p className="text-neonPink font-black text-2xl italic">SABE?</p>
          </div>
        </div>
        <div className="w-64 py-5 rounded-2xl border-2 border-neonPink/60 text-center font-black text-xl">¡BUZZER!</div>
        <div className="flex gap-3 flex-wrap justify-center">
          {jugadores.map((j: any) => (
            <div key={j.user_id} className="flex flex-col items-center gap-1">
              <img src={j.profiles?.avatar_url} className="w-10 h-10 rounded-full" />
              <p className="text-[9px] font-bold w-14 truncate text-center">{j.profiles?.username}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-black/78 backdrop-blur-lg rounded-3xl border border-white/10 p-6 flex flex-col gap-4 shadow-2xl">

          <div className="flex justify-between items-start">
            <div>
              <p className="text-neonCyan text-[10px] font-bold uppercase tracking-widest">Código de sala</p>
              <h1 className="text-3xl font-black">{sala.codigo_acceso}</h1>
            </div>
            <button onClick={onSalir}
              className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-all mt-1">
              ← Salir
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {tematicas.map((t: string) => (
              <span key={t} className="px-3 py-1 rounded-full text-xs font-black bg-neonPink/20 border border-neonPink/40 text-neonPink">{t}</span>
            ))}
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Preview</p>
              <p className="font-black">{sala.tiempo_preview ?? 15}s</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Máx. jugadores</p>
              <p className="font-black">{sala.max_jugadores ?? 5}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Jugadores ({jugadores.length})</p>
            {jugadores.length === 0 && <p className="text-white/30 text-xs text-center py-2">Compartí el código para que se unan</p>}
            {jugadores.map((j: any) => (
              <div key={j.user_id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                <div className="flex items-center gap-2">
                  <img src={j.profiles?.avatar_url} className="w-8 h-8 rounded-full" />
                  <p className="font-bold text-sm">{j.profiles?.username}</p>
                  {sala.host_id === j.user_id && <span className="text-neonCyan text-[9px] uppercase">Host</span>}
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full
                  ${j.confirmado ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/30 border border-white/10'}`}>
                  {j.confirmado ? '✓ LISTO' : '...'}
                </span>
              </div>
            ))}
          </div>

          {!esHost && !miJugador?.confirmado && (
            <button onClick={marcarListo}
              className="w-full py-4 rounded-2xl font-black text-lg bg-neonCyan text-black hover:scale-105 active:scale-95 transition-all shadow-neon-cyan">
              ✓ ESTOY LISTO
            </button>
          )}
          {esHost && (
            <button onClick={onEmpezar}
              className="w-full py-4 rounded-2xl font-black text-xl bg-neonPink text-white shadow-neon-pink hover:scale-105 active:scale-95 transition-all">
              🎮 EMPEZAR JUEGO
            </button>
          )}
          {esHost && !todosListos && jugadores.length > 1 && (
            <p className="text-center text-white/30 text-[10px]">No todos están listos — podés empezar igual</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO
// ─────────────────────────────────────────────────────────────────────────────
function PantallaJuego({ sala, jugadores, user, codigo }: any) {
  const [estaSonando,      setEstaSonando]      = useState(false);
  const [cargandoCancion,  setCargandoCancion]  = useState(false);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [timerCancion,     setTimerCancion]     = useState(0);
  const [timerRespuesta,   setTimerRespuesta]   = useState(0);
  const [trackInfo,        setTrackInfo]        = useState<any>(null);
  const [fondoActual,      setFondoActual]      = useState('/backgrounds/portada.jpg');
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false);

  // Chat
  const [mensajes,     setMensajes]     = useState<{ user: string; text: string; avatar?: string }[]>([]);
  const [mensajeInput, setMensajeInput] = useState('');
  const [chatAbierto,  setChatAbierto]  = useState(false);
  const chatRef  = useRef<HTMLDivElement>(null);
  const canalRef = useRef<any>(null);

  const audioRef          = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const prevUrlRef        = useRef<string | null>(null);
  const timerCancionRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRespuestaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const esHost            = sala.host_id === user?.id;
  const modoEntrenamiento = jugadores.length === 1;
  const tematicasDisp: string[] = sala.tematica?.split(',') ?? ['Rock'];

  // ── Desbloquear audio con primer gesto ───────────────────────────────────
  const desbloquearAudio = () => {
    if (audioDesbloqueado) return;
    // Crear AudioContext y reproducir silencio para desbloquear
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    audioCtxRef.current = ctx;
    setAudioDesbloqueado(true);
  };

  // ── Canal chat ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canal = supabase.channel(`chat:${codigo}`, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        setMensajes(prev => [...prev, payload]);
        setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);
      })
      .subscribe();
    canalRef.current = canal;
    return () => { supabase.removeChannel(canal); };
  }, [codigo]);

  const enviarMensaje = () => {
    const t = mensajeInput.trim();
    if (!t || !canalRef.current) return;
    const p = jugadores.find((j: any) => j.user_id === user?.id);
    canalRef.current.send({ type: 'broadcast', event: 'msg',
      payload: { user: p?.profiles?.username ?? 'Vos', text: t, avatar: p?.profiles?.avatar_url } });
    setMensajeInput('');
  };

  // ── Timer canción ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sala?.cancion_actual_url) {
      audioRef.current?.pause();
      setEstaSonando(false);
      setTimerCancion(0);
      clearInterval(timerCancionRef.current!);
      prevUrlRef.current = null;
      return;
    }
    if (sala.cancion_actual_url === prevUrlRef.current) return;
    prevUrlRef.current = sala.cancion_actual_url;

    audioRef.current?.pause();
    clearInterval(timerCancionRef.current!);

    const audio = new Audio(sala.cancion_actual_url);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    const dur = sala.tiempo_preview ?? 15;
    setTimerCancion(dur);
    setEstaSonando(true);
    setMostrarRespuesta(false);

    // Intentar reproducir — si falla (autoplay policy) mostrar unlock
    const play = audio.play();
    if (play !== undefined) {
      play.catch(() => setAudioDesbloqueado(false));
    }

    let r = dur;
    timerCancionRef.current = setInterval(() => {
      r -= 1;
      setTimerCancion(r);
      if (r <= 0) { clearInterval(timerCancionRef.current!); audio.pause(); setEstaSonando(false); }
    }, 1000);

    return () => { clearInterval(timerCancionRef.current!); audio.pause(); };
  }, [sala?.cancion_actual_url]);

  // ── Timer respuesta post-buzzer ───────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRespuestaRef.current!);
    if (!sala?.quien_presiono) { setTimerRespuesta(0); return; }

    let r = TIMER_RESPUESTA;
    setTimerRespuesta(r);
    timerRespuestaRef.current = setInterval(() => {
      r -= 1;
      setTimerRespuesta(r);
      if (r <= 0) { clearInterval(timerRespuestaRef.current!); if (esHost) resolverBuzzer(false); }
    }, 1000);

    return () => clearInterval(timerRespuestaRef.current!);
  }, [sala?.quien_presiono]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const siguienteCancion = async () => {
    desbloquearAudio(); // aprovechar el gesto del host
    setCargandoCancion(true);
    setMostrarRespuesta(false);
    await supabase.from('salas').update({ cancion_actual_url: null, respuesta_correcta: null, quien_presiono: null }).eq('id', sala.id);

    const tematica = tematicasDisp[Math.floor(Math.random() * tematicasDisp.length)];
    setFondoActual(FONDOS[tematica] ?? '/backgrounds/portada.jpg');

    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/bright-worker`, {
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
      alert('Error: ' + e.message);
    } finally {
      setCargandoCancion(false);
    }
  };

  const resolverBuzzer = async (correcto: boolean) => {
    clearInterval(timerRespuestaRef.current!);
    if (correcto && !modoEntrenamiento) {
      const j = jugadores.find((j: any) => j.user_id === sala.quien_presiono);
      if (j) await supabase.from('sala_jugadores').update({ puntos: (j.puntos ?? 0) + 1 }).eq('id', j.id);
    }
    audioRef.current?.pause();
    setEstaSonando(false);
    clearInterval(timerCancionRef.current!);
    await supabase.from('salas').update({ quien_presiono: null, cancion_actual_url: null }).eq('id', sala.id);
  };

  const handleBuzzer = async () => {
    desbloquearAudio();
    if (!estaSonando || sala?.quien_presiono) return;
    await supabase.from('salas').update({ quien_presiono: user.id }).eq('id', sala.id);
  };

  const jugadorBuzzeado = jugadores.find((j: any) => j.user_id === sala?.quien_presiono);
  // En modo entrenamiento el host también puede buzzear
  const puedeVerBuzzer = !esHost || modoEntrenamiento;

  return (
    <div className="min-h-screen text-white flex flex-col select-none" onClick={desbloquearAudio}>
      <Fondo src={fondoActual} />

      {/* Banner desbloquear audio */}
      {!audioDesbloqueado && sala?.cancion_actual_url && (
        <div className="fixed top-0 inset-x-0 z-50 bg-neonPink/90 text-black text-center py-3 font-black text-sm cursor-pointer"
          onClick={desbloquearAudio}>
          🔊 TAP AQUÍ PARA ACTIVAR EL AUDIO
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex justify-between items-start p-4 pt-3">
        <div className="bg-black/50 px-3 py-2 rounded-xl border border-neonCyan/30">
          <p className="text-neonCyan text-[9px] font-bold uppercase tracking-widest">Sala</p>
          <p className="font-black text-sm">{sala.codigo_acceso}</p>
          {modoEntrenamiento && <p className="text-yellow-400 text-[8px] font-bold uppercase">⚡ Entrenamiento</p>}
        </div>

        {estaSonando && (
          <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-xl transition-colors
            ${timerCancion <= 3 ? 'border-red-500 text-red-400' : 'border-neonCyan text-neonCyan'}`}>
            {timerCancion}
          </div>
        )}

        <div className="bg-black/50 px-3 py-2 rounded-xl border border-neonPink/30 text-right">
          <p className="text-neonPink text-[9px] font-bold uppercase tracking-widest">Temáticas</p>
          <p className="font-black text-xs">{tematicasDisp.join(' · ')}</p>
        </div>
      </div>

      {/* Centro */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 px-4">

        {trackInfo?.image && (
          <img src={trackInfo.image} alt="album"
            className={`w-20 h-20 rounded-2xl shadow-2xl transition-all duration-500 ${estaSonando ? 'scale-110' : 'opacity-40'}`} />
        )}

        {/* Círculo */}
        <div className={`relative w-52 h-52 rounded-full border-8 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-all duration-500
          ${estaSonando && !sala?.quien_presiono ? 'border-neonPink shadow-neon-pink scale-105'
            : sala?.quien_presiono ? 'border-neonCyan shadow-neon-cyan scale-105'
            : 'border-white/10'}`}>

          {sala?.quien_presiono ? (
            <div className="text-center px-2">
              <img src={jugadorBuzzeado?.profiles?.avatar_url}
                className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-neonCyan" />
              <p className="text-neonCyan font-black text-sm truncate max-w-[120px]">{jugadorBuzzeado?.profiles?.username}</p>
              <p className={`font-black text-2xl mt-1 ${timerRespuesta <= 5 ? 'text-red-400' : 'text-white'}`}>
                {timerRespuesta}s
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-neonCyan font-black text-2xl italic leading-tight">¿QUIÉN LA</p>
              <p className="text-neonPink font-black text-2xl italic leading-tight">SABE?</p>
              {!estaSonando && !cargandoCancion && (
                <p className="text-white/30 text-[9px] mt-2 uppercase tracking-widest">
                  {esHost ? 'Presioná siguiente' : 'Esperando canción...'}
                </p>
              )}
            </div>
          )}

          {estaSonando && !sala?.quien_presiono && (
            <div className="absolute inset-0 rounded-full border-4 border-neonPink animate-ping opacity-20 pointer-events-none" />
          )}
        </div>

        {/* Buzzer — jugadores y host en modo entrenamiento */}
        {puedeVerBuzzer && (
          <button onClick={handleBuzzer}
            disabled={!estaSonando || !!sala.quien_presiono}
            className={`w-full max-w-xs py-5 rounded-2xl text-2xl font-black transition-all active:scale-90
              ${estaSonando && !sala.quien_presiono
                ? 'bg-neonPink text-white shadow-neon-pink hover:scale-105'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
            {sala.quien_presiono ? '¡BLOQUEADO!' : '¡BUZZER!'}
          </button>
        )}

        {/* Controles host */}
        {esHost && (
          <div className="w-full max-w-xs flex flex-col gap-3">
            <button onClick={siguienteCancion} disabled={cargandoCancion || estaSonando}
              className="w-full py-4 rounded-2xl font-black text-lg bg-neonCyan text-black shadow-neon-cyan hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {cargandoCancion ? '⏳ Buscando...' : '🎵 SIGUIENTE CANCIÓN'}
            </button>

            {sala.respuesta_correcta && (
              <>
                <button onClick={() => setMostrarRespuesta(v => !v)}
                  className="w-full py-3 rounded-xl text-sm font-black bg-white/10 border border-white/20 hover:bg-white/20 transition-all">
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
      <div className="relative z-10 flex gap-3 justify-center flex-wrap px-4 pb-3">
        {jugadores.map((j: any) => (
          <div key={j.user_id}
            className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all min-w-[60px]
              ${sala.quien_presiono === j.user_id ? 'border-neonCyan bg-neonCyan/20 scale-110' : 'border-transparent bg-white/5'}`}>
            <img src={j.profiles?.avatar_url} className="w-9 h-9 rounded-full mb-1" />
            <p className="text-[9px] font-bold truncate w-14 text-center">{j.profiles?.username}</p>
            <p className="text-neonCyan font-black text-xs">{j.puntos ?? 0} pts</p>
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="relative z-10 px-4 pb-4">
        <button onClick={() => setChatAbierto(v => !v)}
          className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-bold uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-2">
          💬 {chatAbierto ? 'Cerrar chat' : 'Chat'}
          {!chatAbierto && mensajes.length > 0 && (
            <span className="bg-neonPink text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{mensajes.length}</span>
          )}
        </button>

        {chatAbierto && (
          <div className="mt-2 bg-black/75 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col overflow-hidden">
            <div ref={chatRef} className="h-44 overflow-y-auto p-3 flex flex-col gap-2">
              {mensajes.length === 0 && <p className="text-white/30 text-sm text-center mt-6">Nadie dijo nada todavía</p>}
              {mensajes.map((m, i) => (
                <div key={i} className="flex items-start gap-2">
                  {m.avatar && <img src={m.avatar} className="w-7 h-7 rounded-full mt-0.5 flex-shrink-0" />}
                  <p className="text-sm leading-snug">
                    <span className="text-neonCyan font-black">{m.user}: </span>
                    <span className="text-white/85">{m.text}</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="flex border-t border-white/10 items-center">
              <input
                type="text"
                value={mensajeInput}
                onChange={e => setMensajeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
                placeholder="Escribí algo..."
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
              />
              <button onClick={enviarMensaje}
                className="px-5 py-3 text-neonCyan font-black text-base hover:text-white transition-all">
                ↑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
    const { error } = await supabase.from('salas').update({ estado: 'jugando' }).eq('id', sala.id);
    if (!error) {
      // Actualizar estado local directamente — no depender de realtime para la transición
      setSala((prev: any) => ({ ...prev, estado: 'jugando' }));
    } else {
      alert('Error al empezar: ' + error.message);
    }
  };

  const salirDeSala = async () => {
    const esHost = sala.host_id === user?.id;
    if (esHost) {
      await supabase.from('sala_jugadores').delete().eq('sala_id', sala.id);
      await supabase.from('salas').delete().eq('id', sala.id);
    } else {
      const miJugador = jugadores.find(j => j.user_id === user?.id);
      if (miJugador) await supabase.from('sala_jugadores').delete().eq('id', miJugador.id);
    }
    router.push('/lobby');
  };

  if (!sala) return <div className="bg-darkBg min-h-screen" />;

  if (sala.estado === 'esperando') {
    return <SalaEspera sala={sala} jugadores={jugadores} user={user} onEmpezar={empezarJuego} onSalir={salirDeSala} />;
  }

  return <PantallaJuego sala={sala} jugadores={jugadores} user={user} codigo={codigo} />;
}

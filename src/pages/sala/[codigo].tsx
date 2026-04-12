import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TIMER_RESPUESTA = 15;

const FONDOS: Record<string, string> = {
  Rock:  '/backgrounds/Rock.jpg',
  Pop:   '/backgrounds/pop.jpg',
  '80s': '/backgrounds/80s.jpg',
  '90s': '/backgrounds/90s.jpg',
  Metal: '/backgrounds/Metal.jpg',
  Blues: '/backgrounds/blues.jpg',
};

// Silence WAV (0-length) for audio unlock
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

function Fondo({ src }: { src: string }) {
  return (
    <div className="fixed inset-0 -z-10 transition-all duration-700"
      style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-black/75" />
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
  const fondo     = FONDOS[tematicas[0]] ?? '/backgrounds/portada.jpg';

  const marcarListo = async () => {
    if (!miJugador) return;
    await supabase.from('sala_jugadores').update({ confirmado: true }).eq('id', miJugador.id);
  };

  return (
    <div className="min-h-screen text-white">
      <Fondo src={fondo} />

      {/* Ghost game preview */}
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
        <div className="w-full max-w-sm bg-black/80 backdrop-blur-lg rounded-3xl border border-white/10 p-6 flex flex-col gap-4 shadow-2xl">

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
            {jugadores.length === 0 && (
              <p className="text-white/30 text-xs text-center py-2">Compartí el código para que se unan</p>
            )}
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
          {esHost && jugadores.length > 1 && (
            <p className="text-center text-white/30 text-[10px]">Podés empezar aunque no todos estén listos</p>
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
  const [audioOK,          setAudioOK]          = useState(false);

  // Chat
  const [mensajes,     setMensajes]     = useState<{ user: string; text: string; avatar?: string }[]>([]);
  const [mensajeInput, setMensajeInput] = useState('');
  const chatRef  = useRef<HTMLDivElement>(null);
  const canalRef = useRef<any>(null);

  const audioRef          = useRef<HTMLAudioElement | null>(null);
  const prevUrlRef        = useRef<string | null>(null);
  const timerCancionRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRespuestaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const esHost            = sala.host_id === user?.id;
  const modoEntrenamiento = jugadores.length === 1;
  const tematicasDisp: string[] = sala.tematica?.split(',') ?? ['Rock'];
  const puedeVerBuzzer    = !esHost || modoEntrenamiento;
  const jugadoresOrden    = [...jugadores].sort((a, b) => (b.puntos ?? 0) - (a.puntos ?? 0));
  const jugadorBuzzeado   = jugadores.find((j: any) => j.user_id === sala?.quien_presiono);

  // ── Inicializar audio element ────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // ── Desbloquear audio (llamar siempre desde un gesto de usuario) ─────────
  const desbloquearAudio = async () => {
    if (audioOK) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      // Reproducir silencio para desbloquear el elemento HTMLAudio en este contexto
      audio.src = SILENCE;
      await audio.play();
      audio.pause();
      audio.src = '';
      setAudioOK(true);
    } catch (_) {
      // Sigue bloqueado — el banner lo indica
    }
  };

  // ── Reproducir una URL ───────────────────────────────────────────────────
  const reproducir = (url: string, dur: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    clearInterval(timerCancionRef.current!);

    audio.src = url;
    audio.load();
    setTimerCancion(dur);
    setEstaSonando(true);
    setMostrarRespuesta(false);

    const p = audio.play();
    if (p) p.catch(() => setAudioOK(false));

    let r = dur;
    timerCancionRef.current = setInterval(() => {
      r -= 1;
      setTimerCancion(r);
      if (r <= 0) {
        clearInterval(timerCancionRef.current!);
        audio.pause();
        setEstaSonando(false);
      }
    }, 1000);
  };

  // ── Reaccionar a cambio de URL en sala (no-host players) ─────────────────
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
    reproducir(sala.cancion_actual_url, sala.tiempo_preview ?? 15);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala?.cancion_actual_url]);

  // ── Timer respuesta post-buzzer ──────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRespuestaRef.current!);
    if (!sala?.quien_presiono) { setTimerRespuesta(0); return; }
    let r = TIMER_RESPUESTA;
    setTimerRespuesta(r);
    timerRespuestaRef.current = setInterval(() => {
      r -= 1; setTimerRespuesta(r);
      if (r <= 0) { clearInterval(timerRespuestaRef.current!); if (esHost) resolverBuzzer(false); }
    }, 1000);
    return () => clearInterval(timerRespuestaRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala?.quien_presiono]);

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

  // ── Siguiente canción (solo host) ─────────────────────────────────────────
  const siguienteCancion = async () => {
    await desbloquearAudio(); // desbloquear en el gesto
    setCargandoCancion(true);
    setMostrarRespuesta(false);

    await supabase.from('salas').update({
      cancion_actual_url: null, respuesta_correcta: null, quien_presiono: null,
    }).eq('id', sala.id);

    const tematica = tematicasDisp[Math.floor(Math.random() * tematicasDisp.length)];
    setFondoActual(FONDOS[tematica] ?? '/backgrounds/portada.jpg');

    try {
      const res   = await fetch(`${SUPABASE_URL}/functions/v1/bright-worker`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tematica }),
      });
      const track = await res.json();
      if (track.error) throw new Error(track.error);
      setTrackInfo(track);

      // Host reproduce directamente (no espera realtime)
      prevUrlRef.current = track.preview_url;
      reproducir(track.preview_url, sala.tiempo_preview ?? 15);

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
    clearInterval(timerRespuestaRef.current!);
    if (correcto && !modoEntrenamiento) {
      const j = jugadores.find((j: any) => j.user_id === sala.quien_presiono);
      if (j) await supabase.from('sala_jugadores')
        .update({ puntos: (j.puntos ?? 0) + 1 }).eq('id', j.id);
    }
    audioRef.current?.pause();
    setEstaSonando(false);
    clearInterval(timerCancionRef.current!);
    await supabase.from('salas').update({
      quien_presiono: null, cancion_actual_url: null,
    }).eq('id', sala.id);
  };

  const handleBuzzer = async () => {
    await desbloquearAudio();
    if (!estaSonando || sala?.quien_presiono) return;
    await supabase.from('salas').update({ quien_presiono: user.id }).eq('id', sala.id);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden text-white">
      <Fondo src={fondoActual} />

      {/* Banner activar audio */}
      {!audioOK && (
        <button
          className="fixed top-0 inset-x-0 z-50 bg-neonPink text-black text-center py-3 font-black text-sm"
          onClick={desbloquearAudio}
        >
          🔊 TAP AQUÍ PARA ACTIVAR EL AUDIO
        </button>
      )}

      {/* ── HEADER ── */}
      <div className={`relative z-10 flex justify-between items-center px-4 pb-1 flex-shrink-0 ${!audioOK ? 'pt-12' : 'pt-3'}`}>
        {/* Logo */}
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,255,0.8))' }}>
          <span
            className="font-black italic text-transparent bg-clip-text bg-gradient-to-r from-neonPink via-white to-neonCyan"
            style={{ fontSize: 'clamp(0.9rem, 4vw, 1.1rem)', lineHeight: 1 }}
          >
            ¿QUIÉN LA SABE?
          </span>
        </div>
        <div className="flex items-center gap-2">
          {modoEntrenamiento && (
            <span className="text-yellow-400 text-[9px] font-black uppercase bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30">
              ⚡ Entrenamiento
            </span>
          )}
          <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest">{sala.codigo_acceso}</span>
        </div>
      </div>

      {/* ── MAIN CONTENT: LEFT + RIGHT ── */}
      <div className="relative z-10 flex flex-1 gap-2 px-3 pb-2 overflow-hidden min-h-0">

        {/* ────── LEFT COLUMN ────── */}
        <div className="flex flex-col flex-1 gap-2 min-w-0">

          {/* Display digital */}
          <div
            className="bg-black/60 border border-neonCyan/20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ minHeight: '88px' }}
          >
            {estaSonando && !sala?.quien_presiono ? (
              <div className="text-center">
                <p
                  className="font-black text-neonCyan leading-none"
                  style={{
                    fontSize: 'clamp(2.8rem, 14vw, 4.5rem)',
                    textShadow: '0 0 20px rgba(0,255,255,0.7), 0 0 40px rgba(0,255,255,0.3)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {String(timerCancion).padStart(2, '0')}
                </p>
                <p className="text-white/30 text-[9px] uppercase tracking-widest">seg</p>
              </div>
            ) : sala?.quien_presiono ? (
              <div className="text-center px-2">
                <img
                  src={jugadorBuzzeado?.profiles?.avatar_url}
                  className="w-10 h-10 rounded-full mx-auto mb-1 border-2 border-neonCyan"
                />
                <p
                  className={`font-black text-3xl leading-none ${timerRespuesta <= 5 ? 'text-red-400' : 'text-neonCyan'}`}
                  style={{ textShadow: timerRespuesta <= 5 ? '0 0 15px rgba(255,60,60,0.8)' : '0 0 15px rgba(0,255,255,0.6)' }}
                >
                  {timerRespuesta}s
                </p>
                <p className="text-white/40 text-[9px] truncate" style={{ maxWidth: '110px' }}>
                  {jugadorBuzzeado?.profiles?.username}
                </p>
              </div>
            ) : (
              <div className="text-center px-3">
                {trackInfo?.image && (
                  <img src={trackInfo.image} className="w-12 h-12 rounded-xl mx-auto mb-1 opacity-40" />
                )}
                <p className="text-white/25 text-xs font-bold">
                  {cargandoCancion ? '⏳ buscando canción...' : esHost ? '▶ presioná siguiente' : 'esperando canción...'}
                </p>
              </div>
            )}
          </div>

          {/* Controles host */}
          {esHost && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={siguienteCancion}
                disabled={cargandoCancion || estaSonando}
                className="w-full py-3 rounded-2xl font-black text-sm bg-neonCyan text-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-neon-cyan"
              >
                {cargandoCancion ? '⏳ Buscando...' : '🎵 SIGUIENTE CANCIÓN'}
              </button>

              {sala.quien_presiono && (
                <div className="flex gap-2">
                  <button onClick={() => resolverBuzzer(true)}
                    className="flex-1 py-2.5 rounded-xl font-black text-sm text-black bg-green-400 active:scale-95 transition-all">
                    ✓ CORRECTO
                  </button>
                  <button onClick={() => resolverBuzzer(false)}
                    className="flex-1 py-2.5 rounded-xl font-black text-sm text-white bg-red-600 active:scale-95 transition-all">
                    ✗ MAL
                  </button>
                </div>
              )}

              {sala.respuesta_correcta && !sala.quien_presiono && (
                <>
                  <button onClick={() => setMostrarRespuesta(v => !v)}
                    className="w-full py-2 rounded-xl text-xs font-black bg-white/10 border border-white/20 active:scale-95 transition-all">
                    {mostrarRespuesta ? '🙈 Ocultar' : '👁 Ver respuesta'}
                  </button>
                  {mostrarRespuesta && (
                    <div className="bg-black/70 border border-yellow-400/40 rounded-xl p-2 text-center">
                      <p className="text-yellow-400 font-black text-xs">{sala.respuesta_correcta}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── BUZZER GRANDE ── */}
          {puedeVerBuzzer && (
            <div className="flex-1 flex items-end pb-1">
              <button
                onClick={handleBuzzer}
                disabled={!estaSonando || !!sala.quien_presiono}
                className="w-full rounded-3xl transition-all duration-100"
                style={{
                  paddingTop:    '1.5rem',
                  paddingBottom: '1.5rem',
                  background: estaSonando && !sala.quien_presiono
                    ? 'linear-gradient(180deg, #ff5555 0%, #cc1111 55%, #991111 100%)'
                    : '#1c1c1c',
                  borderBottom: estaSonando && !sala.quien_presiono
                    ? '7px solid #660000'
                    : '4px solid #111',
                  boxShadow: estaSonando && !sala.quien_presiono
                    ? '0 0 35px rgba(255,30,30,0.55), inset 0 2px 0 rgba(255,160,160,0.25)'
                    : 'none',
                  transform: 'none',
                  cursor: estaSonando && !sala.quien_presiono ? 'pointer' : 'not-allowed',
                }}
                onPointerDown={e => {
                  if (estaSonando && !sala.quien_presiono) {
                    (e.currentTarget as HTMLButtonElement).style.borderBottom = '2px solid #660000';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(5px)';
                  }
                }}
                onPointerUp={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderBottom = estaSonando && !sala.quien_presiono ? '7px solid #660000' : '4px solid #111';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                }}
              >
                <p
                  className="font-black text-3xl uppercase tracking-widest text-center leading-none"
                  style={{
                    color: estaSonando && !sala.quien_presiono ? '#fff' : '#333',
                    textShadow: estaSonando && !sala.quien_presiono
                      ? '0 0 20px rgba(255,200,200,0.9)'
                      : 'none',
                  }}
                >
                  {sala.quien_presiono ? '🔒' : 'BUZZER'}
                </p>
                {estaSonando && !sala.quien_presiono && (
                  <p className="text-center text-sm font-bold mt-1.5"
                    style={{ color: 'rgba(255,200,200,0.6)' }}>
                    JAM!
                  </p>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ────── RIGHT COLUMN ────── */}
        <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: '132px' }}>

          {/* Tabla de jugadores */}
          <div className="bg-black/70 border border-white/10 rounded-2xl p-2 flex flex-col flex-1 overflow-hidden min-h-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 flex-shrink-0">
              PLAYERS
            </p>
            <div className="flex flex-col gap-1 overflow-y-auto flex-1">
              {jugadoresOrden.map((j: any, i: number) => (
                <div
                  key={j.user_id}
                  className={`flex items-center gap-1.5 rounded-lg p-1.5 transition-all flex-shrink-0
                    ${sala.quien_presiono === j.user_id
                      ? 'bg-neonCyan/20 border border-neonCyan/30'
                      : 'bg-white/5'}`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={j.profiles?.avatar_url} className="w-7 h-7 rounded-full" />
                    {i === 0 && jugadoresOrden.length > 1 && (
                      <span className="absolute -top-1.5 -right-1 text-[9px]">👑</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold truncate leading-tight">{j.profiles?.username}</p>
                    <p className="text-neonCyan font-black text-[10px] leading-tight">{j.puntos ?? 0} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div
            className="bg-black/70 border border-white/10 rounded-2xl flex flex-col overflow-hidden flex-shrink-0"
            style={{ height: '148px' }}
            onClick={e => e.stopPropagation()}
          >
            <div ref={chatRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 min-h-0">
              {mensajes.length === 0 && (
                <p className="text-white/20 text-[9px] text-center mt-4">Chat vacío</p>
              )}
              {mensajes.map((m, i) => (
                <div key={i} className="flex items-start gap-1 flex-shrink-0">
                  {m.avatar && (
                    <img src={m.avatar} className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-[9px] leading-snug break-all">
                    <span className="text-neonCyan font-black">{m.user}: </span>
                    <span className="text-white/80">{m.text}</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="flex border-t border-white/10 flex-shrink-0">
              <input
                type="text"
                value={mensajeInput}
                onChange={e => setMensajeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
                placeholder="Escribí..."
                className="flex-1 bg-transparent px-2 py-2 text-[10px] text-white placeholder:text-white/25 focus:outline-none"
                style={{ userSelect: 'text', WebkitUserSelect: 'text', minWidth: 0 }}
              />
              <button
                onClick={e => { e.stopPropagation(); enviarMensaje(); }}
                className="px-2 py-2 text-neonCyan font-black text-sm flex-shrink-0"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER: avatares con puntos ── */}
      <div className="relative z-10 flex gap-2 justify-center flex-wrap px-3 pb-3 flex-shrink-0">
        {jugadoresOrden.map((j: any, i: number) => (
          <div
            key={j.user_id}
            className={`flex flex-col items-center px-2 py-1.5 rounded-xl border transition-all
              ${sala.quien_presiono === j.user_id
                ? 'border-neonCyan bg-neonCyan/20 scale-110'
                : 'border-transparent bg-white/5'}`}
          >
            {i === 0 && jugadoresOrden.length > 1 && (
              <span className="text-yellow-400 text-[8px] leading-none mb-0.5">👑</span>
            )}
            <img src={j.profiles?.avatar_url} className="w-8 h-8 rounded-full" />
            <p className="text-neonCyan font-black text-[10px] mt-0.5">{j.puntos ?? 0}</p>
          </div>
        ))}
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
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'salas',
        filter: `codigo_acceso=eq.${codigo}`,
      }, payload => setSala(payload.new))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sala_jugadores',
      }, () => { if (salaIdRef.current) cargarJugadores(salaIdRef.current); })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [codigo]);

  const empezarJuego = async () => {
    const { error } = await supabase.from('salas').update({ estado: 'jugando' }).eq('id', sala.id);
    if (!error) setSala((prev: any) => ({ ...prev, estado: 'jugando' }));
    else alert('Error al empezar: ' + error.message);
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
    return (
      <SalaEspera
        sala={sala}
        jugadores={jugadores}
        user={user}
        onEmpezar={empezarJuego}
        onSalir={salirDeSala}
      />
    );
  }

  return <PantallaJuego sala={sala} jugadores={jugadores} user={user} codigo={codigo} />;
}

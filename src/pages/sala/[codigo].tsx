import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SILENCE         = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const PUNTOS_TABLA    = [3, 2, 1]; // por orden de respuesta correcta
const TIEMPO_RESPONDER = 20;

const FONDOS: Record<string, string> = {
  Rock:  '/backgrounds/Rock.jpg',
  Pop:   '/backgrounds/pop.jpg',
  '80s': '/backgrounds/80s.jpg',
  '90s': '/backgrounds/90s.jpg',
  Metal: '/backgrounds/Metal.jpg',
  Blues: '/backgrounds/blues.jpg',
};

// ── Bocina (Web Audio) ──────────────────────────────────────────────────────
function bocina() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}

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
  const tematicas = sala.tematica?.split(',') ?? [];
  const miJugador = jugadores.find((j: any) => j.user_id === user?.id);
  const fondo     = FONDOS[tematicas[0]] ?? '/backgrounds/portada.jpg';

  const marcarListo = async () => {
    if (!miJugador) return;
    await supabase.from('sala_jugadores').update({ confirmado: true }).eq('id', miJugador.id);
  };

  const modoLabel: Record<string, string> = {
    opciones: '🎯 Con Opciones',
    texto:    '✏️ Sin Opciones',
    juntada:  '🎉 Juntada',
  };

  return (
    <div className="min-h-screen text-white">
      <Fondo src={fondo} />

      {/* Ghost preview */}
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none select-none opacity-15">
        <div className="w-48 h-48 rounded-full border-8 border-neonPink flex items-center justify-center">
          <div className="text-center">
            <p className="text-neonCyan font-black text-xl italic">¿QUIÉN LA</p>
            <p className="text-neonPink font-black text-xl italic">SABE?</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 w-56 opacity-60">
          {[1,2,3,4].map(i => (
            <div key={i} className="py-3 rounded-xl border border-neonPink/40 text-center text-xs font-black text-white/30">Opción {i}</div>
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-black/80 backdrop-blur-lg rounded-3xl border border-white/10 p-6 flex flex-col gap-4 shadow-2xl">

          <div className="flex justify-between items-start">
            <div>
              <p className="text-neonCyan text-[10px] font-bold uppercase tracking-widest">Código</p>
              <h1 className="text-3xl font-black tracking-widest">{sala.codigo_acceso}</h1>
            </div>
            <button onClick={onSalir}
              className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-all mt-1">
              ← Salir
            </button>
          </div>

          {/* Modo y temáticas */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-neonCyan/20 border border-neonCyan/40 text-neonCyan">
              {modoLabel[sala.modo_juego] ?? sala.modo_juego}
            </span>
            {tematicas.map((t: string) => (
              <span key={t} className="px-3 py-1 rounded-full text-xs font-black bg-neonPink/20 border border-neonPink/40 text-neonPink">{t}</span>
            ))}
          </div>

          {/* Info Juntada */}
          {sala.modo_juego === 'juntada' && (
            <div className="flex gap-3">
              <div className="flex-1 bg-neonPink/10 border border-neonPink/30 rounded-2xl p-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-gray-400">Equipo 1</p>
                <p className="font-black text-neonPink truncate">{sala.equipo1_nombre}</p>
              </div>
              <div className="flex items-center text-white/30 font-black">VS</div>
              <div className="flex-1 bg-neonCyan/10 border border-neonCyan/30 rounded-2xl p-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-gray-400">Equipo 2</p>
                <p className="font-black text-neonCyan truncate">{sala.equipo2_nombre}</p>
              </div>
            </div>
          )}

          <div className="flex gap-6">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Preview</p>
              <p className="font-black">{sala.tiempo_preview ?? 15}s</p>
            </div>
            {sala.modo_juego !== 'juntada' && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Máx</p>
                <p className="font-black">{sala.max_jugadores ?? 5}</p>
              </div>
            )}
          </div>

          {sala.modo_juego !== 'juntada' && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Jugadores ({jugadores.length})</p>
              {jugadores.length === 0 && (
                <p className="text-white/30 text-xs text-center py-2">Compartí el código</p>
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
          )}

          {!esHost && !miJugador?.confirmado && sala.modo_juego !== 'juntada' && (
            <button onClick={marcarListo}
              className="w-full py-4 rounded-2xl font-black text-lg bg-neonCyan text-black hover:scale-105 active:scale-95 transition-all shadow-neon-cyan">
              ✓ ESTOY LISTO
            </button>
          )}
          {esHost && (
            <button onClick={onEmpezar}
              className="w-full py-4 rounded-2xl font-black text-xl bg-neonPink text-white shadow-neon-pink hover:scale-105 active:scale-95 transition-all">
              🎮 EMPEZAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO JUNTADA
// ─────────────────────────────────────────────────────────────────────────────
function ModoJuntada({ sala, user }: any) {
  const esHost = sala.host_id === user?.id;
  const tematicasDisp: string[] = sala.tematica?.split(',') ?? ['Rock'];

  const [fondoActual,     setFondoActual]     = useState('/backgrounds/portada.jpg');
  const [cargando,        setCargando]        = useState(false);
  const [trackInfo,       setTrackInfo]       = useState<any>(null);
  const [fase,            setFase]            = useState<'idle'|'escuchando'|'fin'>('idle');
  const [timerCancion,    setTimerCancion]    = useState(0);
  const [timerJuntada,    setTimerJuntada]    = useState(0);
  const [tiempoConfig,    setTiempoConfig]    = useState(30);
  const [audioOK,         setAudioOK]         = useState(false);
  const [equipo1pts,      setEquipo1pts]      = useState(sala.equipo1_puntos ?? 0);
  const [equipo2pts,      setEquipo2pts]      = useState(sala.equipo2_puntos ?? 0);

  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const timerCancionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerJuntadaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  const desbloquearAudio = async () => {
    if (audioOK || !audioRef.current) return;
    audioRef.current.src = SILENCE;
    await audioRef.current.play().catch(() => {});
    audioRef.current.pause();
    audioRef.current.src = '';
    setAudioOK(true);
  };

  const iniciarTimer = () => {
    clearInterval(timerJuntadaRef.current!);
    let r = tiempoConfig;
    setTimerJuntada(r);
    timerJuntadaRef.current = setInterval(() => {
      r -= 1;
      setTimerJuntada(r);
      if (r <= 0) {
        clearInterval(timerJuntadaRef.current!);
        bocina();
      }
    }, 1000);
  };

  const siguienteCancion = async () => {
    await desbloquearAudio();
    setCargando(true);
    setFase('idle');
    clearInterval(timerCancionRef.current!);
    clearInterval(timerJuntadaRef.current!);
    setTimerJuntada(0);

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

      const audio = audioRef.current!;
      audio.pause();
      audio.src = track.preview_url;
      audio.load();
      audio.play().catch(() => setAudioOK(false));

      const dur = sala.tiempo_preview ?? 15;
      setTimerCancion(dur);
      setFase('escuchando');

      let r = dur;
      timerCancionRef.current = setInterval(() => {
        r -= 1;
        setTimerCancion(r);
        if (r <= 0) {
          clearInterval(timerCancionRef.current!);
          audio.pause();
          setFase('fin');
          iniciarTimer();
        }
      }, 1000);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  const marcarPunto = async (equipo: 1 | 2 | 0) => {
    clearInterval(timerJuntadaRef.current!);
    const e1 = equipo === 1 ? equipo1pts + 1 : equipo1pts;
    const e2 = equipo === 2 ? equipo2pts + 1 : equipo2pts;
    setEquipo1pts(e1);
    setEquipo2pts(e2);
    await supabase.from('salas').update({ equipo1_puntos: e1, equipo2_puntos: e2 }).eq('id', sala.id);
    setFase('idle');
    setTimerJuntada(0);
  };

  return (
    <div className="text-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}
      onClick={desbloquearAudio}>
      <Fondo src={fondoActual} />

      {!audioOK && (
        <button className="fixed top-0 inset-x-0 z-50 bg-neonPink text-black text-center py-3 font-black text-sm"
          onClick={desbloquearAudio}>
          🔊 TAP PARA ACTIVAR AUDIO
        </button>
      )}

      {/* Header */}
      <div className={`relative z-10 flex justify-between items-center px-4 pb-2 flex-shrink-0 ${!audioOK ? 'pt-12' : 'pt-4'}`}>
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,255,0.8))' }}>
          <span className="font-black italic text-transparent bg-clip-text bg-gradient-to-r from-neonPink via-white to-neonCyan"
            style={{ fontSize: 'clamp(0.9rem, 4vw, 1.1rem)' }}>
            ¿QUIÉN LA SABE?
          </span>
        </div>
        <span className="text-yellow-400 text-[10px] font-black uppercase bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30">
          🎉 Juntada
        </span>
      </div>

      {/* Marcador */}
      <div className="relative z-10 flex gap-3 px-4 mb-3 flex-shrink-0">
        <div className="flex-1 bg-neonPink/10 border border-neonPink/40 rounded-2xl p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 truncate">{sala.equipo1_nombre}</p>
          <p className="text-5xl font-black text-neonPink mt-1"
            style={{ textShadow: '0 0 20px rgba(255,0,200,0.6)' }}>{equipo1pts}</p>
        </div>
        <div className="flex items-center text-white/20 font-black text-lg">VS</div>
        <div className="flex-1 bg-neonCyan/10 border border-neonCyan/40 rounded-2xl p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 truncate">{sala.equipo2_nombre}</p>
          <p className="text-5xl font-black text-neonCyan mt-1"
            style={{ textShadow: '0 0 20px rgba(0,255,255,0.6)' }}>{equipo2pts}</p>
        </div>
      </div>

      {/* Centro */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 px-4 min-h-0">

        {/* Álbum art + timer canción */}
        {fase === 'escuchando' && (
          <div className="flex flex-col items-center gap-3">
            {trackInfo?.image && (
              <img src={trackInfo.image} className="w-24 h-24 rounded-2xl shadow-2xl animate-pulse" />
            )}
            <div className="w-20 h-20 rounded-full border-4 border-neonCyan flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(0,255,255,0.4)' }}>
              <p className="font-black text-3xl text-neonCyan"
                style={{ textShadow: '0 0 15px rgba(0,255,255,0.8)' }}>{timerCancion}</p>
            </div>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest animate-pulse">Escuchando...</p>
          </div>
        )}

        {fase === 'idle' && (
          <div className="text-center">
            {trackInfo ? (
              <p className="text-white/20 text-sm font-bold">Canción terminada</p>
            ) : (
              <p className="text-white/20 text-sm font-bold">Presioná siguiente para empezar</p>
            )}
          </div>
        )}

        {/* Timer juntada + acciones */}
        {fase === 'fin' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            {timerJuntada > 0 && (
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all
                ${timerJuntada <= 5 ? 'border-red-500' : 'border-neonPink'}`}
                style={{ boxShadow: timerJuntada <= 5 ? '0 0 20px rgba(255,50,50,0.5)' : '0 0 20px rgba(255,0,200,0.4)' }}>
                <p className={`font-black text-3xl ${timerJuntada <= 5 ? 'text-red-400' : 'text-neonPink'}`}>
                  {timerJuntada}
                </p>
              </div>
            )}
            {timerJuntada === 0 && <p className="text-red-400 font-black text-lg animate-pulse">¡TIEMPO!</p>}

            <p className="text-white/50 text-xs font-bold uppercase">¿Quién acertó?</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => marcarPunto(1)}
                className="flex-1 py-4 rounded-2xl font-black text-sm bg-neonPink/20 border-2 border-neonPink text-neonPink hover:bg-neonPink hover:text-black active:scale-95 transition-all">
                {sala.equipo1_nombre}
              </button>
              <button onClick={() => marcarPunto(2)}
                className="flex-1 py-4 rounded-2xl font-black text-sm bg-neonCyan/20 border-2 border-neonCyan text-neonCyan hover:bg-neonCyan hover:text-black active:scale-95 transition-all">
                {sala.equipo2_nombre}
              </button>
            </div>
            <button onClick={() => marcarPunto(0)}
              className="w-full py-3 rounded-2xl font-black text-sm bg-white/10 border border-white/20 text-white/50 hover:bg-white/20 active:scale-95 transition-all">
              ✗ Nadie acertó
            </button>
          </div>
        )}
      </div>

      {/* Config timer + siguiente */}
      {esHost && (
        <div className="relative z-10 px-4 pb-4 flex flex-col gap-3 flex-shrink-0">
          {fase === 'idle' && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap">Timer:</p>
              {[20, 30, 45, 60].map(t => (
                <button key={t} onClick={() => setTiempoConfig(t)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black border transition-all
                    ${tiempoConfig === t ? 'bg-neonCyan text-black border-neonCyan' : 'border-white/20 text-white/40 hover:border-white/50'}`}>
                  {t}s
                </button>
              ))}
            </div>
          )}
          <button onClick={siguienteCancion} disabled={cargando || fase === 'escuchando'}
            className="w-full py-4 rounded-2xl font-black text-lg bg-neonCyan text-black shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {cargando ? '⏳ Buscando...' : '🎵 SIGUIENTE CANCIÓN'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO (opciones / texto)
// ─────────────────────────────────────────────────────────────────────────────
function PantallaJuego({ sala, jugadores, user, codigo }: any) {
  const esHost         = sala.host_id === user?.id;
  const modoEntrenamiento = jugadores.length === 1;
  const tematicasDisp: string[] = sala.tematica?.split(',') ?? ['Rock'];

  // Audio
  const [audioOK,   setAudioOK]   = useState(false);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const prevUrlRef  = useRef<string | null>(null);

  // Game state
  const [fondoActual,      setFondoActual]      = useState('/backgrounds/portada.jpg');
  const [cargando,         setCargando]         = useState(false);
  const [trackInfo,        setTrackInfo]        = useState<any>(null);
  const [timerCancion,     setTimerCancion]     = useState(0);
  const [timerRespuesta,   setTimerRespuesta]   = useState(0);
  const [miRespuesta,      setMiRespuesta]      = useState('');
  const [miTextoArtista,   setMiTextoArtista]   = useState('');
  const [miTextoCancion,   setMiTextoCancion]   = useState('');
  const [yaRespondio,      setYaRespondio]      = useState(false);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);

  const timerCancionRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRespRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chat
  const [mensajes,     setMensajes]     = useState<{ user: string; text: string; avatar?: string }[]>([]);
  const [mensajeInput, setMensajeInput] = useState('');
  const chatRef  = useRef<HTMLDivElement>(null);
  const canalRef = useRef<any>(null);

  const jugadoresOrden = [...jugadores].sort((a: any, b: any) => (b.puntos ?? 0) - (a.puntos ?? 0));

  // ── Inicializar audio ────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  const desbloquearAudio = async () => {
    if (audioOK || !audioRef.current) return;
    audioRef.current.src = SILENCE;
    await audioRef.current.play().catch(() => {});
    audioRef.current.pause();
    audioRef.current.src = '';
    setAudioOK(true);
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
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

  // ── Reproducir audio ─────────────────────────────────────────────────────
  const reproducir = (url: string, dur: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    clearInterval(timerCancionRef.current!);
    audio.src = url;
    audio.load();
    audio.play().catch(() => setAudioOK(false));
    setTimerCancion(dur);
    let r = dur;
    timerCancionRef.current = setInterval(() => {
      r -= 1; setTimerCancion(r);
      if (r <= 0) {
        clearInterval(timerCancionRef.current!);
        audio.pause();
        // La transición a 'respondiendo' la hace el host via DB
        if (esHost) {
          supabase.from('salas').update({
            fase_actual:  'respondiendo',
            fase_inicio:  Date.now(),
          }).eq('id', sala.id);
        }
      }
    }, 1000);
  };

  // ── Reaccionar a cambios en sala via realtime ────────────────────────────
  // (cancion_actual_url) — para no-host players
  useEffect(() => {
    if (!sala?.cancion_actual_url) {
      audioRef.current?.pause();
      clearInterval(timerCancionRef.current!);
      prevUrlRef.current = null;
      return;
    }
    if (sala.cancion_actual_url === prevUrlRef.current) return;
    prevUrlRef.current = sala.cancion_actual_url;
    reproducir(sala.cancion_actual_url, sala.tiempo_preview ?? 15);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala?.cancion_actual_url]);

  // Cuando empieza fase respondiendo — arrancar timer local
  useEffect(() => {
    clearInterval(timerRespRef.current!);
    if (sala?.fase_actual !== 'respondiendo') return;
    setYaRespondio(false);
    setMiRespuesta('');
    setMiTextoArtista('');
    setMiTextoCancion('');

    let r = TIEMPO_RESPONDER;
    setTimerRespuesta(r);
    timerRespRef.current = setInterval(() => {
      r -= 1; setTimerRespuesta(r);
      if (r <= 0) {
        clearInterval(timerRespRef.current!);
        if (esHost) {
          // Tiempo agotado — pasar a resultado
          calcularResultados();
        }
      }
    }, 1000);
    return () => clearInterval(timerRespRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala?.fase_actual]);

  // Cuando todos respondieron — host pasa a resultado
  useEffect(() => {
    if (sala?.fase_actual !== 'respondiendo' || !esHost) return;
    const respondieron = jugadores.filter((j: any) => j.respuesta_ronda != null);
    if (respondieron.length === jugadores.length && jugadores.length > 0) {
      clearInterval(timerRespRef.current!);
      calcularResultados();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jugadores]);

  const calcularResultados = async () => {
    // Ordenar por orden de respuesta (respondio_en asc), premiamos rapidez
    const correctos = jugadores
      .filter((j: any) => j.respuesta_ronda === sala.respuesta_correcta)
      .sort((a: any, b: any) => (a.respondio_en ?? Infinity) - (b.respondio_en ?? Infinity));

    for (let i = 0; i < correctos.length; i++) {
      const pts = PUNTOS_TABLA[i] ?? 1;
      if (!modoEntrenamiento) {
        await supabase.from('sala_jugadores')
          .update({ puntos: (correctos[i].puntos ?? 0) + pts })
          .eq('id', correctos[i].id);
      }
    }
    // Limpiar respuestas y pasar a resultado
    await supabase.from('sala_jugadores')
      .update({ respuesta_ronda: null, respondio_en: null })
      .eq('sala_id', sala.id);
    await supabase.from('salas')
      .update({ fase_actual: 'resultado', cancion_actual_url: null })
      .eq('id', sala.id);
  };

  const siguienteCancion = async () => {
    await desbloquearAudio();
    setCargando(true);
    setMostrarRespuesta(false);

    await supabase.from('salas').update({
      cancion_actual_url: null, respuesta_correcta: null,
      opciones_actuales: null, fase_actual: null, fase_inicio: null,
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

      // Host reproduce directamente
      prevUrlRef.current = track.preview_url;
      reproducir(track.preview_url, sala.tiempo_preview ?? 15);

      await supabase.from('salas').update({
        cancion_actual_url: track.preview_url,
        respuesta_correcta: track.respuesta,
        opciones_actuales:  JSON.stringify(track.opciones),
        fase_actual:        'escuchando',
      }).eq('id', sala.id);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  const responderOpcion = async (opcion: string) => {
    if (yaRespondio) return;
    setYaRespondio(true);
    setMiRespuesta(opcion);
    await supabase.from('sala_jugadores')
      .update({ respuesta_ronda: opcion, respondio_en: Date.now() })
      .eq('sala_id', sala.id).eq('user_id', user.id);
  };

  const responderTexto = async () => {
    if (yaRespondio) return;
    const resp = `${miTextoCancion.trim()} — ${miTextoArtista.trim()}`;
    setYaRespondio(true);
    setMiRespuesta(resp);
    await supabase.from('sala_jugadores')
      .update({ respuesta_ronda: resp, respondio_en: Date.now() })
      .eq('sala_id', sala.id).eq('user_id', user.id);
  };

  const opciones: string[] = sala?.opciones_actuales
    ? (typeof sala.opciones_actuales === 'string'
        ? JSON.parse(sala.opciones_actuales)
        : sala.opciones_actuales)
    : [];

  const fase = sala?.fase_actual ?? 'idle';

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="text-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}
      onClick={desbloquearAudio}>
      <Fondo src={fondoActual} />

      {!audioOK && (
        <button className="fixed top-0 inset-x-0 z-50 bg-neonPink text-black text-center py-3 font-black text-sm"
          onClick={desbloquearAudio}>
          🔊 TAP AQUÍ PARA ACTIVAR EL AUDIO
        </button>
      )}

      {/* ── HEADER ── */}
      <div className={`relative z-10 flex justify-between items-center px-4 pb-1 flex-shrink-0 ${!audioOK ? 'pt-12' : 'pt-3'}`}>
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,255,0.8))' }}>
          <span className="font-black italic text-transparent bg-clip-text bg-gradient-to-r from-neonPink via-white to-neonCyan"
            style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.05rem)', lineHeight: 1 }}>
            ¿QUIÉN LA SABE?
          </span>
        </div>
        <div className="flex items-center gap-2">
          {modoEntrenamiento && (
            <span className="text-yellow-400 text-[8px] font-black uppercase bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30">⚡ Entrenamiento</span>
          )}
          <span className="text-white/25 text-[9px] font-bold uppercase">{sala.codigo_acceso}</span>
        </div>
      </div>

      {/* ── MAIN: LEFT + RIGHT ── */}
      <div className="relative z-10 flex flex-1 gap-2 px-3 pb-2 overflow-hidden min-h-0">

        {/* LEFT */}
        <div className="flex flex-col flex-1 gap-2 min-w-0 overflow-hidden">

          {/* Display principal */}
          <div className="bg-black/60 border border-neonCyan/20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ minHeight: '96px' }}>
            {fase === 'escuchando' ? (
              <div className="flex flex-col items-center gap-1 py-2">
                {trackInfo?.image && (
                  <img src={trackInfo.image}
                    className="w-12 h-12 rounded-xl shadow-lg mb-1"
                    style={{ animation: 'pulse 1s infinite' }} />
                )}
                <p className="font-black text-neonCyan"
                  style={{
                    fontSize: 'clamp(2.5rem, 12vw, 4rem)',
                    textShadow: '0 0 20px rgba(0,255,255,0.7)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>
                  {String(timerCancion).padStart(2, '0')}
                </p>
                <p className="text-white/30 text-[8px] uppercase tracking-widest">seg</p>
              </div>
            ) : fase === 'respondiendo' ? (
              <div className="flex flex-col items-center gap-1 py-2">
                <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1">Respondé</p>
                <p className={`font-black leading-none ${timerRespuesta <= 5 ? 'text-red-400' : 'text-neonPink'}`}
                  style={{
                    fontSize: 'clamp(2.5rem, 12vw, 4rem)',
                    textShadow: timerRespuesta <= 5 ? '0 0 20px rgba(255,60,60,0.8)' : '0 0 20px rgba(255,0,200,0.5)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>
                  {timerRespuesta}
                </p>
                <p className="text-white/30 text-[8px] uppercase tracking-widest">seg</p>
              </div>
            ) : fase === 'resultado' ? (
              <div className="text-center px-3 py-2">
                <p className="text-yellow-400 font-black text-sm leading-snug">{sala.respuesta_correcta}</p>
                {trackInfo?.image && (
                  <img src={trackInfo.image} className="w-8 h-8 rounded-lg mx-auto mt-1 opacity-60" />
                )}
              </div>
            ) : (
              <p className="text-white/20 text-xs font-bold">
                {cargando ? '⏳ buscando...' : esHost ? '▶ siguiente canción' : 'esperando...'}
              </p>
            )}
          </div>

          {/* Controles host */}
          {esHost && (fase === 'idle' || fase === 'resultado') && (
            <button onClick={siguienteCancion} disabled={cargando}
              className="w-full py-3 rounded-2xl font-black text-sm bg-neonCyan text-black shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 flex-shrink-0">
              {cargando ? '⏳ Buscando...' : '🎵 SIGUIENTE CANCIÓN'}
            </button>
          )}

          {esHost && fase === 'resultado' && sala.respuesta_correcta && (
            <button onClick={() => setMostrarRespuesta(v => !v)}
              className="w-full py-2 rounded-xl text-xs font-black bg-white/10 border border-white/20 active:scale-95 transition-all flex-shrink-0">
              {mostrarRespuesta ? '🙈 Ocultar' : '👁 Ver respuesta'}
            </button>
          )}

          {/* Opciones multiple choice */}
          {fase === 'respondiendo' && sala.modo_juego === 'opciones' && opciones.length > 0 && (
            <div className="grid grid-cols-2 gap-2 flex-1 content-start">
              {opciones.map((op: string, i: number) => {
                const esElegida  = miRespuesta === op;
                const esCorrecta = yaRespondio && op === sala.respuesta_correcta;
                const esMal      = yaRespondio && esElegida && op !== sala.respuesta_correcta;
                return (
                  <button
                    key={i}
                    onClick={() => responderOpcion(op)}
                    disabled={yaRespondio}
                    className={`rounded-2xl p-3 text-xs font-black text-center leading-snug transition-all active:scale-95 border-2
                      ${esCorrecta
                        ? 'bg-green-500/30 border-green-400 text-green-300'
                        : esMal
                        ? 'bg-red-500/30 border-red-500 text-red-300'
                        : esElegida
                        ? 'bg-neonCyan/20 border-neonCyan text-neonCyan'
                        : 'bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-white/30'}`}
                    style={{ minHeight: '56px' }}
                  >
                    {op}
                  </button>
                );
              })}
              {yaRespondio && (
                <div className="col-span-2 text-center py-2">
                  <p className={`font-black text-sm ${miRespuesta === sala.respuesta_correcta ? 'text-green-400' : 'text-red-400'}`}>
                    {miRespuesta === sala.respuesta_correcta ? '✓ ¡CORRECTO!' : '✗ Incorrecto'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Input texto */}
          {fase === 'respondiendo' && sala.modo_juego === 'texto' && (
            <div className="flex flex-col gap-2 flex-shrink-0"
              onClick={e => e.stopPropagation()}>
              {!yaRespondio ? (
                <>
                  <input type="text" value={miTextoCancion}
                    onChange={e => setMiTextoCancion(e.target.value)}
                    placeholder="Nombre de la canción..."
                    className="w-full bg-white/5 border border-neonCyan/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-neonCyan"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  />
                  <input type="text" value={miTextoArtista}
                    onChange={e => setMiTextoArtista(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && responderTexto()}
                    placeholder="Artista..."
                    className="w-full bg-white/5 border border-neonPink/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-neonPink"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  />
                  <button onClick={e => { e.stopPropagation(); responderTexto(); }}
                    disabled={!miTextoCancion.trim() && !miTextoArtista.trim()}
                    className="w-full py-3 rounded-2xl font-black text-sm bg-neonPink text-white shadow-neon-pink active:scale-95 transition-all disabled:opacity-40">
                    ↑ ENVIAR
                  </button>
                </>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-white/50 text-xs">Respondiste:</p>
                  <p className="font-black text-sm text-neonCyan mt-1">{miRespuesta}</p>
                </div>
              )}
            </div>
          )}

          {/* Escuchando — mensaje para jugadores */}
          {fase === 'escuchando' && !esHost && (
            <div className="text-center flex-shrink-0">
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest animate-pulse">
                Escuchá con atención...
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: scores + chat */}
        <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: '132px' }}>

          {/* Scoreboard */}
          <div className="bg-black/70 border border-white/10 rounded-2xl p-2 flex flex-col flex-1 overflow-hidden min-h-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 flex-shrink-0">PLAYERS</p>
            <div className="flex flex-col gap-1 overflow-y-auto flex-1">
              {jugadoresOrden.map((j: any, i: number) => {
                const respondio = j.respuesta_ronda != null;
                return (
                  <div key={j.user_id}
                    className={`flex items-center gap-1.5 rounded-lg p-1.5 transition-all flex-shrink-0
                      ${respondio && fase === 'respondiendo' ? 'bg-neonCyan/15 border border-neonCyan/25' : 'bg-white/5'}`}>
                    <div className="relative flex-shrink-0">
                      <img src={j.profiles?.avatar_url} className="w-7 h-7 rounded-full" />
                      {i === 0 && jugadoresOrden.length > 1 && (
                        <span className="absolute -top-1.5 -right-1 text-[9px]">👑</span>
                      )}
                      {respondio && fase === 'respondiendo' && (
                        <span className="absolute -bottom-0.5 -right-0.5 text-[9px]">✓</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold truncate leading-tight">{j.profiles?.username}</p>
                      <p className="text-neonCyan font-black text-[10px] leading-tight">{j.puntos ?? 0} pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-black/70 border border-white/10 rounded-2xl flex flex-col overflow-hidden flex-shrink-0"
            style={{ height: '140px' }}
            onClick={e => e.stopPropagation()}>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 min-h-0">
              {mensajes.length === 0 && (
                <p className="text-white/20 text-[9px] text-center mt-4">Chat vacío</p>
              )}
              {mensajes.map((m, i) => (
                <div key={i} className="flex items-start gap-1 flex-shrink-0">
                  {m.avatar && <img src={m.avatar} className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" />}
                  <p className="text-[9px] leading-snug break-all">
                    <span className="text-neonCyan font-black">{m.user}: </span>
                    <span className="text-white/80">{m.text}</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="flex border-t border-white/10 flex-shrink-0">
              <input type="text" value={mensajeInput}
                onChange={e => setMensajeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
                placeholder="Escribí..."
                className="flex-1 bg-transparent px-2 py-2 text-[10px] text-white placeholder:text-white/25 focus:outline-none"
                style={{ userSelect: 'text', WebkitUserSelect: 'text', minWidth: 0 }}
              />
              <button onClick={e => { e.stopPropagation(); enviarMensaje(); }}
                className="px-2 py-2 text-neonCyan font-black text-sm flex-shrink-0">↑</button>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER avatares */}
      <div className="relative z-10 flex gap-2 justify-center flex-wrap px-3 pb-3 flex-shrink-0">
        {jugadoresOrden.map((j: any, i: number) => (
          <div key={j.user_id}
            className={`flex flex-col items-center px-2 py-1.5 rounded-xl border transition-all
              ${j.respuesta_ronda && fase === 'respondiendo'
                ? 'border-neonCyan bg-neonCyan/20'
                : 'border-transparent bg-white/5'}`}>
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas', filter: `codigo_acceso=eq.${codigo}` },
        payload => setSala(payload.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_jugadores' },
        () => { if (salaIdRef.current) cargarJugadores(salaIdRef.current); })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [codigo]);

  const empezarJuego = async () => {
    const { error } = await supabase.from('salas').update({ estado: 'jugando' }).eq('id', sala.id);
    if (!error) setSala((prev: any) => ({ ...prev, estado: 'jugando' }));
    else alert('Error: ' + error.message);
  };

  const salirDeSala = async () => {
    const esHost = sala.host_id === user?.id;
    if (esHost) {
      await supabase.from('sala_jugadores').delete().eq('sala_id', sala.id);
      await supabase.from('salas').delete().eq('id', sala.id);
    } else {
      const mio = jugadores.find(j => j.user_id === user?.id);
      if (mio) await supabase.from('sala_jugadores').delete().eq('id', mio.id);
    }
    router.push('/lobby');
  };

  if (!sala) return <div className="bg-darkBg" style={{ height: '100dvh' }} />;

  if (sala.estado === 'esperando') {
    return (
      <SalaEspera sala={sala} jugadores={jugadores} user={user}
        onEmpezar={empezarJuego} onSalir={salirDeSala} />
    );
  }

  if (sala.modo_juego === 'juntada') {
    return <ModoJuntada sala={sala} user={user} />;
  }

  return <PantallaJuego sala={sala} jugadores={jugadores} user={user} codigo={codigo} />;
}

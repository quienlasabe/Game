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

const PLAYER_COLORS = [
  { color: '#ff00ff', glow: 'rgba(255,0,255,0.5)',  conic: 'conic-gradient(from 0deg, #ff00ff, #ff88ff, #ff00ff)' },
  { color: '#00ffff', glow: 'rgba(0,255,255,0.5)',  conic: 'conic-gradient(from 0deg, #00ffff, #88ffff, #00ffff)' },
  { color: '#f3ff00', glow: 'rgba(243,255,0,0.5)',  conic: 'conic-gradient(from 0deg, #f3ff00, #ffee88, #f3ff00)' },
  { color: '#39ff14', glow: 'rgba(57,255,20,0.5)',  conic: 'conic-gradient(from 0deg, #39ff14, #88ff66, #39ff14)' },
  { color: '#ff8800', glow: 'rgba(255,136,0,0.5)',  conic: 'conic-gradient(from 0deg, #ff8800, #ffbb44, #ff8800)' },
];
function playerColor(idx: number) {
  const i = ((idx % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length;
  return PLAYER_COLORS[i];
}
function NeonAvatar({ src, idx, size = 32, gold = false }: { src?: string; idx: number; size?: number; gold?: boolean }) {
  const pc = gold
    ? { conic: 'conic-gradient(from 0deg, #fbbf24, #fff8aa, #fbbf24)', glow: 'rgba(251,191,36,0.7)' }
    : playerColor(idx);
  return (
    <div style={{ background: pc.conic, boxShadow: `0 0 ${gold ? 16 : 8}px ${pc.glow}`, padding: 2, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }}>
      {src ? (
        <img src={src} style={{ width: size, height: size, borderRadius: '50%', display: 'block' }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: '#1a1a2e' }} />
      )}
    </div>
  );
}

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
// SALA DE ESPERA — layout 2 columnas idéntico al mock
// ─────────────────────────────────────────────────────────────────────────────
function SalaEspera({ sala, jugadores, user, onEmpezar, onSalir }: any) {
  const esHost    = sala.host_id === user?.id;
  const tematicas: string[] = sala.tematica?.split(',') ?? [];
  const miJugador = jugadores.find((j: any) => j.user_id === user?.id);
  const fondo     = FONDOS[tematicas[0]] ?? '/backgrounds/portada.jpg';
  const host      = jugadores.find((j: any) => j.user_id === sala.host_id);

  const MODO_LABEL: Record<string, string> = {
    opciones: '🎯 Con Opciones',
    texto:    '✏️ Sin Opciones',
    juntada:  '🎉 Juntada',
  };

  const marcarListo = async () => {
    if (!miJugador) return;
    await supabase.from('sala_jugadores').update({ confirmado: true }).eq('id', miJugador.id);
  };

  /* ── estilos reutilizables ── */
  const panelCls = 'bg-black/65 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex flex-col gap-3';
  const labelCls = 'text-[9px] font-black uppercase tracking-[0.18em] text-white/35';

  return (
    <div className="text-white" style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Fondo src={fondo} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <span className="logo-neon" style={{ fontSize: 'clamp(1rem, 5vw, 1.2rem)' }}>¿Quién la Sabe?</span>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={labelCls}>Sala</p>
            <p className="font-black text-base tracking-widest">{sala.codigo_acceso}</p>
          </div>
          <button onClick={onSalir}
            className="text-white/35 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
            ✕
          </button>
        </div>
      </div>

      {/* Cassette decorativo */}
      <div className="relative z-10 text-center text-3xl flex-shrink-0 py-0.5" style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,255,0.6))' }}>📼</div>

      {/* Body: dos columnas */}
      <div className="relative z-10 flex-1 flex gap-3 px-4 pb-4 overflow-hidden min-h-0">

        {/* ── COLUMNA IZQUIERDA: config de sala ── */}
        <div className={`${panelCls} flex-1 min-w-0 overflow-y-auto`}>
          <p className="font-black text-sm tracking-wide text-white/80">CREAR SALA</p>

          {/* Host */}
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
            <NeonAvatar src={host?.profiles?.avatar_url} idx={jugadores.findIndex((j: any) => j.user_id === sala.host_id)} size={32} />
            <div>
              <p className={labelCls}>Host</p>
              <p className="text-xs font-black">{host?.profiles?.username ?? 'Host'}</p>
            </div>
          </div>

          {/* Modo */}
          <div>
            <p className={labelCls + ' mb-1'}>Modo</p>
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-neonCyan/15 border border-neonCyan/35 text-neonCyan">
              {MODO_LABEL[sala.modo_juego] ?? sala.modo_juego}
            </span>
          </div>

          {/* Juntada teams */}
          {sala.modo_juego === 'juntada' && (
            <div className="flex gap-2">
              <div className="flex-1 bg-neonPink/10 border border-neonPink/25 rounded-xl p-2 text-center">
                <p className={labelCls}>Equipo 1</p>
                <p className="font-black text-xs text-neonPink truncate mt-0.5">{sala.equipo1_nombre}</p>
              </div>
              <div className="flex-1 bg-neonCyan/10 border border-neonCyan/25 rounded-xl p-2 text-center">
                <p className={labelCls}>Equipo 2</p>
                <p className="font-black text-xs text-neonCyan truncate mt-0.5">{sala.equipo2_nombre}</p>
              </div>
            </div>
          )}

          {/* Temáticas */}
          <div>
            <p className={labelCls + ' mb-1.5'}>Temática</p>
            <div className="flex flex-wrap gap-1.5">
              {tematicas.map((t: string) => (
                <span key={t} className="px-2.5 py-1 rounded-full text-[10px] font-black bg-neonPink/15 border border-neonPink/35 text-neonPink">{t}</span>
              ))}
            </div>
          </div>

          {/* Tiempo preview + jugadores */}
          <div className="flex gap-4">
            <div>
              <p className={labelCls}>Tiempo de Preview</p>
              <div className="flex gap-1.5 mt-1.5">
                {[5, 10, 15].map(t => (
                  <span key={t}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black border
                      ${sala.tiempo_preview === t
                        ? 'bg-neonCyan/20 border-neonCyan text-neonCyan'
                        : 'border-white/15 text-white/30'}`}>
                    {t}s
                  </span>
                ))}
              </div>
            </div>
            {sala.modo_juego !== 'juntada' && (
              <div>
                <p className={labelCls}>Jugadores (3-8)</p>
                <p className="font-black text-xl text-white mt-1">{sala.max_jugadores ?? 5}</p>
              </div>
            )}
          </div>

          {/* Botón listo para jugadores no-host */}
          {!esHost && !miJugador?.confirmado && (
            <button onClick={marcarListo}
              className="mt-auto w-full py-3 rounded-2xl font-black text-sm bg-neonCyan text-black hover:brightness-110 active:scale-95 transition-all"
              style={{ boxShadow: '0 0 20px rgba(0,255,255,0.35)' }}>
              ✓ ESTOY LISTO
            </button>
          )}
          {!esHost && miJugador?.confirmado && (
            <div className="mt-auto text-center py-2">
              <span className="text-green-400 text-xs font-black">✓ Listo — esperando al host</span>
            </div>
          )}
        </div>

        {/* ── COLUMNA DERECHA: confirmación de jugadores ── */}
        <div className={`${panelCls} flex-1 min-w-0 overflow-hidden`}>
          {/* Header panel derecho */}
          <div className="flex items-center justify-between flex-shrink-0">
            <p className="font-black text-sm tracking-wide text-white/80">CONFIRMACIÓN<br/>JUGADORES</p>
            {jugadores.some((j: any) => !j.confirmado) === false && jugadores.length > 0 && (
              <span className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/35 rounded-full px-2 py-0.5">
                <span className="text-yellow-400 text-[9px] font-black uppercase">🏆 Primera sangre</span>
              </span>
            )}
          </div>

          {/* Lista de jugadores */}
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
            {jugadores.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/20 text-xs text-center">Compartí el código<br/>
                  <span className="text-neonCyan font-black text-lg tracking-widest">{sala.codigo_acceso}</span>
                </p>
              </div>
            )}
            {jugadores.map((j: any, jIdx: number) => (
              <div key={j.user_id}
                className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5 border border-white/8 flex-shrink-0">
                <div className="relative flex-shrink-0">
                  <NeonAvatar src={j.profiles?.avatar_url} idx={jIdx} size={36} />
                  {sala.host_id === j.user_id && (
                    <span className="absolute -top-1 -right-1 text-[9px] bg-neonCyan text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-black leading-none">H</span>
                  )}
                </div>
                <p className="font-black text-sm flex-1 truncate">{j.profiles?.username}</p>
                {j.confirmado ? (
                  <span className="flex items-center gap-1 bg-green-500/20 border border-green-400/40 rounded-full px-2 py-0.5 flex-shrink-0">
                    <span className="text-green-400 text-[9px] font-black">✓ READY!</span>
                  </span>
                ) : (
                  <span className="border border-white/15 rounded-full px-2 py-0.5 flex-shrink-0">
                    <span className="text-white/25 text-[9px] font-black">pendiente</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* EMPEZAR — solo para el host, en el panel derecho */}
          {esHost && (
            <div className="flex-shrink-0 flex flex-col gap-2 pt-2 border-t border-white/8">
              <button onClick={onEmpezar}
                className="w-full py-3.5 rounded-2xl font-black text-base transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #ff00cc, #cc00ff)',
                  boxShadow: '0 0 25px rgba(255,0,200,0.45)',
                  color: '#fff',
                }}>
                🎮 EMPEZAR
              </button>
              {jugadores.length > 1 && (
                <p className="text-center text-white/25 text-[9px]">Podés empezar sin que todos confirmen</p>
              )}
            </div>
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
        <span className="logo-neon" style={{ fontSize: 'clamp(0.9rem, 4vw, 1.1rem)' }}>¿Quién la Sabe?</span>
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
          <div className="flex flex-col items-center gap-4">
            {/* Timer circular */}
            <div className="flex items-center gap-5">
              {trackInfo?.image && (
                <img src={trackInfo.image} className="w-16 h-16 rounded-2xl shadow-2xl opacity-80" />
              )}
              <div className="w-20 h-20 rounded-full border-4 border-neonCyan flex items-center justify-center"
                style={{ boxShadow: '0 0 20px rgba(0,255,255,0.4)' }}>
                <p className="font-black text-3xl text-neonCyan"
                  style={{ textShadow: '0 0 15px rgba(0,255,255,0.8)' }}>{timerCancion}</p>
              </div>
            </div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">Escuchando...</p>
            {/* BUZZER */}
            <button
              onClick={() => {
                clearInterval(timerCancionRef.current!);
                audioRef.current?.pause();
                setFase('fin');
                iniciarTimer();
              }}
              className="flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 38% 35%, #ff6666, #cc0000, #7a0000)',
                boxShadow: '0 0 35px rgba(255,30,30,0.7), 0 8px 24px rgba(0,0,0,0.6), inset 0 2px 8px rgba(255,160,160,0.25)',
                border: '3px solid rgba(255,100,100,0.45)',
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">BUZZER</span>
              <span className="font-black text-white" style={{ fontSize: '1.5rem', letterSpacing: '0.05em' }}>JAM!</span>
            </button>
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
          <div className="flex gap-2">
            <button onClick={siguienteCancion} disabled={cargando || fase === 'escuchando'}
              className="flex-1 py-4 rounded-2xl font-black text-lg bg-neonCyan text-black shadow-neon-cyan hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {cargando ? '⏳...' : '🎵 SIG. CANCIÓN'}
            </button>
            <button onClick={async () => {
              await supabase.from('salas').update({ estado: 'terminado' }).eq('id', sala.id);
            }}
              className="py-4 px-4 rounded-2xl font-black text-sm active:scale-95 transition-all flex-shrink-0"
              style={{ background: 'rgba(255,50,50,0.15)', border: '1.5px solid rgba(255,80,80,0.35)', color: '#ff8080' }}>
              FIN
            </button>
          </div>
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

  // Ref siempre apunta a la sala actual (evita stale closure en timers)
  const salaRef = useRef<any>(sala);
  useEffect(() => { salaRef.current = sala; }, [sala]);

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
  // Snapshot de jugadores en el momento que terminó la ronda (para mostrar resultados)
  const [resultadosRonda,  setResultadosRonda]  = useState<any[]>([]);

  const timerCancionRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRespRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chat
  const [mensajes,     setMensajes]     = useState<{ user: string; text: string; avatar?: string; colorIdx?: number }[]>([]);
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
    const colorIdx = jugadores.findIndex((j: any) => j.user_id === user?.id);
    canalRef.current.send({ type: 'broadcast', event: 'msg',
      payload: { user: p?.profiles?.username ?? 'Vos', text: t, avatar: p?.profiles?.avatar_url, colorIdx } });
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
        // Usa salaRef.current para evitar stale closure
        if (salaRef.current?.host_id === user?.id) {
          supabase.from('salas').update({
            fase_actual: 'respondiendo',
            fase_inicio: Date.now(),
          }).eq('id', salaRef.current.id);
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
    const currentSala = salaRef.current;
    const currentJugadores = jugadores; // captura local

    // Guardar snapshot para la pantalla de resultados
    setResultadosRonda([...currentJugadores]);

    // Ordenar por velocidad de respuesta correcta
    const correctos = currentJugadores
      .filter((j: any) => j.respuesta_ronda === currentSala.respuesta_correcta)
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
      .eq('sala_id', currentSala.id);
    await supabase.from('salas')
      .update({ fase_actual: 'resultado', cancion_actual_url: null })
      .eq('id', currentSala.id);
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
        opciones_actuales:  track.opciones,   // array directo a jsonb, no JSON.stringify
        fase_actual:        'escuchando',
      }).eq('id', salaRef.current.id);
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

  // opciones_actuales es jsonb — siempre viene como array desde Supabase
  const opciones: string[] = Array.isArray(sala?.opciones_actuales)
    ? sala.opciones_actuales
    : (typeof sala?.opciones_actuales === 'string'
        ? (() => { try { return JSON.parse(sala.opciones_actuales); } catch { return []; } })()
        : []);

  const fase = sala?.fase_actual ?? 'idle';

  // Tiempo de respuesta legible (ms → "2.3s")
  const tiempoResp = (ms: number | null) =>
    ms && sala?.fase_inicio ? `${((ms - sala.fase_inicio) / 1000).toFixed(1)}s` : null;

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="text-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}
      onClick={desbloquearAudio}>
      <Fondo src={fondoActual} />

      {/* Banner audio */}
      {!audioOK && (
        <button className="fixed top-0 inset-x-0 z-50 font-black text-sm text-black text-center py-2.5"
          style={{ background: 'linear-gradient(90deg,#ff00cc,#cc00ff)', boxShadow: '0 2px 20px rgba(255,0,200,0.6)' }}
          onClick={desbloquearAudio}>
          🔊 TAP AQUÍ PARA ACTIVAR EL AUDIO
        </button>
      )}

      {/* ── HEADER ── */}
      <div className={`relative z-10 flex justify-between items-center px-4 flex-shrink-0 ${!audioOK ? 'pt-11 pb-1' : 'pt-3 pb-1'}`}>
        <span className="logo-neon" style={{ fontSize: 'clamp(0.8rem, 3.5vw, 1rem)' }}>¿Quién la Sabe?</span>
        <div className="flex items-center gap-2">
          {modoEntrenamiento && (
            <span className="text-yellow-400 text-[8px] font-black uppercase bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30">⚡ Entr.</span>
          )}
          <span className="text-white/25 text-[9px] font-bold">{sala.codigo_acceso}</span>
        </div>
      </div>

      {/* ── MAIN: SCORES + CENTER + RIGHT ── */}
      <div className="relative z-10 flex flex-1 gap-0 px-2 pb-2 overflow-hidden min-h-0">

        {/* SCORES SIDEBAR */}
        <div className="flex flex-col justify-center gap-2.5 px-1 flex-shrink-0" style={{ width: '50px' }}>
          {jugadoresOrden.map((j: any) => {
            const jIdx = jugadores.findIndex((x: any) => x.user_id === j.user_id);
            const pc = playerColor(jIdx);
            return (
              <div key={j.user_id} className="flex flex-col items-center gap-0.5">
                <NeonAvatar src={j.profiles?.avatar_url} idx={jIdx} size={22} />
                <span style={{ fontWeight: 900, fontSize: '14px', lineHeight: 1, color: pc.color, textShadow: `0 0 6px ${pc.glow}` }}>
                  {j.puntos ?? 0}
                </span>
              </div>
            );
          })}
        </div>

        {/* ──────── CENTER ──────── */}
        <div className="flex flex-col flex-1 gap-2 min-w-0 overflow-hidden px-2">

          {/* Top players */}
          {fase === 'escuchando' && jugadoresOrden.length >= 2 && (
            <div className="flex items-center justify-center gap-4 flex-shrink-0 pt-1">
              {jugadoresOrden.slice(0, 2).map((j: any) => {
                const jIdx = jugadores.findIndex((x: any) => x.user_id === j.user_id);
                const isCurrent = j.user_id === user?.id;
                const pc = playerColor(jIdx);
                return (
                  <div key={j.user_id} className="flex flex-col items-center gap-1">
                    <NeonAvatar src={j.profiles?.avatar_url} idx={jIdx} size={isCurrent ? 46 : 36} />
                    <p className="text-[9px] font-black" style={{ color: isCurrent ? pc.color : 'rgba(255,255,255,0.75)' }}>
                      {j.profiles?.username}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* ▶ Display digital estilo LED */}
          <div className="rounded-2xl flex-shrink-0 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(0,10,20,0.9) 0%, rgba(0,20,10,0.85) 100%)',
              border: '1px solid rgba(0,255,136,0.25)',
              boxShadow: '0 0 30px rgba(0,255,100,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
              minHeight: '100px',
            }}>
            {fase === 'escuchando' ? (
              <div className="flex flex-col items-center justify-center h-full py-3 gap-1">
                {trackInfo?.image && (
                  <img src={trackInfo.image} className="w-10 h-10 rounded-xl shadow-lg mb-1 opacity-80" />
                )}
                <div className="flex items-baseline gap-2">
                  <span style={{
                    fontFamily: '"Orbitron", monospace',
                    fontSize: 'clamp(2.8rem, 14vw, 4.8rem)',
                    fontWeight: 900,
                    color: '#39ff14',
                    textShadow: '0 0 8px #39ff14, 0 0 20px #39ff14, 0 0 40px #39ff14',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}>
                    {String(timerCancion).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: '"Orbitron", monospace',
                    fontWeight: 900,
                    fontSize: 'clamp(1rem, 5vw, 1.6rem)',
                    color: '#39ff14',
                    textShadow: '0 0 10px #39ff14',
                    opacity: 0.8,
                    letterSpacing: '0.1em',
                  }}>
                    SEC
                  </span>
                </div>
                <p className="text-white/20 text-[8px] uppercase tracking-[0.25em]">escuchando</p>
              </div>
            ) : fase === 'respondiendo' ? (
              <div className="flex flex-col items-center justify-center h-full py-3 gap-1">
                <p className="text-white/40 text-[9px] uppercase tracking-[0.2em] mb-0.5">respondé!</p>
                <div className="flex items-baseline gap-2">
                  <span style={{
                    fontFamily: '"Orbitron", monospace',
                    fontSize: 'clamp(2.8rem, 14vw, 4.8rem)',
                    fontWeight: 900,
                    color: timerRespuesta <= 5 ? '#ff4444' : '#ff00cc',
                    textShadow: timerRespuesta <= 5
                      ? '0 0 8px #ff4444, 0 0 20px #ff4444, 0 0 40px #ff4444'
                      : '0 0 8px #ff00cc, 0 0 20px #ff00cc, 0 0 40px #ff00cc',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}>
                    {String(timerRespuesta).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: '"Orbitron", monospace',
                    fontWeight: 900,
                    fontSize: 'clamp(1rem, 5vw, 1.6rem)',
                    color: timerRespuesta <= 5 ? '#ff4444' : '#ff00cc',
                    textShadow: timerRespuesta <= 5 ? '0 0 10px #ff4444' : '0 0 10px #ff00cc',
                    opacity: 0.8,
                    letterSpacing: '0.1em',
                  }}>
                    SEC
                  </span>
                </div>
              </div>
            ) : fase === 'resultado' ? (
              <div className="flex flex-col items-center justify-center h-full py-3 px-3 gap-1.5">
                <p className="text-[8px] uppercase tracking-[0.2em] text-yellow-400/60">era...</p>
                <p className="text-yellow-400 font-black text-sm text-center leading-snug"
                  style={{ textShadow: '0 0 15px rgba(250,200,0,0.5)' }}>
                  {sala.respuesta_correcta}
                </p>
                {trackInfo?.image && (
                  <img src={trackInfo.image} className="w-8 h-8 rounded-lg opacity-50 mt-0.5" />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/15 text-xs font-bold uppercase tracking-widest">
                  {cargando ? '⏳ buscando...' : esHost ? '▶ siguiente' : 'esperando...'}
                </p>
              </div>
            )}
          </div>

          {/* Host: siguiente canción + terminar */}
          {esHost && (fase === 'idle' || fase === 'resultado') && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={siguienteCancion} disabled={cargando}
                className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg,#00ffee,#00ccbb)',
                  color: '#000',
                  boxShadow: cargando ? 'none' : '0 0 20px rgba(0,255,238,0.35)',
                }}>
                {cargando ? '⏳...' : '🎵 SIG.'}
              </button>
              <button onClick={async () => {
                await supabase.from('salas').update({ estado: 'terminado' }).eq('id', sala.id);
              }}
                className="py-3 px-3 rounded-2xl font-black text-xs active:scale-95 transition-all flex-shrink-0"
                style={{ background: 'rgba(255,50,50,0.15)', border: '1.5px solid rgba(255,80,80,0.35)', color: '#ff8080' }}>
                TERMINAR
              </button>
            </div>
          )}

          {/* ── RESULTADOS DE RONDA ── */}
          {fase === 'resultado' && (
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
              {(resultadosRonda.length > 0 ? resultadosRonda : jugadores)
                .sort((a: any, b: any) => {
                  const aOk = a.respuesta_ronda === sala.respuesta_correcta;
                  const bOk = b.respuesta_ronda === sala.respuesta_correcta;
                  if (aOk && !bOk) return -1;
                  if (!aOk && bOk) return 1;
                  return (a.respondio_en ?? Infinity) - (b.respondio_en ?? Infinity);
                })
                .map((j: any) => {
                  const acerto = j.respuesta_ronda === sala.respuesta_correcta;
                  const posCorrectos = (resultadosRonda.length > 0 ? resultadosRonda : jugadores)
                    .filter((x: any) => x.respuesta_ronda === sala.respuesta_correcta)
                    .sort((a: any, b: any) => (a.respondio_en ?? Infinity) - (b.respondio_en ?? Infinity))
                    .findIndex((x: any) => x.user_id === j.user_id);
                  const pts = acerto ? (PUNTOS_TABLA[posCorrectos] ?? 1) : 0;
                  const t   = tiempoResp(j.respondio_en);
                  return (
                    <div key={j.user_id}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 border flex-shrink-0
                        ${acerto ? 'bg-green-500/12 border-green-500/25' : 'bg-white/4 border-white/8'}`}>
                      <img src={j.profiles?.avatar_url} className="w-7 h-7 rounded-full flex-shrink-0" />
                      <p className="text-xs font-bold flex-1 truncate">{j.profiles?.username}</p>
                      {t && <span className="text-white/30 text-[9px]">{t}</span>}
                      {acerto
                        ? <span className="text-green-400 font-black text-xs ml-1">+{pts}</span>
                        : <span className="text-white/20 text-xs ml-1">—</span>}
                    </div>
                  );
                })}
            </div>
          )}

          {/* ── OPCIONES MULTIPLE CHOICE ── */}
          {fase === 'respondiendo' && sala.modo_juego === 'opciones' && opciones.length > 0 && (
            <div className="grid grid-cols-2 gap-2 flex-1 content-start overflow-hidden">
              {opciones.map((op: string, i: number) => {
                const esElegida  = miRespuesta === op;
                const esCorrecta = yaRespondio && op === sala.respuesta_correcta;
                const esMal      = yaRespondio && esElegida && !esCorrecta;
                return (
                  <button key={i} onClick={() => responderOpcion(op)} disabled={yaRespondio}
                    className="rounded-2xl text-xs font-black text-center leading-snug transition-all active:scale-95 flex items-center justify-center"
                    style={{
                      minHeight: '54px',
                      padding: '0.6rem',
                      border: `2px solid ${esCorrecta ? '#4ade80' : esMal ? '#f87171' : esElegida ? '#00ffee' : 'rgba(255,255,255,0.12)'}`,
                      background: esCorrecta ? 'rgba(74,222,128,0.18)'
                        : esMal ? 'rgba(248,113,113,0.18)'
                        : esElegida ? 'rgba(0,255,238,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      color: esCorrecta ? '#86efac' : esMal ? '#fca5a5' : esElegida ? '#00ffee' : '#fff',
                      boxShadow: esElegida && !yaRespondio ? '0 0 12px rgba(0,255,238,0.3)' : 'none',
                    }}>
                    {op}
                  </button>
                );
              })}
              {yaRespondio && (
                <div className="col-span-2 text-center py-1 flex-shrink-0">
                  <p className={`font-black text-sm ${miRespuesta === sala.respuesta_correcta ? 'text-green-400' : 'text-red-400'}`}>
                    {miRespuesta === sala.respuesta_correcta ? '✓ ¡CORRECTO!' : '✗ Incorrecto'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── INPUT TEXTO ── */}
          {fase === 'respondiendo' && sala.modo_juego === 'texto' && (
            <div className="flex flex-col gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {!yaRespondio ? (
                <>
                  <input type="text" value={miTextoCancion}
                    onChange={e => setMiTextoCancion(e.target.value)}
                    placeholder="Canción..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
                    style={{ background: 'rgba(0,255,238,0.07)', border: '1.5px solid rgba(0,255,238,0.3)',
                      userSelect: 'text', WebkitUserSelect: 'text' }}
                  />
                  <input type="text" value={miTextoArtista}
                    onChange={e => setMiTextoArtista(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && responderTexto()}
                    placeholder="Artista..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
                    style={{ background: 'rgba(255,0,200,0.07)', border: '1.5px solid rgba(255,0,200,0.3)',
                      userSelect: 'text', WebkitUserSelect: 'text' }}
                  />
                  <button onClick={e => { e.stopPropagation(); responderTexto(); }}
                    disabled={!miTextoCancion.trim() && !miTextoArtista.trim()}
                    className="w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#ff00cc,#cc00ff)',
                      color: '#fff', boxShadow: '0 0 20px rgba(255,0,200,0.4)' }}>
                    ↑ ENVIAR
                  </button>
                </>
              ) : (
                <div className="rounded-xl p-3 text-center border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-white/40 text-[9px] uppercase tracking-widest">Respondiste</p>
                  <p className="font-black text-sm text-neonCyan mt-0.5">{miRespuesta}</p>
                </div>
              )}
            </div>
          )}

          {fase === 'escuchando' && !esHost && (
            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest text-center flex-shrink-0">
              Escuchá con atención...
            </p>
          )}
        </div>

        {/* ──────── RIGHT ──────── */}
        <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: '128px' }}>

          {/* PLAYERS — tabla con tiempos como en el mock */}
          <div className="rounded-2xl p-2 flex flex-col flex-1 overflow-hidden min-h-0"
            style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-1.5 flex-shrink-0">
              PLAYERS
            </p>
            <div className="flex flex-col gap-1 overflow-y-auto flex-1">
              {jugadoresOrden.map((j: any, i: number) => {
                const respondio = j.respuesta_ronda != null;
                const t = fase === 'resultado' ? tiempoResp(j.respondio_en) : null;
                return (
                  <div key={j.user_id}
                    className="flex items-center gap-1.5 rounded-lg p-1.5 flex-shrink-0 transition-all"
                    style={{
                      background: respondio && fase === 'respondiendo'
                        ? 'rgba(0,255,238,0.1)' : 'rgba(255,255,255,0.04)',
                      border: respondio && fase === 'respondiendo'
                        ? '1px solid rgba(0,255,238,0.2)' : '1px solid transparent',
                    }}>
                    <div className="relative flex-shrink-0">
                      <NeonAvatar src={j.profiles?.avatar_url} idx={jugadores.findIndex((x: any) => x.user_id === j.user_id)} size={20} />
                      {i === 0 && jugadoresOrden.length > 1 && (
                        <span className="absolute -top-1.5 -right-1 text-[9px]">👑</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold truncate leading-tight">{j.profiles?.username}</p>
                      <p className="font-black text-[10px] leading-tight" style={{ color: '#00ffee' }}>
                        {j.puntos ?? 0} pts
                      </p>
                    </div>
                    {t && <span className="text-white/35 text-[8px] flex-shrink-0">{t}</span>}
                    {respondio && fase === 'respondiendo' && !t && (
                      <span className="text-[9px] flex-shrink-0" style={{ color: '#00ffee' }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Tiempo promedio */}
            {fase === 'resultado' && resultadosRonda.length > 0 && (() => {
              const tiempos = resultadosRonda
                .filter((j: any) => j.respondio_en && sala?.fase_inicio)
                .map((j: any) => (j.respondio_en - sala.fase_inicio) / 1000);
              if (!tiempos.length) return null;
              const avg = (tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length).toFixed(1);
              return (
                <div className="flex-shrink-0 border-t border-white/8 pt-1.5 mt-1">
                  <p className="text-[8px] text-white/25 uppercase tracking-wider">Tiempo Promedio</p>
                  <p className="text-white/50 font-black text-[10px]">{avg}s</p>
                </div>
              );
            })()}
          </div>

          {/* CHAT */}
          <div className="rounded-2xl flex flex-col overflow-hidden flex-shrink-0"
            style={{ height: '136px', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 min-h-0">
              {mensajes.length === 0 && (
                <p className="text-white/15 text-[9px] text-center mt-4">Chat</p>
              )}
              {mensajes.map((m, i) => (
                <div key={i} className="flex items-start gap-1 flex-shrink-0">
                  {m.avatar && <NeonAvatar src={m.avatar} idx={m.colorIdx ?? 0} size={14} />}
                  <p className="text-[9px] leading-snug break-all">
                    <span className="font-black" style={{ color: '#00ffee' }}>{m.user}: </span>
                    <span className="text-white/75">{m.text}</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <input type="text" value={mensajeInput}
                onChange={e => setMensajeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-2 py-1.5 text-[9px] text-white placeholder:text-white/20 focus:outline-none"
                style={{ userSelect: 'text', WebkitUserSelect: 'text', minWidth: 0 }}
              />
              <button onClick={e => { e.stopPropagation(); enviarMensaje(); }}
                className="px-2 py-1.5 font-black text-sm flex-shrink-0"
                style={{ color: '#00ffee' }}>↑</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA FINAL — estadísticas post-partida
// ─────────────────────────────────────────────────────────────────────────────
function PantallaFinal({ sala, jugadores, user, onFinalizar }: any) {
  const tematicas: string[] = sala.tematica?.split(',') ?? [];
  const fondo = FONDOS[tematicas[0]] ?? '/backgrounds/portada.jpg';
  const ranking = [...jugadores].sort((a: any, b: any) => (b.puntos ?? 0) - (a.puntos ?? 0));
  const yo = ranking.find((j: any) => j.user_id === user?.id);
  const miPos = ranking.findIndex((j: any) => j.user_id === user?.id) + 1;
  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="text-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <Fondo src={fondo} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <span className="logo-neon" style={{ fontSize: 'clamp(0.9rem, 4vw, 1.1rem)' }}>¿Quién la Sabe?</span>
        <span className="text-yellow-400 text-[10px] font-black bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30">
          FIN
        </span>
      </div>

      {/* Body */}
      <div className="relative z-10 flex-1 flex gap-3 px-4 pb-4 overflow-hidden min-h-0">

        {/* LEFT: Podio visual */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Podio */}
          <div className="rounded-2xl p-4 flex-1 flex flex-col justify-end min-h-0"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-3 flex-shrink-0">Podio</p>
            {/* Avatares sobre las plataformas */}
            <div className="flex items-end justify-center gap-2 mb-0">
              {/* 2do */}
              {ranking[1] && (
                <div className="flex flex-col items-center" style={{ flex: 1 }}>
                  <NeonAvatar src={ranking[1].profiles?.avatar_url} idx={jugadores.findIndex((x: any) => x.user_id === ranking[1].user_id)} size={36} />
                  <p className="text-[9px] font-black text-white/70 truncate w-full text-center">
                    {ranking[1].profiles?.username}
                  </p>
                  <p className="font-black text-xs mb-1" style={{ color: '#d1d5db' }}>{ranking[1].puntos ?? 0}</p>
                  <div className="w-full rounded-t-xl flex items-start justify-center pt-2"
                    style={{
                      height: '60px',
                      background: 'linear-gradient(180deg, rgba(209,213,219,0.25), rgba(209,213,219,0.1))',
                      border: '1px solid rgba(209,213,219,0.35)',
                      boxShadow: '0 0 12px rgba(209,213,219,0.2)',
                    }}>
                    <span className="font-black text-xl" style={{ color: '#d1d5db' }}>2</span>
                  </div>
                </div>
              )}
              {/* 1ro */}
              {ranking[0] && (
                <div className="flex flex-col items-center" style={{ flex: 1 }}>
                  <span className="text-base mb-0.5">👑</span>
                  <NeonAvatar src={ranking[0].profiles?.avatar_url} idx={jugadores.findIndex((x: any) => x.user_id === ranking[0].user_id)} size={44} gold />
                  <p className="text-[9px] font-black text-white/80 truncate w-full text-center">
                    {ranking[0].profiles?.username}
                  </p>
                  <p className="font-black text-sm mb-1" style={{ color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.6)' }}>
                    {ranking[0].puntos ?? 0}
                  </p>
                  <div className="w-full rounded-t-xl flex items-start justify-center pt-2"
                    style={{
                      height: '90px',
                      background: 'linear-gradient(180deg, rgba(251,191,36,0.3), rgba(251,191,36,0.1))',
                      border: '1px solid rgba(251,191,36,0.5)',
                      boxShadow: '0 0 20px rgba(251,191,36,0.3)',
                    }}>
                    <span className="font-black text-2xl" style={{ color: '#fbbf24' }}>1</span>
                  </div>
                </div>
              )}
              {/* 3ro */}
              {ranking[2] && (
                <div className="flex flex-col items-center" style={{ flex: 1 }}>
                  <NeonAvatar src={ranking[2].profiles?.avatar_url} idx={jugadores.findIndex((x: any) => x.user_id === ranking[2].user_id)} size={36} />
                  <p className="text-[9px] font-black text-white/60 truncate w-full text-center">
                    {ranking[2].profiles?.username}
                  </p>
                  <p className="font-black text-xs mb-1" style={{ color: '#cd7c2e' }}>{ranking[2].puntos ?? 0}</p>
                  <div className="w-full rounded-t-xl flex items-start justify-center pt-2"
                    style={{
                      height: '40px',
                      background: 'linear-gradient(180deg, rgba(205,124,46,0.25), rgba(205,124,46,0.1))',
                      border: '1px solid rgba(205,124,46,0.35)',
                      boxShadow: '0 0 12px rgba(205,124,46,0.2)',
                    }}>
                    <span className="font-black text-xl" style={{ color: '#cd7c2e' }}>3</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats post-partida */}
          <div className="rounded-2xl p-3 flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2">Estadísticas Post-Partida</p>
            <div className="flex flex-col gap-1.5">
              {yo && (
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-[10px]">Tu posición</p>
                  <p className="font-black text-xs" style={{ color: miPos <= 3 ? '#fbbf24' : '#00ffee' }}>
                    {MEDAL[miPos - 1] ?? `#${miPos}`} · {yo.puntos ?? 0} pts
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-[10px]">Temática</p>
                <p className="font-black text-[10px]" style={{ color: '#00ffee' }}>{tematicas.join(', ')}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-[10px]">Modo</p>
                <p className="font-black text-[10px]" style={{ color: '#ff00ff' }} >{sala.modo_juego}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-[10px]">Jugadores</p>
                <p className="font-black text-[10px] text-white">{jugadores.length}</p>
              </div>
            </div>
            {/* Badges de temáticas */}
            <div className="mt-3">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25 mb-2">Total Playoff Badges</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'Rock',  icon: '🎸' },
                  { key: 'Pop',   icon: '🎤' },
                  { key: '80s',   icon: '🕹️' },
                  { key: '90s',   icon: '📼' },
                  { key: 'Metal', icon: '🤘' },
                  { key: 'Blues', icon: '🎷' },
                ].map(({ key, icon }) => (
                  <div key={key}
                    className="flex flex-col items-center gap-0.5"
                    style={{ opacity: tematicas.includes(key) ? 1 : 0.25 }}>
                    <span className="text-xl">{icon}</span>
                    <span className="text-[8px] text-white/50 font-bold">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: ranking completo + finalizar */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="rounded-2xl p-3 flex flex-col flex-1 overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2 flex-shrink-0">Ranking Final</p>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
              {ranking.map((j: any, i: number) => (
                <div key={j.user_id}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border flex-shrink-0 ${j.user_id === user?.id ? 'border-neonCyan/30' : 'border-white/8'}`}
                  style={{ background: i === 0 ? 'rgba(251,191,36,0.12)' : i === 1 ? 'rgba(209,213,219,0.08)' : i === 2 ? 'rgba(205,124,46,0.08)' : 'rgba(255,255,255,0.04)' }}>
                  <span className="text-base flex-shrink-0 w-5 text-center">
                    {i < 3 ? MEDAL[i] : <span className="text-white/25 text-xs font-black">#{i + 1}</span>}
                  </span>
                  <NeonAvatar src={j.profiles?.avatar_url} idx={jugadores.findIndex((x: any) => x.user_id === j.user_id)} size={30} gold={i === 0} />
                  <p className="font-black text-sm flex-1 truncate">{j.profiles?.username}</p>
                  <p className="font-black text-sm flex-shrink-0" style={{ color: '#00ffee' }}>{j.puntos ?? 0}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onFinalizar}
            className="w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-all flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#ff00cc,#cc00ff)',
              color: '#fff',
              boxShadow: '0 0 25px rgba(255,0,200,0.5)',
            }}>
            🏁 FINALIZAR
          </button>
        </div>
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
  const salaIdRef        = useRef<string | null>(null);
  const subJugadoresRef  = useRef<any>(null);

  const cargarJugadores = async (salaId: string) => {
    const { data } = await supabase.from('sala_jugadores')
      .select('*, profiles(username, avatar_url)').eq('sala_id', salaId);
    if (data) setJugadores(data);
  };

  useEffect(() => {
    if (!codigo) return;
    const cargar = async () => {
      const { data } = await supabase.from('salas').select('*').eq('codigo_acceso', codigo).single();
      if (!data) return;
      setSala(data);
      salaIdRef.current = data.id;
      cargarJugadores(data.id);

      // Suscripción filtrada por sala_id — se configura DESPUÉS de tener el ID
      const subJugadores = supabase.channel(`jugadores:${data.id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'sala_jugadores',
          filter: `sala_id=eq.${data.id}`,
        }, () => cargarJugadores(data.id))
        .subscribe();

      // Guardar ref para cleanup
      subJugadoresRef.current = subJugadores;
    };
    cargar();

    const canal = supabase.channel(`sala:${codigo}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'salas',
        filter: `codigo_acceso=eq.${codigo}`,
      }, payload => setSala(payload.new))
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
      if (subJugadoresRef.current) supabase.removeChannel(subJugadoresRef.current);
    };
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

  if (sala.estado === 'terminado') {
    return (
      <PantallaFinal sala={sala} jugadores={jugadores} user={user}
        onFinalizar={() => router.push('/lobby')} />
    );
  }

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

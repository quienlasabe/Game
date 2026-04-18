import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

const TEMATICAS = ['Rock', 'Pop', '80s', '90s', 'Metal', 'Blues'];
const MODOS = [
  { id: 'opciones', icon: '🎯', label: 'Con Opciones', desc: 'Multiple choice, 4 pistas' },
  { id: 'texto',    icon: '✏️', label: 'Sin Opciones', desc: 'Escribís artista y canción' },
  { id: 'juntada',  icon: '🎉', label: 'Modo Juntada', desc: 'Un cel, dos equipos, el host decide' },
];

export default function Lobby({ session, user }: { session: any; user: any }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [stats,  setStats]  = useState({ jugadores: 0, activas: 0, disponibles: 0 });
  const [codigoSala, setCodigoSala] = useState('');
  const [creando,   setCreando]   = useState(false);
  const [uniendose, setUniendose] = useState(false);
  const [expandConfig, setExpandConfig] = useState(false);

  // Config sala
  const [tematicas,     setTematicas]     = useState<string[]>(['Rock']);
  const [maxJugadores,  setMaxJugadores]  = useState(5);
  const [tiempoPreview, setTiempoPreview] = useState(15);
  const [modoJuego,     setModoJuego]     = useState('opciones');
  const [equipo1,       setEquipo1]       = useState('Equipo 1');
  const [equipo2,       setEquipo2]       = useState('Equipo 2');

  useEffect(() => {
    if (!session) { router.push('/'); return; }
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setPerfil(data));
    cargarStats();
  }, [session, user, router]);

  const cargarStats = async () => {
    const { data: salas } = await supabase.from('salas').select('estado');
    const { data: jugs }  = await supabase.from('sala_jugadores').select('id');
    const activas    = (salas ?? []).filter(s => s.estado === 'jugando').length;
    const disponibles = (salas ?? []).filter(s => s.estado === 'esperando').length;
    setStats({ jugadores: jugs?.length ?? 0, activas, disponibles });
  };

  const toggleTematica = (t: string) =>
    setTematicas(prev =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter(x => x !== t) : prev) : [...prev, t]
    );

  const crearSala = async () => {
    setCreando(true);
    const codigo = Math.random().toString(36).substring(2, 7).toUpperCase();
    const { data, error } = await supabase.from('salas').insert([{
      host_id:        user.id,
      codigo_acceso:  codigo,
      estado:         'esperando',
      tematica:       tematicas.join(','),
      max_jugadores:  maxJugadores,
      tiempo_preview: tiempoPreview,
      modo_juego:     modoJuego,
      equipo1_nombre: equipo1 || 'Equipo 1',
      equipo2_nombre: equipo2 || 'Equipo 2',
    }]).select().single();
    if (error) { alert('Error al crear sala'); setCreando(false); return; }
    await supabase.from('sala_jugadores').insert([{ sala_id: data.id, user_id: user.id, confirmado: true }]);
    router.push(`/sala/${codigo}`);
  };

  const unirseASala = async () => {
    if (!codigoSala) return;
    setUniendose(true);
    const { data } = await supabase.from('salas').select('id').eq('codigo_acceso', codigoSala).single();
    if (!data) { alert('Sala no encontrada'); setUniendose(false); return; }
    await supabase.from('sala_jugadores')
      .upsert([{ sala_id: data.id, user_id: user.id, confirmado: false }], { onConflict: 'sala_id,user_id' });
    router.push(`/sala/${codigoSala}`);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!perfil) return <div className="bg-darkBg min-h-screen" />;

  return (
    <main className="min-h-screen text-white flex flex-col items-center"
      style={{
        backgroundImage: "linear-gradient(rgba(8,8,18,0.94), rgba(8,8,18,0.97)), url('/backgrounds/portada.jpg')",
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
      }}>

      {/* ── HEADER ── */}
      <header className="w-full max-w-2xl flex items-center justify-between px-5 pt-6 pb-2">
        {/* Logo */}
        <div style={{ filter: 'drop-shadow(0 0 16px rgba(255,0,255,0.8)) drop-shadow(0 0 32px rgba(0,255,255,0.4))' }}>
          <span className="title-qls text-transparent bg-clip-text bg-gradient-to-r from-neonPink via-white to-neonCyan"
            style={{ fontSize: 'clamp(1.2rem, 5vw, 1.6rem)', lineHeight: 1 }}>
            ¿Quién la Sabe?
          </span>
        </div>
        {/* Perfil chip */}
        <button onClick={cerrarSesion}
          className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-1 pr-3 py-1 hover:bg-white/10 transition-all">
          <img src={perfil.avatar_url} className="w-7 h-7 rounded-full border border-neonCyan/40" />
          <span className="text-xs font-black">{perfil.username}</span>
          <span className="text-white/25 text-[9px]">✕</span>
        </button>
      </header>

      <div className="w-full max-w-2xl px-5 flex flex-col gap-5 pb-10">

        {/* ── STATS ── */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { label: 'Jugando ahora', value: stats.jugadores, color: '#00ffff' },
            { label: 'Salas activas',  value: stats.activas,   color: '#ff00ff' },
            { label: 'Disponibles',    value: stats.disponibles, color: '#39ff14' },
          ].map(s => (
            <div key={s.label}
              className="rounded-2xl p-3 text-center border border-white/8"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="font-black text-2xl leading-none" style={{ color: s.color, textShadow: `0 0 12px ${s.color}` }}>
                {s.value}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-white/35 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── CREAR SALA ── */}
        <div className="rounded-3xl border overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(0,255,255,0.2)' }}>

          {/* Header crear */}
          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-all"
            onClick={() => setExpandConfig(v => !v)}>
            <div className="flex items-center gap-3">
              <span className="text-xl">🎸</span>
              <span className="font-black text-base tracking-tight" style={{ color: '#00ffff' }}>CREAR SALA</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                {MODOS.find(m => m.id === modoJuego)?.label}
              </span>
              <span className="text-white/30 text-sm">{expandConfig ? '▲' : '▼'}</span>
            </div>
          </button>

          {expandConfig && (
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-white/8">

              {/* Modo */}
              <div className="pt-4">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2">Modo de juego</p>
                <div className="flex flex-col gap-1.5">
                  {MODOS.map(m => (
                    <button key={m.id} onClick={() => setModoJuego(m.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all"
                      style={{
                        background: modoJuego === m.id ? 'rgba(0,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                        borderColor: modoJuego === m.id ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.08)',
                      }}>
                      <span className="text-base flex-shrink-0">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xs" style={{ color: modoJuego === m.id ? '#00ffff' : 'rgba(255,255,255,0.7)' }}>
                          {m.label}
                        </p>
                        <p className="text-[9px] text-white/30 leading-tight">{m.desc}</p>
                      </div>
                      {modoJuego === m.id && <span className="text-[10px] font-black flex-shrink-0" style={{ color: '#00ffff' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipos Juntada */}
              {modoJuego === 'juntada' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-1.5">Equipo 1</p>
                    <input type="text" value={equipo1} onChange={e => setEquipo1(e.target.value)} maxLength={16}
                      placeholder="Equipo 1"
                      className="w-full rounded-xl px-3 py-2 text-sm font-black focus:outline-none"
                      style={{ background: 'rgba(255,0,255,0.07)', border: '1.5px solid rgba(255,0,255,0.3)', color: '#ff00ff' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-1.5">Equipo 2</p>
                    <input type="text" value={equipo2} onChange={e => setEquipo2(e.target.value)} maxLength={16}
                      placeholder="Equipo 2"
                      className="w-full rounded-xl px-3 py-2 text-sm font-black focus:outline-none"
                      style={{ background: 'rgba(0,255,255,0.07)', border: '1.5px solid rgba(0,255,255,0.3)', color: '#00ffff' }} />
                  </div>
                </div>
              )}

              {/* Temática */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2">Temática</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMATICAS.map(t => (
                    <button key={t} onClick={() => toggleTematica(t)}
                      className="px-3 py-1 rounded-full text-[10px] font-black border transition-all"
                      style={{
                        background: tematicas.includes(t) ? '#ff00ff' : 'transparent',
                        borderColor: tematicas.includes(t) ? '#ff00ff' : 'rgba(255,255,255,0.15)',
                        color: tematicas.includes(t) ? '#000' : 'rgba(255,255,255,0.45)',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Jugadores */}
                {modoJuego !== 'juntada' && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2">
                      Jugadores: <span className="text-white">{maxJugadores}</span>
                    </p>
                    <input type="range" min={2} max={8} value={maxJugadores}
                      onChange={e => setMaxJugadores(+e.target.value)}
                      className="w-full accent-cyan-400" />
                    <div className="flex justify-between text-[9px] text-white/20 mt-0.5"><span>2</span><span>8</span></div>
                  </div>
                )}

                {/* Preview */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2">Preview</p>
                  <div className="flex gap-1.5">
                    {[5, 10, 15].map(t => (
                      <button key={t} onClick={() => setTiempoPreview(t)}
                        className="flex-1 py-1.5 rounded-xl text-[10px] font-black border transition-all"
                        style={{
                          background: tiempoPreview === t ? '#00ffff' : 'transparent',
                          borderColor: tiempoPreview === t ? '#00ffff' : 'rgba(255,255,255,0.15)',
                          color: tiempoPreview === t ? '#000' : 'rgba(255,255,255,0.4)',
                        }}>
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-5 pb-5">
            <button onClick={crearSala} disabled={creando}
              className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #00ffff, #00ccee)',
                color: '#000',
                boxShadow: '0 0 25px rgba(0,255,255,0.35)',
              }}>
              {creando ? 'Creando...' : expandConfig ? '🎮 CREAR SALA' : '🎮 CREAR SALA →'}
            </button>
          </div>
        </div>

        {/* ── UNIRSE ── */}
        <div className="rounded-3xl border p-5 flex flex-col gap-4"
          style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,0,255,0.2)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">🎟️</span>
            <span className="font-black text-base tracking-tight" style={{ color: '#ff00ff' }}>UNIRSE A PARTIDA</span>
          </div>
          <input
            type="text"
            placeholder="Código de sala"
            value={codigoSala}
            onChange={e => setCodigoSala(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full text-center text-3xl font-black tracking-[0.3em] focus:outline-none rounded-2xl py-3"
            style={{
              background: 'rgba(255,0,255,0.06)',
              border: '2px solid rgba(255,0,255,0.3)',
              color: '#ff00ff',
            }}
          />
          <button onClick={unirseASala} disabled={uniendose || !codigoSala}
            className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #ff00ff, #cc00cc)',
              color: '#fff',
              boxShadow: '0 0 25px rgba(255,0,255,0.35)',
            }}>
            {uniendose ? 'Uniéndose...' : 'UNIRSE'}
          </button>
        </div>

      </div>
    </main>
  );
}

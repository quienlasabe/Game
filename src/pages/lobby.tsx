import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

const TEMATICAS = ['Rock', 'Pop', '80s', '90s', 'Metal', 'Blues'];

export default function Lobby({ session, user }: { session: any; user: any }) {
  const router = useRouter();
  const [perfil, setPerfil]             = useState<any>(null);
  const [codigoSala, setCodigoSala]     = useState('');
  const [creando, setCreando]           = useState(false);
  const [uniendose, setUniendose]       = useState(false);

  // Config crear sala
  const [tematicasSeleccionadas, setTematicasSeleccionadas] = useState<string[]>(['Rock']);
  const [maxJugadores, setMaxJugadores] = useState(5);
  const [tiempoPreview, setTiempoPreview] = useState(15);

  useEffect(() => {
    if (!session) { router.push('/'); return; }
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setPerfil(data));
  }, [session, user, router]);

  const toggleTematica = (t: string) => {
    setTematicasSeleccionadas(prev =>
      prev.includes(t)
        ? prev.length > 1 ? prev.filter(x => x !== t) : prev   // mínimo 1
        : [...prev, t]
    );
  };

  const crearSala = async () => {
    setCreando(true);
    const codigo = Math.random().toString(36).substring(2, 7).toUpperCase();
    const { data, error } = await supabase.from('salas').insert([{
      host_id:       user.id,
      codigo_acceso: codigo,
      estado:        'esperando',
      tematica:      tematicasSeleccionadas.join(','),
      max_jugadores: maxJugadores,
      tiempo_preview: tiempoPreview,
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

  if (!perfil) return <div className="bg-darkBg min-h-screen" />;

  return (
    <main
      className="min-h-screen bg-darkBg text-white flex flex-col items-center p-6 md:p-10"
      style={{ backgroundImage: "linear-gradient(rgba(10,10,10,0.9), rgba(10,10,10,0.9)), url('/backgrounds/portada.jpg')", backgroundSize: 'cover' }}
    >
      <div className="w-full max-w-4xl flex flex-col gap-8">

        {/* Perfil */}
        <div className="flex justify-between items-center bg-white/5 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <img src={perfil.avatar_url} className="w-14 h-14 rounded-full border-2 border-neonCyan" />
            <div>
              <h2 className="text-xl font-black italic">{perfil.username}</h2>
              <p className="text-neonCyan text-[10px] font-bold uppercase tracking-widest">Rango: {perfil.rango}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Victorias</p>
            <p className="text-4xl font-black text-neonPink">{perfil.partidas_ganadas ?? 0}</p>
          </div>
        </div>

        {/* Dos columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── CREAR SALA ── */}
          <div className="bg-white/5 rounded-3xl border border-neonCyan/30 p-6 flex flex-col gap-5 backdrop-blur-sm">
            <h3 className="text-xl font-black italic text-neonCyan tracking-tight">🎸 CREAR SALA</h3>

            {/* Temáticas */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Temática</p>
              <div className="flex flex-wrap gap-2">
                {TEMATICAS.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTematica(t)}
                    className={`px-3 py-1 rounded-full text-xs font-black border transition-all
                      ${tematicasSeleccionadas.includes(t)
                        ? 'bg-neonPink text-black border-neonPink shadow-neon-pink'
                        : 'bg-transparent text-white/50 border-white/20 hover:border-white/50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Jugadores */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Jugadores: <span className="text-white">{maxJugadores}</span>
              </p>
              <input type="range" min={2} max={8} value={maxJugadores}
                onChange={e => setMaxJugadores(+e.target.value)}
                className="w-full accent-neonCyan" />
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>2</span><span>8</span>
              </div>
            </div>

            {/* Tiempo de preview */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Preview: <span className="text-white">{tiempoPreview}s</span>
              </p>
              <div className="flex gap-2">
                {[5, 10, 15].map(t => (
                  <button key={t} onClick={() => setTiempoPreview(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all
                      ${tiempoPreview === t
                        ? 'bg-neonCyan text-black border-neonCyan'
                        : 'bg-transparent text-white/50 border-white/20 hover:border-white/50'}`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={crearSala}
              disabled={creando}
              className="mt-auto w-full py-4 rounded-2xl font-black text-lg bg-neonCyan text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-neon-cyan"
            >
              {creando ? 'Creando...' : 'CREAR SALA'}
            </button>
          </div>

          {/* ── UNIRSE ── */}
          <div className="bg-white/5 rounded-3xl border border-neonPink/30 p-6 flex flex-col items-center justify-center gap-6 backdrop-blur-sm">
            <span className="text-5xl">🎟️</span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Código de sala</p>
            <input
              type="text"
              placeholder="XXXXXX"
              value={codigoSala}
              onChange={e => setCodigoSala(e.target.value.toUpperCase())}
              maxLength={6}
              className="bg-transparent border-b-4 border-neonPink text-center text-4xl font-black focus:outline-none w-full placeholder:opacity-20 text-neonPink"
            />
            <button
              onClick={unirseASala}
              disabled={uniendose || !codigoSala}
              className="w-full py-4 rounded-2xl font-black text-lg bg-neonPink text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-neon-pink"
            >
              {uniendose ? 'Uniéndose...' : 'UNIRSE A PARTIDA'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

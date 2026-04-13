import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Términos de búsqueda por temática (varios para fallback)
const GENRE_TERMS: Record<string, string[]> = {
  'Rock':  ['classic rock hits', 'rock radio', 'rock anthems'],
  'Pop':   ['pop hits', 'pop radio', 'top pop songs'],
  '80s':   ['80s hits', 'eighties pop', '80s greatest hits'],
  '90s':   ['90s hits', 'nineties pop rock', '90s greatest hits'],
  'Metal': ['heavy metal', 'metal classic', 'hard rock'],
  'Blues': ['blues rock', 'electric blues', 'blues classic'],
};

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { tematica } = await req.json();
    const terms = GENRE_TERMS[tematica] ?? [tematica];
    let tracks: any[] = [];

    for (const term of terms) {
      if (tracks.length >= 8) break;
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=50&country=us`;
      const res  = await fetch(url);
      const data = await res.json();
      const found = (data.results ?? []).filter((t: any) => t.previewUrl);
      tracks = [...tracks, ...found];
    }

    if (tracks.length < 4) {
      throw new Error('No se encontraron suficientes canciones con preview.');
    }

    // Eliminar duplicados por trackId
    const uniq = Object.values(
      Object.fromEntries(tracks.map(t => [t.trackId, t]))
    ) as any[];

    const mezcladas = shuffle(uniq).slice(0, 8);
    const correcta  = mezcladas[0];

    // Tomar 3 distractores distintos (distinto artista si es posible para hacerlo no-obvio)
    const distractores = mezcladas
      .slice(1)
      .filter(t => t.artistName !== correcta.artistName)
      .slice(0, 3);

    // Si no hay suficientes de distinto artista, completar igual
    if (distractores.length < 3) {
      const extra = mezcladas.slice(1).filter(t => !distractores.includes(t)).slice(0, 3 - distractores.length);
      distractores.push(...extra);
    }

    const correctaStr  = `${correcta.trackName} — ${correcta.artistName}`;
    const opcionesBase = [
      correctaStr,
      ...distractores.map((t: any) => `${t.trackName} — ${t.artistName}`),
    ];

    const opciones = shuffle(opcionesBase);

    return new Response(JSON.stringify({
      name:        correcta.trackName,
      artist:      correcta.artistName,
      preview_url: correcta.previewUrl,
      image:       correcta.artworkUrl100 ?? null,
      opciones,           // array de 4 opciones, mezcladas, incluye la correcta
      respuesta:   correctaStr,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

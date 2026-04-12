import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Términos de búsqueda por temática para iTunes
const GENRE_TERMS: Record<string, string[]> = {
  'Rock':  ['classic rock hits', 'rock radio', 'rock 2000s'],
  'Pop':   ['pop hits', 'pop radio', 'pop 2010s'],
  '80s':   ['80s hits', '80s pop', 'eighties music'],
  '90s':   ['90s hits', '90s pop rock', 'nineties music'],
  'Metal': ['heavy metal', 'metal rock', 'hard rock metal'],
  'Blues': ['blues rock', 'electric blues', 'blues guitar'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { tematica } = await req.json();
    const terms = GENRE_TERMS[tematica] ?? [tematica];
    let tracks: any[] = [];

    for (const term of terms) {
      if (tracks.length > 0) break;
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=50&country=us`;
      const res = await fetch(url);
      const data = await res.json();
      tracks = (data.results ?? []).filter((t: any) => t.previewUrl);
    }

    if (tracks.length === 0) {
      throw new Error('No se encontraron canciones con preview para esta temática.');
    }

    const track = tracks[Math.floor(Math.random() * tracks.length)];

    return new Response(JSON.stringify({
      name:        track.trackName,
      artist:      track.artistName,
      preview_url: track.previewUrl,
      image:       track.artworkUrl100 ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});

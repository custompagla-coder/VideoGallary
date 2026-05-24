import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, video_url, thumbnail_url, tags, duration, category_id } = body;

    if (!title || !video_url || !thumbnail_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        title,
        video_url,
        thumbnail_url,
        tags: tags || [],
        duration: duration || 0,
        views: 0,
        likes: 0,
        category_id: category_id || null,
        is_pinned: false,
        status: 'published',
        scheduled_at: null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API Videos] Server-side insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[API Videos] Server-side proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error during video saving' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('video_id');
    const sessionId = searchParams.get('session_id');

    if (!videoId) {
      return NextResponse.json({ error: 'Missing video_id parameter' }, { status: 400 });
    }

    // 1. Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('[API Comments GET] Comments error:', commentsError);
      return NextResponse.json({ error: commentsError.message }, { status: 500 });
    }

    const allComments = comments || [];
    const commentIds = allComments.map(c => c.id);

    // 2. Fetch reactions if there are comments
    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, Record<string, boolean>> = {};

    if (commentIds.length > 0) {
      const { data: reactions, error: reactionsError } = await supabase
        .from('comment_reactions')
        .select('*')
        .in('comment_id', commentIds);

      if (reactionsError) {
        console.error('[API Comments GET] Reactions error:', reactionsError);
      } else {
        (reactions || []).forEach((r: any) => {
          if (!counts[r.comment_id]) counts[r.comment_id] = {};
          counts[r.comment_id][r.emoji] = (counts[r.comment_id][r.emoji] || 0) + 1;
          
          if (sessionId && r.session_id === sessionId) {
            if (!mine[r.comment_id]) mine[r.comment_id] = {};
            mine[r.comment_id][r.emoji] = true;
          }
        });
      }
    }

    return NextResponse.json({
      comments: allComments,
      reactions: counts,
      userReactions: mine,
    });
  } catch (error) {
    console.error('[API Comments GET] Server-side error:', error);
    return NextResponse.json(
      { error: 'Internal server error during comments fetch' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_id, author_name, content, parent_id } = body;

    if (!video_id || !author_name || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        video_id,
        author_name,
        content,
        parent_id: parent_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API Comments POST] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[API Comments POST] Server-side error:', error);
    return NextResponse.json(
      { error: 'Internal server error during comment insertion' },
      { status: 500 }
    );
  }
}

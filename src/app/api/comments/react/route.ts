import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comment_id, emoji, session_id, action } = body;

    if (!comment_id || !emoji || !session_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'remove') {
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', comment_id)
        .eq('session_id', session_id)
        .eq('emoji', emoji);

      if (error) {
        console.error('[API Comments React] Delete reaction error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } else if (action === 'add') {
      const { error } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id,
          emoji,
          session_id,
        });

      if (error) {
        console.error('[API Comments React] Add reaction error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API Comments React] Server-side error:', error);
    return NextResponse.json(
      { error: 'Internal server error during comment reaction' },
      { status: 500 }
    );
  }
}

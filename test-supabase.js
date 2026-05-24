const { createClient } = require('@supabase/supabase-js');

const url = 'https://gmweaxhsgzluiiatrotj.supabase.co';
const key = 'sb_publishable_uMUhfDuRThvu_LpX84tk9A_plzodGfF';

const supabase = createClient(url, key);

async function runTest() {
  console.log('Connecting to Supabase...');
  try {
    console.log('Fetching videos with category join to check connection...');
    const { data: videos, error: fetchError } = await supabase
      .from('videos')
      .select('*, category:categories(id, name, slug, color)')
      .limit(1);

    if (fetchError) {
      console.error('Videos Fetch error:', fetchError);
    } else {
      console.log('Videos Fetch successful! Video count sample:', videos.length);
      if (videos.length > 0) {
        console.log('First video data:', videos[0]);
      }
    }

    console.log('Fetching profiles to check table existence...');
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profError) {
      console.error('Profiles Fetch error:', profError);
    } else {
      console.log('Profiles Fetch successful! Profiles count sample:', profiles.length);
    }

    console.log('Attempting a test insert into videos table...');
    const testVideo = {
      title: 'Diagnostic Test',
      video_url: 'https://files.catbox.moe/test.mp4',
      thumbnail_url: 'https://files.catbox.moe/test.jpg',
      tags: ['test'],
      duration: 10,
      views: 0,
      likes: 0,
      category_id: null
    };

    const { data: inserted, error: insertError } = await supabase
      .from('videos')
      .insert(testVideo)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('Insert successful! Data returned:', inserted);
      
      // Clean up the test insert if successful
      if (inserted && inserted[0]) {
        console.log('Cleaning up test video...');
        await supabase.from('videos').delete().eq('id', inserted[0].id);
        console.log('Cleanup successful.');
      }
    }
  } catch (err) {
    console.error('Unexpected error during script execution:', err);
  }
}

runTest();

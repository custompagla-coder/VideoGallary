import { NextRequest, NextResponse } from 'next/server';

const CATBOX_API_URL = 'https://catbox.moe/user/api.php';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Build the multipart/form-data request for Catbox
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'fileupload');
    catboxForm.append('fileToUpload', file);

    const catboxResponse = await fetch(CATBOX_API_URL, {
      method: 'POST',
      body: catboxForm,
    });

    if (!catboxResponse.ok) {
      const errorText = await catboxResponse.text();
      console.error('Catbox API error:', errorText);
      return NextResponse.json(
        { error: `Catbox upload failed: ${catboxResponse.status}` },
        { status: 502 }
      );
    }

    const url = await catboxResponse.text();

    // Catbox returns the direct URL as plain text
    if (!url.startsWith('https://')) {
      return NextResponse.json(
        { error: `Unexpected Catbox response: ${url}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: url.trim() });
  } catch (error) {
    console.error('Upload proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    );
  }
}

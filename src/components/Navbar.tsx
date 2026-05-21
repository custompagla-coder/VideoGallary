'use client';

import { useState } from 'react';
import { Upload, Video, Tv2 } from 'lucide-react';
import UploadForm from './UploadForm';

interface NavbarProps {
  onRefresh: () => void;
}

export default function Navbar({ onRefresh }: NavbarProps) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#08080d]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Tv2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-lg tracking-tight">
                  Video
                  <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Vault
                  </span>
                </span>
                <p className="text-xs text-gray-500 leading-none">Serverless Gallery</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                <Video className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-400">Powered by Catbox</span>
              </div>
              <button
                id="open-upload-modal"
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Video</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showUpload && (
        <UploadForm
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}


import React, { useEffect, useRef } from 'react';

// Manually declare QRCode since we're using a script tag and not an npm package with types
declare var QRCode: any;

interface QrCodeModalProps {
  url: string; // The prop can be the actual URL or the string 'loading'
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, onClose }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const isLoading = url === 'loading';

  const generateQrCode = () => {
    if (qrCodeRef.current && typeof QRCode !== 'undefined' && !isLoading) {
      qrCodeRef.current.innerHTML = ''; // Clear previous QR code or loading indicator
      new QRCode(qrCodeRef.current, {
        text: url,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }
  };
  
  useEffect(() => {
    if (isLoading) {
      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = ''; // Clear any existing QR code when going back to loading
      }
      return;
    }

    // Dynamically load the qrcode.js script if it's not already there.
    if (!document.getElementById('qrcode-script')) {
        const script = document.createElement('script');
        script.id = 'qrcode-script';
        script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        script.onload = () => generateQrCode();
        document.body.appendChild(script);
    } else {
        generateQrCode();
    }
  }, [url, isLoading]);

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white p-8 rounded-xl text-center text-gray-800 shadow-2xl animate-fade-in w-[360px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold mb-4">
          {isLoading ? 'Generating Link...' : 'Scan to download your photo!'}
        </h3>
        <div ref={qrCodeRef} className="p-2 bg-white rounded-lg inline-block mb-6 w-[272px] h-[272px] flex items-center justify-center">
          {isLoading && (
             <div className="flex flex-col items-center justify-center text-gray-600">
                <svg className="animate-spin h-12 w-12 text-[#D02C3F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 font-semibold">Uploading image...</p>
                <p className="text-sm text-gray-500">Please wait a moment.</p>
             </div>
          )}
          {/* QR Code will be rendered here by the script when not loading */}
        </div>
        <button
          onClick={onClose}
          className="w-full bg-[#D02C3F] text-white py-3 rounded-lg font-bold text-lg transition hover:bg-[#a02332]"
        >
          Close
        </button>
      </div>
    </div>
  );
};


import React, { useEffect, useRef } from 'react';

// Manually declare QRCode since we're using a script tag and not an npm package with types
declare var QRCode: any;

interface QrCodeModalProps {
  url: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ url, onClose }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [url]);

  const generateQrCode = () => {
    if (qrCodeRef.current && typeof QRCode !== 'undefined') {
      qrCodeRef.current.innerHTML = ''; // Clear previous QR code
      new QRCode(qrCodeRef.current, {
        text: url,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white p-8 rounded-xl text-center text-gray-800 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold mb-4">Scan to download your photo!</h3>
        <div ref={qrCodeRef} className="p-2 bg-white rounded-lg inline-block mb-6">
          {/* QR Code will be rendered here */}
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

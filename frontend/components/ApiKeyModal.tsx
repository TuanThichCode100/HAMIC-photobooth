import React, { useState } from 'react';
import type { FirebaseConfig } from '../services/firebaseService';

interface ApiKeyModalProps {
  onSave: (config: FirebaseConfig) => Promise<boolean>;
  initialError?: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, initialError }) => {
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState<string | null>(initialError || null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setError(null);
    if (!configJson.trim()) {
      setError('Configuration cannot be empty.');
      return;
    }
    
    setIsLoading(true);
    try {
      const parsedConfig = JSON.parse(configJson);
      if (!parsedConfig.apiKey || !parsedConfig.projectId || !parsedConfig.storageBucket) {
        setError('The configuration JSON must include "apiKey", "projectId", and "storageBucket".');
        setIsLoading(false);
        return;
      }
      
      const success = await onSave(parsedConfig);
      if (!success) {
        // The error alert is now handled inside firebaseService, 
        // but we can set a generic message here as a fallback.
        setError('Initialization failed. Please check the console and the alert message for details.');
      }
    } catch (e) {
      setError('Invalid JSON. Please paste the full Firebase config object from your project settings.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-8 rounded-xl w-full max-w-lg text-gray-800 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-bold mb-2 text-center">Firebase Configuration Required</h2>
        <p className="mb-4 text-center text-gray-600">
          To enable cloud features like QR code sharing, please paste your Firebase web app configuration object below.
        </p>
        <textarea
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          placeholder='{ \n  "apiKey": "AIza...",\n  "authDomain": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  ...\n}'
          className="w-full h-48 p-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-[#D02C3F] outline-none"
          aria-label="Firebase Configuration JSON"
          disabled={isLoading}
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          onClick={handleSave}
          className="w-full mt-4 bg-[#D02C3F] text-white py-3 rounded-lg font-bold text-lg transition hover:bg-[#a02332] disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? 'Verifying...' : 'Save and Initialize'}
        </button>
        <p className="text-xs text-gray-400 mt-4 text-center">
            Your configuration is saved only in your browser and is not sent anywhere else.
        </p>
      </div>
    </div>
  );
};
// src/components/Scanner.js
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function Scanner({ onScanSuccess, activeEventTitle }) {
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const qrCodeInstance = useRef(null);
  const scannerContainerId = 'qr-reader-container';

  const stopScanner = async () => {
    if (qrCodeInstance.current && qrCodeInstance.current.isScanning) {
      try {
        await qrCodeInstance.current.stop();
        qrCodeInstance.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setScanError(null);
    setScanResult(null);

    try {
      // 1. Determine camera config: default to rear/environment camera
      let cameraConfig = selectedCameraId;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);

          if (!cameraConfig) {
            // Find explicit back/rear camera in device list
            const rearCamera = devices.find(d => {
              const label = (d.label || '').toLowerCase();
              return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('facing back') || label.includes('0, facing back');
            });

            if (rearCamera) {
              cameraConfig = rearCamera.id;
              setSelectedCameraId(rearCamera.id);
            } else if (devices.length > 1) {
              // On mobile devices, rear camera is typically the last device in the list
              const lastDevice = devices[devices.length - 1];
              cameraConfig = lastDevice.id;
              setSelectedCameraId(lastDevice.id);
            }
          }
        }
      } catch (enumErr) {
        console.warn('Could not enumerate camera devices, using default facingMode environment:', enumErr);
      }

      // Fallback to native environment facingMode for rear camera on mobile Safari/Chrome
      if (!cameraConfig) {
        cameraConfig = { facingMode: "environment" };
      }

      // 2. Start scanner instance
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      qrCodeInstance.current = html5QrCode;

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          setScanResult(decodedText);
          onScanSuccess(decodedText);
          stopScanner();
        },
        () => {
          // Verbose error logging suppressed
        }
      );
      setScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setScanError('Could not start scanner. Verify camera permissions or ensure rear camera is available.');
    }
  };

  const toggleScan = () => {
    if (scanning) {
      stopScanner();
    } else {
      startScanner();
    }
  };

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl glass-panel bg-slate-950/60 max-w-md mx-auto border border-white/5 shadow-2xl">
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <h3 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
          <Camera className="w-5 h-5 text-cyan-400" />
          <span>Organizer Camera Scanner</span>
        </h3>
        {scanning && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
        )}
      </div>

      {activeEventTitle && (
        <div className="mb-4 text-center">
          <span className="text-xs text-slate-500 block mb-0.5">Scanning For:</span>
          <span className="text-sm font-semibold text-cyan-400">{activeEventTitle}</span>
        </div>
      )}

      {/* Camera Selection Dropdown */}
      {!scanning && cameras.length > 1 && (
        <div className="w-full mb-4">
          <label className="text-xs text-slate-400 block mb-1">Select Camera</label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner Target Area */}
      <div className="relative w-full aspect-square bg-slate-900/60 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
        <div id={scannerContainerId} className="absolute inset-0 w-full h-full" />

        {!scanning && !scanResult && (
          <div className="flex flex-col items-center text-slate-500 p-6 text-center">
            <Camera className="w-12 h-12 mb-3 text-slate-600 animate-pulse-slow" />
            <p className="text-sm">Camera is inactive</p>
            <p className="text-xs mt-1 text-slate-600">Click Start Scanner below and allow access</p>
          </div>
        )}

        {scanning && (
          <>
            {/* Visual Laser Line and corners */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-2 border-dashed border-cyan-500/40 pointer-events-none rounded-lg" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[2px] bg-cyan-500 shadow-md shadow-cyan-500/50 animate-bounce pointer-events-none" />
          </>
        )}

        {scanResult && (
          <div className="flex flex-col items-center bg-slate-950/90 absolute inset-0 z-10 p-6 justify-center text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
            <span className="text-sm font-semibold text-slate-200">QR Code Scanned!</span>
            <span className="text-xs text-slate-400 mt-1 font-mono break-all line-clamp-2 px-4 max-w-[250px]">
              Token: {scanResult}
            </span>
            <button
              onClick={() => {
                setScanResult(null);
                startScanner();
              }}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300 flex items-center space-x-1.5 transition-all duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan Next</span>
            </button>
          </div>
        )}
      </div>

      {scanError && !scanResult && (
        <div className="w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-2 text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {/* Start/Stop Button */}
      <button
        onClick={toggleScan}
        disabled={!!scanResult}
        className={`w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg ${scanning
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10'
            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/10 disabled:opacity-50'
          }`}
      >
        <span>{scanning ? 'Stop Camera Scanner' : 'Start Camera Scanner'}</span>
      </button>
    </div>
  );
}

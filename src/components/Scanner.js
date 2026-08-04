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
    <div className="flex flex-col items-center p-4 sm:p-6 rounded-2xl glass-panel bg-slate-950/80 w-full max-w-sm sm:max-w-md mx-auto border border-white/10 shadow-2xl">
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <h3 className="text-sm sm:text-base font-semibold text-slate-200 flex items-center space-x-2">
          <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
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
          <span className="text-xs text-slate-400 block mb-0.5">Scanning For:</span>
          <span className="text-sm font-semibold text-cyan-400 line-clamp-1">{activeEventTitle}</span>
        </div>
      )}

      {/* Camera Selection Dropdown */}
      {!scanning && cameras.length > 1 && (
        <div className="w-full mb-4">
          <label className="text-xs text-slate-400 block mb-1 font-medium">Select Camera</label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 min-h-[44px]"
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
      <div className="relative w-full max-w-[280px] aspect-square bg-slate-900/80 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center mx-auto">
        <div id={scannerContainerId} className="absolute inset-0 w-full h-full" />

        {!scanning && !scanResult && (
          <div className="flex flex-col items-center text-slate-400 p-6 text-center">
            <Camera className="w-10 h-10 mb-2 text-slate-500 animate-pulse" />
            <p className="text-xs sm:text-sm font-medium">Camera is inactive</p>
            <p className="text-[11px] mt-1 text-slate-500">Click Start Camera Scanner below</p>
          </div>
        )}

        {scanning && (
          <>
            {/* Visual Laser Line and corners */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[210px] sm:w-[240px] h-[210px] sm:h-[240px] border-2 border-dashed border-cyan-500/50 pointer-events-none rounded-xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[210px] sm:w-[240px] h-[2px] bg-cyan-400 shadow-md shadow-cyan-400/60 animate-bounce pointer-events-none" />
          </>
        )}

        {scanResult && (
          <div className="flex flex-col items-center bg-slate-950/95 absolute inset-0 z-10 p-6 justify-center text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2 animate-bounce" />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">QR Code Scanned!</span>
            <span className="text-[11px] text-slate-400 mt-1 font-mono break-all line-clamp-2 px-3 max-w-[220px]">
              Token: {scanResult}
            </span>
            <button
              type="button"
              onClick={() => {
                setScanResult(null);
                startScanner();
              }}
              className="mt-4 min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300 flex items-center space-x-1.5 transition-all cursor-pointer"
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
        type="button"
        onClick={toggleScan}
        disabled={!!scanResult}
        className={`w-full min-h-[44px] mt-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${scanning
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10'
            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/10 disabled:opacity-50'
          }`}
      >
        <span>{scanning ? 'Stop Camera Scanner' : 'Start Camera Scanner'}</span>
      </button>
    </div>
  );
}

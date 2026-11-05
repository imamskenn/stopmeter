from pathlib import Path
import re

p = Path("src/App.jsx")
s = p.read_text()

# Simpan backup sebelum mengubah apa pun
Path("src/App.jsx.before-camera").write_text(s)

# Ganti import
s = s.replace(
    "import { useEffect, useMemo, useState } from 'react';",
    "import { useEffect, useMemo, useRef, useState } from 'react';"
)
s = s.replace(
    "import { createWorker } from 'tesseract.js';",
    "import cvModule from '@techstark/opencv-js';"
)

# Hapus fungsi OCR
start = s.find("function extractReceiptTotal(")
if start >= 0:
    brace = s.find("{", start)
    depth = 0
    for i in range(brace, len(s)):
        if s[i] == "{": depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                s = s[:start] + s[i+1:].lstrip()
                break

# Hapus state OCR dan handler OCR
for line in [
    "  const [ocrLoading, setOcrLoading] = useState(false);",
    "  const [ocrMessage, setOcrMessage] = useState('');",
    "  const [ocrText, setOcrText] = useState('');"
]:
    s = s.replace(line, "")

s, n = re.subn(
    r"  const scanReceipt = async file => \{.*?\n  \};",
    """  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const scanReceipt = file => {
    if (file) setReceiptFile(file);
  };""",
    s, count=1, flags=re.S
)
if n != 1:
    raise SystemExit("Handler OCR tidak ditemukan. Backup tersedia.")

# Ganti tombol kamera dan galeri
pattern = r'<div style=\{\{ display: .grid., gridTemplateColumns: .1fr 1fr., gap: 8 \}\}>.*?</div>\s*\{receiptFile &&'
replacement = """<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button type="button" onClick={() => setShowReceiptCamera(true)}
                  style={{ padding: 12, border: 0, borderRadius: 9, background: '#172f59', color: '#fff', fontWeight: 700 }}>
                  Scan Kamera
                </button>
                <label style={{ padding: 12, borderRadius: 9, background: '#eaf0f8', color: '#172f59', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                  Pilih Galeri
                  <input type="file" accept="image/*" onChange={e => scanReceipt(e.target.files?.[0])} style={{ display: 'none' }} />
                </label>
              </div>
              {showReceiptCamera && <ReceiptCamera
                onClose={() => setShowReceiptCamera(false)}
                onCapture={file => { setReceiptFile(file); setShowReceiptCamera(false); }}
              />}
              {receiptFile &&"""
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit("Bagian tombol kamera tidak ditemukan. Backup tersedia.")

# Hapus panel OCR berdasarkan teks unik
start = s.find("background: '#f1f5fb'")
if start == -1:
    raise SystemExit("Panel OCR tidak ditemukan.")

start = s.rfind("<div style={{", 0, start)
end = s.find("</div>", s.find("{ocrText &&", start))
end = s.find("</div>", end + 6) + len("</div>")

if start == -1 or end < len("</div>"):
    raise SystemExit("Batas panel OCR tidak ditemukan.")

s = s[:start] + s[end:]

camera = r'''
function ReceiptCamera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureRef = useRef(false);
  const [message, setMessage] = useState('Membuka kamera...');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let stream;
    let raf;
    let mats = [];
    let stableAt = 0;
    let previous = null;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
    };

    const takePhoto = () => {
      if (captureRef.current || !videoRef.current) return;
      captureRef.current = true;
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        if (blob && active) onCapture(new File([blob], `resit-${Date.now()}.jpg`, {type:'image/jpeg'}));
      }, 'image/jpeg', 0.92);
      stop();
    };

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } }
        });
        if (!active) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        let cv = cvModule;
        if (cv instanceof Promise) cv = await cv;
        else if (!cv.Mat) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(Error('OpenCV gagal dimuat')), 15000);
            cv.onRuntimeInitialized = () => { clearTimeout(timeout); resolve(); };
          });
        }
        if (!active) return;

        const video = videoRef.current;
        const src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
        const gray = new cv.Mat();
        const blur = new cv.Mat();
        const edges = new cv.Mat();
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        mats = [src, gray, blur, edges, contours, hierarchy];

        setReady(true);
        setMessage('Arahkan kamera ke resit.');

        const scan = () => {
          if (!active || captureRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          src.data.set(ctx.getImageData(0, 0, canvas.width, canvas.height).data);

          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          cv.GaussianBlur(gray, blur, new cv.Size(5,5), 0);
          cv.Canny(blur, edges, 60, 160);
          cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

          let best = null, maxArea = canvas.width * canvas.height * 0.12;
          for (let i=0; i<contours.size(); i++) {
            const c = contours.get(i);
            const approx = new cv.Mat();
            cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c,true), true);
            const area = Math.abs(cv.contourArea(approx));
            if (approx.rows === 4 && area > maxArea && cv.isContourConvex(approx)) {
              maxArea = area;
              best = Array.from({length:4}, (_,j) => ({
                x: approx.data32S[j*2], y: approx.data32S[j*2+1]
              }));
            }
            c.delete(); approx.delete();
          }

          if (best) {
            ctx.beginPath();
            best.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
            ctx.closePath();
            ctx.strokeStyle = '#22e58b';
            ctx.lineWidth = 5;
            ctx.stroke();

            const stable = previous && best.every((p,i) =>
              Math.hypot(p.x-previous[i].x,p.y-previous[i].y) < 18
            );
            if (stable) {
              if (!stableAt) stableAt = Date.now();
              setMessage('Resit terdeteksi. Tahan posisi...');
              if (Date.now()-stableAt > 1300) takePhoto();
            } else {
              stableAt = 0;
              setMessage('Resit terdeteksi. Stabilkan kamera...');
            }
            previous = best;
          } else {
            stableAt = 0;
            previous = null;
            setMessage('Arahkan kamera ke seluruh resit.');
          }
          raf = requestAnimationFrame(scan);
        };
        scan();
      } catch (err) {
        console.error(err);
        setMessage(err.message || 'Kamera gagal dibuka. Periksa izin kamera.');
      }
    }

    start();
    return () => {
      active = false;
      stop();
      mats.forEach(m => m.delete());
    };
  }, []);

  return <div style={{position:'fixed',inset:0,zIndex:9999,background:'#050b14',color:'#fff',padding:14,display:'flex',flexDirection:'column',justifyContent:'center'}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
      <strong>Scanner Resit</strong>
      <button type="button" onClick={onClose}>Tutup</button>
    </div>
    <div style={{position:'relative',width:'100%'}}>
      <video ref={videoRef} muted playsInline style={{width:'100%',display:'block'}} />
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} />
    </div>
    <p style={{textAlign:'center',fontSize:13}}>{message}</p>
    <button type="button" disabled={!ready} onClick={takePhoto}>Ambil Manual</button>
  </div>;
}

'''

if "function ReceiptCamera(" not in s:
    marker = "function AdminDashboard("
    if marker not in s:
        raise SystemExit("AdminDashboard tidak ditemukan. Backup tersedia.")
    s = s.replace(marker, camera + marker, 1)

p.write_text(s)
print("Patch selesai.")

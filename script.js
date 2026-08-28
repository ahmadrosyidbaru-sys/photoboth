       const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-3Cg40eElzmYghvBv__8S3xc1GVXrUCGH6CimfKZm0Vmil_Y0CWMKth9W_ka0lZUhzQ/exec"; 
        const DRIVE_URL = "https://drive.google.com/drive/folders/1wfP3gvg2WOY_mgiBqmuGjuw5Mz-KXxFF";

        const video = document.getElementById('video');
        const canvas = document.getElementById('main-canvas');
        const flash = document.getElementById('flash');
        
        let userName = "";
        let sessionPhotos = [];
        let rawPhotos = [];
        let currentLayout = 'strip';
        let bgColor = '#ffffff';
        let currentFont = 'Plus Jakarta Sans';
        let currentFilter = 'none';
        let lastTempSnap = null;
        let currentFacingMode = 'user';

        async function initCamera(facingMode = 'user') {
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: facingMode, aspectRatio: 1/1, width: 1080, height: 1080 }, 
                    audio: false 
                });
                video.srcObject = stream;
                if(facingMode === 'user') video.classList.add('mirror');
                else video.classList.remove('mirror');
            } catch (e) { alert("Kamera tidak ditemukan."); }
        }

        function switchCamera() {
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            initCamera(currentFacingMode);
        }

        function goToLayoutStep() {
            userName = document.getElementById('user-name').value.trim().toUpperCase() || "GUEST";
            document.getElementById('step-name').classList.add('hidden');
            document.getElementById('step-layout').classList.remove('hidden');
        }

        function backToNameStep() {
            document.getElementById('step-layout').classList.add('hidden');
            document.getElementById('step-name').classList.remove('hidden');
        }

        function selectLayoutAndStart(layout) {
            document.getElementById('welcome-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            setLayout(layout);
            initCamera(currentFacingMode);
            syncActiveChoiceUI();
        }

        function setLayout(l) {
            currentLayout = l;
            document.querySelectorAll('#btn-strip, #btn-grid').forEach(b => b.classList.remove('is-active'));
            const btn = document.getElementById(`btn-${l}`);
            if (btn) btn.classList.add('is-active');
            drawFinal();
        }

        function setFont(f) {
            currentFont = f;
            document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('is-active'));
            const active = document.querySelector(`[data-font="${CSS.escape(f)}"]`);
            if (active) active.classList.add('is-active');
            drawFinal();
        }

        function setFilter(f) {
            currentFilter = f;
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('is-active'));
            const active = document.querySelector(`[data-filter="${CSS.escape(f)}"]`);
            if (active) active.classList.add('is-active');
            drawFinal();
        }

        function changeBg(c) { bgColor = c; drawFinal(); }

        async function takeIndividualSnap() {
            const max = currentLayout === 'strip' ? 3 : 4;
            if(sessionPhotos.length >= max) return;
            
            document.getElementById('snap-btn').disabled = true;
            await countdown(3);
            triggerFlash();

            const temp = document.createElement('canvas');
            temp.width = 800; temp.height = 800;
            const ctx = temp.getContext('2d');
            
            if(currentFacingMode === 'user') {
                ctx.translate(800, 0); ctx.scale(-1, 1);
            }
            
            const size = Math.min(video.videoWidth, video.videoHeight);
            const startX = (video.videoWidth - size) / 2;
            const startY = (video.videoHeight - size) / 2;
            ctx.drawImage(video, startX, startY, size, size, 0, 0, 800, 800);
            
            lastTempSnap = temp;
            drawFinal(true);
            toggleOverlay(true);
        }

        function toggleOverlay(show) {
            const c = document.getElementById('capture-controls');
            const s = document.getElementById('snap-container');
            const lt = document.getElementById('layout-tools');
            if(show) { 
                c.classList.remove('pointer-events-none'); 
                c.classList.add('opacity-100'); 
                s.classList.add('hidden');
                lt.classList.add('hidden');
                video.pause(); 
            }
            else { 
                c.classList.add('pointer-events-none'); 
                c.classList.remove('opacity-100'); 
                s.classList.remove('hidden');
                lt.classList.remove('hidden');
                video.play(); 
                document.getElementById('snap-btn').disabled = false; 
            }
        }

        function keepPhoto() {
            sessionPhotos.push(lastTempSnap);
            rawPhotos.push(lastTempSnap.toDataURL('image/png').split(',')[1]);
            toggleOverlay(false);
            drawFinal();
            
            const max = currentLayout === 'strip' ? 3 : 4;
            if(sessionPhotos.length >= max) {
                document.getElementById('camera-section').classList.add('hidden');
                document.getElementById('editor-tools').classList.remove('hidden');
                document.getElementById('editing-section').scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        function retakePhoto() {
            lastTempSnap = null;
            toggleOverlay(false);
            drawFinal();
        }

        function syncActiveChoiceUI() {
            document.querySelectorAll('#btn-strip, #btn-grid').forEach(b => b.classList.remove('is-active'));
            const layoutBtn = document.getElementById(`btn-${currentLayout}`);
            if (layoutBtn) layoutBtn.classList.add('is-active');

            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('is-active'));
            const filterBtn = document.querySelector(`[data-filter="${CSS.escape(currentFilter)}"]`);
            if (filterBtn) filterBtn.classList.add('is-active');

            document.querySelectorAll('[data-font]').forEach(b => b.classList.remove('is-active'));
            const fontBtn = document.querySelector(`[data-font="${CSS.escape(currentFont)}"]`);
            if (fontBtn) fontBtn.classList.add('is-active');
        }

        function countdown(sec) {
            const box = document.getElementById('countdown-box');
            return new Promise(resolve => {
                let t = sec;
                let timer = setInterval(() => {
                    box.innerText = t;
                    if (t <= 0) { clearInterval(timer); box.innerText = ''; resolve(); }
                    t--;
                }, 1000);
            });
        }

        function triggerFlash() {
            flash.classList.add('flash-active');
            setTimeout(() => flash.classList.remove('flash-active'), 400);
        }

        function drawFinal(isPreview = false) {
            const ctx = canvas.getContext('2d');
            const isStrip = currentLayout === 'strip';
            
            // PERBAIKAN: Tinggi canvas untuk Grid ditambah agar teks tidak menimpa foto
            canvas.width = isStrip ? 400 : 800;
            canvas.height = isStrip ? 1200 : 860; 
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const maxSlots = isStrip ? 3 : 4;
            for(let i=0; i < maxSlots; i++) {
                const x = isStrip ? 20 : (i % 2 === 0 ? 20 : 410);
                const y = isStrip ? (20 + (i * 380)) : (i < 2 ? 20 : 410);
                
                let imgToDraw = sessionPhotos[i];
                let isTemp = false;

                if(!imgToDraw && isPreview && i === sessionPhotos.length) {
                    imgToDraw = lastTempSnap;
                    isTemp = true;
                }

                if(!imgToDraw) {
                    ctx.fillStyle = 'rgba(0,0,0,0.05)';
                    ctx.fillRect(x, y, 360, 360);
                } else {
                    ctx.save();
                    if(!isTemp) ctx.filter = currentFilter;
                    ctx.drawImage(imgToDraw, 0, 0, 800, 800, x, y, 360, 360);
                    if(isTemp) {
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 8;
                        ctx.strokeRect(x+4, y+4, 352, 352);
                    }
                    ctx.restore();
                }
            }

            const r = parseInt(bgColor.slice(1,3), 16);
            const g = parseInt(bgColor.slice(3,5), 16);
            const b = parseInt(bgColor.slice(5,7), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const textColor = brightness > 128 ? '#000000' : '#ffffff';

            ctx.font = `bold 28px "${currentFont}"`;
            ctx.textAlign = 'center';
            const txt = document.getElementById('custom-text').value.toUpperCase() || `SNAP STUDIO x ${userName}`;

            ctx.fillStyle = textColor;
            // PERBAIKAN: Posisi teks selalu di bawah area canvas (canvas.height - 35)
            ctx.fillText(txt, canvas.width / 2, canvas.height - 35);
        }

        async function processAndUpload() {
            const btn = document.getElementById('sync-btn');
            const status = document.getElementById('upload-status');
            const box = document.getElementById('upload-box');
            btn.disabled = true; btn.innerText = "SEDANG MENGIRIM...";
            box.classList.remove('hidden');
            const sessionID = `${userName}-${Date.now()}`;

            for(let i=0; i<rawPhotos.length; i++) {
                status.innerText = `SYNC PHOTO ${i+1}/${rawPhotos.length}...`;
                await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ sessionID, base64: rawPhotos[i], fileName: `RAW-${i+1}.png` })});
            }
            status.innerText = "GENERATING FINAL RESULT...";
            const final = canvas.toDataURL('image/png').split(',')[1];
            await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ sessionID, base64: final, fileName: `RESULT-${userName}.png` })});
            
            status.innerText = "SESI BERHASIL DISIMPAN!";
            document.getElementById('qr-code').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(DRIVE_URL)}`;
            btn.innerText = "SELESAI";
        }
// Global State and Elements
let stream = null;
let autoDetectInterval = null;
let isDetecting = false;
let isTTSEnabled = false;
let lastDetectedChar = "";
let apiEndpoint = localStorage.getItem("sign_lang_api_endpoint") || "https://naufal312-sign-language-mnist-api.hf.space/predict";

const webcam = document.getElementById("webcam");
const roiBox = document.getElementById("roiBox");
const videoPlaceholder = document.getElementById("videoPlaceholder");
const cropCanvas = document.getElementById("cropCanvas");
const cropCtx = cropCanvas.getContext("2d");

// Buttons & Controls
const btnStartCamera = document.getElementById("btnStartCamera");
const btnStopCamera = document.getElementById("btnStopCamera");
const btnCapture = document.getElementById("btnCapture");
const autoDetectToggle = document.getElementById("autoDetectToggle");
const cameraStatus = document.getElementById("cameraStatus");

// API Settings
const settingsHeader = document.getElementById("settingsHeader");
const settingsArrow = document.getElementById("settingsArrow");
const settingsBody = document.getElementById("settingsBody");
const apiEndpointInput = document.getElementById("apiEndpoint");
const btnSaveSettings = document.getElementById("btnSaveSettings");

// Results Display
const predictedChar = document.getElementById("predictedChar");
const confidenceValue = document.getElementById("confidenceValue");
const progressBarFill = document.getElementById("progressBarFill");
const inferenceTime = document.getElementById("inferenceTime");
const scanningPulse = document.getElementById("scanningPulse");
const btnTTS = document.getElementById("btnTTS");
const ttsIcon = document.getElementById("ttsIcon");
const ttsText = document.getElementById("ttsText");
const probabilitiesList = document.getElementById("probabilitiesList");

// Initialize settings value
apiEndpointInput.value = apiEndpoint;

// --- Event Listeners ---

// Settings Toggle Panel
settingsHeader.addEventListener("click", () => {
    settingsBody.classList.toggle("show");
    settingsArrow.classList.toggle("rotated");
});

// Save Settings
btnSaveSettings.addEventListener("click", () => {
    const url = apiEndpointInput.value.trim();
    if (url) {
        apiEndpoint = url;
        localStorage.setItem("sign_lang_api_endpoint", url);
        alert("Endpoint API berhasil disimpan!");
        settingsBody.classList.remove("show");
        settingsArrow.classList.remove("rotated");
    } else {
        alert("Endpoint URL tidak boleh kosong!");
    }
});

// Start Camera
btnStartCamera.addEventListener("click", startCamera);
btnStopCamera.addEventListener("click", stopCamera);

// Capture Single
btnCapture.addEventListener("click", () => {
    captureAndPredict();
});

// Auto Detect Toggle
autoDetectToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
        scanningPulse.classList.add("active");
        // Start loop prediction every 600ms
        autoDetectInterval = setInterval(captureAndPredict, 650);
    } else {
        scanningPulse.classList.remove("active");
        if (autoDetectInterval) {
            clearInterval(autoDetectInterval);
            autoDetectInterval = null;
        }
    }
});

// TTS Toggle
btnTTS.addEventListener("click", () => {
    isTTSEnabled = !isTTSEnabled;
    if (isTTSEnabled) {
        btnTTS.classList.remove("btn-outline");
        btnTTS.classList.add("btn-primary");
        ttsIcon.className = "fa-solid fa-volume-high";
        ttsText.textContent = "Suara On (Text-to-Speech)";
        speak("Suara aktif");
    } else {
        btnTTS.classList.remove("btn-primary");
        btnTTS.classList.add("btn-outline");
        ttsIcon.className = "fa-solid fa-volume-xmark";
        ttsText.textContent = "Suara Off (Text-to-Speech)";
    }
});

// --- Core functions ---

// Start Camera Function
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            },
            audio: false
        });
        webcam.srcObject = stream;
        
        // Wait for video metadata to load
        webcam.onloadedmetadata = () => {
            webcam.play();
            
            // Adjust UI
            videoPlaceholder.style.opacity = "0";
            setTimeout(() => {
                videoPlaceholder.style.display = "none";
            }, 300);
            
            webcam.parentElement.classList.add("active");
            cameraStatus.className = "status-indicator active";
            cameraStatus.innerHTML = '<span class="dot"></span> Camera Active';
            
            // Enable controls
            btnStopCamera.disabled = false;
            btnCapture.disabled = false;
            autoDetectToggle.disabled = false;
        };
    } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
    }
}

// Stop Camera Function
function stopCamera() {
    if (autoDetectToggle.checked) {
        autoDetectToggle.checked = false;
        autoDetectToggle.dispatchEvent(new Event("change"));
    }
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    webcam.srcObject = null;
    
    // Adjust UI
    videoPlaceholder.style.display = "flex";
    setTimeout(() => {
        videoPlaceholder.style.opacity = "1";
    }, 50);
    
    webcam.parentElement.classList.remove("active");
    cameraStatus.className = "status-indicator";
    cameraStatus.innerHTML = '<span class="dot"></span> Camera Off';
    
    // Disable controls
    btnStopCamera.disabled = true;
    btnCapture.disabled = true;
    autoDetectToggle.disabled = true;
}

// Capture Guideline Region (ROI) and Predict
async function captureAndPredict() {
    if (isDetecting || !stream) return;
    isDetecting = true;
    
    // Highlight guideline box on UI
    roiBox.classList.add("detecting");

    try {
        const videoRect = webcam.getBoundingClientRect();
        const roiRect = roiBox.getBoundingClientRect();
        
        // 1. Calculate relative coordinates of the ROI relative to the displayed video element
        const relativeX = roiRect.left - videoRect.left;
        const relativeY = roiRect.top - videoRect.top;
        
        // 2. Scale coordinate mapping to actual video source resolution
        const scaleX = webcam.videoWidth / videoRect.width;
        const scaleY = webcam.videoHeight / videoRect.height;
        
        const sourceX = relativeX * scaleX;
        const sourceY = relativeY * scaleY;
        const sourceWidth = roiRect.width * scaleX;
        const sourceHeight = roiRect.height * scaleY;
        
        // 3. Draw cropped image into canvas (200x200 pixels)
        cropCtx.drawImage(
            webcam, 
            sourceX, sourceY, sourceWidth, sourceHeight, // Source bounding box
            0, 0, 200, 200                              // Destination canvas
        );
        
        // 4. Convert canvas drawing to Blob
        const blob = await new Promise(resolve => cropCanvas.toBlob(resolve, 'image/jpeg', 0.9));
        
        if (!blob) throw new Error("Gagal mengambil gambar dari canvas.");
        
        // 5. Send payload to Backend API
        const formData = new FormData();
        formData.append("file", blob, "hand_sign.jpg");
        
        const startTime = performance.now();
        const response = await fetch(apiEndpoint, {
            method: "POST",
            body: formData
        });
        const duration = Math.round(performance.now() - startTime);
        
        if (!response.ok) {
            const errDetail = await response.json().catch(() => ({ detail: "Unknown API error" }));
            throw new Error(errDetail.detail || `Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update UI with predictions
        updateUI(result, duration);

    } catch (err) {
        console.error("Inference Error:", err);
        // Only alert if we are NOT in auto-detect mode to prevent spamming popups
        if (!autoDetectToggle.checked) {
            alert(`Gagal mendeteksi gambar: ${err.message}`);
        }
        resetPredictionUI("Error!");
    } finally {
        isDetecting = false;
        setTimeout(() => {
            roiBox.classList.remove("detecting");
        }, 150);
    }
}

// Update UI elements based on prediction results
function updateUI(data, timeMs) {
    const letter = data.label;
    const confidence = data.confidence;
    
    // Display letter & confidence value
    predictedChar.textContent = letter;
    confidenceValue.textContent = `${(confidence * 100).toFixed(1)}%`;
    progressBarFill.style.width = `${confidence * 100}%`;
    inferenceTime.textContent = `${timeMs} ms`;
    
    // Text-to-Speech logic (Only speaks when letter changes to avoid constant repetition)
    if (isTTSEnabled && letter !== lastDetectedChar && letter !== "?") {
        speak(letter);
        lastDetectedChar = letter;
    }
    
    // Sort and render top 5 probabilities
    renderProbabilities(data.probabilities, letter);
}

// Render Top 5 Probabilities Chart Breakdown
function renderProbabilities(probs, topLetter) {
    if (!probs) return;
    
    // Convert to sorted array
    const sortedProbs = Object.entries(probs)
        .map(([char, val]) => ({ char, val }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 5); // Take top 5
        
    probabilitiesList.innerHTML = "";
    
    sortedProbs.forEach(item => {
        const percent = (item.val * 100).toFixed(1);
        const isTop = item.char === topLetter;
        
        const probRow = document.createElement("div");
        probRow.className = `prob-row ${isTop ? 'top-match' : ''}`;
        
        probRow.innerHTML = `
            <span class="prob-label">${item.char}</span>
            <div class="prob-bar-container">
                <div class="prob-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <span class="prob-value">${percent}%</span>
        `;
        
        probabilitiesList.appendChild(probRow);
    });
}

// Reset UI state on error or stop
function resetPredictionUI(char = "?") {
    predictedChar.textContent = char;
    confidenceValue.textContent = "0%";
    progressBarFill.style.width = "0%";
    inferenceTime.textContent = "-- ms";
}

// Text-to-Speech Utility
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Sign language is in English letters
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

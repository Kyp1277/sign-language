# SignTalk MNIST - Sign Language Recognition Frontend

Aplikasi frontend berbasis web (single-page application) yang interaktif untuk deteksi gerakan tangan bahasa isyarat Amerika (American Sign Language - ASL) secara real-time. Aplikasi ini terintegrasi dengan model **Convolutional Neural Network (CNN)** yang dideploy sebagai API di Hugging Face Spaces.

## Fitur Utama

- **Live Camera Feed & Bounding Box Guide**: Pengguna dibantu kotak panduan statis (ROI) untuk memposisikan tangan secara presisi sebelum dideteksi.
- **Deteksi Real-Time (Auto-Detect)**: Fitur looping otomatis untuk mengirim gambar tangan secara berkala (setiap 650ms) guna menampilkan prediksi secara real-time.
- **Top 5 Probabilities Chart**: Menampilkan bagan bar interaktif untuk 5 prediksi huruf tertinggi beserta nilai persentase kecocokannya.
- **Text-to-Speech (TTS)**: Aksesibilitas suara menggunakan Web Speech API untuk membaca huruf yang terdeteksi dengan keras secara otomatis (hanya bersuara jika huruf berubah).
- **Pengaturan API Mandiri**: Memungkinkan pengguna mengganti URL Endpoint API Hugging Face langsung dari UI.

## Struktur File

```text
├── index.html   # Struktur utama antarmuka pengguna (HTML5)
├── style.css    # Desain premium gelap, glassmorphism, dan animasi CSS
└── app.js       # Logika akses kamera, cropping ROI, dan komunikasi API
```

## Cara Menjalankan Secara Lokal

Karena aplikasi ini dikembangkan murni menggunakan Vanilla HTML, CSS, dan Javascript tanpa framework tambahan:

1. Kloning repositori ini ke komputer Anda.
2. Klik ganda file `index.html` untuk langsung membukanya di browser internet pilihan Anda (Chrome, Edge, Firefox, atau Safari).
3. Pastikan browser Anda diizinkan untuk mengakses kamera/webcam.

## Cara Deploy ke GitHub Pages

Aplikasi web statis ini sangat mudah di-host gratis di **GitHub Pages**:

1. Pastikan semua file proyek (`index.html`, `style.css`, `app.js`, `README.md`) telah di-push ke repositori GitHub Anda.
2. Di halaman repositori GitHub Anda, buka tab **Settings** (Pengaturan).
3. Cari menu **Pages** di kolom sebelah kiri.
4. Di bagian *Build and deployment* > *Source*, pilih **Deploy from a branch**.
5. Pilih branch **`main`** (atau `master`) dan folder `/ (root)`, lalu klik **Save** (Simpan).
6. Tunggu sekitar 1 menit, GitHub akan menampilkan URL situs web Anda (misalnya: `https://USERNAME.github.io/sign-language/`).

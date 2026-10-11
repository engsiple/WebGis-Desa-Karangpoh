document.addEventListener('DOMContentLoaded', function() {
    // Mengambil semua elemen gambar dengan class 'slide' di dalam '#hero-slideshow'
    const slides = document.querySelectorAll('#hero-slideshow .slide');
    let currentSlideIndex = 0;
    
    // Pastikan ada gambar yang ditemukan
    if (slides.length > 0) {
        // Fungsi untuk mengganti slide
        function nextSlide() {
            // Hapus class 'active' dari slide saat ini (akan membuatnya memudar)
            slides[currentSlideIndex].classList.remove('active');
            
            // Tentukan index slide berikutnya. Jika sudah mencapai akhir, kembali ke 0.
            currentSlideIndex = (currentSlideIndex + 1) % slides.length;
            
            // Tambahkan class 'active' ke slide berikutnya (akan memunculkannya)
            slides[currentSlideIndex].classList.add('active');
        }

        // Jalankan fungsi nextSlide setiap 5000 milidetik (5 detik)
        setInterval(nextSlide, 5000);
    }
});

// =========================================================
// ANIMASI TRANSISI PINDAH HALAMAN (SANGAT SMOOTH & LAMA)
// =========================================================
document.addEventListener("DOMContentLoaded", function () {
  const transitionLinks = document.querySelectorAll("a[href='index.html'], a[href='peta.html']");

  transitionLinks.forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault(); // Menahan klik agar tidak langsung pindah URL
      const targetUrl = this.href; 

      // Memicu efek redup dan geser ke kiri (fade-out)
      document.body.classList.add("fade-out");

      // Browser dipaksa menunggu 1,5 detik sampai layar benar-benar kosong
      // sebelum memuat halaman baru
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 1500); 
    });
  });
});
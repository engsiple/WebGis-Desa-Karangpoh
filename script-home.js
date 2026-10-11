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
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const slideIndicator = document.getElementById('slideIndicator');
  const dotNav = document.getElementById('dotNav');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const printBtn = document.getElementById('printBtn');

  let currentSlide = 1;
  const totalSlides = slides.length;

  // Build Dot Navigation
  for (let i = 1; i <= totalSlides; i++) {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    if (i === 1) dot.classList.add('active');
    dot.dataset.slide = i;
    dot.addEventListener('click', () => goToSlide(i));
    dotNav.appendChild(dot);
  }

  const dots = document.querySelectorAll('.dot');

  function updateSlideState() {
    slides.forEach((slide) => {
      const slideNum = parseInt(slide.dataset.slide, 10);
      if (slideNum === currentSlide) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot) => {
      const dotNum = parseInt(dot.dataset.slide, 10);
      if (dotNum === currentSlide) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    slideIndicator.textContent = `Slide ${currentSlide} / ${totalSlides}`;
    prevBtn.disabled = currentSlide === 1;
    nextBtn.disabled = currentSlide === totalSlides;
  }

  function goToSlide(num) {
    if (num < 1) num = 1;
    if (num > totalSlides) num = totalSlides;
    currentSlide = num;
    updateSlideState();
  }

  prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
  nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Space') {
      e.preventDefault();
      goToSlide(currentSlide + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToSlide(currentSlide - 1);
    }
  });

  // Fullscreen mode toggle
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });

  // Print / Save to PDF
  printBtn.addEventListener('click', () => {
    window.print();
  });

  updateSlideState();
});

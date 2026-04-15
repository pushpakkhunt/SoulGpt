const fadeItems = document.querySelectorAll(
    '.lp-section, .lp-hero-copy, .lp-hero-visual, .lp-mood-strip, .lp-final-cta, .lp-footer'
  );
  
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      }
    },
    {
      threshold: 0.12,
    }
  );
  
  fadeItems.forEach((item) => observer.observe(item));
  
  const orb = document.querySelector('.central-orb');
  const scene = document.querySelector('.sacred-scene');
  
  if (orb && scene) {
    scene.addEventListener('mousemove', (e) => {
      const rect = scene.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
  
      orb.style.transform = `translate(${x * 12}px, ${y * 12}px)`;
    });
  
    scene.addEventListener('mouseleave', () => {
      orb.style.transform = 'translate(0, 0)';
    });
  }
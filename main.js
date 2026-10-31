/**
 * Intelligence Designed To Evolve — Main JavaScript
 * Handles stats count-up animation and mobile navigation interactions.
 */

document.addEventListener("DOMContentLoaded", () => {
  initStatsCountUp();
  initMobileMenu();
  initNavLinks();
});

/**
 * --------------------------------------------------------------------------
 * Stats Count-Up Animation
 * Uses easeOutCubic with staggered duration and start offset.
 * Triggered once via IntersectionObserver (threshold: 0.25).
 * --------------------------------------------------------------------------
 */
function initStatsCountUp() {
  const statValues = document.querySelectorAll(".stat-value");
  if (!statValues.length) return;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          obs.disconnect(); // Trigger once

          statValues.forEach((el, index) => {
            const target = parseFloat(el.getAttribute("data-target")) || 0;
            const suffix = el.getAttribute("data-suffix") || "";
            const decimals = parseInt(el.getAttribute("data-decimals"), 10) || 0;

            const duration = 1500 + index * 80;
            const startOffset = 480 + index * 90;

            setTimeout(() => {
              animateValue(el, 0, target, duration, decimals, suffix, easeOutCubic);
            }, startOffset);
          });
        }
      });
    },
    { threshold: 0.25 }
  );

  const footer = document.querySelector(".stats-footer");
  if (footer) {
    observer.observe(footer);
  } else {
    statValues.forEach((el) => observer.observe(el));
  }
}

function animateValue(el, start, end, duration, decimals, suffix, easingFn) {
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(progress);

    const currentVal = start + (end - start) * easedProgress;
    el.textContent = currentVal.toFixed(decimals) + suffix;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = end.toFixed(decimals) + suffix;
    }
  }

  requestAnimationFrame(step);
}

/**
 * --------------------------------------------------------------------------
 * Mobile Navigation Menu & Overlay
 * --------------------------------------------------------------------------
 */
function initMobileMenu() {
  const burgerBtn = document.getElementById("burgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const mobileLinks = document.querySelectorAll(".mobile-link, .mobile-signin");

  if (!burgerBtn || !mobileMenu || !mobileOverlay) return;

  let isOpen = false;

  function openMenu() {
    isOpen = true;
    burgerBtn.setAttribute("aria-expanded", "true");
    mobileMenu.removeAttribute("hidden");
    mobileOverlay.removeAttribute("hidden");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    isOpen = false;
    burgerBtn.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("hidden", "");
    mobileOverlay.setAttribute("hidden", "");
    document.body.classList.remove("menu-open");
  }

  function toggleMenu() {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  // Toggle button click
  burgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Overlay click closes menu
  mobileOverlay.addEventListener("click", closeMenu);

  // Escape key closes menu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeMenu();
    }
  });

  // Close when clicking any menu link
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  // Close automatically if window resized above 720px
  window.addEventListener("resize", () => {
    if (window.innerWidth > 720 && isOpen) {
      closeMenu();
    }
  });
}

/**
 * --------------------------------------------------------------------------
 * Navigation Link Active State Toggle
 * --------------------------------------------------------------------------
 */
function initNavLinks() {
  const desktopLinks = document.querySelectorAll(".nav-link");
  const mobileLinks = document.querySelectorAll(".mobile-link");

  function setActive(links, clickedLink) {
    links.forEach((l) => l.classList.remove("active"));
    clickedLink.classList.add("active");
  }

  desktopLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      setActive(desktopLinks, link);
    });
  });

  mobileLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      setActive(mobileLinks, link);
    });
  });
}

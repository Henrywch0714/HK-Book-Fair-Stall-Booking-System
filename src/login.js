document.addEventListener("DOMContentLoaded", function () {
  const roleToggle = document.getElementById("roleToggle");
  const roleInput = document.getElementById("roleInput");
  const loginForm = document.getElementById("loginForm");
  const rememberCheckbox = document.getElementById("rememberMe");

  // Prefill remembered email if available
  if (loginForm) {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      const emailInput = loginForm.querySelector('input[name="email"]');
      if (emailInput) {
        emailInput.value = rememberedEmail;
      }
      if (rememberCheckbox) {
        rememberCheckbox.checked = true;
      }
    }
  }

  if (roleToggle && roleInput) {
    roleToggle.addEventListener("click", function (e) {
      const btn = e.target.closest(".role-btn");
      if (!btn) return;

      const role = btn.getAttribute("data-role");
      if (!role) return;

      roleInput.value = role;

      const buttons = roleToggle.querySelectorAll(".role-btn");
      buttons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(loginForm);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "").trim();
      const role = formData.get("role") || "exhibitor";

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      try {
        const result = await apiService.login({
          email,
          password,
          role
        });

        if (!result.token) {
          throw new Error("Server did not return a token");
        }

        if (!result.user || !result.user._id) {
          throw new Error("Server did not return user information");
        }

        localStorage.setItem("token", result.token);
        localStorage.setItem("userId", result.user._id);
        localStorage.setItem("user", JSON.stringify(result.user));

        // Remember login email if checkbox is checked
        if (rememberCheckbox && rememberCheckbox.checked) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        const redirectUrl = sessionStorage.getItem("redirectAfterLogin");

        if (redirectUrl) {
          sessionStorage.removeItem("redirectAfterLogin");
          window.location.href = redirectUrl;
        } else {
          if (result.user.role === "admin") {
            window.location.href = "../webContent/admin-dashboard.html";
          } else {
            window.location.href = "../webContent/exhibitor-dashboard.html";
          }
        }
      } catch (error) {
        console.error("Login failed:", error);
        alert(
          error.message ||
            "Login failed. Please check your credentials and try again."
        );
      }
    });
  }

  // =====================================================================
  // ================= NEW: simple slider logic added below ===============
  // This block controls the left-side image slideshow and does NOT
  // change any existing login behavior above.
  // =====================================================================
  (function initLoginSlider() {
    const slider = document.getElementById("loginHeroSlider");
    if (!slider) return;

    const slides = Array.from(
      slider.querySelectorAll(".login-hero-slide")
    );
    const dots = Array.from(
      document.querySelectorAll(".login-hero-dot")
    );

    if (!slides.length) return;

    let current = 0;
    const INTERVAL = 4000; // 4 seconds per slide
    let timer = null;

    function showSlide(index) {
      slides.forEach((el, i) => {
        el.classList.toggle("is-active", i === index);
      });
      dots.forEach((el, i) => {
        el.classList.toggle("is-active", i === index);
      });
      current = index;
    }

    function nextSlide() {
      const next = (current + 1) % slides.length;
      showSlide(next);
    }

    function start() {
      if (timer) return;
      timer = setInterval(nextSlide, INTERVAL);
    }

    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        stop();
        showSlide(index);
        start();
      });
    });

    slider.addEventListener("mouseenter", stop);
    slider.addEventListener("mouseleave", start);

    // start autoplay on load
    start();
  })();
  // ======================= END of new slider logic ======================
});
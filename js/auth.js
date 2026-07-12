
import { auth } from "./firebase.js";
import { showToast } from "./main.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

function safeRedirect(url) {
  window.location.assign(url);
}

function setButtonBusy(button, busy, label = "Login") {
  if (!button) return;
  button.disabled = busy;
  button.dataset.originalHtml = button.dataset.originalHtml || button.innerHTML;
  button.innerHTML = busy
    ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span> Signing in...'
    : button.dataset.originalHtml;
  if (!busy && label && !button.dataset.originalHtml) button.innerHTML = label;
}

export async function loginWithEmailPassword({ email, password, rememberMe = false }) {
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout(redirectUrl = "login.html") {
  await signOut(auth);
  localStorage.removeItem("electronicShopAdminEmail");
  localStorage.removeItem("electronicShopAdminUid");
  localStorage.removeItem("electronicShopAuthReady");
  safeRedirect(redirectUrl);
}

export function bindLogoutButtons(selector = ".logout-btn", redirectUrl = "login.html") {
  document.querySelectorAll(selector).forEach((button) => {
    if (button.dataset.logoutBound === "true") return;
    button.dataset.logoutBound = "true";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span> Logging out...';
      try {
        await logout(redirectUrl);
      } catch (error) {
        console.error("Logout failed:", error);
        button.disabled = false;
        button.innerHTML = originalHtml;
        showToast(error?.message || "Could not log out", "danger", "Logout");
      }
    });
  });
}

export async function requireAuth({ redirectUrl = "login.html" } = {}) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      localStorage.setItem("electronicShopAuthReady", "1");
      if (!user) {
        safeRedirect(redirectUrl);
        resolve(null);
        return;
      }
      localStorage.setItem("electronicShopAdminEmail", user.email || "");
      localStorage.setItem("electronicShopAdminUid", user.uid || "");
      bindLogoutButtons();
      resolve(user);
    });
  });
}

export function initLoginPage({
  formId = "loginForm",
  emailId = "email",
  passwordId = "password",
  rememberId = "rememberMe",
  togglePasswordId = "togglePassword",
  toggleIconId = "toggleIcon",
  successRedirect = "dashboard.html"
} = {}) {
  const form = document.getElementById(formId);
  const emailInput = document.getElementById(emailId);
  const passwordInput = document.getElementById(passwordId);
  const rememberInput = document.getElementById(rememberId);
  const togglePassword = document.getElementById(togglePasswordId);
  const toggleIcon = document.getElementById(toggleIconId);
  const submitButton = form?.querySelector('button[type="submit"]');

  const savedEmail = localStorage.getItem("electronicShopAdminEmail");
  if (savedEmail && emailInput) emailInput.value = savedEmail;
  if (rememberInput && savedEmail) rememberInput.checked = true;

  onAuthStateChanged(auth, (user) => {
    if (user) safeRedirect(successRedirect);
  });

  if (togglePassword && passwordInput && toggleIcon) {
    togglePassword.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      toggleIcon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";
    const rememberMe = Boolean(rememberInput?.checked);

    if (!email || !password) {
      showToast("Enter email and password", "warning", "Login");
      return;
    }

    try {
      setButtonBusy(submitButton, true);
      await loginWithEmailPassword({ email, password, rememberMe });
      localStorage.setItem("electronicShopAdminEmail", email);
      showToast("Login successful", "success", "Welcome back");
      setTimeout(() => safeRedirect(successRedirect), 300);
    } catch (error) {
      console.error("Login failed:", error);
      showToast(error?.message || "Login failed", "danger", "Login");
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
}

window.ShopAuth = {
  loginWithEmailPassword,
  logout,
  bindLogoutButtons,
  requireAuth,
  initLoginPage
};

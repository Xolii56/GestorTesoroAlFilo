// public/modules/auth.js

document.addEventListener('DOMContentLoaded', () => {
  const { supa } = window;

  const loginBtn = document.getElementById('login-discord');
  if (!loginBtn) return;

  loginBtn.addEventListener('click', async () => {
    try {
      window.localStorage.setItem('afterLogin', '1');
      
      await supa.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          // Siempre volvemos al index después del login
          redirectTo: window.location.origin + '/index.html'
        }
      });
    } catch (e) {
      console.error('Error al iniciar login con Discord:', e);
      alert('No se ha podido iniciar sesión con Discord.');
    }
  });
});

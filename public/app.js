document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-discord');
  const goApp = document.getElementById('go-app');
  if(loginBtn){
    loginBtn.addEventListener('click', async () => {
      await window.signInWithDiscord();
    });
  }
  const logoutBtn = document.getElementById('logout');
  if(logoutBtn){
    logoutBtn.addEventListener('click', async () => {
      await window.signOut();
      window.location.href = './index.html';
    });
  }
});

// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. SELECCIÓN DE ELEMENTOS DEL DOM
  // ==========================================
  const userNameSpan = document.getElementById('user-name');
  const userAvatar = document.querySelector('.avatar');
  const logoutBtn = document.getElementById('btn-logout');

  // ==========================================
  // 2. MOSTRAR DATOS DEL USUARIO LOGUEADO
  // ==========================================
  // Recuperamos los datos guardados en el localStorage durante el login
  const userData = localStorage.getItem('usuarioEcoAlerta');

  if (userData) {
    const user = JSON.parse(userData);
    // Mostramos el nombre en la barra superior
    userNameSpan.textContent = user.nombre;
    // Mostramos la primera letra del nombre en el avatar
    userAvatar.textContent = user.nombre.charAt(0).toUpperCase();
  } else {
    // Si no hay datos de sesión, redirigimos al login por seguridad
    window.location.href = 'login.html';
  }

  // ==========================================
  // 3. LÓGICA DE CERRAR SESIÓN
  // ==========================================
  logoutBtn.addEventListener('click', () => {
    // 1. Confirmar la acción con el usuario
    const confirmar = confirm('¿Estás seguro de que deseas cerrar sesión?');

    if (confirmar) {
      // 2. Eliminar los datos de sesión del almacenamiento local
      localStorage.removeItem('usuarioEcoAlerta');

      // 3. Redirigir a la página de login
      window.location.href = 'login.html';
    }
  });
});
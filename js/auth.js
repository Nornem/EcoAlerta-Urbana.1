// js/auth.js

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 0. SIMULACIÓN DE BASE DE DATOS DE USUARIOS
  // ==========================================
  // Usuario por defecto para probar la validación
  const usuariosRegistrados = [
    {
      email: "vecino@ecoalerta.com",
      password: "123456",
      nombre: "Vecino de Prueba"
    }
  ];

  // ==========================================
  // 1. SELECCIÓN DE ELEMENTOS DEL DOM
  // ==========================================
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const googleBtn = document.getElementById('btn-google');
  const alertContainer = document.getElementById('alert-message');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ==========================================
  // 2. FUNCIONES AUXILIARES
  // ==========================================
  const showAlert = (message, type) => {
    alertContainer.textContent = message;
    alertContainer.className = `alert-message ${type}`;
  };

  const hideAlert = () => {
    alertContainer.textContent = '';
    alertContainer.className = 'alert-message hidden';
  };

  const setFieldError = (input, message) => {
    const formGroup = input.parentElement;
    const errorSpan = formGroup.querySelector('.error-text');
    formGroup.classList.add('has-error');
    if (errorSpan) errorSpan.textContent = message;
  };

  const clearFieldError = (input) => {
    const formGroup = input.parentElement;
    const errorSpan = formGroup.querySelector('.error-text');
    formGroup.classList.remove('has-error');
    if (errorSpan) errorSpan.textContent = '';
  };

  const validateField = (input) => {
    const value = input.value.trim();

    // Validar campo vacío (CA02 / CA04)
    if (value === '') {
      setFieldError(input, 'Este campo es obligatorio.');
      return false;
    }

    // Validar formato de correo (CA03)
    if (input.type === 'email' && !emailRegex.test(value)) {
      setFieldError(input, 'Ingresa un correo electrónico válido (ejemplo@dominio.com).');
      return false;
    }

    // Validar longitud de contraseña (CA03)
    if (input.type === 'password' && value.length < 6) {
      setFieldError(input, 'La contraseña debe tener al menos 6 caracteres.');
      return false;
    }

    clearFieldError(input);
    return true;
  };

  // ==========================================
  // 3. LÓGICA DE AUTENTICACIÓN
  // ==========================================
  const autenticarUsuario = (email, password) => {
    // Busca si existe un usuario con ese email y contraseña
    return usuariosRegistrados.find(user => user.email === email && user.password === password);
  };

  // ==========================================
  // 4. EVENTOS
  // ==========================================

  // A. Validación en tiempo real (Escenario 5: Corrección y reintento)
  [emailInput, passwordInput].forEach((input) => {
    input.addEventListener('input', () => {
      validateField(input);
      if (!emailInput.parentElement.classList.contains('has-error') &&
          !passwordInput.parentElement.classList.contains('has-error')) {
        hideAlert();
      }
    });
  });

  // B. Envío del formulario (Login)
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // 1. Validar formato de campos
    const isEmailValid = validateField(emailInput);
    const isPasswordValid = validateField(passwordInput);

    if (!isEmailValid || !isPasswordValid) {
      showAlert('Por favor, corrige los errores destacados antes de ingresar.', 'error');
      return;
    }

    // 2. Validar credenciales contra la "base de datos"
    const usuario = autenticarUsuario(emailInput.value.trim(), passwordInput.value.trim());

    if (usuario) {
      // CA05: Éxito
      showAlert(`¡Bienvenido, ${usuario.nombre}! Redirigiendo al panel...`, 'success');
      
      // Guardar sesión (opcional para futuras validaciones)
      localStorage.setItem('usuarioEcoAlerta', JSON.stringify(usuario));

      // Redirigir al Dashboard (mapa.html)
      setTimeout(() => {
        window.location.href = 'mapa.html';
      }, 1500);
    } else {
      // Credenciales incorrectas (No existe el usuario)
      showAlert('Correo o contraseña incorrectos. Inténtalo de nuevo.', 'error');
      setFieldError(passwordInput, 'Credenciales inválidas.');
    }
  });

  // C. Login con Google (Simulado)
  googleBtn.addEventListener('click', () => {
    showAlert('Autenticando con Google... ¡Bienvenido!', 'success');
    
    // Simulamos un usuario de Google
    const usuarioGoogle = { nombre: "Usuario Google", email: "google@ecoalerta.com" };
    localStorage.setItem('usuarioEcoAlerta', JSON.stringify(usuarioGoogle));

    setTimeout(() => {
      window.location.href = 'mapa.html';
    }, 1500);
  });
});
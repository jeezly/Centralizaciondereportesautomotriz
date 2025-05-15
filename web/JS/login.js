document.addEventListener('DOMContentLoaded', async function() {
    const BASE_URL = 'http://localhost:8080/CentroAutomotrizElRosario/api';
    
    // Mostrar/ocultar contraseña
    document.getElementById('showPassword').addEventListener('click', function() {
        const input = document.getElementById('password');
        input.type = input.type === 'password' ? 'text' : 'password';
        this.innerHTML = input.type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });

    // Manejar login
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor completa todos los campos',
                confirmButtonColor: '#1e962e'
            });
            return;
        }
        
        try {
            // Mostrar carga
            await Swal.fire({
                title: 'Verificando credenciales',
                html: 'Por favor espera...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                timer: 1500
            });

            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombreUsuario: username, password: password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Credenciales incorrectas');
            }

            // Guardar datos de sesión (actualizado con idEmpleado)
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('idUsuario', data.idUsuario);
            sessionStorage.setItem('rol', data.rol);
            sessionStorage.setItem('idEmpleado', data.idEmpleado);
            sessionStorage.setItem('nombreCompleto', data.nombreCompleto || '');
            sessionStorage.setItem('sucursal', data.sucursal || '');
            sessionStorage.setItem('nombreUsuario', username);
            
            // Alert de éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: `Redirigiendo a panel de ${data.rol}...`,
                confirmButtonColor: '#1e962e',
                timer: 1500,
                timerProgressBar: true,
                willClose: () => {
                    const redirect = data.rol === 'gerente' ? 'vistaGerente.html' : 'vistaEmpleado.html';
                    window.location.href = `./HTML/${redirect}`;
                }
            });
            
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonColor: '#1e962e'
            });
        }
    });
    
    // Redirigir si ya está autenticado
    if (sessionStorage.getItem('token')) {
        const rol = sessionStorage.getItem('rol');
        const redirect = rol === 'gerente' ? 'vistaGerente.html' : 'vistaEmpleado.html';
        window.location.href = `./HTML/${redirect}`;
    }
});
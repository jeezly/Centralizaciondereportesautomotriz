document.addEventListener('DOMContentLoaded', async function() {
    const BASE_URL = 'http://localhost:8080/CentroAutomotrizElRosario/api';
    
    // 1. Verificar sesión
    const token = sessionStorage.getItem('token');
    const rol = sessionStorage.getItem('rol');
    const idUsuario = sessionStorage.getItem('idUsuario');
    const idEmpleado = sessionStorage.getItem('idEmpleado');
    const nombreCompleto = sessionStorage.getItem('nombreCompleto');
    const sucursal = sessionStorage.getItem('sucursal');
    const nombreUsuario = sessionStorage.getItem('nombreUsuario');

    if (!token || rol !== 'empleado' || !idEmpleado) {
        window.location.href = '../index.html';
        return;
    }

    try {
        // 2. Verificar token con el backend
        const response = await fetch(`${BASE_URL}/login/verifyToken?idUsuario=${idUsuario}&token=${token}`);
        
        if (!response.ok) {
            throw new Error('Sesión inválida o expirada');
        }
        
        const userData = await response.json();
        
        // 3. Mostrar información del usuario
        document.getElementById('employeeName').textContent = userData.nombreCompleto || nombreCompleto || nombreUsuario || 'Empleado';
        
        if (userData.sucursal || sucursal) {
            document.getElementById('employeeInfo').innerHTML = 
                `<small>Sucursal: ${userData.sucursal || sucursal}</small>`;
        }

        // 4. Configurar botones
        document.getElementById('newReportBtn').addEventListener('click', function() {
            Swal.fire({
                title: 'Nuevo Reporte',
                text: 'Redirigiendo al formulario de nuevo reporte...',
                icon: 'info',
                confirmButtonColor: '#1e962e',
                willClose: () => {
                    window.location.href = 'nuevoReporte.html';
                }
            });
        });
        
        document.getElementById('editReportBtn').addEventListener('click', function() {
            Swal.fire({
                title: 'Editar Reporte',
                text: 'Redirigiendo a la edición de reportes...',
                icon: 'info',
                confirmButtonColor: '#1e962e',
                willClose: () => {
                    window.location.href = 'editarReportes.html';
                }
            });
        });
        
        document.getElementById('viewReportsBtn').addEventListener('click', function() {
            Swal.fire({
                title: 'Consultar Reportes',
                text: 'Redirigiendo a la consulta de reportes...',
                icon: 'info',
                confirmButtonColor: '#1e962e',
                willClose: () => {
                    window.location.href = 'consultarReportes.html';
                }
            });
        });
        
        // 5. Configurar logout
        document.getElementById('logoutBtn').addEventListener('click', function() {
            Swal.fire({
                title: `¿Cerrar sesión, ${userData.nombreCompleto || nombreUsuario}?`,
                html: `<p>Estás a punto de salir del sistema</p>
                      <small>Sucursal: ${userData.sucursal || sucursal || 'No especificada'}</small>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#1e962e',
                cancelButtonColor: '#d33',
                confirmButtonText: '<i class="fas fa-sign-out-alt"></i> Salir',
                cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
                reverseButtons: true
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const loadingAlert = Swal.fire({
                        title: 'Cerrando sesión',
                        html: 'Por favor espera...',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });
                    
                    try {
                        // Cerrar sesión en el backend
                        await fetch(`${BASE_URL}/login/logout?idUsuario=${idUsuario}`, {
                            method: 'POST'
                        });
                        
                        // Cerrar alerta de carga
                        await Swal.close();
                        
                        // Mostrar confirmación
                        await Swal.fire({
                            icon: 'success',
                            title: 'Sesión cerrada',
                            text: 'Has salido del sistema correctamente',
                            confirmButtonColor: '#1e962e',
                            timer: 1500,
                            willClose: () => {
                                sessionStorage.clear();
                                window.location.href = '../index.html';
                            }
                        });
                        
                    } catch (error) {
                        await Swal.close();
                        await Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo cerrar sesión correctamente',
                            confirmButtonColor: '#1e962e'
                        });
                        sessionStorage.clear();
                        window.location.href = '../index.html';
                    }
                }
            });
        });

        // 6. Mostrar bienvenida
        setTimeout(() => {
            Swal.fire({
                title: `¡Bienvenido, ${userData.nombreCompleto || nombreUsuario}!`,
                html: userData.sucursal ? 
                    `<p>Has iniciado sesión en el sistema de reportes</p>
                    <small><i class="fas fa-store-alt"></i> ${userData.sucursal}</small>` :
                    '<p>Has iniciado sesión en el sistema de reportes</p>',
                icon: 'success',
                confirmButtonColor: '#1e962e',
                timer: 3000,
                timerProgressBar: true,
                toast: true,
                position: 'top-end'
            });
        }, 500);

    } catch (error) {
        await Swal.fire({
            icon: 'error',
            title: 'Error de autenticación',
            text: error.message,
            confirmButtonColor: '#1e962e'
        });
        sessionStorage.clear();
        window.location.href = '../index.html';
    }
});
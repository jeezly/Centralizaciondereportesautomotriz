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
        
        // 3. Configurar botón de regreso
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'vistaEmpleado.html';
        });
        
        // 4. Cargar reportes iniciales
        await cargarReportes();
        
        // 5. Configurar filtros
        document.getElementById('aplicarFiltrosBtn').addEventListener('click', async function() {
            await cargarReportes();
        });
        
        document.getElementById('limpiarFiltrosBtn').addEventListener('click', function() {
            document.getElementById('filtroFecha').value = '';
            document.getElementById('filtroOrden').value = '';
            cargarReportes();
        });
        
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
    
    // Función para cargar reportes con filtros
    async function cargarReportes() {
        const loadingAlert = Swal.fire({
            title: 'Cargando reportes',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            // Obtener valores de filtros
            const fecha = document.getElementById('filtroFecha').value;
            const orden = document.getElementById('filtroOrden').value;
            
            // Construir URL con parámetros
            let url = `${BASE_URL}/reportes/empleado?idEmpleado=${idEmpleado}`;
            
            if (fecha) url += `&fecha=${fecha}`;
            if (orden) url += `&orden=${orden}`;
            
            // Obtener reportes del backend
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.mensaje || 'Error al obtener los reportes');
            }
            
            const data = await response.json();
            
            if (!data.exito) {
                throw new Error(data.mensaje || 'Error en la respuesta del servidor');
            }
            
            // Mostrar reportes en la interfaz
            mostrarReportes(data.datos || []);
            
            await Swal.close();
            
        } catch (error) {
            await Swal.close();
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Ocurrió un error al cargar los reportes',
                confirmButtonColor: '#1e962e'
            });
            console.error('Error al cargar reportes:', error);
        }
    }
    
    // Función para mostrar reportes en la interfaz
    function mostrarReportes(reportes) {
        const reportesContainer = document.getElementById('reportesContainer');
        reportesContainer.innerHTML = '';
        
        if (!reportes || reportes.length === 0) {
            reportesContainer.innerHTML = `
                <div class="no-reportes">
                    <i class="fas fa-folder-open fa-3x" style="color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No se encontraron reportes</p>
                </div>
            `;
            return;
        }
        
        reportes.forEach(reporte => {
            const reporteCard = document.createElement('div');
            reporteCard.className = 'reporte-card';
            reporteCard.innerHTML = `
                <div class="reporte-icon">
                    <img src="../MEDIA/registroEditar.png" alt="Editar Reporte">
                </div>
                <div class="reporte-info">
                    <h3>Reporte #${reporte.id_cierre}</h3>
                    <p>Órdenes: ${reporte.orden_inicio} - ${reporte.orden_fin}</p>
                    <p>Total: $${reporte.total.toFixed(2)}</p>
                    <div class="reporte-date">
                        <p>Fecha: ${new Date(reporte.fecha_cierre).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</p>
                    </div>
                </div>
            `;
            
            // Configurar evento para editar reporte
            reporteCard.addEventListener('click', () => {
                abrirEditarReporte(reporte.id_cierre);
            });
            
            reportesContainer.appendChild(reporteCard);
        });
    }
    
    // Función para abrir la edición de un reporte específico
    function abrirEditarReporte(idReporte) {
        // Guardar el ID en sessionStorage y pasarlo por URL
        sessionStorage.setItem('reporteAEditar', idReporte);
        window.location.href = `editarReporteIndividual.html?id=${idReporte}`;
    }
});
document.addEventListener('DOMContentLoaded', async function() {
    const BASE_URL = 'http://localhost:8080/CentroAutomotrizElRosario/api';
    const token = sessionStorage.getItem('token');
    const rol = sessionStorage.getItem('rol');
    const idUsuario = sessionStorage.getItem('idUsuario');

    // Verificar sesión
    if (!token || rol !== 'gerente') {
        window.location.href = '../index.html';
        return;
    }

    try {
        // Verificar token con el backend
        const response = await fetch(`${BASE_URL}/login/verifyToken?idUsuario=${idUsuario}&token=${token}`);
        if (!response.ok) {
            throw new Error('Sesión inválida o expirada');
        }

        // Configurar botón de regreso
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'vistaGerente.html';
        });

        // Cargar datos iniciales
        await cargarSucursales();
        await cargarEmpleados();
        
        // Inicializar DataTable
        const table = $('#reportesTable').DataTable({
            dom: 'lrtip',
            responsive: true,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/es-MX.json'
            },
            columns: [
                { 
                    data: null,
                    defaultContent: '',
                    className: 'select-checkbox',
                    orderable: false
                },
                { 
                    data: 'fecha_cierre',
                    render: function(data) {
                        return new Date(data).toLocaleDateString('es-MX');
                    }
                },
                { data: 'orden_inicio' },
                { data: 'orden_fin' },
                { data: 'empleado' },
                { data: 'sucursal' },
                { 
                    data: 'total',
                    render: function(data, type, row) {
                        return `$${parseFloat(data).toFixed(2)}`;
                    }
                },
                {
                    data: null,
                    render: function(data, type, row) {
                        return `<button class="btn btn-sm btn-primary ver-detalle" data-id="${row.id_cierre}">
                            <i class="fas fa-eye"></i> Ver
                        </button>`;
                    },
                    orderable: false
                }
            ],
            select: {
                style: 'multi',
                selector: 'td:first-child'
            },
            initComplete: function() {
                this.api().on('select deselect', function() {
                    const selectedCount = table.rows({ selected: true }).count();
                    document.getElementById('consolidarBtn').disabled = selectedCount < 2;
                });
            }
        });

        // Cargar reportes iniciales
        await cargarReportes(table);
        
        // Configurar filtros
        document.getElementById('aplicarFiltrosBtn').addEventListener('click', async function() {
            await cargarReportes(table);
        });
        
        document.getElementById('limpiarFiltrosBtn').addEventListener('click', function() {
            document.getElementById('filtroFechaInicio').value = '';
            document.getElementById('filtroFechaFin').value = '';
            document.getElementById('filtroOrdenInicio').value = '';
            document.getElementById('filtroOrdenFin').value = '';
            document.getElementById('filtroSucursal').value = '';
            document.getElementById('filtroEmpleado').value = '';
            cargarReportes(table);
        });
        
        // Configurar botón de consolidar
        document.getElementById('consolidarBtn').addEventListener('click', function() {
            const selectedRows = table.rows({ selected: true }).data().toArray();
            
            if (selectedRows.length < 2) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Selección insuficiente',
                    text: 'Por favor selecciona al menos dos reportes para consolidar',
                    confirmButtonColor: '#1e962e'
                });
                return;
            }
            
            const idsReportes = selectedRows.map(row => row.id_cierre);
            sessionStorage.setItem('reportesAConsolidar', JSON.stringify(idsReportes));
            window.location.href = 'verReporteConsolidado.html';
        });
        
        // Delegación de eventos para botones de ver detalle
        document.getElementById('reportesTable').addEventListener('click', function(e) {
            if (e.target.closest('.ver-detalle')) {
                const idReporte = e.target.closest('.ver-detalle').getAttribute('data-id');
                sessionStorage.setItem('reporteAVer', idReporte);
                window.location.href = 'verReporteIndividualGerente.html';
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error de autenticación',
            text: error.message,
            confirmButtonColor: '#1e962e'
        });
        sessionStorage.clear();
        window.location.href = '../index.html';
    }
    
    // Función para cargar sucursales
    async function cargarSucursales() {
        try {
            const response = await fetch(`${BASE_URL}/sucursales/activas`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener sucursales');
            }
            
            const data = await response.json();
            
            const select = document.getElementById('filtroSucursal');
            select.innerHTML = '<option value="">Todas</option>';
            
            if (data.exito && data.datos) {
                data.datos.forEach(sucursal => {
                    const option = document.createElement('option');
                    option.value = sucursal.id_sucursal;
                    option.textContent = sucursal.nombre_sucursal;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar sucursales:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las sucursales',
                confirmButtonColor: '#1e962e'
            });
        }
    }

    // Función para cargar empleados
    async function cargarEmpleados() {
        try {
            const response = await fetch(`${BASE_URL}/empleados/activos`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener empleados');
            }
            
            const data = await response.json();
            
            const select = document.getElementById('filtroEmpleado');
            select.innerHTML = '<option value="">Todos</option>';
            
            if (data.exito && data.datos) {
                data.datos.forEach(empleado => {
                    const option = document.createElement('option');
                    option.value = empleado.id_empleado;
                    option.textContent = empleado.nombre_completo;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar empleados:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los empleados',
                confirmButtonColor: '#1e962e'
            });
        }
    }
    
    // Función para cargar reportes con filtros
    async function cargarReportes(table) {
        const loadingAlert = Swal.fire({
            title: 'Cargando reportes',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            // Obtener valores de filtros
            const fechaInicio = document.getElementById('filtroFechaInicio').value;
            const fechaFin = document.getElementById('filtroFechaFin').value;
            const ordenInicio = document.getElementById('filtroOrdenInicio').value;
            const ordenFin = document.getElementById('filtroOrdenFin').value;
            const idSucursal = document.getElementById('filtroSucursal').value;
            const idEmpleado = document.getElementById('filtroEmpleado').value;
            
            // Construir URL con parámetros
            let url = `${BASE_URL}/reportes/gerente`;
            const params = new URLSearchParams();
            
            if (fechaInicio) params.append('fechaInicio', fechaInicio);
            if (fechaFin) params.append('fechaFin', fechaFin);
            if (ordenInicio) params.append('ordenInicio', ordenInicio);
            if (ordenFin) params.append('ordenFin', ordenFin);
            if (idSucursal) params.append('idSucursal', idSucursal);
            if (idEmpleado) params.append('idEmpleado', idEmpleado);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            
            // Obtener reportes del backend
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Verificar si la respuesta es OK
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al obtener los reportes');
            }
            
            // Obtener el texto de la respuesta y limpiarlo
            const responseText = await response.text();
            const cleanedResponse = responseText.trim();
            
            // Parsear el JSON manualmente para mejor control de errores
            let data;
            try {
                data = JSON.parse(cleanedResponse);
            } catch (parseError) {
                console.error('Error al parsear JSON:', parseError);
                console.error('Respuesta recibida:', cleanedResponse);
                throw new Error('Formato de respuesta inválido del servidor');
            }
            
            // Verificar estructura de la respuesta
            if (!data.exito || !data.datos) {
                throw new Error(data.mensaje || 'Error en la respuesta del servidor');
            }
            
            // Limpiar y cargar datos en la tabla
            table.clear();
            
            if (data.datos && data.datos.length > 0) {
                const datosTransformados = data.datos.map(reporte => ({
                    id_cierre: reporte.id_cierre,
                    fecha_cierre: reporte.fecha_cierre,
                    orden_inicio: reporte.orden_inicio || 'N/A',
                    orden_fin: reporte.orden_fin || 'N/A',
                    empleado: reporte.nombre_empleado || 'N/A',
                    sucursal: reporte.nombre_sucursal || 'N/A',
                    total: reporte.total || 0,
                    total_efectivo: reporte.total_efectivo || 0,
                    total_credito_eventual: reporte.total_credito_eventual || 0,
                    total_credito: reporte.total_credito || 0,
                    total_tarjeta: reporte.total_tarjeta || 0,
                    total_transferencia: reporte.total_transferencia || 0
                }));
                
                table.rows.add(datosTransformados).draw();
            }
            
            await Swal.close();
            
        } catch (error) {
            await Swal.close();
            console.error('Error al cargar reportes:', error);
            
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Ocurrió un error al cargar los reportes',
                confirmButtonColor: '#1e962e'
            });
        }
    }
});
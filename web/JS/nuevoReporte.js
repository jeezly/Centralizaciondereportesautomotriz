document.addEventListener('DOMContentLoaded', async function() {
    const BASE_URL = 'http://localhost:8080/CentroAutomotrizElRosario/api';
    
    // Variables globales
    let ordenInicio = 0;
    let ordenFin = 0;
    let creditosGenerados = false;
    
    // Función mejorada para formatear decimales
    window.formatDecimal = function(input) {
        if (!input) return '';
        
        // Si es un elemento input, obtener su valor
        let value = (input instanceof HTMLInputElement) ? input.value : input;
        
        // Guardar posición del cursor si es un input y no es tipo number
        let cursorPos = (input instanceof HTMLInputElement && input.type !== 'number') ? input.selectionStart : null;
        
        // Limpiar caracteres no numéricos excepto punto
        let newValue = value.replace(/[^0-9.]/g, '');
        
        // Manejar múltiples puntos
        const parts = newValue.split('.');
        if (parts.length > 2) {
            // Si hay más de un punto, mantener solo el primero
            newValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limitar a 2 decimales si hay punto
        if (newValue.includes('.')) {
            const decimalParts = newValue.split('.');
            if (decimalParts[1] && decimalParts[1].length > 2) {
                newValue = decimalParts[0] + '.' + decimalParts[1].substring(0, 2);
            }
        }
        
        // Si el valor cambió, actualizar el input
        if (newValue !== value && input instanceof HTMLInputElement) {
            input.value = newValue;
            
            // Ajustar la posición del cursor solo para inputs de texto
            if (cursorPos !== null && input.type !== 'number') {
                // Si se insertó un punto, ajustar la posición
                if (value.length < newValue.length && newValue.charAt(cursorPos) === '.') {
                    cursorPos += 1;
                }
                // Si se eliminaron caracteres, ajustar la posición
                else if (value.length > newValue.length) {
                    cursorPos -= (value.length - newValue.length);
                }
                
                // Asegurar que la posición no sea negativa
                cursorPos = Math.max(0, Math.min(cursorPos, newValue.length));
                input.setSelectionRange(cursorPos, cursorPos);
            }
        }
        
        return newValue;
    };

    // 1. Verificar sesión
    const token = sessionStorage.getItem('token');
    const rol = sessionStorage.getItem('rol');
    const idUsuario = sessionStorage.getItem('idUsuario');
    const idEmpleado = sessionStorage.getItem('idEmpleado');

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
        
        // 3. Configurar fecha actual por defecto
        const fechaInput = document.getElementById('fechaCierre');
        if (fechaInput) {
            const hoy = new Date().toISOString().split('T')[0];
            fechaInput.value = hoy;
            fechaInput.max = hoy;
        }
        
        // 4. Configurar botones con verificación de existencia
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => window.location.href = 'vistaEmpleado.html');
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                Swal.fire({
                    title: '¿Cancelar reporte?',
                    text: 'Los datos no guardados se perderán',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#1e962e',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, cancelar',
                    cancelButtonText: 'No, continuar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = 'vistaEmpleado.html';
                    }
                });
            });
        }
        
        // 5. Configurar eventos para órdenes con validación
        const ordenInicioInput = document.getElementById('ordenInicio');
        if (ordenInicioInput) {
            ordenInicioInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
                actualizarRangoOrdenes();
            });
        }
        
        const ordenFinInput = document.getElementById('ordenFin');
        if (ordenFinInput) {
            ordenFinInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
                actualizarRangoOrdenes();
            });
        }
        
        // 6. Configurar botón para agregar créditos
        const generarCreditosBtn = document.getElementById('generarCreditosBtn');
        if (generarCreditosBtn) {
            generarCreditosBtn.addEventListener('click', function() {
                if (ordenInicio > 0 && ordenFin > 0 && ordenInicio <= ordenFin) {
                    generarFilasCreditos(ordenInicio, ordenFin);
                    creditosGenerados = true;
                    this.disabled = true;
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Rango inválido',
                        text: 'Por favor ingresa un rango de órdenes válido primero',
                        confirmButtonColor: '#1e962e'
                    });
                }
            });
        }
        
        // 7. Configurar cálculos automáticos y validaciones
        setupCalculosAutomaticos();
        
        // 8. Configurar envío del formulario con verificación de existencia
        const reporteForm = document.getElementById('reporteForm');
        if (reporteForm) {
            reporteForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Validar datos antes de enviar
                if (!validateForm()) {
                    return;
                }
                
                // Mostrar confirmación
                Swal.fire({
                    title: '¿Guardar reporte?',
                    html: '<p>¿Estás seguro de que deseas guardar este reporte de cierre?</p>',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#1e962e',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, guardar',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        const loadingAlert = Swal.fire({
                            title: 'Guardando reporte',
                            html: 'Por favor espera...',
                            allowOutsideClick: false,
                            didOpen: () => Swal.showLoading()
                        });
                        
                        try {
                            // Obtener datos del formulario (ya sanitizados)
                            const formData = getFormData();
                            
                            // Enviar datos al backend
                            const response = await fetch(`${BASE_URL}/reportes/nuevo`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify(formData)
                            });
                            
                            const data = await response.json();
                            
                            if (!response.ok) {
                                throw new Error(data.mensaje || 'Error al guardar el reporte');
                            }
                            
                            // Cerrar alerta de carga
                            await Swal.close();
                            
                            // Mostrar éxito
                            await Swal.fire({
                                icon: 'success',
                                title: 'Reporte guardado',
                                text: 'El reporte se ha guardado correctamente',
                                confirmButtonColor: '#1e962e',
                                willClose: () => {
                                    window.location.href = 'vistaEmpleado.html';
                                }
                            });
                            
                        } catch (error) {
                            await Swal.close();
                            await Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: error.message || 'Ocurrió un error al guardar el reporte',
                                confirmButtonColor: '#1e962e'
                            });
                        }
                    }
                });
            });
        }
        
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
    
    // Función para actualizar el rango de órdenes
    function actualizarRangoOrdenes() {
        const ordenInicioInput = document.getElementById('ordenInicio');
        const ordenFinInput = document.getElementById('ordenFin');
        
        if (ordenInicioInput && ordenFinInput) {
            ordenInicio = parseInt(ordenInicioInput.value) || 0;
            ordenFin = parseInt(ordenFinInput.value) || 0;
        }
    }
    
    // Función para generar filas de créditos automáticamente con validaciones
    function generarFilasCreditos(inicio, fin) {
    const creditosBody = document.getElementById('creditos-body');
    if (!creditosBody) return;
    
    creditosBody.innerHTML = ''; // Limpiar tabla existente
    
    // Crear una fila por cada orden en el rango
    for (let i = inicio; i <= fin; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" name="creditoNoOrden" class="credito-input" value="${i}" readonly></td>
            <td><input type="text" name="creditoCliente" class="credito-input" oninput="this.value = this.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .0-9]/g, '')"></td>
            <td>
                <div class="currency-input">
                    <span>$</span>
                    <input type="text" name="creditoMonto" class="credito-input" oninput="formatDecimal(this)">
                </div>
            </td>
            <td><input type="text" name="creditoConcepto" class="credito-input" oninput="this.value = this.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .0-9]/g, '')"></td>
            <td>
                <select name="creditoStatus" class="credito-input">
                    <option value="No pagado" selected>No pagado</option>
                    <option value="Pagado">Pagado</option>
                </select>
            </td>
            <td><button type="button" class="btn remove-btn"><i class="fas fa-trash"></i></button></td>
        `;
        creditosBody.appendChild(tr);
        
        // Configurar evento para eliminar crédito
        const removeBtn = tr.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                tr.remove();
            });
        }
    }
}
    
    // Función para configurar todos los cálculos automáticos y validaciones
    function setupCalculosAutomaticos() {
        // Configurar validación para campos monetarios en relación de cobros
        const moneyInputs = [
            'totalEfectivo', 'totalCreditoEventual', 'totalCredito', 'totalTarjeta',
            'facturacionEfectivo', 'remisionado'
        ];
        
        moneyInputs.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            
            // Cambiar a type="text" para permitir mejor manejo de decimales
            input.type = 'text';
            
            input.addEventListener('input', function(e) {
                // Aplicar formato
                formatDecimal(this);
                calcularTotalCobros();
            });
        });
        
        // Configurar eventos para sumas automáticas en la tabla de verificaciones
        setupVerificacionesCalculations();
        
        // Configurar eventos para suma automática en relación de cobros
        setupRelacionCobrosCalculations();
    }
    
    // Función optimizada para cálculos en tabla de verificaciones
    function setupVerificacionesCalculations() {
        const tiposVerificacion = ['verEstatal', 'verFederal', 'revEstatal', 'revFederal'];
        
        tiposVerificacion.forEach(tipo => {
            const realizadas = document.querySelector(`input[name="${tipo}Realizadas"]`);
            const efectivo = document.querySelector(`input[name="${tipo}Efectivo"]`);
            const tarjeta = document.querySelector(`input[name="${tipo}Tarjeta"]`);
            const credito = document.querySelector(`input[name="${tipo}Credito"]`);
            const transferencia = document.querySelector(`input[name="${tipo}Transferencia"]`);
            const eventuales = document.querySelector(`input[name="${tipo}Eventuales"]`);
            const total = document.querySelector(`input[name="${tipo}Total"]`);
            
            // Cambiar a type="text" para campos monetarios
            [efectivo, tarjeta, credito, transferencia, eventuales].forEach(input => {
                if (!input) return;
                
                input.type = 'text';
                input.addEventListener('input', function(e) {
                    // Aplicar formato
                    formatDecimal(this);
                    actualizarFila();
                });
            });
            
            // Función para actualizar toda la fila
            const actualizarFila = () => {
                // Calcular si hay montos ingresados
                const tieneMontos = [efectivo, tarjeta, credito, transferencia, eventuales].some(
                    input => input && parseFloat(input.value || 0) > 0
                );
                
                // Actualizar realizadas
                if (realizadas) {
                    if (tieneMontos) {
                        if (!realizadas.value || realizadas.value === "0") {
                            realizadas.value = "1";
                        }
                    } else {
                        realizadas.value = "";
                    }
                }
                
                // Calcular total
                if (total) {
                    const totalValue = parseFloat(efectivo?.value || 0) + 
                                     parseFloat(tarjeta?.value || 0) + 
                                     parseFloat(credito?.value || 0) + 
                                     parseFloat(transferencia?.value || 0) + 
                                     parseFloat(eventuales?.value || 0);
                    total.value = totalValue.toFixed(2);
                }
                
                // Actualizar totales generales inmediatamente
                updateTotalesVerificaciones();
            };
            
            // Configurar eventos para realizadas (por si se modifica manualmente)
            if (realizadas) {
                realizadas.addEventListener('input', function() {
                    this.value = this.value.replace(/[^0-9]/g, '');
                    updateTotalesVerificaciones();
                });
            }
            
            // Actualizar fila al inicio por si hay valores precargados
            actualizarFila();
        });
    }
    
    // Función optimizada para actualizar totales de verificaciones
    function updateTotalesVerificaciones() {
        const tiposVerificacion = ['verEstatal', 'verFederal', 'revEstatal', 'revFederal'];
        const columnas = ['Realizadas', 'Efectivo', 'Tarjeta', 'Credito', 'Transferencia', 'Eventuales', 'Total'];
        
        // Calcular totales por columna
        columnas.forEach(col => {
            let suma = 0;
            tiposVerificacion.forEach(tipo => {
                const input = document.querySelector(`input[name="${tipo}${col}"]`);
                if (input && input.value) {
                    suma += parseFloat(input.value);
                }
            });
            
            const totalInput = document.querySelector(`input[name="total${col}Ver"]`);
            if (totalInput) {
                totalInput.value = suma.toFixed(2);
            }
        });
        
        // Calcular el GRAN TOTAL de todas las verificaciones
        let granTotal = 0;
        tiposVerificacion.forEach(tipo => {
            const totalInput = document.querySelector(`input[name="${tipo}Total"]`);
            if (totalInput && totalInput.value) {
                granTotal += parseFloat(totalInput.value);
            }
        });
        
        // Actualizar campos de totales
        const totalVerificacionesInput = document.querySelector(`input[name="totalVerificaciones"]`);
        if (totalVerificacionesInput) {
            totalVerificacionesInput.value = granTotal.toFixed(2);
        }
        
        const totalGeneralInput = document.getElementById('totalGeneral');
        if (totalGeneralInput) {
            totalGeneralInput.value = granTotal.toFixed(2);
        }
    }
    
    // Función para configurar cálculos en relación de cobros
    function setupRelacionCobrosCalculations() {
        const inputsCobros = [
            document.getElementById('totalEfectivo'),
            document.getElementById('totalCreditoEventual'),
            document.getElementById('totalCredito'),
            document.getElementById('totalTarjeta')
        ].filter(input => input !== null);
        
        inputsCobros.forEach(input => {
            input.addEventListener('input', calcularTotalCobros);
        });
    }
    
    // Función para calcular el total de cobros
    function calcularTotalCobros() {
        const totalEfectivo = parseFloat(document.getElementById('totalEfectivo')?.value || 0);
        const totalCreditoEventual = parseFloat(document.getElementById('totalCreditoEventual')?.value || 0);
        const totalCredito = parseFloat(document.getElementById('totalCredito')?.value || 0);
        const totalTarjeta = parseFloat(document.getElementById('totalTarjeta')?.value || 0);
        
        const totalCobros = totalEfectivo + totalCreditoEventual + totalCredito + totalTarjeta;
        const totalCobrosInput = document.getElementById('totalCobros');
        if (totalCobrosInput) {
            totalCobrosInput.value = totalCobros.toFixed(2);
        }
    }
    
    // Función para validar el formulario antes de enviar
    function validateForm() {
        // Validar fecha
        const fechaCierre = document.getElementById('fechaCierre');
        if (!fechaCierre || !fechaCierre.value) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debes especificar la fecha de cierre',
                confirmButtonColor: '#1e962e'
            });
            return false;
        }
        
        // Validar órdenes
        const ordenInicio = document.getElementById('ordenInicio');
        const ordenFin = document.getElementById('ordenFin');
        
        if (!ordenInicio || !ordenInicio.value || !ordenFin || !ordenFin.value) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debes especificar el rango de órdenes',
                confirmButtonColor: '#1e962e'
            });
            return false;
        }
        
        if (parseInt(ordenInicio.value) > parseInt(ordenFin.value)) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El número de orden inicial no puede ser mayor al final',
                confirmButtonColor: '#1e962e'
            });
            return false;
        }
        
        // Validar totales
        const totalGeneral = document.getElementById('totalGeneral');
        const totalCobros = document.getElementById('totalCobros');
        
        if (!totalGeneral || !totalGeneral.value || !totalCobros || !totalCobros.value) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debes completar los totales generales',
                confirmButtonColor: '#1e962e'
            });
            return false;
        }
        
        // Validar que al menos una verificación tenga datos
        const hasVerificaciones = ['verEstatal', 'verFederal', 'revEstatal', 'revFederal'].some(tipo => {
            const realizadas = document.querySelector(`input[name="${tipo}Realizadas"]`);
            return realizadas && realizadas.value && parseInt(realizadas.value) > 0;
        });
        
        if (!hasVerificaciones) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debes registrar al menos una verificación',
                confirmButtonColor: '#1e962e'
            });
            return false;
        }
        
        // Validar créditos (ahora opcional)
        const creditos = document.querySelectorAll('#creditos-body tr');
        for (const credito of creditos) {
            const noOrden = credito.querySelector('input[name="creditoNoOrden"]');
            const cliente = credito.querySelector('input[name="creditoCliente"]');
            const monto = credito.querySelector('input[name="creditoMonto"]');
            const concepto = credito.querySelector('input[name="creditoConcepto"]');
            
            // Solo validar si al menos un campo está lleno
            if ((cliente && cliente.value) || (monto && monto.value) || (concepto && concepto.value)) {
                if (!noOrden || !noOrden.value || !cliente || !cliente.value || !monto || !monto.value || !concepto || !concepto.value) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Si vas a registrar un crédito, debes completar todos sus campos',
                        confirmButtonColor: '#1e962e'
                    });
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Función para obtener datos del formulario en formato para el backend (con sanitización)
    function getFormData() {
        const idEmpleado = sessionStorage.getItem('idEmpleado');
        if (!idEmpleado) {
            throw new Error('No se pudo identificar al empleado');
        }

        const formData = {
            idEmpleado: parseInt(idEmpleado),
            fechaCierre: document.getElementById('fechaCierre')?.value || '',
            ordenInicio: parseInt(document.getElementById('ordenInicio')?.value || 0),
            ordenFin: parseInt(document.getElementById('ordenFin')?.value || 0),
            totalGeneral: parseFloat(document.getElementById('totalGeneral')?.value || 0),
            totalEfectivo: parseFloat(document.getElementById('totalEfectivo')?.value || 0),
            totalCreditoEventual: parseFloat(document.getElementById('totalCreditoEventual')?.value || 0),
            totalCredito: parseFloat(document.getElementById('totalCredito')?.value || 0),
            totalTarjeta: parseFloat(document.getElementById('totalTarjeta')?.value || 0),
            totalTransferencia: parseFloat(document.getElementById('totalTransferencia')?.value || 0),
            totalCobros: parseFloat(document.getElementById('totalCobros')?.value || 0),
            facturacionEfectivo: parseFloat(document.getElementById('facturacionEfectivo')?.value || 0),
            remisionado: parseFloat(document.getElementById('remisionado')?.value || 0),
            verificaciones: [],
            creditos: []
        };
        
        // Agregar datos de verificaciones
        const tiposVerificacion = [
            { tipo: 'verEstatal', nombre: 'VER. ESTATAL' },
            { tipo: 'verFederal', nombre: 'VER. FEDERAL' },
            { tipo: 'revEstatal', nombre: 'REV. ESTATAL' },
            { tipo: 'revFederal', nombre: 'REV. FEDERAL' }
        ];
        
        tiposVerificacion.forEach(tipo => {
            const realizadas = document.querySelector(`input[name="${tipo.tipo}Realizadas"]`);
            
            if (realizadas && realizadas.value && parseInt(realizadas.value) > 0) {
                formData.verificaciones.push({
                    tipo: tipo.nombre,
                    realizadas: parseInt(realizadas.value),
                    efectivo: parseFloat(document.querySelector(`input[name="${tipo.tipo}Efectivo"]`)?.value || 0),
                    tarjeta: parseFloat(document.querySelector(`input[name="${tipo.tipo}Tarjeta"]`)?.value || 0),
                    credito: parseFloat(document.querySelector(`input[name="${tipo.tipo}Credito"]`)?.value || 0),
                    transferencia: parseFloat(document.querySelector(`input[name="${tipo.tipo}Transferencia"]`)?.value || 0),
                    eventuales: parseFloat(document.querySelector(`input[name="${tipo.tipo}Eventuales"]`)?.value || 0),
                    total: parseFloat(document.querySelector(`input[name="${tipo.tipo}Total"]`)?.value || 0)
                });
            }
        });
        
        // Agregar datos de créditos (solo los que tengan datos)
        const creditos = document.querySelectorAll('#creditos-body tr');
        creditos.forEach(credito => {
            const cliente = credito.querySelector('input[name="creditoCliente"]');
            const monto = credito.querySelector('input[name="creditoMonto"]');
            const concepto = credito.querySelector('input[name="creditoConcepto"]');
            
            if ((cliente && cliente.value) || (monto && monto.value) || (concepto && concepto.value)) {
                formData.creditos.push({
                    noOrden: parseInt(credito.querySelector('input[name="creditoNoOrden"]')?.value || 0),
                    cliente: cliente?.value.toUpperCase().trim() || '',
                    monto: parseFloat(monto?.value || 0),
                    concepto: concepto?.value.toUpperCase().trim() || '',
                    status: credito.querySelector('select[name="creditoStatus"]')?.value || 'No pagado'
                });
            }
        });
        
        return formData;
    }
});
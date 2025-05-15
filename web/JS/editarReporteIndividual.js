document.addEventListener('DOMContentLoaded', async function() {
    const BASE_URL = 'http://localhost:8080/CentroAutomotrizElRosario/api';
    
    // Variables globales
    let ordenInicio = 0;
    let ordenFin = 0;
    let creditosGenerados = false;
    let idReporte = null;
    
    // Función para formatear decimales
    window.formatDecimal = function(input) {
        if (!input) return '';
        
        let value = (input instanceof HTMLInputElement) ? input.value : input;
        let cursorPos = (input instanceof HTMLInputElement && input.type !== 'number') ? input.selectionStart : null;
        
        let newValue = value.replace(/[^0-9.]/g, '');
        
        const parts = newValue.split('.');
        if (parts.length > 2) {
            newValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        if (newValue.includes('.')) {
            const decimalParts = newValue.split('.');
            if (decimalParts[1] && decimalParts[1].length > 2) {
                newValue = decimalParts[0] + '.' + decimalParts[1].substring(0, 2);
            }
        }
        
        if (newValue !== value && input instanceof HTMLInputElement) {
            input.value = newValue;
            
            if (cursorPos !== null && input.type !== 'number') {
                if (value.length < newValue.length && newValue.charAt(cursorPos) === '.') {
                    cursorPos += 1;
                }
                else if (value.length > newValue.length) {
                    cursorPos -= (value.length - newValue.length);
                }
                
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
        
        // 3. Obtener ID del reporte a editar de la URL
        const urlParams = new URLSearchParams(window.location.search);
        idReporte = urlParams.get('id');
        
        if (!idReporte) {
            throw new Error('No se especificó el reporte a editar');
        }
        
        // 4. Cargar los datos del reporte
        await cargarReporte(idReporte);
        
        // 5. Configurar botones con verificación de existencia
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => window.location.href = 'vistaEmpleado.html');
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                Swal.fire({
                    title: '¿Cancelar cambios?',
                    text: 'Los cambios no guardados se perderán',
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
        
        // 6. Configurar el formulario como solo lectura para campos no editables
        configurarCamposNoEditables();
        
        // 7. Configurar eventos para sumas automáticas en la tabla de verificaciones
        setupVerificacionesCalculations();
        
        // 8. Configurar eventos para suma automática en relación de cobros
        setupRelacionCobrosCalculations();
        
        // 9. Configurar envío del formulario con verificación de existencia
        const editarReporteForm = document.getElementById('editarReporteForm');
        if (editarReporteForm) {
            editarReporteForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Validar datos antes de enviar
                if (!validateForm()) {
                    return;
                }
                
                // Mostrar confirmación
                Swal.fire({
                    title: '¿Guardar cambios?',
                    html: '<p>¿Estás seguro de que deseas guardar los cambios en este reporte?</p>',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#1e962e',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, guardar',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        const loadingAlert = Swal.fire({
                            title: 'Guardando cambios',
                            html: 'Por favor espera...',
                            allowOutsideClick: false,
                            didOpen: () => Swal.showLoading()
                        });
                        
                        try {
                            // Obtener datos del formulario (ya sanitizados)
                            const formData = getFormData();
                            formData.idReporte = parseInt(idReporte);
                            
                            // Enviar datos al backend
                            const response = await fetch(`${BASE_URL}/reportes/editar`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify(formData)
                            });
                            
                            const data = await response.json();
                            
                            if (!response.ok) {
                                throw new Error(data.mensaje || 'Error al guardar los cambios');
                            }
                            
                            // Cerrar alerta de carga
                            await Swal.close();
                            
                            // Mostrar éxito
                            await Swal.fire({
                                icon: 'success',
                                title: 'Cambios guardados',
                                text: 'El reporte se ha actualizado correctamente',
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
                                text: error.message || 'Ocurrió un error al guardar los cambios',
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
            title: 'Error',
            text: error.message || 'Ocurrió un error al cargar el reporte',
            confirmButtonColor: '#1e962e'
        });
        window.location.href = 'vistaEmpleado.html';
    }
    
    // Función para configurar campos no editables
    function configurarCamposNoEditables() {
        // Fecha de cierre (solo lectura)
        const fechaCierre = document.getElementById('fechaCierre');
        if (fechaCierre) {
            fechaCierre.readOnly = true;
            fechaCierre.classList.add('readonly-field');
        }
        
        // Rango de órdenes (solo lectura)
        const ordenInicioInput = document.getElementById('ordenInicio');
        const ordenFinInput = document.getElementById('ordenFin');
        
        if (ordenInicioInput && ordenFinInput) {
            ordenInicioInput.readOnly = true;
            ordenFinInput.readOnly = true;
            ordenInicioInput.classList.add('readonly-field');
            ordenFinInput.classList.add('readonly-field');
        }
    }
    
    // Función para cargar los datos del reporte
    async function cargarReporte(idReporte) {
        try {
            const response = await fetch(`${BASE_URL}/reportes/${idReporte}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('No se pudo cargar el reporte');
            }
            
            const data = await response.json();
            
            if (!data.exito || !data.datos) {
                throw new Error(data.mensaje || 'Datos del reporte no disponibles');
            }
            
            const reporte = data.datos;
            
            // 1. Llenar campos básicos
            if (reporte.fecha_cierre) {
                const fechaCierre = new Date(reporte.fecha_cierre);
                document.getElementById('fechaCierre').value = fechaCierre.toISOString().split('T')[0];
            }
            
            document.getElementById('ordenInicio').value = reporte.orden_inicio;
            document.getElementById('ordenFin').value = reporte.orden_fin;
            
            // 2. Llenar tabla de verificaciones
            if (reporte.verificaciones && reporte.verificaciones.length > 0) {
                const mapeoVerificaciones = {
                    'VER. ESTATAL': 'verEstatal',
                    'VER. FEDERAL': 'verFederal',
                    'REV. ESTATAL': 'revEstatal',
                    'REV. FEDERAL': 'revFederal'
                };
                
                reporte.verificaciones.forEach(verif => {
                    const prefijoCampo = mapeoVerificaciones[verif.tipo_verificacion];
                    
                    if (prefijoCampo) {
                        const campos = [
                            { sufijo: 'Realizadas', valor: verif.realizadas || 0 },
                            { sufijo: 'Efectivo', valor: verif.efectivo || 0 },
                            { sufijo: 'Tarjeta', valor: verif.tarjeta || 0 },
                            { sufijo: 'Credito', valor: verif.credito || 0 },
                            { sufijo: 'Transferencia', valor: verif.transferencia || 0 },
                            { sufijo: 'Eventuales', valor: verif.eventuales || 0 },
                            { sufijo: 'Total', valor: verif.total || 0 }
                        ];
                        
                        campos.forEach(campo => {
                            const input = document.querySelector(`input[name="${prefijoCampo}${campo.sufijo}"]`);
                            if (input) {
                                if (campo.sufijo !== 'Realizadas') {
                                    input.value = parseFloat(campo.valor).toFixed(2);
                                    input.type = 'text';
                                } else {
                                    input.value = campo.valor;
                                }
                            }
                        });
                    }
                });
                
                updateTotalesVerificaciones();
            }
            
            // 3. Llenar totales generales
            document.getElementById('totalGeneral').value = reporte.total.toFixed(2);
            document.getElementById('totalEfectivo').value = reporte.total_efectivo.toFixed(2);
            document.getElementById('totalCreditoEventual').value = reporte.total_credito_eventual.toFixed(2);
            document.getElementById('totalCredito').value = reporte.total_credito.toFixed(2);
            document.getElementById('totalTarjeta').value = reporte.total_tarjeta.toFixed(2);
            document.getElementById('totalCobros').value = (
                reporte.total_efectivo + 
                reporte.total_credito_eventual + 
                reporte.total_credito + 
                reporte.total_tarjeta
            ).toFixed(2);
            
            // 4. Llenar facturación
            if (reporte.facturado_efectivo !== undefined) {
                document.getElementById('facturacionEfectivo').value = reporte.facturado_efectivo.toFixed(2);
            }
            
            if (reporte.remisionado !== undefined) {
                document.getElementById('remisionado').value = reporte.remisionado.toFixed(2);
            }
            
            // 5. Llenar créditos
            if (reporte.creditos && reporte.creditos.length > 0) {
                const creditosBody = document.getElementById('creditos-body');
                if (creditosBody) {
                    creditosBody.innerHTML = '';
                    
                    reporte.creditos.forEach(credito => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><input type="number" name="creditoNoOrden" class="credito-input" value="${credito.no_orden}" readonly></td>
                            <td><input type="text" name="creditoCliente" class="credito-input" value="${credito.cliente || ''}" oninput="this.value = this.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .0-9]/g, '')"></td>
                            <td>
                                <div class="currency-input">
                                    <span>$</span>
                                    <input type="text" name="creditoMonto" class="credito-input" value="${(credito.monto || 0).toFixed(2)}" oninput="formatDecimal(this)">
                                </div>
                            </td>
                            <td><input type="text" name="creditoConcepto" class="credito-input" value="${credito.concepto || ''}" oninput="this.value = this.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .0-9]/g, '')"></td>
                            <td>
                                <select name="creditoStatus" class="credito-input">
                                    <option value="No pagado" ${credito.status === 'No pagado' ? 'selected' : ''}>No pagado</option>
                                    <option value="Pagado" ${credito.status === 'Pagado' ? 'selected' : ''}>Pagado</option>
                                </select>
                            </td>
                            <td><button type="button" class="btn remove-btn"><i class="fas fa-trash"></i></button></td>
                        `;
                        creditosBody.appendChild(tr);
                        
                        // Configurar evento para eliminar crédito con confirmación
                        const removeBtn = tr.querySelector('.remove-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', function() {
                                Swal.fire({
                                    title: '¿Eliminar crédito?',
                                    text: '¿Estás seguro de que deseas eliminar este crédito?',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#1e962e',
                                    cancelButtonColor: '#d33',
                                    confirmButtonText: 'Sí, eliminar',
                                    cancelButtonText: 'Cancelar'
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        tr.remove();
                                    }
                                });
                            });
                        }
                    });
                    
                    creditosGenerados = true;
                    const generarCreditosBtn = document.getElementById('generarCreditosBtn');
                    if (generarCreditosBtn) {
                        generarCreditosBtn.disabled = true;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error al cargar el reporte:', error);
            throw error;
        }
    }
    
    // Función optimizada para cálculos en tabla de verificaciones
    function setupVerificacionesCalculations() {
        const tiposVerificacion = ['verEstatal', 'verFederal', 'revEstatal', 'revFederal'];
        
        tiposVerificacion.forEach(tipo => {
            const realizadas = document.querySelector(`input[name="${tipo}Realizadas"]`);
            const efectivo = document.querySelector(`.currency-input input[name="${tipo}Efectivo"]`);
            const tarjeta = document.querySelector(`.currency-input input[name="${tipo}Tarjeta"]`);
            const credito = document.querySelector(`.currency-input input[name="${tipo}Credito"]`);
            const transferencia = document.querySelector(`.currency-input input[name="${tipo}Transferencia"]`);
            const eventuales = document.querySelector(`.currency-input input[name="${tipo}Eventuales"]`);
            const total = document.querySelector(`.currency-input input[name="${tipo}Total"]`);
            
            [efectivo, tarjeta, credito, transferencia, eventuales].forEach(input => {
                if (!input) return;
                
                input.addEventListener('input', function(e) {
                    formatDecimal(this);
                    actualizarFila();
                });
            });
            
            const actualizarFila = () => {
                const tieneMontos = [efectivo, tarjeta, credito, transferencia, eventuales].some(
                    input => input && parseFloat(input.value || 0) > 0
                );
                
                if (realizadas) {
                    if (tieneMontos) {
                        if (!realizadas.value || realizadas.value === "0") {
                            realizadas.value = "1";
                        }
                    } else {
                        realizadas.value = "";
                    }
                }
                
                if (total) {
                    const totalValue = parseFloat(efectivo?.value || 0) + 
                                     parseFloat(tarjeta?.value || 0) + 
                                     parseFloat(credito?.value || 0) + 
                                     parseFloat(transferencia?.value || 0) + 
                                     parseFloat(eventuales?.value || 0);
                    total.value = totalValue.toFixed(2);
                }
                
                updateTotalesVerificaciones();
            };
            
            if (realizadas) {
                realizadas.addEventListener('input', function() {
                    this.value = this.value.replace(/[^0-9]/g, '');
                    updateTotalesVerificaciones();
                });
            }
        });
    }
    
    // Función para actualizar totales de verificaciones
    function updateTotalesVerificaciones() {
        const tiposVerificacion = ['verEstatal', 'verFederal', 'revEstatal', 'revFederal'];
        const columnas = ['Realizadas', 'Efectivo', 'Tarjeta', 'Credito', 'Transferencia', 'Eventuales', 'Total'];
        
        columnas.forEach(col => {
            let suma = 0;
            tiposVerificacion.forEach(tipo => {
                const input = document.querySelector(`input[name="${tipo}${col}"]`);
                if (input && input.value) {
                    suma += parseFloat(input.value);
                }
            });
            
            const totalInput = document.querySelector(`.currency-input input[name="total${col}Ver"]`);
            if (totalInput) {
                totalInput.value = suma.toFixed(2);
            }
        });
        
        let granTotal = 0;
        tiposVerificacion.forEach(tipo => {
            const totalInput = document.querySelector(`.currency-input input[name="${tipo}Total"]`);
            if (totalInput && totalInput.value) {
                granTotal += parseFloat(totalInput.value);
            }
        });
        
        const totalVerificacionesInput = document.querySelector(`.currency-input input[name="totalVerificaciones"]`);
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
        
        const creditos = document.querySelectorAll('#creditos-body tr');
        for (const credito of creditos) {
            const noOrden = credito.querySelector('input[name="creditoNoOrden"]');
            const cliente = credito.querySelector('input[name="creditoCliente"]');
            const monto = credito.querySelector('input[name="creditoMonto"]');
            const concepto = credito.querySelector('input[name="creditoConcepto"]');
            
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
    
    // Función para obtener datos del formulario en formato para el backend
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
            totalCobros: parseFloat(document.getElementById('totalCobros')?.value || 0),
            facturacionEfectivo: parseFloat(document.getElementById('facturacionEfectivo')?.value || 0),
            remisionado: parseFloat(document.getElementById('remisionado')?.value || 0),
            verificaciones: [],
            creditos: []
        };
        
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
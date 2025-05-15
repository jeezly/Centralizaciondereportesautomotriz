document.addEventListener('DOMContentLoaded', async function() {
    const BASE_URL = 'http://localhost:8080/CentroAutomotrizElRosario/api';
    const { jsPDF } = window.jspdf;
    
    // Verificar sesión
    const token = sessionStorage.getItem('token');
    const rol = sessionStorage.getItem('rol');
    const idUsuario = sessionStorage.getItem('idUsuario');

    if (!token || rol !== 'gerente') {
        window.location.href = '../index.html';
        return;
    }

    // Obtener IDs de reportes a consolidar
    const idsReportesStr = sessionStorage.getItem('reportesAConsolidar');
    let idsReportes = [];
    
    try {
        idsReportes = JSON.parse(idsReportesStr || '[]');
    } catch (e) {
        console.error('Error al parsear IDs de reportes:', e);
    }

    if (idsReportes.length === 0) {
        window.location.href = 'consultarReportesGerente.html';
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
            window.location.href = 'consultarReportesGerente.html';
        });
        
        // Cargar datos del reporte consolidado
        await cargarReporteConsolidado(idsReportes);
        
        // Configurar botones de exportación
        document.getElementById('exportPdfBtn').addEventListener('click', exportarAPDF);
        document.getElementById('exportExcelBtn').addEventListener('click', exportarAExcel);
        
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
    
    // Función para cargar los datos del reporte consolidado
    async function cargarReporteConsolidado(idsReportes) {
        const loadingAlert = Swal.fire({
            title: 'Generando reporte consolidado',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            // Obtener reporte consolidado del backend
            const response = await fetch(`${BASE_URL}/reportes/consolidado?ids=${idsReportes.join(',')}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Verificar estado de la respuesta
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al obtener el reporte consolidado');
            }
            
            // Obtener texto de respuesta y limpiarlo
            const responseText = await response.text();
            const cleanedResponse = responseText.trim();
            
            // Parsear JSON manualmente
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
            
            // Mostrar datos en la interfaz
            mostrarReporteConsolidado(data.datos);
            
            await Swal.close();
            
        } catch (error) {
            await Swal.close();
            console.error('Error al cargar reporte consolidado:', error);
            
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Ocurrió un error al cargar el reporte consolidado',
                confirmButtonColor: '#1e962e'
            });
            
            window.location.href = 'consultarReportesGerente.html';
        }
    }
    
    // Función para mostrar los datos del reporte consolidado
    function mostrarReporteConsolidado(consolidado) {
        // Formatear fechas
        const fechaMinima = new Date(consolidado.fecha_minima).toLocaleDateString('es-MX');
        const fechaMaxima = new Date(consolidado.fecha_maxima).toLocaleDateString('es-MX');
        
        // Resumen consolidado
        document.getElementById('totalReportes').textContent = consolidado.total_reportes;
        document.getElementById('rangoFechas').textContent = `${fechaMinima} a ${fechaMaxima}`;
        document.getElementById('rangoOrdenes').textContent = `${consolidado.orden_minima} a ${consolidado.orden_maxima}`;
        document.getElementById('totalConsolidado').textContent = formatearMoneda(consolidado.total_general);
        
        // Totales por sucursal
        const sucursalesBody = document.getElementById('sucursalesBody');
        sucursalesBody.innerHTML = '';
        
        consolidado.totales_por_sucursal.forEach(sucursal => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sucursal.nombre_sucursal}</td>
                <td>${sucursal.total_reportes}</td>
                <td>${formatearMoneda(sucursal.total_efectivo)}</td>
                <td>${formatearMoneda(sucursal.total_tarjeta)}</td>
                <td>${formatearMoneda(sucursal.total_credito)}</td>
                <td>${formatearMoneda(sucursal.total_transferencia)}</td>
                <td>${formatearMoneda(sucursal.total_general)}</td>
            `;
            sucursalesBody.appendChild(row);
        });
        
        // Relación de cobros consolidados
        document.getElementById('totalEfectivoConsolidado').textContent = formatearMoneda(consolidado.total_efectivo);
        document.getElementById('totalCreditoEventualConsolidado').textContent = formatearMoneda(consolidado.total_credito_eventual);
        document.getElementById('totalCreditoConsolidado').textContent = formatearMoneda(consolidado.total_credito);
        document.getElementById('totalTarjetaConsolidado').textContent = formatearMoneda(consolidado.total_tarjeta);
        document.getElementById('totalTransferenciaConsolidado').textContent = formatearMoneda(consolidado.total_transferencia);
        
        const totalCobros = consolidado.total_efectivo + consolidado.total_credito_eventual + 
                           consolidado.total_credito + consolidado.total_tarjeta + consolidado.total_transferencia;
        document.getElementById('totalCobrosConsolidado').textContent = formatearMoneda(totalCobros);
        
        // Tabla de verificaciones consolidadas
        const verificacionesBody = document.getElementById('verificacionesConsolidadasBody');
        verificacionesBody.innerHTML = '';
        
        consolidado.verificaciones.forEach(verificacion => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${verificacion.tipo_verificacion}</td>
                <td>${verificacion.realizadas}</td>
                <td>${formatearMoneda(verificacion.efectivo)}</td>
                <td>${formatearMoneda(verificacion.tarjeta)}</td>
                <td>${formatearMoneda(verificacion.credito)}</td>
                <td>${formatearMoneda(verificacion.transferencia)}</td>
                <td>${formatearMoneda(verificacion.eventuales)}</td>
                <td>${formatearMoneda(verificacion.total)}</td>
            `;
            verificacionesBody.appendChild(row);
        });
        
        // Facturación consolidada
        document.getElementById('facturadoEfectivoConsolidado').textContent = formatearMoneda(consolidado.facturado_efectivo);
        document.getElementById('remisionadoConsolidado').textContent = formatearMoneda(consolidado.remisionado);
        
        // Detalle de reportes
        const detalleBody = document.getElementById('detalleReportesBody');
        detalleBody.innerHTML = '';
        
        consolidado.detalle_reportes.forEach(reporte => {
            const fecha = new Date(reporte.fecha_cierre).toLocaleDateString('es-MX');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fecha}</td>
                <td>${reporte.nombre_sucursal}</td>
                <td>${reporte.nombre_empleado}</td>
                <td>${reporte.orden_inicio}</td>
                <td>${reporte.orden_fin}</td>
                <td>${formatearMoneda(reporte.total)}</td>
            `;
            detalleBody.appendChild(row);
        });
    }
    
    // Función para formatear montos monetarios
    function formatearMoneda(monto) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(monto);
    }
    
    // Función para exportar a PDF
    async function exportarAPDF() {
        const loadingAlert = Swal.fire({
            title: 'Generando PDF',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
            
            // Logo y nombre de la empresa
            doc.addImage('../MEDIA/LogoElRosario.png', 'PNG', 15, 10, 30, 30);
            doc.setFontSize(16);
            doc.setTextColor(1, 93, 37);
            doc.text('Centro Automotriz El Rosario, S.A. de C.V.', 200, 20, { align: 'right' });

            // Título
            doc.setFontSize(14);
            doc.text('REPORTE CONSOLIDADO', 15, 45);

            // Fechas
            doc.setFontSize(10);
            doc.text(`Fechas de Cierre: ${document.getElementById('rangoFechas').textContent}`, 15, 55);
            
            // Firmas
            doc.text('Firma Gerente: ____________   Firma Recibido: ____________', 200, 55, { align: 'right' });
            
            // Resumen consolidado
            doc.setFontSize(12);
            doc.text('Resumen Consolidado', 15, 70);
            
            doc.text(`Total de reportes consolidados: ${document.getElementById('totalReportes').textContent}`, 15, 77);
            doc.text(`Rango de fechas: ${document.getElementById('rangoFechas').textContent}`, 15, 84);
            doc.text(`Rango de órdenes: ${document.getElementById('rangoOrdenes').textContent}`, 15, 91);
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`TOTAL CONSOLIDADO: ${document.getElementById('totalConsolidado').textContent}`, 15, 98);
            doc.setFont(undefined, 'normal');
            
            // Totales por sucursal
            doc.setFontSize(12);
            doc.text('Totales por Sucursal', 15, 110);
            
            const sucursalesHeaders = ['Sucursal', 'Reportes', 'Efectivo', 'Tarjeta', 'Crédito', 'Transferencia', 'Total'];
            const sucursalesData = [];
            
            document.querySelectorAll('#sucursalesBody tr').forEach(row => {
                const cells = row.cells;
                sucursalesData.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent,
                    cells[6].textContent
                ]);
            });
            
            doc.autoTable({
                startY: 115,
                head: [sucursalesHeaders],
                body: sucursalesData,
                styles: {
                    cellPadding: 3,
                    fontSize: 8
                },
                headStyles: {
                    fillColor: [1, 93, 37],
                    textColor: [255, 255, 255]
                }
            });
            
            // Relación de cobros
            doc.setFontSize(12);
            doc.text('Relación de Cobros Consolidados', 15, doc.autoTable.previous.finalY + 15);
            
            const cobrosData = [
                ['Total contado efectivo:', document.getElementById('totalEfectivoConsolidado').textContent],
                ['Total crédito eventual:', document.getElementById('totalCreditoEventualConsolidado').textContent],
                ['Total crédito:', document.getElementById('totalCreditoConsolidado').textContent],
                ['Total tarjeta bancaria:', document.getElementById('totalTarjetaConsolidado').textContent],
                ['Total transferencia:', document.getElementById('totalTransferenciaConsolidado').textContent],
                ['TOTAL:', document.getElementById('totalCobrosConsolidado').textContent]
            ];
            
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 20,
                head: [['Concepto', 'Monto']],
                body: cobrosData,
                styles: {
                    cellPadding: 3,
                    fontSize: 10
                },
                columnStyles: {
                    1: { halign: 'right' }
                },
                headStyles: {
                    fillColor: [1, 93, 37],
                    textColor: [255, 255, 255]
                }
            });
            
            // Verificaciones consolidadas
            doc.setFontSize(12);
            doc.text('Verificaciones Consolidadas', 15, doc.autoTable.previous.finalY + 15);
            
            const verificacionesHeaders = ['Verificación', 'Realizadas', 'Efectivo', 'Tarjeta', 'Crédito', 'Transferencia', 'Eventuales', 'Total'];
            const verificacionesData = [];
            
            document.querySelectorAll('#verificacionesConsolidadasBody tr').forEach(row => {
                const cells = row.cells;
                verificacionesData.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent,
                    cells[6].textContent,
                    cells[7].textContent
                ]);
            });
            
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 20,
                head: [verificacionesHeaders],
                body: verificacionesData,
                styles: {
                    cellPadding: 3,
                    fontSize: 8
                },
                headStyles: {
                    fillColor: [1, 93, 37],
                    textColor: [255, 255, 255]
                }
            });
            
            // Facturación consolidada
            doc.setFontSize(12);
            doc.text('Facturación Consolidada', 15, doc.autoTable.previous.finalY + 15);
            
            const facturacionData = [
                ['FACTURADO EN EFECTIVO:', document.getElementById('facturadoEfectivoConsolidado').textContent],
                ['REMISIONADO:', document.getElementById('remisionadoConsolidado').textContent]
            ];
            
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 20,
                body: facturacionData,
                styles: {
                    cellPadding: 3,
                    fontSize: 10
                },
                columnStyles: {
                    0: { cellWidth: 50, halign: 'left' },
                    1: { cellWidth: 30, halign: 'right' }
                }
            });
            
            // Detalle de reportes
            doc.setFontSize(12);
            doc.text('Detalle de Reportes Consolidados', 15, doc.autoTable.previous.finalY + 15);
            
            const detalleHeaders = ['Fecha', 'Sucursal', 'Empleado', 'Orden Inicio', 'Orden Fin', 'Total'];
            const detalleData = [];
            
            document.querySelectorAll('#detalleReportesBody tr').forEach(row => {
                const cells = row.cells;
                detalleData.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent
                ]);
            });
            
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 20,
                head: [detalleHeaders],
                body: detalleData,
                styles: {
                    cellPadding: 3,
                    fontSize: 8
                },
                headStyles: {
                    fillColor: [1, 93, 37],
                    textColor: [255, 255, 255]
                }
            });
            
            // Generar nombre del archivo
            const fileName = `Reporte_Consolidado_${new Date().toISOString().slice(0, 10)}.pdf`;
            
            // Guardar PDF
            doc.save(fileName);
            
            await Swal.close();
            
            // Mostrar alerta de éxito
            await Swal.fire({
                icon: 'success',
                title: 'PDF generado',
                html: `El archivo <strong>${fileName}</strong> se ha descargado correctamente.`,
                confirmButtonColor: '#1e962e',
                confirmButtonText: 'OK'
            });
            
        } catch (error) {
            await Swal.close();
            console.error('Error al generar PDF:', error);
            
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al generar el PDF: ' + error.message,
                confirmButtonColor: '#1e962e'
            });
        }
    }
    
    // Función para exportar a Excel
    async function exportarAExcel() {
        const loadingAlert = Swal.fire({
            title: 'Generando Excel',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            // Crear un nuevo libro de trabajo
            const wb = XLSX.utils.book_new();
            
            // Hoja 1: Resumen consolidado
            const ws1Data = [
                ['Centro Automotriz El Rosario, S.A. de C.V.'],
                ['REPORTE CONSOLIDADO'],
                [''],
                ['Resumen Consolidado'],
                [`Total de reportes consolidados: ${document.getElementById('totalReportes').textContent}`],
                [`Rango de fechas: ${document.getElementById('rangoFechas').textContent}`],
                [`Rango de órdenes: ${document.getElementById('rangoOrdenes').textContent}`],
                [`TOTAL CONSOLIDADO: ${document.getElementById('totalConsolidado').textContent}`],
                [''],
                ['Totales por Sucursal'],
                ['Sucursal', 'Reportes', 'Efectivo', 'Tarjeta', 'Crédito', 'Transferencia', 'Total']
            ];
            
            // Agregar datos de sucursales
            document.querySelectorAll('#sucursalesBody tr').forEach(row => {
                const cells = row.cells;
                ws1Data.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent,
                    cells[6].textContent
                ]);
            });
            
            ws1Data.push(['']);
            ws1Data.push(['Relación de Cobros Consolidados']);
            ws1Data.push(['Concepto', 'Monto']);
            ws1Data.push(['Total contado efectivo', document.getElementById('totalEfectivoConsolidado').textContent]);
            ws1Data.push(['Total crédito eventual', document.getElementById('totalCreditoEventualConsolidado').textContent]);
            ws1Data.push(['Total crédito', document.getElementById('totalCreditoConsolidado').textContent]);
            ws1Data.push(['Total tarjeta bancaria', document.getElementById('totalTarjetaConsolidado').textContent]);
            ws1Data.push(['Total transferencia', document.getElementById('totalTransferenciaConsolidado').textContent]);
            ws1Data.push(['TOTAL', document.getElementById('totalCobrosConsolidado').textContent]);
            
            const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
            
            // Hoja 2: Verificaciones consolidadas
            const verificacionesHeader = ['Verificación', 'Realizadas', 'Efectivo', 'Tarjeta', 'Crédito', 'Transferencia', 'Eventuales', 'Total'];
            const verificacionesRows = [];
            
            document.querySelectorAll('#verificacionesConsolidadasBody tr').forEach(row => {
                const cells = row.cells;
                verificacionesRows.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent,
                    cells[6].textContent,
                    cells[7].textContent
                ]);
            });
            
            const ws2Data = [verificacionesHeader, ...verificacionesRows];
            const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
            
            // Hoja 3: Detalle de reportes
            const detalleHeader = ['Fecha', 'Sucursal', 'Empleado', 'Orden Inicio', 'Orden Fin', 'Total'];
            const detalleRows = [];
            
            document.querySelectorAll('#detalleReportesBody tr').forEach(row => {
                const cells = row.cells;
                detalleRows.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent,
                    cells[5].textContent
                ]);
            });
            
            const ws3Data = [detalleHeader, ...detalleRows];
            const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
            
            // Agregar hojas al libro
            XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
            XLSX.utils.book_append_sheet(wb, ws2, "Verificaciones");
            XLSX.utils.book_append_sheet(wb, ws3, "Detalle Reportes");
            
            // Generar nombre del archivo
            const fileName = `Reporte_Consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`;
            
            // Generar archivo Excel
            XLSX.writeFile(wb, fileName);
            
            await Swal.close();
            
            // Mostrar alerta de éxito
            await Swal.fire({
                icon: 'success',
                title: 'Excel generado',
                html: `El archivo <strong>${fileName}</strong> se ha descargado correctamente.`,
                confirmButtonColor: '#1e962e',
                confirmButtonText: 'OK'
            });
            
        } catch (error) {
            await Swal.close();
            console.error('Error al generar Excel:', error);
            
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al generar el Excel: ' + error.message,
                confirmButtonColor: '#1e962e',
                confirmButtonText: 'OK'
            });
        }
    }
});
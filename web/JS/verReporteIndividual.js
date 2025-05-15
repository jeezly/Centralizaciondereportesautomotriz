document.addEventListener('DOMContentLoaded', async function() {
    const BASE_URL = 'http://localhost:8080/CentroAutomotrizElRosario/api';
    const { jsPDF } = window.jspdf;
    
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

    // Obtener ID del reporte de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const idReporte = urlParams.get('id') || sessionStorage.getItem('reporteAVer');

    if (!idReporte) {
        window.location.href = 'consultarReportes.html';
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
            window.location.href = 'consultarReportes.html';
        });
        
        // 4. Cargar datos del reporte
        await cargarReporte(idReporte);
        
        // 5. Configurar botones de exportación
        document.getElementById('exportPdfBtn').addEventListener('click', exportarAPDF);
        document.getElementById('exportExcelBtn').addEventListener('click', exportarAExcel);
        
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
    
    // Función para cargar los datos del reporte
    async function cargarReporte(idReporte) {
        const loadingAlert = Swal.fire({
            title: 'Cargando reporte',
            html: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            // Obtener reporte del backend
            const response = await fetch(`${BASE_URL}/reportes/${idReporte}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.mensaje || 'Error al obtener el reporte');
            }
            
            const data = await response.json();
            
            if (!data.exito) {
                throw new Error(data.mensaje || 'Error en la respuesta del servidor');
            }
            
            // Mostrar datos en la interfaz
            mostrarReporte(data.datos);
            
            await Swal.close();
            
        } catch (error) {
            await Swal.close();
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Ocurrió un error al cargar el reporte',
                confirmButtonColor: '#1e962e'
            });
            console.error('Error al cargar reporte:', error);
            window.location.href = 'consultarReportes.html';
        }
    }
    
    // Función para mostrar los datos del reporte en la interfaz
    function mostrarReporte(reporte) {
        // Encabezado
        const fecha = new Date(reporte.fecha_cierre);
        document.getElementById('fechaCierre').textContent = `Fecha de Cierre de Caja: ${fecha.toLocaleDateString('es-MX')}`;
        
        // Totales Orden de Servicio
        document.getElementById('ordenInicio').textContent = reporte.orden_inicio;
        document.getElementById('ordenFin').textContent = reporte.orden_fin;
        document.getElementById('totalGeneral').textContent = `$${reporte.total.toFixed(2)}`;
        
        // Relación de cobros (sin transferencia)
        document.getElementById('totalEfectivo').textContent = `$${reporte.total_efectivo.toFixed(2)}`;
        document.getElementById('totalCreditoEventual').textContent = `$${reporte.total_credito_eventual.toFixed(2)}`;
        document.getElementById('totalCredito').textContent = `$${reporte.total_credito.toFixed(2)}`;
        document.getElementById('totalTarjeta').textContent = `$${reporte.total_tarjeta.toFixed(2)}`;
        document.getElementById('totalCobros').textContent = `$${(
            reporte.total_efectivo + 
            reporte.total_credito_eventual + 
            reporte.total_credito + 
            reporte.total_tarjeta
        ).toFixed(2)}`;
        
        // Tabla de verificaciones
        const verificacionesBody = document.getElementById('verificacionesBody');
        verificacionesBody.innerHTML = '';
        
        let totalRealizadas = 0;
        let totalEfectivo = 0;
        let totalTarjeta = 0;
        let totalCredito = 0;
        let totalTransferencia = 0;
        let totalEventuales = 0;
        let totalVerificaciones = 0;
        
        reporte.verificaciones.forEach(verificacion => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${verificacion.tipo_verificacion}</td>
                <td>${verificacion.realizadas}</td>
                <td>$${verificacion.efectivo.toFixed(2)}</td>
                <td>$${verificacion.tarjeta.toFixed(2)}</td>
                <td>$${verificacion.credito.toFixed(2)}</td>
                <td>$${verificacion.transferencia.toFixed(2)}</td>
                <td>$${verificacion.eventuales.toFixed(2)}</td>
                <td>$${verificacion.total.toFixed(2)}</td>
            `;
            verificacionesBody.appendChild(row);
            
            // Sumar totales
            totalRealizadas += verificacion.realizadas;
            totalEfectivo += verificacion.efectivo;
            totalTarjeta += verificacion.tarjeta;
            totalCredito += verificacion.credito;
            totalTransferencia += verificacion.transferencia;
            totalEventuales += verificacion.eventuales;
            totalVerificaciones += verificacion.total;
        });
        
        // Agregar fila de totales
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = `
            <td>TOTAL</td>
            <td>${totalRealizadas}</td>
            <td>$${totalEfectivo.toFixed(2)}</td>
            <td>$${totalTarjeta.toFixed(2)}</td>
            <td>$${totalCredito.toFixed(2)}</td>
            <td>$${totalTransferencia.toFixed(2)}</td>
            <td>$${totalEventuales.toFixed(2)}</td>
            <td>$${totalVerificaciones.toFixed(2)}</td>
        `;
        verificacionesBody.appendChild(totalRow);
        
        // Facturación en tabla
        document.getElementById('facturadoEfectivo').textContent = `$${reporte.facturado_efectivo?.toFixed(2) || '0.00'}`;
        document.getElementById('remisionado').textContent = `$${reporte.remisionado?.toFixed(2) || '0.00'}`;
        
        // Créditos - Mostrar solo las órdenes del rango del reporte
        const creditosBody = document.getElementById('creditosBody');
        creditosBody.innerHTML = '';
        
        // Actualizar el título para mostrar el rango correcto
        const creditosTitle = document.querySelector('.seccion-reporte h3.section-title');
        if (creditosTitle) {
            creditosTitle.textContent = `CRÉDITO (ÓRDENES ${reporte.orden_inicio}-${reporte.orden_fin})`;
        }
        
        // Generar filas solo para el rango de órdenes del reporte
        for (let i = reporte.orden_inicio; i <= reporte.orden_fin; i++) {
            const credito = reporte.creditos?.find(c => c.no_orden === i);
            
            const row = document.createElement('tr');
            if (credito) {
                row.innerHTML = `
                    <td>${credito.no_orden}</td>
                    <td>${credito.cliente}</td>
                    <td>$${credito.monto.toFixed(2)}</td>
                    <td>${credito.concepto}</td>
                    <td>${credito.status}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${i}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                `;
            }
            creditosBody.appendChild(row);
        }
    }
    
    async function exportarAPDF() {
    const loadingAlert = Swal.fire({
        title: 'Generando PDF',
        html: 'Por favor espera...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        // Crear nuevo documento PDF en formato Carta (Letter)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });
        
        // Logo y nombre de la empresa
        const logoImg = new Image();
        logoImg.src = '../MEDIA/LogoElRosario.png';
        
        // Esperar a que cargue la imagen
       const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
        // Timeout por si falla la carga
        setTimeout(() => reject(new Error('Timeout loading image')), 2000);
    });
};

try {
    const logoImg = await loadImage('../MEDIA/LogoElRosario.png');
    doc.addImage(logoImg, 'PNG', 15, 10, 30, 30);
} catch (e) {
    console.warn('No se pudo cargar el logo:', e);
    // Continuar sin el logo
}
        
// 1. LOGO Y NOMBRE (como en tu imagen)
if (logoImg.complete && logoImg.naturalHeight !== 0) {
    doc.addImage(logoImg, 'PNG', 15, 10, 30, 30); // Logo en posición original
}
doc.setFontSize(16);
doc.setTextColor(1, 93, 37);
doc.text('Centro Automotriz El Rosario, S.A. de C.V.', 200, 20, { align: 'right' });

// 2. VERIFICACION (justo debajo del logo, sin espacios extra)
doc.setFontSize(14);
doc.text('VERIFICACION', 15, 45); // Exactamente donde lo tenías

// 3. FECHA DE CIERRE (pegado a VERIFICACION, como en tu screenshot)
doc.setFontSize(8);
const fechaCierre = document.getElementById('fechaCierre').textContent;
doc.text(`FECHA DE CIERRE DE CAJA: ${fechaCierre}`, 15, 55); // 10mm debajo de VERIFICACION

// 4. FIRMAS EN HORIZONTAL (en la MISMA línea que la fecha, a la derecha)
doc.text('Firma Gerente: ____________   Firma Recibido: ____________', 200, 55, { align: 'right' });
        
        // Totales Orden de Servicio - Versión mejorada
        doc.setFontSize(14);
        doc.text('Totales Orden de Servicio', 15, 85);
        
        doc.setFontSize(12);
        const ordenInicio = document.getElementById('ordenInicio').textContent;
        const ordenFin = document.getElementById('ordenFin').textContent;
        
        // Texto en dos líneas para mejor legibilidad
        doc.text(`DE LA ORDEN No.: ${ordenInicio}`, 15, 92);
        doc.text(`A LA ORDEN No.: ${ordenFin}`, 15, 98);
        
        // Relación de cobros (con espacio adecuado)
        doc.setFontSize(12);
        doc.text('Relación de cobros:', 15, 110); // Más espacio después de los números de orden
        
        const cobros = [
            ['Total contado efectivo:', document.getElementById('totalEfectivo').textContent],
            ['Total crédito eventual:', document.getElementById('totalCreditoEventual').textContent],
            ['Total crédito:', document.getElementById('totalCredito').textContent],
            ['Total tarjeta bancaria:', document.getElementById('totalTarjeta').textContent],
            ['TOTAL:', document.getElementById('totalCobros').textContent]
        ];
        
        doc.autoTable({
            startY: 115,
            head: [['Concepto', 'Monto']],
            body: cobros,
            styles: {
                halign: 'left',
                cellPadding: 3,
                fontSize: 10
            },
            columnStyles: {
                1: { halign: 'right' }
            },
            headStyles: {
                fillColor: [1, 93, 37],
                textColor: [255, 255, 255]
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.row.index === cobros.length - 1) {
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.5);
                    doc.line(
                        data.cell.x,
                        data.cell.y + data.cell.height,
                        data.cell.x + data.cell.width,
                        data.cell.y + data.cell.height
                    );
                }
            }
        });
        
        // Tabla de verificaciones
        doc.setFontSize(14);
        doc.text('Verificaciones realizadas', 15, doc.autoTable.previous.finalY + 15);
        
        const verificaciones = [];
        const verificacionesRows = document.querySelectorAll('#verificacionesBody tr:not(.total-row)');
        
        verificacionesRows.forEach(row => {
            const cells = row.cells;
            verificaciones.push([
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
        
        // Agregar totales
        const totalRow = document.querySelector('#verificacionesBody tr.total-row');
        if (totalRow) {
            const cells = totalRow.cells;
            verificaciones.push([
                cells[0].textContent,
                cells[1].textContent,
                cells[2].textContent,
                cells[3].textContent,
                cells[4].textContent,
                cells[5].textContent,
                cells[6].textContent,
                cells[7].textContent
            ]);
        }
        
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 20,
            head: [['Verificación', 'Realizadas', 'Efectivo', 'Tarjeta', 'Crédito', 'Transferencia', 'Eventuales', 'Total']],
            body: verificaciones,
            styles: {
                cellPadding: 3,
                fontSize: 8,
                halign: 'center'
            },
            headStyles: {
                fillColor: [1, 93, 37],
                textColor: [255, 255, 255]
            },
            columnStyles: {
                0: { halign: 'left' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right' }
            },
            didParseCell: (data) => {
                if (data.row.index === verificaciones.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [224, 224, 224];
                }
            }
        });
        
        // Facturación - Tabla extendida de izquierda a derecha
doc.setFontSize(14);
doc.text('Facturación', 15, doc.autoTable.previous.finalY + 15);

const facturacion = [
    ['FACTURADO EN EFECTIVO:', document.getElementById('facturadoEfectivo').textContent],
    ['REMISIONADO:', document.getElementById('remisionado').textContent]
];

doc.autoTable({
    startY: doc.autoTable.previous.finalY + 20,
    body: facturacion,
    styles: {
        cellPadding: 5,
        fontSize: 10,
        halign: 'left'
    },
    columnStyles: {
        0: { cellWidth: 70, halign: 'left' },
        1: { cellWidth: 40, halign: 'right' }
    },
    headStyles: {
        fillColor: [1, 93, 37],
        textColor: [255, 255, 255]
    },
    theme: 'grid',
    margin: { left: 15, right: 15 } // Extender de izquierda a derecha
});
        
        // Créditos
        doc.setFontSize(14);
        const ordenInicioNum = parseInt(ordenInicio);
        const ordenFinNum = parseInt(ordenFin);
        doc.text(`Créditos (ÓRDENES ${ordenInicioNum}-${ordenFinNum})`, 15, doc.autoTable.previous.finalY + 20);
        
        const creditos = [];
        const creditosRows = document.querySelectorAll('#creditosBody tr');
        
        creditosRows.forEach(row => {
            const cells = row.cells;
            if (cells.length > 1) {
                creditos.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent
                ]);
            }
        });
        
        if (creditos.length > 0) {
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 25,
                head: [['No. Orden', 'Cliente', 'Monto', 'Concepto', 'Status']],
                body: creditos,
                styles: {
                    cellPadding: 3,
                    fontSize: 8
                },
                headStyles: {
                    fillColor: [1, 93, 37],
                    textColor: [255, 255, 255]
                },
                columnStyles: {
                    2: { halign: 'right' }
                }
            });
        } else {
            doc.setFontSize(12);
            doc.text('No hay créditos registrados', 15, doc.autoTable.previous.finalY + 25);
        }
        
        // Generar nombre del archivo
        const fileName = `Reporte_${document.getElementById('ordenInicio').textContent}_a_${document.getElementById('ordenFin').textContent}.pdf`;
        
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
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al generar el PDF: ' + error.message,
            confirmButtonColor: '#1e962e'
        });
        console.error('Error al generar PDF:', error);
    }
}
    
    // Función para exportar a Excel (versión optimizada)
    async function exportarAExcel() {
        try {
            // Crear un nuevo libro de trabajo
            const wb = XLSX.utils.book_new();
            
            // Hoja 1: Datos principales
            const ws1Data = [
                ['Centro Automotriz El Rosario, S.A. de C.V.'],
                [document.getElementById('fechaCierre').textContent],
                [],
                ['VERIFICACION'],
                [],
                ['Totales Orden de Servicio'],
                [`DE LA ORDEN No.: ${document.getElementById('ordenInicio').textContent} A LA ORDEN No.: ${document.getElementById('ordenFin').textContent}`],
                [],
                ['Relación de cobros'],
                ['Concepto', 'Monto'],
                ['Total contado efectivo', document.getElementById('totalEfectivo').textContent],
                ['Total crédito eventual', document.getElementById('totalCreditoEventual').textContent],
                ['Total crédito', document.getElementById('totalCredito').textContent],
                ['Total tarjeta bancaria', document.getElementById('totalTarjeta').textContent],
                ['TOTAL', document.getElementById('totalCobros').textContent],
                [],
                ['Facturación'],
                ['Concepto', 'Monto'],
                ['FACTURADO EN EFECTIVO:', document.getElementById('facturadoEfectivo').textContent],
                ['REMISIONADO:', document.getElementById('remisionado').textContent]
            ];
            
            const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
            
            // Hoja 2: Verificaciones
            const verificacionesHeader = ['Verificación', 'Realizadas', 'Efectivo', 'Tarjeta', 'Crédito', 'Transferencia', 'Eventuales', 'Total'];
            const verificacionesRows = [];
            
            document.querySelectorAll('#verificacionesBody tr').forEach(row => {
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
            
            // Hoja 3: Créditos
            const ordenInicio = parseInt(document.getElementById('ordenInicio').textContent);
            const ordenFin = parseInt(document.getElementById('ordenFin').textContent);
            
            const creditosHeader = ['No. Orden', 'Cliente', 'Monto', 'Concepto', 'Status'];
            const creditosRows = [];
            
            document.querySelectorAll('#creditosBody tr').forEach(row => {
                const cells = row.cells;
                if (cells.length > 1) {
                    creditosRows.push([
                        cells[0].textContent,
                        cells[1].textContent,
                        cells[2].textContent,
                        cells[3].textContent,
                        cells[4].textContent
                    ]);
                }
            });
            
            const ws3Data = creditosRows.length > 0 ? [creditosHeader, ...creditosRows] : [['No hay créditos registrados']];
            const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
            
            // Agregar hojas al libro
            XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
            XLSX.utils.book_append_sheet(wb, ws2, "Verificaciones");
            XLSX.utils.book_append_sheet(wb, ws3, `Créditos ${ordenInicio}-${ordenFin}`);
            
            // Generar nombre del archivo
            const fileName = `Reporte_${document.getElementById('ordenInicio').textContent}_a_${document.getElementById('ordenFin').textContent}.xlsx`;
            
            // Generar archivo Excel (esto descargará el archivo inmediatamente)
            XLSX.writeFile(wb, fileName);
            
            // Mostrar alerta de éxito con botón OK
            await Swal.fire({
                icon: 'success',
                title: 'Excel generado',
                html: `El archivo <strong>${fileName}</strong> se ha descargado correctamente.`,
                confirmButtonColor: '#1e962e',
                confirmButtonText: 'OK'
            });
            
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al generar el Excel: ' + error.message,
                confirmButtonColor: '#1e962e',
                confirmButtonText: 'OK'
            });
            console.error('Error al generar Excel:', error);
        }
    }
});
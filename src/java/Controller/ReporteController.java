package Controller;

import Model.Credito;
import Model.Reporte;
import Model.Respuesta;
import Model.VerificacionReporte;
import bd.ConexionMySQL;
import com.google.gson.Gson;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
@WebServlet(name = "ReporteController", urlPatterns = {"/api/reportes/*"})
public class ReporteController extends HttpServlet {
    private final Gson gson = new Gson();
    private final ConexionMySQL conexionBD = new ConexionMySQL();
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        PrintWriter out = response.getWriter();
        Respuesta respuesta = new Respuesta();
        
        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet rs = null;
        
        try {
            String pathInfo = request.getPathInfo();

            if (pathInfo != null && pathInfo.equals("/empleado")) {
                // Obtener reportes por empleado 
                obtenerReportesPorEmpleado(request, response, conn, stmt, rs, respuesta);
            } else if (pathInfo != null && pathInfo.equals("/gerente")) {
                // Obtener reportes para gerente 
                obtenerReportesGerente(request, response, conn, stmt, rs, respuesta);
            } else if (pathInfo != null && pathInfo.equals("/consolidado")) {
                // Obtener reporte consolidado
                manejarReporteConsolidado(request, response);
            } else if (pathInfo != null && pathInfo.matches("/\\d+")) {
                // Obtener un reporte específico por ID
                int idReporte = Integer.parseInt(pathInfo.substring(1));
                conn = conexionBD.open();
                
                Map<String, Object> reporte = obtenerReporteCompleto(conn, idReporte);
                
                if (reporte == null) {
                    response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    respuesta.setMensaje("Reporte no encontrado");
                } else {
                    respuesta.setExito(true);
                    respuesta.setDatos(reporte);
                }
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                respuesta.setMensaje("Ruta no válida");
            }
            
        } catch (SQLException ex) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            respuesta.setMensaje("Error en la base de datos: " + ex.getMessage());
        } catch (NumberFormatException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            respuesta.setMensaje("ID de empleado o reporte inválido");
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            respuesta.setMensaje("Error en la solicitud: " + e.getMessage());
        } finally {
            if (rs != null) try { rs.close(); } catch (SQLException ex) {}
            if (stmt != null) try { stmt.close(); } catch (SQLException ex) {}
            if (conn != null) try { conn.close(); } catch (SQLException ex) {}
        }
        
        out.println(gson.toJson(respuesta));
    }

    private void obtenerReportesPorEmpleado(HttpServletRequest request, HttpServletResponse response, 
            Connection conn, PreparedStatement stmt, ResultSet rs, Respuesta respuesta) throws SQLException {
        int idEmpleado = Integer.parseInt(request.getParameter("idEmpleado"));
        String fecha = request.getParameter("fecha");
        String orden = request.getParameter("orden");
        
        conn = conexionBD.open();
        
        StringBuilder sql = new StringBuilder(
            "SELECT cc.id_cierre, cc.fecha_cierre, cc.orden_inicio, cc.orden_fin, cc.total, " +
            "cc.total_efectivo, cc.total_credito_eventual, cc.total_credito, cc.total_tarjeta, " +
            "cc.total_transferencia, s.nombre_sucursal " +
            "FROM CierresCaja cc " +
            "JOIN Empleados e ON cc.id_empleado = e.id_empleado " +
            "JOIN Sucursales s ON e.id_sucursal = s.id_sucursal " +
            "WHERE cc.id_empleado = ? "
        );
        
        List<Object> params = new ArrayList<>();
        params.add(idEmpleado);
        
        if (fecha != null && !fecha.isEmpty()) {
            sql.append("AND DATE(cc.fecha_cierre) = ? ");
            params.add(fecha);
        }
        
        if (orden != null && !orden.isEmpty()) {
            sql.append("AND (? BETWEEN cc.orden_inicio AND cc.orden_fin) ");
            params.add(Integer.parseInt(orden));
        }
        
        sql.append("ORDER BY cc.fecha_cierre DESC");
        
        stmt = conn.prepareStatement(sql.toString());
        
        for (int i = 0; i < params.size(); i++) {
            stmt.setObject(i + 1, params.get(i));
        }
        
        rs = stmt.executeQuery();
        
        List<Map<String, Object>> reportes = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> reporte = new HashMap<>();
            reporte.put("id_cierre", rs.getInt("id_cierre"));
            reporte.put("fecha_cierre", rs.getTimestamp("fecha_cierre"));
            reporte.put("orden_inicio", rs.getInt("orden_inicio"));
            reporte.put("orden_fin", rs.getInt("orden_fin"));
            reporte.put("total", rs.getDouble("total"));
            reporte.put("total_efectivo", rs.getDouble("total_efectivo"));
            reporte.put("total_credito_eventual", rs.getDouble("total_credito_eventual"));
            reporte.put("total_credito", rs.getDouble("total_credito"));
            reporte.put("total_tarjeta", rs.getDouble("total_tarjeta"));
            reporte.put("total_transferencia", rs.getDouble("total_transferencia"));
            reporte.put("nombre_sucursal", rs.getString("nombre_sucursal"));
            reporte.put("total_cobros", rs.getDouble("total_efectivo") + 
                                  rs.getDouble("total_credito_eventual") + 
                                  rs.getDouble("total_credito") + 
                                  rs.getDouble("total_tarjeta") +
                                  rs.getDouble("total_transferencia"));
            
            reportes.add(reporte);
        }
        
        respuesta.setExito(true);
        respuesta.setDatos(reportes);
    }

    private void obtenerReportesGerente(HttpServletRequest request, HttpServletResponse response, 
            Connection conn, PreparedStatement stmt, ResultSet rs, Respuesta respuesta) throws SQLException {
        String fechaInicio = request.getParameter("fechaInicio");
        String fechaFin = request.getParameter("fechaFin");
        String ordenInicio = request.getParameter("ordenInicio");
        String ordenFin = request.getParameter("ordenFin");
        String idSucursal = request.getParameter("idSucursal");
        String idEmpleado = request.getParameter("idEmpleado");
        
        conn = conexionBD.open();
        
        StringBuilder sql = new StringBuilder(
            "SELECT cc.id_cierre, cc.fecha_cierre, cc.orden_inicio, cc.orden_fin, cc.total, " +
            "cc.total_efectivo, cc.total_credito_eventual, cc.total_credito, cc.total_tarjeta, " +
            "cc.total_transferencia, e.nombre_completo as nombre_empleado, s.nombre_sucursal " +
            "FROM CierresCaja cc " +
            "JOIN Empleados e ON cc.id_empleado = e.id_empleado " +
            "JOIN Sucursales s ON e.id_sucursal = s.id_sucursal " +
            "WHERE 1=1 "
        );
        
        List<Object> params = new ArrayList<>();
        
        if (fechaInicio != null && !fechaInicio.isEmpty()) {
            sql.append("AND DATE(cc.fecha_cierre) >= ? ");
            params.add(fechaInicio);
        }
        
        if (fechaFin != null && !fechaFin.isEmpty()) {
            sql.append("AND DATE(cc.fecha_cierre) <= ? ");
            params.add(fechaFin);
        }
        
        if (ordenInicio != null && !ordenInicio.isEmpty()) {
            sql.append("AND cc.orden_fin >= ? ");
            params.add(Integer.parseInt(ordenInicio));
        }
        
        if (ordenFin != null && !ordenFin.isEmpty()) {
            sql.append("AND cc.orden_inicio <= ? ");
            params.add(Integer.parseInt(ordenFin));
        }
        
        if (idSucursal != null && !idSucursal.isEmpty()) {
            sql.append("AND s.id_sucursal = ? ");
            params.add(Integer.parseInt(idSucursal));
        }
        
        if (idEmpleado != null && !idEmpleado.isEmpty()) {
            sql.append("AND e.id_empleado = ? ");
            params.add(Integer.parseInt(idEmpleado));
        }
        
        sql.append("ORDER BY cc.fecha_cierre DESC");
        
        stmt = conn.prepareStatement(sql.toString());
        
        for (int i = 0; i < params.size(); i++) {
            stmt.setObject(i + 1, params.get(i));
        }
        
        rs = stmt.executeQuery();
        
        List<Map<String, Object>> reportes = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> reporte = new HashMap<>();
            reporte.put("id_cierre", rs.getInt("id_cierre"));
            reporte.put("fecha_cierre", rs.getTimestamp("fecha_cierre"));
            reporte.put("orden_inicio", rs.getInt("orden_inicio"));
            reporte.put("orden_fin", rs.getInt("orden_fin"));
            reporte.put("total", rs.getDouble("total"));
            reporte.put("total_efectivo", rs.getDouble("total_efectivo"));
            reporte.put("total_credito_eventual", rs.getDouble("total_credito_eventual"));
            reporte.put("total_credito", rs.getDouble("total_credito"));
            reporte.put("total_tarjeta", rs.getDouble("total_tarjeta"));
            reporte.put("total_transferencia", rs.getDouble("total_transferencia"));
            reporte.put("nombre_empleado", rs.getString("nombre_empleado"));
            reporte.put("nombre_sucursal", rs.getString("nombre_sucursal"));
            
            reportes.add(reporte);
        }
        
        respuesta.setExito(true);
        respuesta.setDatos(reportes);
    }

private void manejarReporteConsolidado(HttpServletRequest request, HttpServletResponse response) 
        throws ServletException, IOException {
    
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");
    
    PrintWriter out = response.getWriter();
    
    Connection conn = null;
    PreparedStatement stmt = null;
    ResultSet rs = null;
    
    try {
        String idsReportes = request.getParameter("ids");
        
        if (idsReportes == null || idsReportes.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.println("{\"exito\":false,\"mensaje\":\"IDs de reportes no proporcionados\"}");
            return;
        }
        
        String[] idsArray = idsReportes.split(",");
        List<Integer> ids = new ArrayList<>();
        for (String id : idsArray) {
            ids.add(Integer.parseInt(id));
        }
        
        conn = conexionBD.open();
        Map<String, Object> consolidado = new HashMap<>();
        String idsStr = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        
        // 1. Obtener información básica del consolidado
        String sqlResumen = "SELECT COUNT(*) as total_reportes, MIN(fecha_cierre) as fecha_minima, " +
                           "MAX(fecha_cierre) as fecha_maxima, MIN(orden_inicio) as orden_minima, " +
                           "MAX(orden_fin) as orden_maxima, SUM(total) as total_general, " +
                           "SUM(total_efectivo) as total_efectivo, SUM(total_tarjeta) as total_tarjeta, " +
                           "SUM(total_credito) as total_credito, SUM(total_transferencia) as total_transferencia, " +
                           "SUM(total_credito_eventual) as total_credito_eventual " +
                           "FROM CierresCaja WHERE id_cierre IN (" + idsStr + ")";
        
        stmt = conn.prepareStatement(sqlResumen);
        rs = stmt.executeQuery();
        
        if (rs.next()) {
            consolidado.put("total_reportes", rs.getInt("total_reportes"));
            consolidado.put("fecha_minima", rs.getTimestamp("fecha_minima").toString());
            consolidado.put("fecha_maxima", rs.getTimestamp("fecha_maxima").toString());
            consolidado.put("orden_minima", rs.getInt("orden_minima"));
            consolidado.put("orden_maxima", rs.getInt("orden_maxima"));
            consolidado.put("total_general", rs.getDouble("total_general"));
            consolidado.put("total_efectivo", rs.getDouble("total_efectivo"));
            consolidado.put("total_tarjeta", rs.getDouble("total_tarjeta"));
            consolidado.put("total_credito", rs.getDouble("total_credito"));
            consolidado.put("total_transferencia", rs.getDouble("total_transferencia"));
            consolidado.put("total_credito_eventual", rs.getDouble("total_credito_eventual"));
        }
        
        // 2. Obtener totales por sucursal
        String sqlSucursales = "SELECT s.nombre_sucursal, COUNT(*) as total_reportes, " +
                              "SUM(cc.total_efectivo) as total_efectivo, " +
                              "SUM(cc.total_tarjeta) as total_tarjeta, " +
                              "SUM(cc.total_credito) as total_credito, " +
                              "SUM(cc.total_transferencia) as total_transferencia, " +
                              "SUM(cc.total_credito_eventual) as total_credito_eventual, " +
                              "SUM(cc.total) as total_general " +
                              "FROM CierresCaja cc " +
                              "JOIN Empleados e ON cc.id_empleado = e.id_empleado " +
                              "JOIN Sucursales s ON e.id_sucursal = s.id_sucursal " +
                              "WHERE cc.id_cierre IN (" + idsStr + ") " +
                              "GROUP BY s.nombre_sucursal";
        
        stmt = conn.prepareStatement(sqlSucursales);
        rs = stmt.executeQuery();
        
        List<Map<String, Object>> totalesSucursales = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> sucursal = new HashMap<>();
            sucursal.put("nombre_sucursal", rs.getString("nombre_sucursal"));
            sucursal.put("total_reportes", rs.getInt("total_reportes"));
            sucursal.put("total_efectivo", rs.getDouble("total_efectivo"));
            sucursal.put("total_tarjeta", rs.getDouble("total_tarjeta"));
            sucursal.put("total_credito", rs.getDouble("total_credito"));
            sucursal.put("total_transferencia", rs.getDouble("total_transferencia"));
            sucursal.put("total_credito_eventual", rs.getDouble("total_credito_eventual"));
            sucursal.put("total_general", rs.getDouble("total_general"));
            
            totalesSucursales.add(sucursal);
        }
        
        consolidado.put("totales_por_sucursal", totalesSucursales);
        
        //  Obtener verificaciones consolidadas
        String sqlVerificaciones = "SELECT tipo_verificacion, SUM(realizadas) as realizadas, " +
                                 "SUM(efectivo) as efectivo, SUM(tarjeta) as tarjeta, " +
                                 "SUM(credito) as credito, SUM(transferencia) as transferencia, " +
                                 "SUM(eventuales) as eventuales, SUM(total) as total " +
                                 "FROM ResumenVerificaciones " +
                                 "WHERE id_cierre IN (" + idsStr + ") " +
                                 "GROUP BY tipo_verificacion";
        
        stmt = conn.prepareStatement(sqlVerificaciones);
        rs = stmt.executeQuery();
        
        List<Map<String, Object>> verificaciones = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> verificacion = new HashMap<>();
            verificacion.put("tipo_verificacion", rs.getString("tipo_verificacion"));
            verificacion.put("realizadas", rs.getInt("realizadas"));
            verificacion.put("efectivo", rs.getDouble("efectivo"));
            verificacion.put("tarjeta", rs.getDouble("tarjeta"));
            verificacion.put("credito", rs.getDouble("credito"));
            verificacion.put("transferencia", rs.getDouble("transferencia"));
            verificacion.put("eventuales", rs.getDouble("eventuales"));
            verificacion.put("total", rs.getDouble("total"));
            
            verificaciones.add(verificacion);
        }
        
        consolidado.put("verificaciones", verificaciones);
        
        //  Obtener facturación consolidada
        String sqlFacturacion = "SELECT SUM(facturado_efectivo) as facturado_efectivo, " +
                               "SUM(remisionado) as remisionado " +
                               "FROM Facturacion " +
                               "WHERE id_cierre IN (" + idsStr + ")";
        
        stmt = conn.prepareStatement(sqlFacturacion);
        rs = stmt.executeQuery();
        
        if (rs.next()) {
            consolidado.put("facturado_efectivo", rs.getDouble("facturado_efectivo"));
            consolidado.put("remisionado", rs.getDouble("remisionado"));
        } else {
            consolidado.put("facturado_efectivo", 0.0);
            consolidado.put("remisionado", 0.0);
        }
        
        // 5. Obtener detalle de reportes
        String sqlDetalle = "SELECT cc.fecha_cierre, s.nombre_sucursal, " +
                           "e.nombre_completo as nombre_empleado, cc.orden_inicio, " +
                           "cc.orden_fin, cc.total " +
                           "FROM CierresCaja cc " +
                           "JOIN Empleados e ON cc.id_empleado = e.id_empleado " +
                           "JOIN Sucursales s ON e.id_sucursal = s.id_sucursal " +
                           "WHERE cc.id_cierre IN (" + idsStr + ") " +
                           "ORDER BY cc.fecha_cierre DESC";
        
        stmt = conn.prepareStatement(sqlDetalle);
        rs = stmt.executeQuery();
        
        List<Map<String, Object>> detalleReportes = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> reporte = new HashMap<>();
            reporte.put("fecha_cierre", rs.getTimestamp("fecha_cierre"));
            reporte.put("nombre_sucursal", rs.getString("nombre_sucursal"));
            reporte.put("nombre_empleado", rs.getString("nombre_empleado"));
            reporte.put("orden_inicio", rs.getInt("orden_inicio"));
            reporte.put("orden_fin", rs.getInt("orden_fin"));
            reporte.put("total", rs.getDouble("total"));
            
            detalleReportes.add(reporte);
        }
        
        consolidado.put("detalle_reportes", detalleReportes);
        
        // Retornar respuesta con formato JSON consistente
        out.println("{\"exito\":true,\"datos\":" + gson.toJson(consolidado) + "}");
        
    } catch (Exception e) {
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        out.println("{\"exito\":false,\"mensaje\":\"Error al obtener el reporte consolidado: " + e.getMessage() + "\"}");
    } finally {
        try { if (rs != null) rs.close(); } catch (Exception e) {}
        try { if (stmt != null) stmt.close(); } catch (Exception e) {}
        try { if (conn != null) conn.close(); } catch (Exception e) {}
    }
}

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        PrintWriter out = response.getWriter();
        Respuesta respuesta = new Respuesta();
        
        Connection conn = null;
        PreparedStatement stmtCierre = null;
        PreparedStatement stmtVerificacion = null;
        PreparedStatement stmtCredito = null;
        
        try {
            // Verificar token de autenticación
            String token = request.getHeader("Authorization");
            if (token == null || !token.startsWith("Bearer ")) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                respuesta.setMensaje("No autorizado: Token no proporcionado");
                out.println(gson.toJson(respuesta));
                return;
            }
            
            // Obtener cuerpo de la solicitud
            String requestBody = request.getReader().lines().collect(Collectors.joining());
            Reporte reporte = gson.fromJson(requestBody, Reporte.class);
            
            // Validar datos del reporte
            if (reporte.getOrdenInicio() <= 0 || reporte.getOrdenFin() <= 0 || 
                reporte.getOrdenInicio() > reporte.getOrdenFin()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                respuesta.setMensaje("Rango de órdenes inválido");
                out.println(gson.toJson(respuesta));
                return;
            }
            
            if (reporte.getVerificaciones() == null || reporte.getVerificaciones().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                respuesta.setMensaje("Debe incluir al menos una verificación");
                out.println(gson.toJson(respuesta));
                return;
            }
            
            // Conectar a la base de datos
            conn = conexionBD.open();
            conn.setAutoCommit(false); // Iniciar transacción
            
            // Obtener la sucursal del empleado
            String sqlSucursal = "SELECT id_sucursal FROM Empleados WHERE id_empleado = ?";
            int idSucursal = 0;
            
            try (PreparedStatement stmtSucursal = conn.prepareStatement(sqlSucursal)) {
                stmtSucursal.setInt(1, reporte.getIdEmpleado());
                try (ResultSet rs = stmtSucursal.executeQuery()) {
                    if (rs.next()) {
                        idSucursal = rs.getInt("id_sucursal");
                    } else {
                        throw new SQLException("No se encontró la sucursal para el empleado");
                    }
                }
            }
            
            //  Insertar en CierresCaja
            String sqlCierre = "INSERT INTO CierresCaja (fecha_cierre, orden_inicio, orden_fin, total, " +
                               "total_efectivo, total_credito_eventual, total_credito, total_tarjeta, " +
                               "total_transferencia, id_empleado, id_sucursal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            stmtCierre = conn.prepareStatement(sqlCierre, Statement.RETURN_GENERATED_KEYS);
            stmtCierre.setTimestamp(1, new Timestamp(reporte.getFechaCierre().getTime()));
            stmtCierre.setInt(2, reporte.getOrdenInicio());
            stmtCierre.setInt(3, reporte.getOrdenFin());
            stmtCierre.setDouble(4, reporte.getTotalGeneral());
            stmtCierre.setDouble(5, reporte.getTotalEfectivo());
            stmtCierre.setDouble(6, reporte.getTotalCreditoEventual());
            stmtCierre.setDouble(7, reporte.getTotalCredito());
            stmtCierre.setDouble(8, reporte.getTotalTarjeta());
            stmtCierre.setDouble(9, reporte.getTotalTransferencia());
            stmtCierre.setInt(10, reporte.getIdEmpleado());
            stmtCierre.setInt(11, idSucursal);
            
            int filasAfectadas = stmtCierre.executeUpdate();
            
            if (filasAfectadas == 0) {
                throw new SQLException("Error al insertar cierre de caja, ninguna fila afectada");
            }
            
            // Obtener ID del cierre insertado
            int idCierre;
            try (ResultSet generatedKeys = stmtCierre.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    idCierre = generatedKeys.getInt(1);
                } else {
                    throw new SQLException("Error al obtener ID del cierre de caja");
                }
            }
            
            //  Insertar verificaciones en ResumenVerificaciones
            String sqlVerificacion = "INSERT INTO ResumenVerificaciones (id_cierre, tipo_verificacion, realizadas, " +
                                    "efectivo, tarjeta, credito, transferencia, eventuales, total) " +
                                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            stmtVerificacion = conn.prepareStatement(sqlVerificacion);
            
            for (VerificacionReporte verificacion : reporte.getVerificaciones()) {
                stmtVerificacion.setInt(1, idCierre);
                stmtVerificacion.setString(2, verificacion.getTipo());
                stmtVerificacion.setInt(3, verificacion.getRealizadas());
                stmtVerificacion.setDouble(4, verificacion.getEfectivo());
                stmtVerificacion.setDouble(5, verificacion.getTarjeta());
                stmtVerificacion.setDouble(6, verificacion.getCredito());
                stmtVerificacion.setDouble(7, verificacion.getTransferencia());
                stmtVerificacion.setDouble(8, verificacion.getEventuales());
                stmtVerificacion.setDouble(9, verificacion.getTotal());
                
                stmtVerificacion.addBatch();
            }
            
            int[] resultados = stmtVerificacion.executeBatch();
            
            // Verificar que todas las inserciones fueron exitosas
            for (int res : resultados) {
                if (res == PreparedStatement.EXECUTE_FAILED) {
                    throw new SQLException("Error al insertar una o más verificaciones");
                }
            }
            
            //  Insertar facturación
            String sqlFacturacion = "INSERT INTO Facturacion (id_cierre, facturado_efectivo, remisionado) " +
                                   "VALUES (?, ?, ?)";
            
            try (PreparedStatement stmtFacturacion = conn.prepareStatement(sqlFacturacion)) {
                stmtFacturacion.setInt(1, idCierre);
                stmtFacturacion.setDouble(2, reporte.getFacturacionEfectivo());
                stmtFacturacion.setDouble(3, reporte.getRemisionado());
                
                filasAfectadas = stmtFacturacion.executeUpdate();
                
                if (filasAfectadas == 0) {
                    throw new SQLException("Error al insertar facturación, ninguna fila afectada");
                }
            }
            
            //  Insertar créditos si existen
            if (reporte.getCreditos() != null && !reporte.getCreditos().isEmpty()) {
                String sqlCredito = "INSERT INTO Creditos (id_cierre, no_orden, cliente, monto, concepto, status) " +
                                   "VALUES (?, ?, ?, ?, ?, ?)";
                
                stmtCredito = conn.prepareStatement(sqlCredito);
                
                for (Credito credito : reporte.getCreditos()) {
                    stmtCredito.setInt(1, idCierre);
                    stmtCredito.setInt(2, credito.getNoOrden());
                    stmtCredito.setString(3, credito.getCliente());
                    stmtCredito.setDouble(4, credito.getMonto());
                    stmtCredito.setString(5, credito.getConcepto());
                    stmtCredito.setString(6, credito.getStatus());
                    
                    stmtCredito.addBatch();
                }
                
                resultados = stmtCredito.executeBatch();
                
                for (int res : resultados) {
                    if (res == PreparedStatement.EXECUTE_FAILED) {
                        throw new SQLException("Error al insertar uno o más créditos");
                    }
                }
            }
            
            conn.commit(); // Confirmar transacción
            respuesta.setExito(true);
            respuesta.setMensaje("Reporte guardado correctamente");
            respuesta.setDatos(idCierre); // Devolver el ID del reporte creado
            
        } catch (SQLException ex) {
            if (conn != null) {
                try {
                    conn.rollback(); // Revertir transacción en caso de error
                } catch (SQLException ex1) {
                    respuesta.setMensaje("Error al revertir transacción: " + ex1.getMessage());
                }
            }
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            respuesta.setMensaje("Error en la base de datos: " + ex.getMessage());
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            respuesta.setMensaje("Error interno del servidor: " + e.getMessage());
        } finally {
            // Cerrar recursos
            if (stmtCredito != null) try { stmtCredito.close(); } catch (SQLException ex) {}
            if (stmtVerificacion != null) try { stmtVerificacion.close(); } catch (SQLException ex) {}
            if (stmtCierre != null) try { stmtCierre.close(); } catch (SQLException ex) {}
            if (conn != null) try { conn.setAutoCommit(true); conexionBD.close(conn); } catch (SQLException ex) {}
        }
        
        out.println(gson.toJson(respuesta));
    }
    
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        PrintWriter out = response.getWriter();
        Respuesta respuesta = new Respuesta();
        
        Connection conn = null;
        PreparedStatement stmtCierre = null;
        PreparedStatement stmtVerificacion = null;
        PreparedStatement stmtCredito = null;
        
        try {
            // Verificar token de autenticación
            String token = request.getHeader("Authorization");
            if (token == null || !token.startsWith("Bearer ")) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                respuesta.setMensaje("No autorizado: Token no proporcionado");
                out.println(gson.toJson(respuesta));
                return;
            }
            
            // Obtener cuerpo de la solicitud
            String requestBody = request.getReader().lines().collect(Collectors.joining());
            Reporte reporte = gson.fromJson(requestBody, Reporte.class);
            
            // Validar datos del reporte
            if (reporte.getIdReporte() <= 0) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                respuesta.setMensaje("ID de reporte inválido");
                out.println(gson.toJson(respuesta));
                return;
            }
            
            if (reporte.getOrdenInicio() <= 0 || reporte.getOrdenFin() <= 0 || 
                reporte.getOrdenInicio() > reporte.getOrdenFin()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                respuesta.setMensaje("Rango de órdenes inválido");
                out.println(gson.toJson(respuesta));
                return;
            }
            
            if (reporte.getVerificaciones() == null || reporte.getVerificaciones().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                respuesta.setMensaje("Debe incluir al menos una verificación");
                out.println(gson.toJson(respuesta));
                return;
            }
            
            // Conectar a la base de datos
            conn = conexionBD.open();
            conn.setAutoCommit(false); // Iniciar transacción
            
            //  Actualizar CierresCaja
            String sqlCierre = "UPDATE CierresCaja SET " +
                              "fecha_cierre = ?, orden_inicio = ?, orden_fin = ?, total = ?, " +
                              "total_efectivo = ?, total_credito_eventual = ?, total_credito = ?, " +
                              "total_tarjeta = ?, total_transferencia = ? WHERE id_cierre = ?";
            
            stmtCierre = conn.prepareStatement(sqlCierre);
            stmtCierre.setTimestamp(1, new Timestamp(reporte.getFechaCierre().getTime()));
            stmtCierre.setInt(2, reporte.getOrdenInicio());
            stmtCierre.setInt(3, reporte.getOrdenFin());
            stmtCierre.setDouble(4, reporte.getTotalGeneral());
            stmtCierre.setDouble(5, reporte.getTotalEfectivo());
            stmtCierre.setDouble(6, reporte.getTotalCreditoEventual());
            stmtCierre.setDouble(7, reporte.getTotalCredito());
            stmtCierre.setDouble(8, reporte.getTotalTarjeta());
            stmtCierre.setDouble(9, reporte.getTotalTransferencia());
            stmtCierre.setInt(10, reporte.getIdReporte());
            
            int filasAfectadas = stmtCierre.executeUpdate();
            
            if (filasAfectadas == 0) {
                throw new SQLException("No se encontró el reporte a actualizar");
            }
            
            //  Actualizar verificaciones (eliminar las existentes y crear nuevas)
            String sqlDeleteVerificaciones = "DELETE FROM ResumenVerificaciones WHERE id_cierre = ?";
            try (PreparedStatement stmtDelete = conn.prepareStatement(sqlDeleteVerificaciones)) {
                stmtDelete.setInt(1, reporte.getIdReporte());
                stmtDelete.executeUpdate();
            }
            
            // Insertar nuevas verificaciones
            String sqlVerificacion = "INSERT INTO ResumenVerificaciones (id_cierre, tipo_verificacion, realizadas, " +
                                    "efectivo, tarjeta, credito, transferencia, eventuales, total) " +
                                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            stmtVerificacion = conn.prepareStatement(sqlVerificacion);
            
            for (VerificacionReporte verificacion : reporte.getVerificaciones()) {
                stmtVerificacion.setInt(1, reporte.getIdReporte());
                stmtVerificacion.setString(2, verificacion.getTipo());
                stmtVerificacion.setInt(3, verificacion.getRealizadas());
                stmtVerificacion.setDouble(4, verificacion.getEfectivo());
                stmtVerificacion.setDouble(5, verificacion.getTarjeta());
                stmtVerificacion.setDouble(6, verificacion.getCredito());
                stmtVerificacion.setDouble(7, verificacion.getTransferencia());
                stmtVerificacion.setDouble(8, verificacion.getEventuales());
                stmtVerificacion.setDouble(9, verificacion.getTotal());
                
                stmtVerificacion.addBatch();
            }
            
            int[] resultados = stmtVerificacion.executeBatch();
            
            // Verificar que todas las inserciones fueron exitosas
            for (int res : resultados) {
                if (res == PreparedStatement.EXECUTE_FAILED) {
                    throw new SQLException("Error al insertar una o más verificaciones");
                }
            }
            
            //  Actualizar facturación
            String sqlFacturacion = "UPDATE Facturacion SET " +
                                   "facturado_efectivo = ?, remisionado = ? " +
                                   "WHERE id_cierre = ?";
            
            try (PreparedStatement stmtFacturacion = conn.prepareStatement(sqlFacturacion)) {
                stmtFacturacion.setDouble(1, reporte.getFacturacionEfectivo());
                stmtFacturacion.setDouble(2, reporte.getRemisionado());
                stmtFacturacion.setInt(3, reporte.getIdReporte());
                
                filasAfectadas = stmtFacturacion.executeUpdate();
                
                if (filasAfectadas == 0) {
                    // Si no existe, insertar
                    String sqlInsertFacturacion = "INSERT INTO Facturacion " +
                                                "(id_cierre, facturado_efectivo, remisionado) " +
                                                "VALUES (?, ?, ?)";
                    
                    try (PreparedStatement stmtInsert = conn.prepareStatement(sqlInsertFacturacion)) {
                        stmtInsert.setInt(1, reporte.getIdReporte());
                        stmtInsert.setDouble(2, reporte.getFacturacionEfectivo());
                        stmtInsert.setDouble(3, reporte.getRemisionado());
                        stmtInsert.executeUpdate();
                    }
                }
            }
            
            //  Actualizar créditos (eliminar existentes y crear nuevos)
            String sqlDeleteCreditos = "DELETE FROM Creditos WHERE id_cierre = ?";
            try (PreparedStatement stmtDelete = conn.prepareStatement(sqlDeleteCreditos)) {
                stmtDelete.setInt(1, reporte.getIdReporte());
                stmtDelete.executeUpdate();
            }
            
            // Insertar nuevos créditos si existen
            if (reporte.getCreditos() != null && !reporte.getCreditos().isEmpty()) {
                String sqlCredito = "INSERT INTO Creditos (id_cierre, no_orden, cliente, monto, concepto, status) " +
                                   "VALUES (?, ?, ?, ?, ?, ?)";
                
                stmtCredito = conn.prepareStatement(sqlCredito);
                
                for (Credito credito : reporte.getCreditos()) {
                    stmtCredito.setInt(1, reporte.getIdReporte());
                    stmtCredito.setInt(2, credito.getNoOrden());
                    stmtCredito.setString(3, credito.getCliente());
                    stmtCredito.setDouble(4, credito.getMonto());
                    stmtCredito.setString(5, credito.getConcepto());
                    stmtCredito.setString(6, credito.getStatus());
                    
                    stmtCredito.addBatch();
                }
                
                resultados = stmtCredito.executeBatch();
                
                for (int res : resultados) {
                    if (res == PreparedStatement.EXECUTE_FAILED) {
                        throw new SQLException("Error al insertar uno o más créditos");
                    }
                }
            }
            
            conn.commit(); // Confirmar transacción
            respuesta.setExito(true);
            respuesta.setMensaje("Reporte actualizado correctamente");
            
        } catch (SQLException ex) {
            if (conn != null) {
                try {
                    conn.rollback(); // Revertir transacción en caso de error
                } catch (SQLException ex1) {
                    respuesta.setMensaje("Error al revertir transacción: " + ex1.getMessage());
                }
            }
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            respuesta.setMensaje("Error en la base de datos: " + ex.getMessage());
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            respuesta.setMensaje("Error interno del servidor: " + e.getMessage());
        } finally {
            // Cerrar recursos
            if (stmtCredito != null) try { stmtCredito.close(); } catch (SQLException ex) {}
            if (stmtVerificacion != null) try { stmtVerificacion.close(); } catch (SQLException ex) {}
            if (stmtCierre != null) try { stmtCierre.close(); } catch (SQLException ex) {}
            if (conn != null) try { conn.setAutoCommit(true); conexionBD.close(conn); } catch (SQLException ex) {}
        }
        
        out.println(gson.toJson(respuesta));
    }

    // Método auxiliar para obtener un reporte completo
    private Map<String, Object> obtenerReporteCompleto(Connection conn, int idReporte) throws SQLException {
        Map<String, Object> reporte = new HashMap<>();
        
        //  Obtener datos básicos del cierre
        String sqlCierre = "SELECT cc.*, s.nombre_sucursal FROM CierresCaja cc " +
                          "JOIN Empleados e ON cc.id_empleado = e.id_empleado " +
                          "JOIN Sucursales s ON e.id_sucursal = s.id_sucursal " +
                          "WHERE cc.id_cierre = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sqlCierre)) {
            stmt.setInt(1, idReporte);
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    reporte.put("id_cierre", rs.getInt("id_cierre"));
                    reporte.put("fecha_cierre", rs.getTimestamp("fecha_cierre"));
                    reporte.put("orden_inicio", rs.getInt("orden_inicio"));
                    reporte.put("orden_fin", rs.getInt("orden_fin"));
                    reporte.put("total", rs.getDouble("total"));
                    reporte.put("total_efectivo", rs.getDouble("total_efectivo"));
                    reporte.put("total_credito_eventual", rs.getDouble("total_credito_eventual"));
                    reporte.put("total_credito", rs.getDouble("total_credito"));
                    reporte.put("total_tarjeta", rs.getDouble("total_tarjeta"));
                    reporte.put("total_transferencia", rs.getDouble("total_transferencia"));
                    reporte.put("nombre_sucursal", rs.getString("nombre_sucursal"));
                    reporte.put("total_cobros", rs.getDouble("total_efectivo") + 
                                              rs.getDouble("total_credito_eventual") + 
                                              rs.getDouble("total_credito") + 
                                              rs.getDouble("total_tarjeta") +
                                              rs.getDouble("total_transferencia"));
                } else {
                    return null;
                }
            }
        }
        
        //  Obtener verificaciones
        String sqlVerificaciones = "SELECT * FROM ResumenVerificaciones WHERE id_cierre = ?";
        List<Map<String, Object>> verificaciones = new ArrayList<>();
        
        try (PreparedStatement stmt = conn.prepareStatement(sqlVerificaciones)) {
            stmt.setInt(1, idReporte);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> verificacion = new HashMap<>();
                    verificacion.put("tipo_verificacion", rs.getString("tipo_verificacion"));
                    verificacion.put("realizadas", rs.getInt("realizadas"));
                    verificacion.put("efectivo", rs.getDouble("efectivo"));
                    verificacion.put("tarjeta", rs.getDouble("tarjeta"));
                    verificacion.put("credito", rs.getDouble("credito"));
                    verificacion.put("transferencia", rs.getDouble("transferencia"));
                    verificacion.put("eventuales", rs.getDouble("eventuales"));
                    verificacion.put("total", rs.getDouble("total"));
                    
                    verificaciones.add(verificacion);
                }
            }
        }
        
        reporte.put("verificaciones", verificaciones);
        
        //  Obtener facturación
        String sqlFacturacion = "SELECT * FROM Facturacion WHERE id_cierre = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sqlFacturacion)) {
            stmt.setInt(1, idReporte);
            
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    reporte.put("facturado_efectivo", rs.getDouble("facturado_efectivo"));
                    reporte.put("remisionado", rs.getDouble("remisionado"));
                } else {
                    reporte.put("facturado_efectivo", 0.0);
                    reporte.put("remisionado", 0.0);
                }
            }
        }
        
        //  Obtener créditos
        String sqlCreditos = "SELECT * FROM Creditos WHERE id_cierre = ?";
        List<Map<String, Object>> creditos = new ArrayList<>();
        
        try (PreparedStatement stmt = conn.prepareStatement(sqlCreditos)) {
            stmt.setInt(1, idReporte);
            
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> credito = new HashMap<>();
                    credito.put("no_orden", rs.getInt("no_orden"));
                    credito.put("cliente", rs.getString("cliente"));
                    credito.put("monto", rs.getDouble("monto"));
                    credito.put("concepto", rs.getString("concepto"));
                    credito.put("status", rs.getString("status"));
                    
                    creditos.add(credito);
                }
            }
        }
        
        reporte.put("creditos", creditos);
        
        return reporte;
    }
}

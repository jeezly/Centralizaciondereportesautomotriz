package Rest;

import Model.Respuesta;
import bd.ConexionMySQL;
import com.google.gson.Gson;
import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Application;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@ApplicationPath("/api")
public class ReporteRest extends Application {
    @Override
    public Set<Class<?>> getClasses() {
        Set<Class<?>> classes = new HashSet<>();
        classes.add(ReporteService.class);
        classes.add(SucursalService.class);
        classes.add(EmpleadoService.class);
        return classes;
    }
    
    @Path("/reportes")
    public static class ReporteService {
        private static final ConexionMySQL conexionBD = new ConexionMySQL();
        private static final Gson gson = new Gson();
        
        @GET
        @Path("/empleado")
        @Produces(MediaType.APPLICATION_JSON)
        public Response obtenerReportesPorEmpleado(
                @QueryParam("idEmpleado") int idEmpleado,
                @QueryParam("fecha") String fecha,
                @QueryParam("orden") String orden) {
            
            Connection conn = null;
            try {
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
                
                PreparedStatement stmt = conn.prepareStatement(sql.toString());
                
                for (int i = 0; i < params.size(); i++) {
                    stmt.setObject(i + 1, params.get(i));
                }
                
                ResultSet rs = stmt.executeQuery();
                
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
                
                return Response.ok()
                    .entity("{\"exito\":true,\"datos\":" + gson.toJson(reportes) + "}")
                    .build();
                
            } catch (Exception e) {
                return Response.serverError()
                    .entity("{\"exito\":false,\"mensaje\":\"Error al obtener reportes: " + e.getMessage() + "\"}")
                    .build();
            } finally {
                try { if (conn != null) conn.close(); } catch (Exception e) {}
            }
        }
        
        @GET
        @Path("/gerente")
        @Produces(MediaType.APPLICATION_JSON)
        public Response obtenerReportesGerente(
                @QueryParam("fechaInicio") String fechaInicio,
                @QueryParam("fechaFin") String fechaFin,
                @QueryParam("ordenInicio") String ordenInicio,
                @QueryParam("ordenFin") String ordenFin,
                @QueryParam("idSucursal") String idSucursal,
                @QueryParam("idEmpleado") String idEmpleado) {
            
            Connection conn = null;
            try {
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
                
                PreparedStatement stmt = conn.prepareStatement(sql.toString());
                
                for (int i = 0; i < params.size(); i++) {
                    stmt.setObject(i + 1, params.get(i));
                }
                
                ResultSet rs = stmt.executeQuery();
                
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
                
                return Response.ok()
                    .entity("{\"exito\":true,\"datos\":" + gson.toJson(reportes) + "}")
                    .build();
                
            } catch (Exception e) {
                return Response.serverError()
                    .entity("{\"exito\":false,\"mensaje\":\"Error al obtener reportes: " + e.getMessage() + "\"}")
                    .build();
            } finally {
                try { if (conn != null) conn.close(); } catch (Exception e) {}
            }
        }
        
@GET
@Path("/consolidado")
@Produces(MediaType.APPLICATION_JSON)
public Response obtenerReporteConsolidado(@QueryParam("ids") String idsReportes) {
    Connection conn = null;
    PreparedStatement stmt = null;
    ResultSet rs = null;
    
    try {
        if (idsReportes == null || idsReportes.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity("{\"exito\":false,\"mensaje\":\"IDs de reportes no proporcionados\"}")
                .build();
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
        
        // 3. Obtener verificaciones consolidadas
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
        return Response.ok()
            .entity("{\"exito\":true,\"datos\":" + gson.toJson(consolidado) + "}")
            .build();
        
    } catch (Exception e) {
        return Response.serverError()
            .entity("{\"exito\":false,\"mensaje\":\"Error al obtener el reporte consolidado: " + e.getMessage() + "\"}")
            .build();
    } finally {
        try { if (rs != null) rs.close(); } catch (Exception e) {}
        try { if (stmt != null) stmt.close(); } catch (Exception e) {}
        try { if (conn != null) conn.close(); } catch (Exception e) {}
    }
}
        
        @GET
        @Path("/{idReporte}")
        @Produces(MediaType.APPLICATION_JSON)
        public Response obtenerReporte(@PathParam("idReporte") int idReporte) {
            Connection conn = null;
            try {
                if (idReporte <= 0) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"exito\":false,\"mensaje\":\"ID de reporte inválido\"}")
                        .build();
                }
                
                conn = conexionBD.open();
                Map<String, Object> reporte = obtenerReporteCompleto(conn, idReporte);
                
                if (reporte == null) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"exito\":false,\"mensaje\":\"Reporte no encontrado\"}")
                        .build();
                }
                
                return Response.ok()
                    .entity("{\"exito\":true,\"datos\":" + gson.toJson(reporte) + "}")
                    .build();
                
            } catch (Exception e) {
                return Response.serverError()
                    .entity("{\"exito\":false,\"mensaje\":\"Error al obtener el reporte: " + e.getMessage() + "\"}")
                    .build();
            } finally {
                try { if (conn != null) conn.close(); } catch (Exception e) {}
            }
        }
        
        private Map<String, Object> obtenerReporteCompleto(Connection conn, int idReporte) throws Exception {
            Map<String, Object> reporte = new HashMap<>();
            
        
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
            
            // 3. Obtener facturación
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
    
    @Path("/sucursales")
    public static class SucursalService {
        private static final ConexionMySQL conexionBD = new ConexionMySQL();
        
        @GET
        @Path("/activas")
        @Produces(MediaType.APPLICATION_JSON)
        public Response obtenerSucursalesActivas() {
            Connection conn = null;
            Statement stmt = null;
            ResultSet rs = null;
            
            try {
                conn = conexionBD.open();
                stmt = conn.createStatement();
                rs = stmt.executeQuery("SELECT id_sucursal, nombre_sucursal FROM Sucursales WHERE estatus = 'activa'");
                
                List<Map<String, Object>> sucursales = new ArrayList<>();
                while (rs.next()) {
                    Map<String, Object> sucursal = new HashMap<>();
                    sucursal.put("id_sucursal", rs.getInt("id_sucursal"));
                    sucursal.put("nombre_sucursal", rs.getString("nombre_sucursal"));
                    sucursales.add(sucursal);
                }
                
                return Response.ok()
                    .entity("{\"exito\":true,\"datos\":" + new Gson().toJson(sucursales) + "}")
                    .build();
                
            } catch (Exception e) {
                return Response.serverError()
                    .entity("{\"exito\":false,\"mensaje\":\"Error al obtener sucursales: " + e.getMessage() + "\"}")
                    .build();
            } finally {
                try { if (rs != null) rs.close(); } catch (Exception e) {}
                try { if (stmt != null) stmt.close(); } catch (Exception e) {}
                try { if (conn != null) conn.close(); } catch (Exception e) {}
            }
        }
    }
    
    @Path("/empleados")
    public static class EmpleadoService {
        private static final ConexionMySQL conexionBD = new ConexionMySQL();
        
        @GET
        @Path("/activos")
        @Produces(MediaType.APPLICATION_JSON)
        public Response obtenerEmpleadosActivos() {
            Connection conn = null;
            Statement stmt = null;
            ResultSet rs = null;
            
            try {
                conn = conexionBD.open();
                stmt = conn.createStatement();
                rs = stmt.executeQuery("SELECT id_empleado, nombre_completo FROM Empleados WHERE estatus = 'activo'");
                
                List<Map<String, Object>> empleados = new ArrayList<>();
                while (rs.next()) {
                    Map<String, Object> empleado = new HashMap<>();
                    empleado.put("id_empleado", rs.getInt("id_empleado"));
                    empleado.put("nombre_completo", rs.getString("nombre_completo"));
                    empleados.add(empleado);
                }
                
                return Response.ok()
                    .entity("{\"exito\":true,\"datos\":" + new Gson().toJson(empleados) + "}")
                    .build();
                
            } catch (Exception e) {
                return Response.serverError()
                    .entity("{\"exito\":false,\"mensaje\":\"Error al obtener empleados: " + e.getMessage() + "\"}")
                    .build();
            } finally {
                try { if (rs != null) rs.close(); } catch (Exception e) {}
                try { if (stmt != null) stmt.close(); } catch (Exception e) {}
                try { if (conn != null) conn.close(); } catch (Exception e) {}
            }
        }
    }
}
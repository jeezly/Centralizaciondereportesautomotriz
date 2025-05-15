package Controller;

import Model.Usuario;
import bd.ConexionMySQL;
import com.google.gson.Gson;
import jakarta.ws.rs.core.Response;
import java.sql.*;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public class controllerLogin {
    private final Gson gson = new Gson();

    public Response login(String json) {
        Usuario usuario = gson.fromJson(json, Usuario.class);
        
        try (Connection conn = new ConexionMySQL().open()) {
           
            String sql = "SELECT u.id_usuario, u.rol, e.id_empleado, e.nombre_completo, s.nombre_sucursal " +
                        "FROM Usuarios u " +
                        "LEFT JOIN Empleados e ON u.id_usuario = e.id_usuario " +
                        "LEFT JOIN Sucursales s ON e.id_sucursal = s.id_sucursal " +
                        "WHERE u.nombre_usuario = ? AND u.password = ? AND u.activo = TRUE";
            
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, usuario.getNombreUsuario());
                pstmt.setString(2, usuario.getPassword());
                
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {

                        String token = generarTokenUnico(rs.getInt("id_usuario"));
                        

                        actualizarToken(conn, rs.getInt("id_usuario"), token);
                        

                        Map<String, Object> respuesta = new HashMap<>();
                        respuesta.put("idUsuario", rs.getInt("id_usuario"));
                        respuesta.put("token", token);
                        respuesta.put("rol", rs.getString("rol"));
                        respuesta.put("idEmpleado", rs.getInt("id_empleado"));
                        respuesta.put("nombreCompleto", rs.getString("nombre_completo"));
                        respuesta.put("sucursal", rs.getString("nombre_sucursal"));
                        
                        return Response.ok(gson.toJson(respuesta)).build();
                    }
                    return Response.status(Response.Status.UNAUTHORIZED)
                            .entity("{\"error\":\"Credenciales incorrectas\"}")
                            .build();
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return Response.serverError()
                    .entity("{\"error\":\"Error en la base de datos\"}")
                    .build();
        }
    }

    private String generarTokenUnico(int idUsuario) {
        return String.format("tok_%d_%s_%s_%d",
                System.currentTimeMillis(),
                UUID.randomUUID().toString().replace("-", "").substring(0, 8),
                Integer.toHexString(ThreadLocalRandom.current().nextInt()),
                idUsuario);
    }

    private void actualizarToken(Connection conn, int idUsuario, String token) throws SQLException {
        String sql = "UPDATE Usuarios SET token = ? WHERE id_usuario = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, token);
            pstmt.setInt(2, idUsuario);
            pstmt.executeUpdate();
        }
    }

    public Response verifyToken(int idUsuario, String token) {
        try (Connection conn = new ConexionMySQL().open()) {
            if (!token.matches("^tok_\\d+_\\w{8}_\\w+_\\d+$")) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity("{\"error\":\"Token con formato inválido\"}")
                        .build();
            }
            

            String sql = "SELECT u.rol, e.id_empleado, e.nombre_completo, s.nombre_sucursal " +
                        "FROM Usuarios u " +
                        "LEFT JOIN Empleados e ON u.id_usuario = e.id_usuario " +
                        "LEFT JOIN Sucursales s ON e.id_sucursal = s.id_sucursal " +
                        "WHERE u.id_usuario = ? AND u.token = ? AND u.activo = TRUE";
            
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setInt(1, idUsuario);
                pstmt.setString(2, token);
                
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        Map<String, Object> respuesta = new HashMap<>();
                        respuesta.put("rol", rs.getString("rol"));
                        respuesta.put("idEmpleado", rs.getInt("id_empleado"));
                        respuesta.put("nombreCompleto", rs.getString("nombre_completo"));
                        respuesta.put("sucursal", rs.getString("nombre_sucursal"));
                        
                        return Response.ok(gson.toJson(respuesta)).build();
                    }
                    return Response.status(Response.Status.UNAUTHORIZED)
                            .entity("{\"error\":\"Token no válido\"}")
                            .build();
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return Response.serverError()
                    .entity("{\"error\":\"Error al verificar token\"}")
                    .build();
        }
    }

    public Response logout(int idUsuario) {
        try (Connection conn = new ConexionMySQL().open()) {
            String sql = "UPDATE Usuarios SET token = NULL WHERE id_usuario = ?";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setInt(1, idUsuario);
                int affected = pstmt.executeUpdate();
                
                if (affected > 0) {
                    return Response.ok("{\"message\":\"Sesión cerrada\"}").build();
                }
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("{\"error\":\"Usuario no encontrado\"}")
                        .build();
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return Response.serverError()
                    .entity("{\"error\":\"Error al cerrar sesión\"}")
                    .build();
        }
    }
}
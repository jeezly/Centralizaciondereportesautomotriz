package bd;

import java.sql.Connection;
import java.sql.DriverManager;

public class ConexionMySQL {
    private static final String URL = "jdbc:mysql://localhost:3306/control_verificaciones";
    private static final String USER = "root"; // Cambia si es necesario
    private static final String PASSWORD = "root"; // Cambia por tu contraseña
    private static final String PARAMS = "?useSSL=false&useUnicode=true&characterEncoding=utf-8&serverTimezone=UTC";
    
    public Connection open() {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            return DriverManager.getConnection(URL + PARAMS, USER, PASSWORD);
        } catch (Exception e) {
            System.err.println("Error al conectar a la base de datos:");
            e.printStackTrace();
            throw new RuntimeException("No se pudo establecer la conexión con la base de datos", e);
        }
    }
    
    public void close(Connection conn) {
        if (conn != null) {
            try {
                conn.close();
            } catch (Exception e) {
                System.err.println("Error al cerrar la conexión:");
                e.printStackTrace();
            }
        }
    }
}
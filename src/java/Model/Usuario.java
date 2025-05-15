/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package Model;

/**
 *
 * @author heezl
 */


public class Usuario {
    private int idUsuario;
    private String nombreUsuario;
    private String password;
    private String rol;
    private String token;


    public int getIdUsuario() { return idUsuario; }
    public void setIdUsuario(int idUsuario) { this.idUsuario = idUsuario; }
    
    public String getNombreUsuario() { return nombreUsuario; }
    public void setNombreUsuario(String nombreUsuario) { this.nombreUsuario = nombreUsuario; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
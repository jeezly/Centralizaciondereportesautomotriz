package Model;

public class Empleado {
    private int idEmpleado;
    private String nombreCompleto;
    private int idUsuario;
    private int idSucursal;
    private String estatus;


    public int getIdEmpleado() { return idEmpleado; }
    public void setIdEmpleado(int idEmpleado) { this.idEmpleado = idEmpleado; }
    
    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String nombreCompleto) { this.nombreCompleto = nombreCompleto; }
    
    public int getIdUsuario() { return idUsuario; }
    public void setIdUsuario(int idUsuario) { this.idUsuario = idUsuario; }
    
    public int getIdSucursal() { return idSucursal; }
    public void setIdSucursal(int idSucursal) { this.idSucursal = idSucursal; }
    
    public String getEstatus() { return estatus; }
    public void setEstatus(String estatus) { this.estatus = estatus; }
}
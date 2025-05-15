package Model;

public class Credito {
    private int noOrden;
    private String cliente;
    private double monto;
    private String concepto;
    private String status;
    

    public int getNoOrden() { return noOrden; }
    public void setNoOrden(int noOrden) { this.noOrden = noOrden; }
    
    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }
    
    public double getMonto() { return monto; }
    public void setMonto(double monto) { this.monto = monto; }
    
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
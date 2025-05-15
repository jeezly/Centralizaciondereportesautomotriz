package Model;

public class VerificacionReporte {
    private String tipo;
    private int realizadas;
    private double efectivo;
    private double tarjeta;
    private double credito;
    private double transferencia;
    private double eventuales;
    private double total;
    

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    
    public int getRealizadas() { return realizadas; }
    public void setRealizadas(int realizadas) { this.realizadas = realizadas; }
    
    public double getEfectivo() { return efectivo; }
    public void setEfectivo(double efectivo) { this.efectivo = efectivo; }
    
    public double getTarjeta() { return tarjeta; }
    public void setTarjeta(double tarjeta) { this.tarjeta = tarjeta; }
    
    public double getCredito() { return credito; }
    public void setCredito(double credito) { this.credito = credito; }
    
    public double getTransferencia() { return transferencia; }
    public void setTransferencia(double transferencia) { this.transferencia = transferencia; }
    
    public double getEventuales() { return eventuales; }
    public void setEventuales(double eventuales) { this.eventuales = eventuales; }
    
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
}
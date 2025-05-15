package Model;

import java.util.Date;
import java.util.List;

public class Reporte {
    private int idReporte; 
    private int idEmpleado;
    private Date fechaCierre;
    private int ordenInicio;
    private int ordenFin;
    private double totalGeneral;
    private double totalEfectivo;
    private double totalCreditoEventual;
    private double totalCredito;
    private double totalTarjeta;
    private double totalTransferencia;
    private double totalCobros;
    private double facturacionEfectivo;
    private double remisionado;
    private List<VerificacionReporte> verificaciones;
    private List<Credito> creditos;

    // Getters y Setters
    public int getIdReporte() {
        return idReporte;
    }

    public void setIdReporte(int idReporte) {
        this.idReporte = idReporte;
    }

    public int getIdEmpleado() {
        return idEmpleado;
    }

    public void setIdEmpleado(int idEmpleado) {
        this.idEmpleado = idEmpleado;
    }

    public Date getFechaCierre() {
        return fechaCierre;
    }

    public void setFechaCierre(Date fechaCierre) {
        this.fechaCierre = fechaCierre;
    }

    public int getOrdenInicio() {
        return ordenInicio;
    }

    public void setOrdenInicio(int ordenInicio) {
        this.ordenInicio = ordenInicio;
    }

    public int getOrdenFin() {
        return ordenFin;
    }

    public void setOrdenFin(int ordenFin) {
        this.ordenFin = ordenFin;
    }

    public double getTotalGeneral() {
        return totalGeneral;
    }

    public void setTotalGeneral(double totalGeneral) {
        this.totalGeneral = totalGeneral;
    }

    public double getTotalEfectivo() {
        return totalEfectivo;
    }

    public void setTotalEfectivo(double totalEfectivo) {
        this.totalEfectivo = totalEfectivo;
    }

    public double getTotalCreditoEventual() {
        return totalCreditoEventual;
    }

    public void setTotalCreditoEventual(double totalCreditoEventual) {
        this.totalCreditoEventual = totalCreditoEventual;
    }

    public double getTotalCredito() {
        return totalCredito;
    }

    public void setTotalCredito(double totalCredito) {
        this.totalCredito = totalCredito;
    }

    public double getTotalTarjeta() {
        return totalTarjeta;
    }

    public void setTotalTarjeta(double totalTarjeta) {
        this.totalTarjeta = totalTarjeta;
    }

    public double getTotalTransferencia() {
        return totalTransferencia;
    }

    public void setTotalTransferencia(double totalTransferencia) {
        this.totalTransferencia = totalTransferencia;
    }

    public double getTotalCobros() {
        return totalCobros;
    }

    public void setTotalCobros(double totalCobros) {
        this.totalCobros = totalCobros;
    }

    public double getFacturacionEfectivo() {
        return facturacionEfectivo;
    }

    public void setFacturacionEfectivo(double facturacionEfectivo) {
        this.facturacionEfectivo = facturacionEfectivo;
    }

    public double getRemisionado() {
        return remisionado;
    }

    public void setRemisionado(double remisionado) {
        this.remisionado = remisionado;
    }

    public List<VerificacionReporte> getVerificaciones() {
        return verificaciones;
    }

    public void setVerificaciones(List<VerificacionReporte> verificaciones) {
        this.verificaciones = verificaciones;
    }

    public List<Credito> getCreditos() {
        return creditos;
    }

    public void setCreditos(List<Credito> creditos) {
        this.creditos = creditos;
    }

    // Método para calcular el total de cobros
    public void calcularTotalCobros() {
        this.totalCobros = this.totalEfectivo + this.totalCreditoEventual + 
                          this.totalCredito + this.totalTarjeta + this.totalTransferencia;
    }

    // Método para validar los datos básicos del reporte
    public boolean validarDatosBasicos() {
        if (ordenInicio <= 0 || ordenFin <= 0 || ordenInicio > ordenFin) {
            return false;
        }
        if (fechaCierre == null) {
            return false;
        }
        if (verificaciones == null || verificaciones.isEmpty()) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "Reporte{" +
                "idReporte=" + idReporte +
                ", idEmpleado=" + idEmpleado +
                ", fechaCierre=" + fechaCierre +
                ", ordenInicio=" + ordenInicio +
                ", ordenFin=" + ordenFin +
                ", totalGeneral=" + totalGeneral +
                ", totalEfectivo=" + totalEfectivo +
                ", totalCreditoEventual=" + totalCreditoEventual +
                ", totalCredito=" + totalCredito +
                ", totalTarjeta=" + totalTarjeta +
                ", totalTransferencia=" + totalTransferencia +
                ", totalCobros=" + totalCobros +
                ", facturacionEfectivo=" + facturacionEfectivo +
                ", remisionado=" + remisionado +
                '}';
    }
}
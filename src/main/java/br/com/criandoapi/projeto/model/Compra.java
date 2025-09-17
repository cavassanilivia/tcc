package br.com.criandoapi.projeto.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "compras")
public class Compra {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idCompra;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    private Integer quantidade;

    @Enumerated(EnumType.STRING)
    private Pagamento pagamento;

    private Double valorEstimado;

    @Column(columnDefinition = "json")
    private String orcamentoJson;

    private LocalDateTime dataCompra = LocalDateTime.now();

    public enum Pagamento {
        pix, cartao, boleto
    }
}

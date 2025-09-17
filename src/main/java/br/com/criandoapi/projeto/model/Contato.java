package br.com.criandoapi.projeto.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "contatos")
public class Contato {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idContato;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    private String nome;
    private String email;
    private String telefone;

    @Enumerated(EnumType.STRING)
    private Assunto assunto;

    @Column(columnDefinition = "text")
    private String mensagem;

    private LocalDateTime enviadoEm = LocalDateTime.now();

    public enum Assunto {
        duvida, suporte, sugestao, outro
    }
}

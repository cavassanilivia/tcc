package br.com.criandoapi.projeto.repository;

@org.springframework.stereotype.Repository
public interface UsuarioRepository
    extends org.springframework.data.jpa.repository.JpaRepository<br.com.criandoapi.projeto.model.Usuario, Integer> {

    // === ORIGINAL ===
    br.com.criandoapi.projeto.model.Usuario findByEmail(String email);

    // === ACRESCENTOS ÚTEIS ===
    // Busca ignorando maiúsculas/minúsculas
    java.util.Optional<br.com.criandoapi.projeto.model.Usuario> findByEmailIgnoreCase(String email);

    // Verifica se já existe usuário com o e-mail informado
    boolean existsByEmail(String email);
}
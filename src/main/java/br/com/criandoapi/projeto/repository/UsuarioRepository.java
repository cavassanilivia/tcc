package br.com.criandoapi.projeto.repository;

import br.com.criandoapi.projeto.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    // Busca usuário pelo e-mail (retorna Optional)
    Optional<Usuario> findByEmail(String email);

    // Busca ignorando maiúsculas/minúsculas
    Optional<Usuario> findByEmailIgnoreCase(String email);

    // Verifica se já existe usuário com o e-mail informado
    boolean existsByEmail(String email);
}

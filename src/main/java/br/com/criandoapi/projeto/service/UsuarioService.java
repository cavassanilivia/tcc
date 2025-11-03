package br.com.criandoapi.projeto.service;

import br.com.criandoapi.projeto.model.Usuario;
import br.com.criandoapi.projeto.repository.UsuarioRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;


import java.util.List;

@Service
public class UsuarioService {

    private final UsuarioRepository repo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UsuarioService(UsuarioRepository repo) {
        this.repo = repo;
    }

    // Cadastro: gera hash antes de salvar
    public Usuario cadastrar(Usuario usuario) {
        if (usuario.getSenha() == null || usuario.getSenha().isBlank()) {
            throw new IllegalArgumentException("Senha não pode ser nula");
        }

        usuario.setSenhaHash(encoder.encode(usuario.getSenha())); // gera hash
        usuario.setSenha(null); // limpa a senha transitória

        return repo.save(usuario);
    }

    // Login: valida senha com BCrypt
    public Usuario autenticar(String email, String senhaDigitada) {
        Usuario usuario = repo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (encoder.matches(senhaDigitada, usuario.getSenhaHash())) {
            return usuario;
        }
        throw new RuntimeException("Senha inválida");
    }

    // Listagem: retorna todos os usuários
    public List<Usuario> listarTodos() {
        return repo.findAll();
    }
}

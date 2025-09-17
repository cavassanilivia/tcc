package br.com.criandoapi.projeto.controller;

import br.com.criandoapi.projeto.model.Usuario;
import br.com.criandoapi.projeto.repository.UsuarioRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioRepository usuarioRepo;

    public AuthController(UsuarioRepository usuarioRepo) {
        this.usuarioRepo = usuarioRepo;
    }

    @PostMapping("/login")
    public Usuario login(@RequestBody Usuario credenciais) {
        Usuario u = usuarioRepo.findByEmail(credenciais.getEmail());
        if (u != null && u.getSenhaHash().equals(credenciais.getSenhaHash())) {
            return u; // ⚠️ para produção use hash seguro (bcrypt/argon2)
        }
        throw new RuntimeException("Credenciais inválidas");
    }
}

package br.com.criandoapi.projeto.controller;

import br.com.criandoapi.projeto.model.Usuario;
import br.com.criandoapi.projeto.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    public ResponseEntity<Usuario> login(@RequestBody Usuario credenciais) {
        Usuario u = usuarioService.autenticar(credenciais.getEmail(), credenciais.getSenha());
        return ResponseEntity.ok(u);
    }
}

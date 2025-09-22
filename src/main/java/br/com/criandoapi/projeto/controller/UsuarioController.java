package br.com.criandoapi.projeto.controller;

import br.com.criandoapi.projeto.model.Usuario;
import br.com.criandoapi.projeto.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping
    public ResponseEntity<Usuario> create(@RequestBody Usuario u) {
        Usuario novo = usuarioService.cadastrar(u);
        return ResponseEntity.ok(novo);
    }

    @GetMapping
    public List<Usuario> list() {
        return usuarioService.listarTodos();
    }
}

package br.com.criandoapi.projeto.controller;

import br.com.criandoapi.projeto.model.Compra;
import br.com.criandoapi.projeto.repository.CompraRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/compras")
@CrossOrigin(origins = "*")
public class CompraController {
    private final CompraRepository repo;
    public CompraController(CompraRepository repo) { this.repo = repo; }

    @PostMapping
    public Compra create(@RequestBody Compra c) { return repo.save(c); }

    @GetMapping
    public List<Compra> list() { return repo.findAll(); }
}

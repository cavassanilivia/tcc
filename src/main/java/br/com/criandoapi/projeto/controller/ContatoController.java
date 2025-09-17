package br.com.criandoapi.projeto.controller;

import br.com.criandoapi.projeto.model.Contato;
import br.com.criandoapi.projeto.repository.ContatoRepository;
import br.com.criandoapi.projeto.service.EmailService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contatos")
@CrossOrigin(origins = "*")
public class ContatoController {

    private final ContatoRepository repo;
    private final EmailService emailService;

    public ContatoController(ContatoRepository repo, EmailService emailService) {
        this.repo = repo;
        this.emailService = emailService;
    }

    @PostMapping
    public Contato create(@RequestBody Contato c) {
        Contato salvo = repo.save(c);
        emailService.enviarEmailContato(salvo); // envia e-mail pelo Mailtrap
        return salvo;
    }

    @GetMapping
    public List<Contato> list() {
        return repo.findAll();
    }
}

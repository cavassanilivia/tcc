package br.com.criandoapi.projeto.service;

import br.com.criandoapi.projeto.model.Contato;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void enviarEmailContato(Contato contato) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo("teste@exemplo.com"); // Pode ser qualquer e-mail, no Mailtrap aparece de qualquer jeito
        msg.setSubject("Novo contato: " + contato.getAssunto());
        msg.setText("""
                Você recebeu uma nova mensagem pelo site:

                Nome: %s
                E-mail: %s
                Telefone: %s

                Assunto: %s
                Mensagem:
                %s
                """.formatted(
                contato.getNome(),
                contato.getEmail(),
                contato.getTelefone() != null ? contato.getTelefone() : "-",
                contato.getAssunto(),
                contato.getMensagem()
        ));
        msg.setReplyTo(contato.getEmail());
        mailSender.send(msg);
    }
}

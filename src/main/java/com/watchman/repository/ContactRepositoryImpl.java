package com.watchman.repository;

import com.watchman.domain.Contact;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ContactRepositoryImpl implements ContactRepository {

    private JdbcTemplate template;

    @Autowired
    public void setJdbcTemplate(JdbcTemplate template) {
        this.template = template;
    }

    private static final String SELECT_COLS =
        "SELECT contact_id, name, email, type, content, status, reply_content, replied_at, created_at ";

    @Override
    public void save(Contact contact) {
        String sql = "INSERT INTO contacts (name, email, type, content) VALUES (?, ?, ?, ?)";
        this.template.update(sql,
                contact.getName(), contact.getEmail(),
                contact.getType(), contact.getContent());
    }

    @Override
    public List<Contact> findAll() {
        String sql = SELECT_COLS + "FROM contacts ORDER BY created_at DESC";
        return this.template.query(sql, BeanPropertyRowMapper.newInstance(Contact.class));
    }

    @Override
    public List<Contact> findByEmail(String email) {
        String sql = SELECT_COLS + "FROM contacts WHERE email = ? ORDER BY created_at DESC";
        return this.template.query(sql, BeanPropertyRowMapper.newInstance(Contact.class), email);
    }

    @Override
    public void delete(Long contactId) {
        String sql = "DELETE FROM contacts WHERE contact_id = ?";
        this.template.update(sql, contactId);
    }

    @Override
    public void reply(Long contactId, String replyContent) {
        String sql = """
                UPDATE contacts
                SET reply_content = ?, replied_at = NOW(), status = 'answered'
                WHERE contact_id = ?
                """;
        this.template.update(sql, replyContent, contactId);
    }
}

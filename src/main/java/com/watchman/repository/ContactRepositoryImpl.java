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

    @Override
    public void save(Contact contact) {
        String sql = "INSERT INTO contacts (name, email, type, content) VALUES (?, ?, ?, ?)";
        this.template.update(sql,
                contact.getName(), contact.getEmail(),
                contact.getType(), contact.getContent());
    }

    @Override
    public List<Contact> findAll() {
        String sql = "SELECT contact_id, name, email, type, content, created_at " 
        + "FROM contacts ORDER BY created_at DESC";
        return this.template.query(sql, BeanPropertyRowMapper.newInstance(Contact.class));
    }

    @Override
    public void delete(Long contactId) {
        String sql = "DELETE FROM contacts WHERE contact_id = ?";
        this.template.update(sql, contactId);
    }
}

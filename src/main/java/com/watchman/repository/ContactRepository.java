package com.watchman.repository;

import com.watchman.domain.Contact;
import java.util.List;

public interface ContactRepository {
    void save(Contact contact);
    List<Contact> findAll();
    List<Contact> findByEmail(String email);
    void delete(Long contactId);
    void reply(Long contactId, String replyContent);
}

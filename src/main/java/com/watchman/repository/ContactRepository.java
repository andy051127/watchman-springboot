package com.watchman.repository;

import com.watchman.domain.Contact;
import java.util.List;

public interface ContactRepository {
    void save(Contact contact);
    List<Contact> findAll();
    void delete(Long contactId);
}

package com.watchman.service;

import com.watchman.domain.Contact;
import java.util.List;

public interface ContactService {
    void submit(Contact contact);
    List<Contact> getAll();
    void delete(Long contactId);
}

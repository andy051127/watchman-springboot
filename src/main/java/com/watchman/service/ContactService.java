package com.watchman.service;

import com.watchman.domain.Contact;
import java.util.List;

public interface ContactService {
    void submit(Contact contact);
    List<Contact> getAll();
    List<Contact> getByEmail(String email);
    void delete(Long contactId);
    void reply(Long contactId, String replyContent);
}

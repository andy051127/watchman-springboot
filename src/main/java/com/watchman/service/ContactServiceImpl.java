package com.watchman.service;

import com.watchman.domain.Contact;
import com.watchman.repository.ContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContactServiceImpl implements ContactService {

    private ContactRepository contactRepository;

    @Autowired
    public void setContactRepository(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    @Override
    public void submit(Contact contact) {
        this.contactRepository.save(contact);
    }

    @Override
    public List<Contact> getAll() {
        return this.contactRepository.findAll();
    }

    @Override
    public void delete(Long contactId) {
        this.contactRepository.delete(contactId);
    }
}

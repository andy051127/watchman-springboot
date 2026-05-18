package com.watchman.service;

import com.watchman.domain.Notice;
import com.watchman.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NoticeServiceImpl implements NoticeService {

    private NoticeRepository noticeRepository;

    @Autowired
    public void setNoticeRepository(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    @Override
    public List<Notice> getAll() {
        return this.noticeRepository.findAll();
    }

    @Override
    public void create(Notice notice) {
        this.noticeRepository.save(notice);
    }

    @Override
    public void update(Notice notice) {
        this.noticeRepository.update(notice);
    }

    @Override
    public void delete(Long noticeId) {
        this.noticeRepository.delete(noticeId);
    }
}

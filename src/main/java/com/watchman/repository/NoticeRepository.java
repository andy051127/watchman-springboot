package com.watchman.repository;

import com.watchman.domain.Notice;
import java.util.List;

public interface NoticeRepository {
    List<Notice> findAll();
    void save(Notice notice);
    void update(Notice notice);
    void delete(Long noticeId);
}

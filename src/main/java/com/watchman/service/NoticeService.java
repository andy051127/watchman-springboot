package com.watchman.service;

import com.watchman.domain.Notice;
import java.util.List;

public interface NoticeService {
    List<Notice> getAll();
    void create(Notice notice);
    void update(Notice notice);
    void delete(Long noticeId);
}

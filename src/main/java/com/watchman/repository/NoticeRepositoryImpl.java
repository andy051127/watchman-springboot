package com.watchman.repository;

import com.watchman.domain.Notice;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class NoticeRepositoryImpl implements NoticeRepository {

    private JdbcTemplate template;

    @Autowired
    public void setJdbcTemplate(JdbcTemplate template) {
        this.template = template;
    }

    @Override
    public List<Notice> findAll() {
        String sql = "SELECT notice_id, tag, title, content, pinned, writer_nickname, created_at " +
                     "FROM notices ORDER BY pinned DESC, created_at DESC";
        return this.template.query(sql, BeanPropertyRowMapper.newInstance(Notice.class));
    }

    @Override
    public void save(Notice notice) {
        String sql = "INSERT INTO notices (tag, title, content, pinned, writer_nickname) VALUES (?, ?, ?, ?, ?)";
        this.template.update(sql,
                notice.getTag(), notice.getTitle(),
                notice.getContent(), notice.isPinned(),
                notice.getWriterNickname());
    }

    @Override
    public void update(Notice notice) {
        String sql = "UPDATE notices SET tag = ?, title = ?, content = ?, pinned = ? " +
                     "WHERE notice_id = ?";
        this.template.update(sql,
                notice.getTag(), notice.getTitle(),
                notice.getContent(), notice.isPinned(),
                notice.getNoticeId());
    }

    @Override
    public void delete(Long noticeId) {
        String sql = "DELETE FROM notices WHERE notice_id = ?";
        this.template.update(sql, noticeId);
    }
}

package com.watchman.repository;

import com.watchman.domain.StudyGroup;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Repository
public class StudyGroupRepositoryImpl implements StudyGroupRepository {

    private final JdbcTemplate template;

    public StudyGroupRepositoryImpl(JdbcTemplate template) {
        this.template = template;
    }

    @Override
    public List<StudyGroup> findAllByUserId(Long userId) {
        String sql = "SELECT sg.group_id, sg.name, sg.description, sg.invite_code, sg.leader_id, sg.created_at " +
                     "FROM study_groups sg " +
                     "JOIN group_members gm ON sg.group_id = gm.group_id " +
                     "WHERE gm.user_id = ? ORDER BY sg.created_at DESC";
        return this.template.query(sql, BeanPropertyRowMapper.newInstance(StudyGroup.class), userId);
    }

    @Override
    public StudyGroup findById(Long groupId) {
        String sql = "SELECT group_id, name, description, invite_code, leader_id, created_at " +
                     "FROM study_groups WHERE group_id = ?";
        List<StudyGroup> list = this.template.query(sql, BeanPropertyRowMapper.newInstance(StudyGroup.class), groupId);
        return list.isEmpty() ? null : list.get(0);
    }

    @Override
    public StudyGroup findByInviteCode(String code) {
        String sql = "SELECT group_id, name, description, invite_code, leader_id, created_at " +
                     "FROM study_groups WHERE invite_code = ?";
        List<StudyGroup> list = this.template.query(sql, BeanPropertyRowMapper.newInstance(StudyGroup.class), code);
        return list.isEmpty() ? null : list.get(0);
    }

    @Override
    public void save(StudyGroup group) {
        String sql = "INSERT INTO study_groups (name, description, invite_code, leader_id) VALUES (?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        this.template.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, group.getName());
            ps.setString(2, group.getDescription());
            ps.setString(3, group.getInviteCode());
            ps.setLong(4, group.getLeaderId());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key != null) group.setGroupId(key.longValue());
    }

    @Override
    public void addMember(Long groupId, Long userId) {
        String sql = "INSERT IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)";
        this.template.update(sql, groupId, userId);
    }

    @Override
    public void removeMember(Long groupId, Long userId) {
        String sql = "DELETE FROM group_members WHERE group_id = ? AND user_id = ?";
        this.template.update(sql, groupId, userId);
    }

    @Override
    public void delete(Long groupId) {
        String sql = "DELETE FROM study_groups WHERE group_id = ?";
        this.template.update(sql, groupId);
    }

    @Override
    public boolean isMember(Long groupId, Long userId) {
        String sql = "SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?";
        Integer count = this.template.queryForObject(sql, Integer.class, groupId, userId);
        return count != null && count > 0;
    }

    @Override
    public List<Map<String, Object>> findMembersWithStats(Long groupId) {
        String sql = "SELECT u.user_id AS userId, u.nickname, " +
                     "COALESCE(SUM(s.focused_time), 0) AS totalTime, " +
                     "COALESCE(AVG(s.focus_rate), 0) AS focusRate " +
                     "FROM group_members gm " +
                     "JOIN users u ON gm.user_id = u.user_id " +
                     "LEFT JOIN sessions s ON s.user_id = u.user_id " +
                     "WHERE gm.group_id = ? " +
                     "GROUP BY u.user_id, u.nickname " +
                     "ORDER BY totalTime DESC";
        return this.template.queryForList(sql, groupId);
    }
}

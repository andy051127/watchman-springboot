package com.watchman.repository;

import com.watchman.domain.StudyGroup;
import com.watchman.domain.StudyGroupMember;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class StudyGroupRepositoryImpl implements StudyGroupRepository {

    private JdbcTemplate template;

    @Autowired
    public void setJdbcTemplate(JdbcTemplate template) {
        this.template = template;
    }

    // ── 멤버 목록 조회 (공통 헬퍼) ──────────────────────────────────────
    private List<StudyGroupMember> fetchMembers(Long groupId, Long leaderId) {
        String sql =
            "SELECT u.user_id, u.nickname, u.avatar, " +
            "       COALESCE(SUM(s.focused_time + s.distracted_time), 0) AS total_time, " +
            "       COALESCE(AVG(s.focus_rate), 0.0) AS focus_rate " +
            "FROM group_members gm " +
            "JOIN users u ON u.user_id = gm.user_id " +
            "LEFT JOIN sessions s ON s.user_id = gm.user_id " +
            "WHERE gm.group_id = ? " +
            "GROUP BY u.user_id, u.nickname, u.avatar " +
            "ORDER BY total_time DESC";

        return template.query(sql, (rs, row) -> {
            StudyGroupMember m = new StudyGroupMember();
            m.setUserId(rs.getLong("user_id"));
            m.setNickname(rs.getString("nickname"));
            m.setAvatar(rs.getString("avatar"));
            m.setIsLeader(rs.getLong("user_id") == leaderId);
            m.setTotalTime(rs.getInt("total_time"));
            m.setFocusRate(rs.getDouble("focus_rate"));
            return m;
        }, groupId);
    }

    // ── 그룹 RowMapper 헬퍼 ──────────────────────────────────────────────
    private StudyGroup mapGroup(java.sql.ResultSet rs) throws java.sql.SQLException {
        StudyGroup g = new StudyGroup();
        g.setGroupId(rs.getLong("group_id"));
        g.setName(rs.getString("name"));
        g.setDescription(rs.getString("description"));
        g.setInviteCode(rs.getString("invite_code"));
        g.setLeaderId(rs.getLong("leader_id"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) g.setCreatedAt(ts.toLocalDateTime());
        return g;
    }

    @Override
    public List<StudyGroup> findGroupsByUserId(Long userId) {
        String sql =
            "SELECT sg.group_id, sg.name, sg.description, sg.invite_code, sg.leader_id, sg.created_at " +
            "FROM study_groups sg " +
            "JOIN group_members gm ON sg.group_id = gm.group_id " +
            "WHERE gm.user_id = ? ORDER BY sg.created_at DESC";

        List<StudyGroup> groups = template.query(sql, (rs, row) -> mapGroup(rs), userId);
        for (StudyGroup g : groups) {
            g.setMembers(fetchMembers(g.getGroupId(), g.getLeaderId()));
        }
        return groups;
    }

    @Override
    public Optional<StudyGroup> findGroupById(Long groupId) {
        String sql =
            "SELECT group_id, name, description, invite_code, leader_id, created_at " +
            "FROM study_groups WHERE group_id = ?";

        List<StudyGroup> list = template.query(sql, (rs, row) -> mapGroup(rs), groupId);
        if (list.isEmpty()) return Optional.empty();

        StudyGroup g = list.get(0);
        g.setMembers(fetchMembers(g.getGroupId(), g.getLeaderId()));
        return Optional.of(g);
    }

    @Override
    public Optional<StudyGroup> findByInviteCode(String inviteCode) {
        String sql =
            "SELECT group_id, name, description, invite_code, leader_id, created_at " +
            "FROM study_groups WHERE invite_code = ?";

        List<StudyGroup> list = template.query(sql, (rs, row) -> mapGroup(rs), inviteCode);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Override
    public Long saveGroup(StudyGroup group) {
        String sql = "INSERT INTO study_groups (name, description, invite_code, leader_id) VALUES (?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, group.getName());
            ps.setString(2, group.getDescription());
            ps.setString(3, group.getInviteCode());
            ps.setLong(4, group.getLeaderId());
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    @Override
    public void addMember(Long groupId, Long userId) {
        template.update("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", groupId, userId);
    }

    @Override
    public void removeMember(Long groupId, Long userId) {
        template.update("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", groupId, userId);
    }

    @Override
    public void deleteGroup(Long groupId) {
        template.update("DELETE FROM study_groups WHERE group_id = ?", groupId);
    }

    @Override
    public boolean existsMember(Long groupId, Long userId) {
        Integer count = template.queryForObject(
            "SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?",
            Integer.class, groupId, userId);
        return count != null && count > 0;
    }

    @Override
    public boolean isLeader(Long groupId, Long userId) {
        Integer count = template.queryForObject(
            "SELECT COUNT(*) FROM study_groups WHERE group_id = ? AND leader_id = ?",
            Integer.class, groupId, userId);
        return count != null && count > 0;
    }
}

package com.watchman.repository;

import com.watchman.domain.StudyGroup;

import java.util.List;
import java.util.Map;

public interface StudyGroupRepository {
    List<StudyGroup> findAllByUserId(Long userId);
    StudyGroup findById(Long groupId);
    StudyGroup findByInviteCode(String code);
    void save(StudyGroup group);
    void addMember(Long groupId, Long userId);
    void removeMember(Long groupId, Long userId);
    void delete(Long groupId);
    boolean isMember(Long groupId, Long userId);
    List<Map<String, Object>> findMembersWithStats(Long groupId);
}

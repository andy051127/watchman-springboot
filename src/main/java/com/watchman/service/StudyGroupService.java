package com.watchman.service;

import java.util.List;
import java.util.Map;

public interface StudyGroupService {
    List<Map<String, Object>> getMyGroups(Long userId);
    Map<String, Object> createGroup(Long userId, String name, String description);
    Map<String, Object> joinGroup(Long userId, String inviteCode);
    void disbandGroup(Long groupId, Long userId);
    void leaveGroup(Long groupId, Long userId);
    void kickMember(Long groupId, Long leaderId, Long targetUserId);
}

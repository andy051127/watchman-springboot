package com.watchman.service;

import com.watchman.domain.StudyGroup;

import java.util.List;

public interface StudyGroupService {

    // 내 그룹 목록
    List<StudyGroup> getMyGroups(Long userId);

    // 그룹 상세 (멤버가 아니면 예외)
    StudyGroup getGroup(Long groupId, Long userId);

    // 그룹 생성 (생성자는 자동 멤버 + 방장)
    StudyGroup createGroup(String name, String description, Long leaderId);

    // 초대코드로 참가 (중복 참가 / 존재하지 않는 코드 예외)
    void joinGroup(String inviteCode, Long userId);

    // 그룹 나가기 — 방장이면 예외 (방장은 disbandGroup 사용)
    void leaveGroup(Long groupId, Long userId);

    // 멤버 강퇴 (방장만 가능)
    void kickMember(Long groupId, Long leaderId, Long targetUserId);

    // 그룹 폐쇄 (방장만 가능)
    void disbandGroup(Long groupId, Long leaderId);
}

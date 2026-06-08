package com.watchman.repository;

import com.watchman.domain.StudyGroup;

import java.util.List;
import java.util.Optional;

public interface StudyGroupRepository {

    // 내가 속한 그룹 목록 (멤버 포함)
    List<StudyGroup> findGroupsByUserId(Long userId);

    // 특정 그룹 상세 (멤버 포함)
    Optional<StudyGroup> findGroupById(Long groupId);

    // 초대코드로 그룹 조회
    Optional<StudyGroup> findByInviteCode(String inviteCode);

    // 그룹 생성 — 생성된 group_id 반환
    Long saveGroup(StudyGroup group);

    // 멤버 추가
    void addMember(Long groupId, Long userId);

    // 멤버 제거 (나가기 / 강퇴)
    void removeMember(Long groupId, Long userId);

    // 그룹 삭제 (CASCADE로 group_members 자동 삭제)
    void deleteGroup(Long groupId);

    // 멤버 여부 확인
    boolean existsMember(Long groupId, Long userId);

    // 방장 여부 확인
    boolean isLeader(Long groupId, Long userId);
}

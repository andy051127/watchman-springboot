package com.watchman.service;

import com.watchman.domain.StudyGroup;
import com.watchman.repository.StudyGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
public class StudyGroupServiceImpl implements StudyGroupService {

    private StudyGroupRepository studyGroupRepository;

    @Autowired
    public void setStudyGroupRepository(StudyGroupRepository studyGroupRepository) {
        this.studyGroupRepository = studyGroupRepository;
    }

    @Override
    public List<StudyGroup> getMyGroups(Long userId) {
        return studyGroupRepository.findGroupsByUserId(userId);
    }

    @Override
    public StudyGroup getGroup(Long groupId, Long userId) {
        StudyGroup g = studyGroupRepository.findGroupById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        if (!studyGroupRepository.existsMember(groupId, userId)) {
            throw new IllegalStateException("그룹 멤버가 아닙니다.");
        }
        return g;
    }

    @Override
    @Transactional
    public StudyGroup createGroup(String name, String description, Long leaderId) {
        StudyGroup group = new StudyGroup();
        group.setName(name);
        group.setDescription(description);
        group.setLeaderId(leaderId);
        group.setInviteCode(generateInviteCode());

        Long groupId = studyGroupRepository.saveGroup(group);
        studyGroupRepository.addMember(groupId, leaderId);

        return studyGroupRepository.findGroupById(groupId)
            .orElseThrow(() -> new IllegalStateException("그룹 생성 후 조회 실패"));
    }

    @Override
    public void joinGroup(String inviteCode, Long userId) {
        StudyGroup g = studyGroupRepository.findByInviteCode(inviteCode)
            .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 초대 코드입니다."));

        if (studyGroupRepository.existsMember(g.getGroupId(), userId)) {
            throw new IllegalStateException("이미 참여 중인 그룹입니다.");
        }
        studyGroupRepository.addMember(g.getGroupId(), userId);
    }

    @Override
    public void leaveGroup(Long groupId, Long userId) {
        if (!studyGroupRepository.existsMember(groupId, userId)) {
            throw new IllegalStateException("그룹 멤버가 아닙니다.");
        }
        if (studyGroupRepository.isLeader(groupId, userId)) {
            throw new IllegalStateException("방장은 그룹을 나갈 수 없습니다. 그룹 폐쇄를 이용하세요.");
        }
        studyGroupRepository.removeMember(groupId, userId);
    }

    @Override
    public void kickMember(Long groupId, Long leaderId, Long targetUserId) {
        if (!studyGroupRepository.isLeader(groupId, leaderId)) {
            throw new IllegalStateException("방장만 강퇴할 수 있습니다.");
        }
        if (leaderId.equals(targetUserId)) {
            throw new IllegalArgumentException("자기 자신을 강퇴할 수 없습니다.");
        }
        if (!studyGroupRepository.existsMember(groupId, targetUserId)) {
            throw new IllegalArgumentException("해당 멤버가 그룹에 없습니다.");
        }
        studyGroupRepository.removeMember(groupId, targetUserId);
    }

    @Override
    public void disbandGroup(Long groupId, Long leaderId) {
        if (!studyGroupRepository.isLeader(groupId, leaderId)) {
            throw new IllegalStateException("방장만 그룹을 폐쇄할 수 있습니다.");
        }
        studyGroupRepository.deleteGroup(groupId);
    }

    // 6자리 영숫자 랜덤 초대코드 생성
    private String generateInviteCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}

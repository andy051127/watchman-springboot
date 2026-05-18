package com.watchman.service;

import com.watchman.domain.StudyGroup;
import com.watchman.repository.StudyGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class StudyGroupServiceImpl implements StudyGroupService {

    private StudyGroupRepository repo;

    @Autowired
    public void setRepo(StudyGroupRepository repo) { this.repo = repo; }

    @Override
    public List<Map<String, Object>> getMyGroups(Long userId) {
        List<StudyGroup> groups = this.repo.findAllByUserId(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (StudyGroup g : groups) {
            result.add(buildGroupMap(g));
        }
        return result;
    }

    @Override
    public Map<String, Object> createGroup(Long userId, String name, String description) {
        StudyGroup g = new StudyGroup();
        g.setName(name);
        g.setDescription(description);
        g.setInviteCode(generateCode());
        g.setLeaderId(userId);
        this.repo.save(g);
        this.repo.addMember(g.getGroupId(), userId);
        return buildGroupMap(g);
    }

    @Override
    public Map<String, Object> joinGroup(Long userId, String inviteCode) {
        StudyGroup g = this.repo.findByInviteCode(inviteCode.toUpperCase());
        if (g == null) throw new IllegalArgumentException("존재하지 않는 초대 코드입니다.");
        if (this.repo.isMember(g.getGroupId(), userId)) throw new IllegalStateException("이미 참여한 그룹입니다.");
        this.repo.addMember(g.getGroupId(), userId);
        return buildGroupMap(g);
    }

    @Override
    public void disbandGroup(Long groupId, Long userId) {
        StudyGroup g = this.repo.findById(groupId);
        if (g == null) throw new NoSuchElementException("그룹을 찾을 수 없습니다.");
        if (!g.getLeaderId().equals(userId)) throw new SecurityException("그룹장만 폐쇄할 수 있습니다.");
        this.repo.delete(groupId);
    }

    @Override
    public void leaveGroup(Long groupId, Long userId) {
        StudyGroup g = this.repo.findById(groupId);
        if (g == null) throw new NoSuchElementException("그룹을 찾을 수 없습니다.");
        if (g.getLeaderId().equals(userId)) throw new IllegalStateException("그룹장은 그룹을 나갈 수 없습니다. 그룹을 폐쇄하세요.");
        if (!this.repo.isMember(groupId, userId)) throw new IllegalStateException("그룹 멤버가 아닙니다.");
        this.repo.removeMember(groupId, userId);
    }

    @Override
    public void kickMember(Long groupId, Long leaderId, Long targetUserId) {
        StudyGroup g = this.repo.findById(groupId);
        if (g == null) throw new NoSuchElementException("그룹을 찾을 수 없습니다.");
        if (!g.getLeaderId().equals(leaderId)) throw new SecurityException("그룹장만 멤버를 강퇴할 수 있습니다.");
        if (targetUserId.equals(leaderId)) throw new IllegalArgumentException("자기 자신을 강퇴할 수 없습니다.");
        if (!this.repo.isMember(groupId, targetUserId)) throw new IllegalStateException("해당 사용자는 그룹 멤버가 아닙니다.");
        this.repo.removeMember(groupId, targetUserId);
    }

    private Map<String, Object> buildGroupMap(StudyGroup g) {
        List<Map<String, Object>> members = this.repo.findMembersWithStats(g.getGroupId());
        for (Map<String, Object> m : members) {
            Object uid = m.get("userId");
            m.put("isLeader", uid != null && uid.equals(g.getLeaderId()));
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("groupId",     g.getGroupId());
        map.put("name",        g.getName());
        map.put("description", g.getDescription());
        map.put("inviteCode",  g.getInviteCode());
        map.put("leaderId",    g.getLeaderId());
        map.put("createdAt",   g.getCreatedAt());
        map.put("members",     members);
        return map;
    }

    private String generateCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random rnd = new Random();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }
}

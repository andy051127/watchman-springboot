package com.watchman.domain;

import java.time.LocalDateTime;
import java.util.List;

public class StudyGroup {

	private Long groupId;
	private String name;
	private String description;
	private String inviteCode;
	private Long leaderId;
	private LocalDateTime createdAt;
	private List<StudyGroupMember> members;

	public StudyGroup() {
	}

	public Long getGroupId() { return groupId; }
	public void setGroupId(Long groupId) { this.groupId = groupId; }

	public String getName() { return name; }
	public void setName(String name) { this.name = name; }

	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }

	public String getInviteCode() { return inviteCode; }
	public void setInviteCode(String inviteCode) { this.inviteCode = inviteCode; }

	public Long getLeaderId() { return leaderId; }
	public void setLeaderId(Long leaderId) { this.leaderId = leaderId; }

	public LocalDateTime getCreatedAt() { return createdAt; }
	public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

	public List<StudyGroupMember> getMembers() { return members; }
	public void setMembers(List<StudyGroupMember> members) { this.members = members; }

}

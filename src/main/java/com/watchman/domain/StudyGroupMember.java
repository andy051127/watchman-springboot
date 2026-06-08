package com.watchman.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

public class StudyGroupMember {

	private Long userId;
	private String nickname;
	private String avatar;
	private boolean isLeader;
	private long totalTime;       // focused_time + distracted_time 합계 (초)
	private double focusRate;    // 평균 집중률 (%)

	public StudyGroupMember() {
	}

	public Long getUserId() { return userId; }
	public void setUserId(Long userId) { this.userId = userId; }

	public String getNickname() { return nickname; }
	public void setNickname(String nickname) { this.nickname = nickname; }

	public String getAvatar() { return avatar; }
	public void setAvatar(String avatar) { this.avatar = avatar; }

	@JsonProperty("isLeader")
	public boolean getIsLeader() { return isLeader; }
	public void setIsLeader(boolean isLeader) { this.isLeader = isLeader; }

	public long getTotalTime() { return totalTime; }
	public void setTotalTime(long totalTime) { this.totalTime = totalTime; }

	public double getFocusRate() { return focusRate; }
	public void setFocusRate(double focusRate) { this.focusRate = focusRate; }

}

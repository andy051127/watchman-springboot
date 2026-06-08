package com.watchman.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class Session {
	private Long sessionId;
	private Long userId;
	private String name;
	private int focusedTime;
	private int distractedTime;
	private BigDecimal focusRate;
	private LocalDateTime startedAt;

	public Session() {}

	public Long getSessionId() { return sessionId; }
	public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
	public Long getUserId() { return userId; }
	public void setUserId(Long userId) { this.userId = userId; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public int getFocusedTime() { return focusedTime; }
	public void setFocusedTime(int focusedTime) { this.focusedTime = focusedTime; }
	public int getDistractedTime() { return distractedTime; }
	public void setDistractedTime(int distractedTime) { this.distractedTime = distractedTime; }
	public BigDecimal getFocusRate() { return focusRate; }
	public void setFocusRate(BigDecimal focusRate) { this.focusRate = focusRate; }
	public LocalDateTime getStartedAt() { return startedAt; }
	public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
}

package com.watchman.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

public class User {
	private Long userId;
	private String email;
	@JsonIgnore
	private String password;
	private String nickname;
	private String avatar;
	private int streak;
	private int isAdmin;
	private LocalDateTime createdAt;

	public User() {
	}

	public Long getUserId() {return userId;}
	public void setUserId(Long userId) {this.userId = userId;}
	public String getEmail() {return email;}
	public void setEmail(String email) {this.email = email;}
	public String getPassword() {return password;}
	public void setPassword(String password) {this.password = password;}
	public String getNickname() {return nickname;}
	public void setNickname(String nickname) {this.nickname = nickname;}
	public String getAvatar() {return avatar;}
	public void setAvatar(String avatar) {this.avatar = avatar;}
	public int getStreak() {return streak;}
	public void setStreak(int streak) {this.streak = streak;}
	public int getIsAdmin() {return isAdmin;}
	public void setIsAdmin(int isAdmin) {this.isAdmin = isAdmin;}
	public LocalDateTime getCreatedAt() {return createdAt;}
	public void setCreatedAt(LocalDateTime createdAt) {this.createdAt = createdAt;}

}

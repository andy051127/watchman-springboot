package com.watchman.repository;

import com.watchman.domain.User;

public interface UserRepository {

	// 이메일로 유저 1명 조회 (로그인 시 사용)
	User findByEmail(String email);

	// user_id로 유저 1명 조회 (내 정보 조회 시 사용)
	User findById(Long userId);

	// 새 유저 저장 (회원가입)
	void save(User user);

	// 닉네임 변경
	void updateNickname(Long userId, String nickname);

	// 비밀번호 변경
	void updatePassword(Long userId, String password);

	// 아바타 이미지 변경
	void updateAvatar(Long userId, String avatar);

	// 전체 유저 목록 조회 (관리자용)
	java.util.List<User> findAll();

	// 역할 변경 (관리자용)
	void updateRole(Long userId, String role);

	// 유저 삭제 (회원 탈퇴) — ON DELETE CASCADE로 연관 데이터 전부 삭제됨
	void delete(Long userId);
}

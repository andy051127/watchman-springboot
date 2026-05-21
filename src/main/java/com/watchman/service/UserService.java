package com.watchman.service;

import com.watchman.domain.User;

public interface UserService {

	// 로그인: 이메일+비밀번호 검증 후 유저 반환 (실패 시 null)
	User login(String email, String password);

	// 회원가입: 이메일 중복 확인 후 저장 (중복이면 예외)
	void register(User user);

	// 내 정보 조회
	User getUser(Long userId);

	// 닉네임 변경
	void updateNickname(Long userId, String nickname);

	// 비밀번호 변경: 현재 비밀번호 확인 후 변경 (불일치 시 예외)
	void updatePassword(Long userId, String currentPassword, String newPassword);

	// 아바타 변경
	void updateAvatar(Long userId, String avatar);

	// 회원 탈퇴: 비밀번호 확인 후 삭제 (불일치 시 예외)
	void deleteUser(Long userId, String password);

	// 전체 유저 목록 조회 (관리자용)
	java.util.List<User> getAllUsers();

	// 관리자가 직접 유저 삭제 (비밀번호 확인 없음)
	void adminDeleteUser(Long userId);

	// 관리자 여부 변경 (0: 일반, 1: 관리자)
	void updateUserAdmin(Long userId, int isAdmin);
}

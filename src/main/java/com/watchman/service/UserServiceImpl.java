package com.watchman.service;

import com.watchman.domain.User;
import com.watchman.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

	private UserRepository userRepository;

	// servlet-context.xml에서 component-scan으로 등록된 UserRepositoryImpl Bean을 주입받음
	@Autowired
	public void setUserRepository(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	// 로그인: 이메일로 유저 조회 → 비밀번호 일치 여부 확인
	// queryForObject()는 결과가 없으면 EmptyResultDataAccessException을 던지므로 catch로 처리
	@Override
	public User login(String email, String password) {
		try {
			User user = this.userRepository.findByEmail(email);
			// 비밀번호가 일치하면 유저 반환, 불일치면 null
			if (user.getPassword().equals(password)) {
				return user;
			}
			return null;
		} catch (EmptyResultDataAccessException e) {
			// 해당 이메일의 유저가 없는 경우
			return null;
		}
	}

	// 회원가입: 이메일 중복 확인 후 저장
	// 이미 존재하는 이메일이면 IllegalArgumentException 발생
	@Override
	public void register(User user) {
		try {
			this.userRepository.findByEmail(user.getEmail());
			// 예외 없이 통과 = 이미 존재하는 이메일
			throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + user.getEmail());
		} catch (EmptyResultDataAccessException e) {
			// 예외 발생 = 이메일 없음 → 정상적으로 가입 진행
			this.userRepository.save(user);
		}
	}

	// 내 정보 조회
	@Override
	public User getUser(Long userId) {
		return this.userRepository.findById(userId);
	}

	// 닉네임 변경
	@Override
	public void updateNickname(Long userId, String nickname) {
		this.userRepository.updateNickname(userId, nickname);
	}

	// 비밀번호 변경: 현재 비밀번호가 일치하는지 먼저 확인
	@Override
	public void updatePassword(Long userId, String currentPassword, String newPassword) {
		User user = this.userRepository.findById(userId);
		if (!user.getPassword().equals(currentPassword)) {
			throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
		}
		this.userRepository.updatePassword(userId, newPassword);
	}

	// 아바타 변경
	@Override
	public void updateAvatar(Long userId, String avatar) {
		this.userRepository.updateAvatar(userId, avatar);
	}

	// 회원 탈퇴: 비밀번호 확인 후 삭제
	// users 테이블의 ON DELETE CASCADE로 연관 데이터(sessions, todos 등) 전부 삭제됨
	@Override
	public void deleteUser(Long userId, String password) {
		User user = this.userRepository.findById(userId);
		if (!user.getPassword().equals(password)) {
			throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
		}
		this.userRepository.delete(userId);
	}

	// 전체 유저 목록 조회 (관리자용)
	@Override
	public java.util.List<User> getAllUsers() {
		return this.userRepository.findAll();
	}

	// 관리자 직접 삭제 (비밀번호 확인 없음)
	@Override
	public void adminDeleteUser(Long userId) {
		this.userRepository.delete(userId);
	}

	// 관리자 여부 변경 (0: 일반, 1: 관리자)
	@Override
	public void updateUserAdmin(Long userId, int isAdmin) {
		this.userRepository.updateAdmin(userId, isAdmin);
	}
}

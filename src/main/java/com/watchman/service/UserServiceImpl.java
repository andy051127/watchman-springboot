package com.watchman.service;

import com.watchman.domain.User;
import com.watchman.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

	private UserRepository userRepository;
	private BCryptPasswordEncoder passwordEncoder;

	@Autowired
	public void setUserRepository(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Autowired
	public void setPasswordEncoder(BCryptPasswordEncoder passwordEncoder) {
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	public User login(String email, String password) {
		try {
			User user = this.userRepository.findByEmail(email);
			if (this.passwordEncoder.matches(password, user.getPassword())) {
				return user;
			}
			return null;
		} catch (EmptyResultDataAccessException e) {
			return null;
		}
	}

	@Override
	public void register(User user) {
		try {
			this.userRepository.findByEmail(user.getEmail());
			throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + user.getEmail());
		} catch (EmptyResultDataAccessException e) {
			user.setPassword(this.passwordEncoder.encode(user.getPassword()));
			this.userRepository.save(user);
		}
	}

	@Override
	public User getUser(Long userId) {
		return this.userRepository.findById(userId);
	}

	@Override
	public void updateNickname(Long userId, String nickname) {
		this.userRepository.updateNickname(userId, nickname);
	}

	@Override
	public void updatePassword(Long userId, String currentPassword, String newPassword) {
		User user = this.userRepository.findById(userId);
		if (!this.passwordEncoder.matches(currentPassword, user.getPassword())) {
			throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
		}
		this.userRepository.updatePassword(userId, this.passwordEncoder.encode(newPassword));
	}

	@Override
	public void updateAvatar(Long userId, String avatar) {
		this.userRepository.updateAvatar(userId, avatar);
	}

	@Override
	public void deleteUser(Long userId, String password) {
		User user = this.userRepository.findById(userId);
		if (!this.passwordEncoder.matches(password, user.getPassword())) {
			throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
		}
		this.userRepository.delete(userId);
	}

	@Override
	public java.util.List<User> getAllUsers() {
		return this.userRepository.findAll();
	}

	@Override
	public void adminDeleteUser(Long userId) {
		this.userRepository.delete(userId);
	}

	@Override
	public void updateUserAdmin(Long userId, int isAdmin) {
		this.userRepository.updateAdmin(userId, isAdmin);
	}
}

package com.watchman.config;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 현재 공부 중인 사용자 수를 인메모리로 추적합니다.
 * 각 세션 키에 대해 마지막 ping 시각을 저장하고,
 * TTL(60초) 초과 시 만료 처리합니다.
 */
@Component
public class ActiveUserTracker {

    private static final long TTL_MS = 60_000L;

    // key: sessionKey(UUID), value: lastPingAt(ms)
    private final Map<String, Long> sessions = new ConcurrentHashMap<>();

    public void ping(String sessionKey) {
        sessions.put(sessionKey, System.currentTimeMillis());
    }

    public void remove(String sessionKey) {
        sessions.remove(sessionKey);
    }

    public int getActiveCount() {
        long cutoff = System.currentTimeMillis() - TTL_MS;
        sessions.entrySet().removeIf(e -> e.getValue() < cutoff);
        return sessions.size();
    }
}
